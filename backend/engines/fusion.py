"""Signal fusion - turns seven engines into one explainable verdict.

The scoring deliberately damps the ML model when nothing else agrees. Short text
("hi", "call me") can produce a jumpy probability from any bag-of-words model, and
a fraud warning that cries wolf is worse than useless: people stop reading it. So
an ML-only signal is halved, while ML plus concrete red flags reinforce each other.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from engines import call_engine, categorizer, email_engine, rules, text_engine, upi_engine, url_engine

VERDICT_BANDS = ((65, "High Risk"), (35, "Suspicious"), (0, "Safe"))

CHANNEL_LABELS = {
    "message": "SMS / WhatsApp",
    "call": "Call transcript",
    "email": "Email",
    "url": "Link",
    "upi": "UPI / Payment",
}


def verdict_for(score: int) -> str:
    for threshold, verdict in VERDICT_BANDS:
        if score >= threshold:
            return verdict
    return "Safe"


def _lookup_intel(db, entities: dict) -> tuple[float, list[dict], list[dict]]:
    """Check extracted entities against the local threat-intel table."""
    if db is None:
        return 0.0, [], []

    try:
        from models import ThreatIntel
    except Exception:
        return 0.0, [], []

    candidates: list[tuple[str, str]] = []
    for domain in entities.get("domains", []):
        candidates.append(("domain", domain.lower()))
    for upi_id in entities.get("upi_ids", []):
        candidates.append(("upi", upi_id.lower()))
    for phone in entities.get("phones", []):
        candidates.append(("phone", phone[-10:]))

    if not candidates:
        return 0.0, [], []

    values = list({value for _, value in candidates})
    try:
        rows = (
            db.query(ThreatIntel)
            .filter(ThreatIntel.indicator_value.in_(values))
            .all()
        )
    except Exception:
        return 0.0, [], []

    by_value = {row.indicator_value.lower(): row for row in rows}

    score = 0.0
    reasons: list[dict] = []
    intel_records: list[dict] = []

    for kind, value in candidates:
        row = by_value.get(value)
        if row is not None:
            weight = {"high": 28.0, "medium": 16.0, "low": 8.0}.get(row.risk_level, 16.0)
            score += weight
            intel_records.append(
                {
                    "value": value,
                    "type": kind,
                    "known_bad": True,
                    "risk_level": row.risk_level,
                    "report_count": row.report_count,
                    "note": (
                        f"Already reported {row.report_count} time(s) by other people using "
                        "CREDIFY.ai."
                    ),
                }
            )
            noun = {
                "domain": "website",
                "upi": "payment address",
                "phone": "phone number",
            }.get(kind, "detail")
            reasons.append(
                {
                    "reason": (
                        f"This {noun} ({value}) has already been reported to us "
                        f"{row.report_count} times by other people as part of a scam."
                    ),
                    "severity": "high",
                    "weight": weight,
                    "engine": "intel",
                }
            )
        else:
            intel_records.append(
                {
                    "value": value,
                    "type": kind,
                    "known_bad": False,
                    "risk_level": None,
                    "report_count": 0,
                    "note": "Not on our reported list - but that alone does not make it safe.",
                }
            )

    return min(score, 40.0), reasons[:4], intel_records[:12]


def _confidence(risky: bool, ml_probability: float, agreeing: int) -> float:
    certainty = abs(ml_probability - 0.5) * 2
    if risky:
        consensus = min(agreeing, 4) / 4
        value = 0.45 + 0.35 * consensus + 0.18 * certainty
    else:
        value = 0.52 + 0.30 * certainty + 0.14 * (1 - min(agreeing, 3) / 3)
    return round(max(0.35, min(0.98, value)), 2)


def analyze(content: str, channel: str = "message", db=None) -> dict:
    """Run the full pipeline and return an AnalyzeResponse-shaped dict."""
    text = (content or "").strip()
    channel = channel if channel in CHANNEL_LABELS else "message"

    # ---------------------------------------------------------------- entities
    urls = url_engine.extract_urls(text)
    domains = url_engine.extract_domains(text)
    upi_ids = upi_engine.extract_upi_ids(text)
    emails = [e for e in rules.extract_emails(text) if e not in upi_ids]
    entities = {
        "urls": urls,
        "upi_ids": upi_ids,
        "phones": rules.extract_phones(text),
        "amounts": rules.extract_amounts(text),
        "emails": emails,
        "domains": domains,
    }

    # ----------------------------------------------------------------- engines
    ml_probability, explanation_tokens = text_engine.predict(text)

    rule_hits = rules.evaluate(text, channel)
    rule_reasons = [hit.as_dict() for hit in rule_hits]
    rule_ids = [hit.rule_id for hit in rule_hits]
    rule_score = min(sum(hit.weight for hit in rule_hits), 70.0)

    url_result = url_engine.analyze(text) if urls else {"score": 0.0, "reasons": []}

    run_upi = channel == "upi" or bool(upi_ids) or "request" in text.lower() or "pin" in text.lower()
    upi_result = upi_engine.analyze(text, channel) if run_upi else {"score": 0.0, "reasons": []}

    email_result = (
        email_engine.analyze(text) if channel == "email" else {"score": 0.0, "reasons": []}
    )
    call_result = (
        call_engine.analyze(text) if channel == "call" else {"score": 0.0, "reasons": []}
    )

    intel_score, intel_reasons, entity_intel = _lookup_intel(db, entities)

    # ------------------------------------------------------------------ fusion
    base = ml_probability * 100.0

    # The classifier was trained on sentences. A bare link, or a body that is
    # almost entirely a URL, gives it nothing to reason about, so its opinion is
    # discounted and the URL engine is left to carry the verdict.
    prose = text
    for url in urls:
        prose = prose.replace(url, " ")
    if channel == "url" or len(prose.split()) < 4:
        base *= 0.35

    if rule_score == 0:
        # Nothing concrete corroborates the model, so halve its contribution.
        final = round(0.5 * base)
    else:
        final = round(0.6 * base + 0.4 * min(base + rule_score, 100.0))
        final = max(final, int(round(rule_score)))

    entity_signal = (
        url_result["score"]
        + upi_result["score"]
        + email_result["score"]
        + call_result["score"]
        + intel_score
    )
    # Entity evidence is strong but must not let four medium hints alone max out
    # the score, so it is compressed before it is added.
    entity_bonus = min(entity_signal, 60.0) * 0.45
    final = int(min(round(final + entity_bonus), 100))
    final = max(final, 0)

    verdict = verdict_for(final)
    risky = final >= 35

    # ----------------------------------------------------------------- reasons
    all_reasons: list[dict] = []
    seen: set[str] = set()
    for group in (
        intel_reasons,
        call_result.get("reasons", []),
        upi_result.get("reasons", []),
        email_result.get("reasons", []),
        url_result.get("reasons", []),
        rule_reasons,
    ):
        for reason in group:
            key = reason["reason"]
            if key not in seen:
                seen.add(key)
                all_reasons.append(reason)

    all_reasons.sort(
        key=lambda r: ({"high": 0, "medium": 1, "low": 2}[r["severity"]], -r["weight"])
    )
    all_reasons = all_reasons[:8]

    if not all_reasons:
        all_reasons = [
            {
                "reason": (
                    "No known scam patterns were found: nothing here asks for a secret code, "
                    "pushes a deadline, or points to a suspicious link or payment address."
                ),
                "severity": "low",
                "weight": 0,
                "engine": "fusion",
            }
        ]
    elif not risky:
        all_reasons.insert(
            0,
            {
                "reason": (
                    "Overall this looks legitimate. The points below are minor things worth "
                    "noticing, not evidence of a scam."
                ),
                "severity": "low",
                "weight": 0,
                "engine": "fusion",
            },
        )
        all_reasons = all_reasons[:6]

    # -------------------------------------------------------------- categorise
    if risky:
        category, _ = categorizer.classify(text, channel, rule_ids)
        if category == "safe_none":
            # Nothing named the scam type. Credential phishing is the honest
            # generic bucket for a risky link or message; a payment channel
            # defaults to the collect-request trap instead.
            category = "upi_collect" if channel == "upi" else "otp_phishing"
    else:
        category = "safe_none"

    # ------------------------------------------------------------- confidence
    agreeing = sum(
        1
        for value in (
            ml_probability >= 0.5,
            rule_score > 0,
            url_result["score"] > 0,
            upi_result["score"] > 0,
            email_result["score"] > 0,
            call_result["score"] > 0,
            intel_score > 0,
        )
        if value
    )
    confidence = _confidence(risky, ml_probability, agreeing)

    return {
        "scan_id": str(uuid.uuid4()),
        "channel": channel,
        "risk_score": final,
        "verdict": verdict,
        "confidence": confidence,
        "category": category,
        "category_label": categorizer.label_for(category),
        "ml_probability": round(ml_probability * 100, 1),
        "reasons": all_reasons,
        "explanation_tokens": explanation_tokens,
        "entities": entities,
        "entity_intel": entity_intel,
        "playbook": categorizer.playbook_for(category, verdict),
        "analyzed_at": datetime.now(timezone.utc),
        "engine_scores": {
            "ml": round(base, 1),
            "rules": round(rule_score, 1),
            "url": round(url_result["score"], 1),
            "upi": round(upi_result["score"], 1),
            "email": round(email_result["score"], 1),
            "call": round(call_result["score"], 1),
            "intel": round(intel_score, 1),
        },
    }
