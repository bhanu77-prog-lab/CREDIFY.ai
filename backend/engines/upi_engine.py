"""UPI and payment-request heuristics.

The single most important idea in this file: on UPI, *receiving* money never
requires your PIN. Any message that tells you to approve a request, scan a QR
code or enter your PIN "to receive" a refund, cashback or prize is asking you to
pay, not to be paid. That direction mismatch is the core check here.
"""

from __future__ import annotations

import re

# A UPI handle looks like name@psp - the part after @ has no dot, which is what
# separates it from an email address.
UPI_RE = re.compile(r"\b([A-Za-z0-9][A-Za-z0-9._\-]{1,60})@([A-Za-z][A-Za-z0-9]{1,20})\b")

KNOWN_PSPS = {
    "oksbi", "okhdfcbank", "okicici", "okaxis", "ybl", "ibl", "axl", "axisb",
    "paytm", "apl", "yapl", "rapl", "upi", "abfspay", "aubank", "barodampay",
    "cnrb", "fbl", "freecharge", "hdfcbank", "icici", "idfcbank", "indus",
    "jupiteraxis", "kotak", "kbl", "pockets", "sbi", "yesbank", "yesg", "ptaxis",
    "ptsbi", "ptyes", "pthdfc", "airtel", "jio", "waaxis", "waicici", "wahdfcbank",
    "wasbi", "slc", "timecosmos", "dbs", "federal", "idbi", "uco", "unionbank",
    "utbi", "vijb", "mahb", "allbank", "cbin", "psb", "dlb", "kvb", "tjsb",
}

RECEIVE_INTENT = [
    r"\b(?:to |and )?(?:receive|get|claim|credit|collect)\b[^.!?\n]{0,40}\b(?:money|amount|refund|cashback|prize|payment|rs\.?\s*\d|₹)",
    r"\b(?:refund|cashback|prize|winning|reward)\b[^.!?\n]{0,50}\b(?:credited|credit|receive|paisa aa jayega|aa jayega)\b",
    r"\bpaisa (?:aa jayega|milega|wapas)\b",
]

COLLECT_LANGUAGE = [
    r"\b(?:collect request|payment request|money request|request received|request of rs)\b",
    r"\b(?:approve|accept|authorise|authorize|allow)\b[^.!?\n]{0,40}\b(?:request|payment|transaction)\b",
    r"\brequest (?:accept|approve) kar\w*\b",
    r"\byou have (?:a|an|received) (?:collect|payment|money) request\b",
]

PIN_TO_RECEIVE = [
    r"\b(?:enter|type|put|daal|daaliye|dal)\w*\b[^.!?\n]{0,25}\b(?:upi )?(?:pin|mpin)\b",
    r"\bpin (?:daal|daaliye|enter|dijiye)\w*\b",
]

REFUND_BAIT = [
    r"\b(?:refund|cashback|reversal|chargeback)\b[^.!?\n]{0,50}\b(?:initiated|ready|pending|processed|approve|claim)\b",
    r"\brefund ready hai\b",
    r"\b(?:cancelled|failed) (?:order|transaction|booking)\b[^.!?\n]{0,40}\brefund\b",
]

TRUST_TEST = [
    r"\b(?:rs\.?|₹)\s*[12]\b[^.!?\n]{0,60}\b(?:verify|verification|test|confirm|check)\b",
    r"\b(?:verify|verification|test|confirm)\b[^.!?\n]{0,50}\b(?:rs\.?|₹)\s*[12]\b",
    r"\bre?[- ]?1 (?:ka )?(?:test|verification)\b",
]

QR_RECEIVE = [
    r"\bscan\b[^.!?\n]{0,50}\bqr\b[^.!?\n]{0,60}\b(?:receive|get|credit|money|paisa|amount|refund)\b",
    r"\bqr\b[^.!?\n]{0,40}\bscan\b[^.!?\n]{0,50}\b(?:paisa|money|amount|receive)\b",
]

CLAIMED_INSTITUTIONS = [
    ("rbi", "the Reserve Bank of India"),
    ("reserve bank", "the Reserve Bank of India"),
    ("income tax", "the Income Tax Department"),
    ("customs", "the Customs Department"),
    ("cyber cell", "the Cyber Cell"),
    ("police", "the police"),
    ("cbi", "the CBI"),
    ("court", "a court"),
    ("bank", "a bank"),
    ("electricity board", "the electricity board"),
    ("government", "the government"),
]


def extract_upi_ids(text: str) -> list[str]:
    """UPI handles only - anything whose domain part contains a dot is an email."""
    found: list[str] = []
    for match in UPI_RE.finditer(text or ""):
        handle = match.group(0)
        after = text[match.end() : match.end() + 1]
        if after == ".":  # e.g. name@gmail.com - an email address, not a UPI ID
            continue
        if handle.lower() not in [f.lower() for f in found]:
            found.append(handle)
    return found[:10]


def _hit(patterns: list[str], text: str) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def analyze(text: str, channel: str = "upi") -> dict:
    """Score UPI / payment-request risk. Returns score (0-45) and reasons."""
    if not text:
        return {"score": 0.0, "reasons": [], "upi_ids": [], "unknown_psps": []}

    normalised = " ".join(text.split())
    upi_ids = extract_upi_ids(normalised)
    reasons: list[dict] = []
    score = 0.0

    def add(reason: str, weight: float, severity: str) -> None:
        nonlocal score
        score += weight
        reasons.append(
            {"reason": reason, "severity": severity, "weight": weight, "engine": "upi"}
        )

    wants_to_receive = _hit(RECEIVE_INTENT, normalised)
    asks_pin = _hit(PIN_TO_RECEIVE, normalised)
    is_collect = _hit(COLLECT_LANGUAGE, normalised)

    if asks_pin and wants_to_receive:
        add(
            "You are being told to enter your UPI PIN in order to receive money. "
            "Receiving money on UPI never needs a PIN - entering it will send your money out.",
            30,
            "high",
        )
    elif asks_pin:
        add(
            "The message asks you to enter your UPI PIN. Only enter your PIN when you "
            "yourself are paying someone you know.",
            18,
            "high",
        )

    if is_collect:
        add(
            "This is a collect request, which means approving it takes money out of your "
            "account. A genuine refund arrives on its own without any approval.",
            22,
            "high",
        )

    if _hit(QR_RECEIVE, normalised):
        add(
            "You are asked to scan a QR code to get money. Scanning a QR code only ever "
            "pays money out.",
            22,
            "high",
        )

    if _hit(REFUND_BAIT, normalised):
        add(
            "A refund or cashback is being dangled to get you to approve a payment. This is "
            "the most common UPI trick reported in India.",
            14,
            "medium",
        )

    if _hit(TRUST_TEST, normalised):
        add(
            "A tiny 1 or 2 rupee 'verification' payment is being requested to build trust "
            "before a much larger request follows.",
            12,
            "medium",
        )

    unknown_psps: list[str] = []
    for handle in upi_ids:
        psp = handle.split("@")[-1].lower()
        if psp not in KNOWN_PSPS:
            unknown_psps.append(handle)
    if unknown_psps:
        add(
            "The payment address "
            + ", ".join(unknown_psps[:2])
            + " does not use a recognised bank or wallet suffix, so it may not be a real "
            "UPI ID at all.",
            10,
            "medium",
        )

    # Payee identity mismatch: the text claims an institution but the money goes
    # to what is really a personal handle.
    lowered = normalised.lower()
    for keyword, label in CLAIMED_INSTITUTIONS:
        if keyword in lowered and upi_ids:
            add(
                f"The message claims to be from {label}, but the money would go to a "
                f"personal UPI address ({upi_ids[0]}). Government bodies and banks never "
                "collect money through personal UPI IDs.",
                16,
                "high",
            )
            break

    return {
        "score": min(score, 45.0),
        "reasons": reasons[:6],
        "upi_ids": upi_ids,
        "unknown_psps": unknown_psps,
    }
