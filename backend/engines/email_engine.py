"""Email header and sender analysis.

Users paste emails in two shapes: a full copy with headers, or just the body.
Both are supported - when no headers are present the engine simply contributes
nothing and the text/URL engines carry the analysis.
"""

from __future__ import annotations

import re

from engines.url_engine import BRANDS, OFFICIAL_DOMAINS, registrable_domain

HEADER_RE = {
    "from": re.compile(r"^\s*from\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE),
    "reply_to": re.compile(r"^\s*reply[- ]?to\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE),
    "return_path": re.compile(r"^\s*return[- ]?path\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE),
    "subject": re.compile(r"^\s*subject\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE),
    "to": re.compile(r"^\s*to\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE),
}

ADDRESS_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

FREE_MAIL = {
    "gmail.com", "yahoo.com", "yahoo.co.in", "outlook.com", "hotmail.com",
    "rediffmail.com", "protonmail.com", "mail.com", "yandex.com", "aol.com",
    "zoho.com", "gmx.com", "inbox.lv", "126.com", "163.com", "qq.com",
}

CORPORATE_CLAIMS = [
    "bank", "rbi", "income tax", "customs", "government", "support team",
    "customer care", "helpdesk", "security team", "billing", "no-reply",
]


def _parse_address(raw: str) -> tuple[str, str]:
    """Split 'Display Name <user@host>' into (display_name, address)."""
    raw = raw.strip()
    address_match = ADDRESS_RE.search(raw)
    address = address_match.group(0).lower() if address_match else ""
    display = re.sub(r"<[^>]*>", "", raw)
    display = display.strip().strip('"').strip("'").strip()
    if display == address:
        display = ""
    return display, address


def parse_headers(text: str) -> dict:
    headers: dict[str, str] = {}
    for key, pattern in HEADER_RE.items():
        match = pattern.search(text or "")
        if match:
            headers[key] = match.group(1).strip()
    return headers


def _domain_of(address: str) -> str:
    return address.split("@")[-1].lower() if "@" in address else ""


def analyze(text: str) -> dict:
    """Score sender trust signals. Returns score (0-45), reasons and headers."""
    headers = parse_headers(text or "")
    reasons: list[dict] = []
    score = 0.0

    def add(reason: str, weight: float, severity: str) -> None:
        nonlocal score
        score += weight
        reasons.append(
            {"reason": reason, "severity": severity, "weight": weight, "engine": "email"}
        )

    if "from" not in headers:
        return {"score": 0.0, "reasons": [], "headers": headers, "has_headers": False}

    display, from_address = _parse_address(headers["from"])
    from_domain = _domain_of(from_address)
    from_registrable = registrable_domain(from_domain) if from_domain else ""

    if not from_address:
        add(
            "The sender line does not contain a real email address, which a genuine "
            "company email always has.",
            12,
            "medium",
        )

    # 1. Display name claims a brand the sending domain does not own.
    display_lower = display.lower()
    claimed_brand = next((b for b in BRANDS if b in display_lower), None)
    if claimed_brand and from_registrable:
        core = from_registrable.split(".")[0]
        if claimed_brand not in from_registrable and core != claimed_brand:
            add(
                f"The sender's name says '{display}' but the email actually comes from "
                f"{from_registrable}, which does not belong to that company.",
                24,
                "high",
            )

    # 2. Free webmail pretending to be an institution.
    if from_domain in FREE_MAIL and (
        claimed_brand or any(c in display_lower for c in CORPORATE_CLAIMS)
    ):
        add(
            f"The email was sent from a free personal mailbox ({from_domain}). Banks and "
            "government departments never write from Gmail or Yahoo addresses.",
            20,
            "high",
        )

    # 3. Reply-To points somewhere else - replies leave the impersonated company.
    if "reply_to" in headers:
        _, reply_address = _parse_address(headers["reply_to"])
        reply_domain = registrable_domain(_domain_of(reply_address))
        if reply_address and reply_domain and reply_domain != from_registrable:
            add(
                f"If you reply, your message goes to {reply_address} instead of the sender "
                "shown at the top. That redirect is a hallmark of a spoofed email.",
                18,
                "high",
            )

    # 4. Return-Path mismatch (weaker than Reply-To, still meaningful).
    if "return_path" in headers:
        _, return_address = _parse_address(headers["return_path"])
        return_domain = registrable_domain(_domain_of(return_address))
        if return_address and return_domain and return_domain != from_registrable:
            add(
                "The technical delivery address of this email does not match the sender "
                "shown to you, which means the sender name was forged.",
                12,
                "medium",
            )

    # 5. Lookalike sending domain: contains a brand but is not the official domain.
    if from_registrable and from_registrable not in OFFICIAL_DOMAINS:
        core = from_registrable.split(".")[0]
        brand_in_domain = next((b for b in BRANDS if b in core), None)
        if brand_in_domain and core != brand_in_domain:
            add(
                f"The sending address {from_registrable} imitates a well-known company name "
                "with extra words added. The real company uses a plain address.",
                20,
                "high",
            )

    subject = headers.get("subject", "")
    if subject and re.search(
        r"\b(urgent|immediate|action required|suspend|blocked|verify|final notice|last warning)\b",
        subject,
        re.IGNORECASE,
    ):
        add(
            "The subject line is written to alarm you into acting immediately.",
            8,
            "medium",
        )

    if from_registrable in OFFICIAL_DOMAINS and not reasons:
        reasons.append(
            {
                "reason": f"The email genuinely comes from {from_registrable}, the company's official domain.",
                "severity": "low",
                "weight": 0,
                "engine": "email",
            }
        )

    return {
        "score": min(score, 45.0),
        "reasons": reasons[:5],
        "headers": headers,
        "has_headers": True,
        "from_domain": from_registrable,
    }
