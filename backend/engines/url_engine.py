"""Phishing-link heuristics.

Everything is computed from the URL string itself - no DNS, no WHOIS, no
reputation API - so the whole tool keeps working offline on a judge's laptop.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

URL_RE = re.compile(
    r"\b(?:https?://|www\.)[^\s<>\"'\)\]]+",
    re.IGNORECASE,
)

SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc", "bl.ink",
    "short.link", "urlz.fr", "clck.ru", "surl.li",
}

SUSPICIOUS_TLDS = {
    "info", "xyz", "top", "click", "loan", "tk", "ml", "ga", "cf", "gq",
    "work", "buzz", "rest", "monster", "cam", "quest", "sbs", "cfd", "icu",
    "online", "site", "website", "live", "fit", "mom", "lol",
}

# Registrable-domain suffixes that are two labels long.
MULTI_LABEL_SUFFIXES = {
    "co.in", "net.in", "org.in", "gov.in", "ac.in", "res.in", "edu.in", "firm.in",
    "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "co.nz", "com.sg",
    "co.jp", "com.br", "org.br", "co.za", "com.my", "co.id",
}

# Brands that scammers impersonate most often in Indian phishing.
BRANDS = [
    "sbi", "yono", "hdfc", "icici", "axis", "kotak", "pnb", "bob", "canara",
    "paytm", "phonepe", "gpay", "googlepay", "bhim", "npci", "upi", "rbi",
    "amazon", "flipkart", "myntra", "irctc", "indiapost", "dhl", "fedex",
    "netflix", "instagram", "facebook", "whatsapp", "microsoft", "apple",
    "aadhaar", "uidai", "incometax", "epfo", "trai",
]

OFFICIAL_DOMAINS = {
    "onlinesbi.sbi", "sbi.co.in", "yonosbi.com", "hdfcbank.com", "icicibank.com",
    "axisbank.com", "kotak.com", "pnbindia.in", "bankofbaroda.in", "canarabank.com",
    "paytm.com", "phonepe.com", "google.com", "pay.google.com", "npci.org.in",
    "bhimupi.org.in", "rbi.org.in", "amazon.in", "amazon.com", "flipkart.com",
    "myntra.com", "irctc.co.in", "indiapost.gov.in", "dhl.com", "fedex.com",
    "netflix.com", "instagram.com", "facebook.com", "whatsapp.com",
    "microsoft.com", "apple.com", "uidai.gov.in", "incometax.gov.in",
    "epfindia.gov.in", "trai.gov.in", "cybercrime.gov.in", "gov.in", "nic.in",
    "swiggy.com", "zomato.com", "zoom.us", "linkedin.com", "github.com",
}

CREDENTIAL_PATH_WORDS = [
    "login", "signin", "verify", "verification", "kyc", "update", "secure",
    "account", "netbanking", "otp", "confirm", "reactivate", "unblock",
    "password", "auth", "billing", "payment", "refund", "claim", "wallet",
]

IPV4_RE = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
HOMOGLYPH_HINTS = re.compile(r"(?:[0-9]{1,2}(?=[a-z])|rn(?=[a-z])|vv)", re.IGNORECASE)


def extract_urls(text: str) -> list[str]:
    """Pull URLs out of free text, de-duplicated, trailing punctuation trimmed."""
    found: list[str] = []
    for match in URL_RE.finditer(text or ""):
        url = match.group(0).rstrip(".,;:!?'\"")
        if url.lower().startswith("www."):
            url = "http://" + url
        if url not in found:
            found.append(url)
    return found[:15]


def registrable_domain(host: str) -> str:
    host = host.lower().strip(".")
    parts = host.split(".")
    if len(parts) <= 2:
        return host
    last_two = ".".join(parts[-2:])
    if last_two in MULTI_LABEL_SUFFIXES and len(parts) >= 3:
        return ".".join(parts[-3:])
    return last_two


def extract_domains(text: str) -> list[str]:
    domains: list[str] = []
    for url in extract_urls(text):
        host = urlparse(url).hostname or ""
        if host and not IPV4_RE.match(host):
            domain = registrable_domain(host)
            if domain and domain not in domains:
                domains.append(domain)
    return domains


def _brand_in(value: str) -> str | None:
    lowered = value.lower()
    for brand in BRANDS:
        if brand in lowered:
            return brand
    return None


def analyze_url(url: str) -> dict:
    """Score one URL. Returns score (0-45), reasons, and parsed detail."""
    reasons: list[dict] = []
    score = 0.0

    parsed = urlparse(url if "://" in url else "http://" + url)
    host = (parsed.hostname or "").lower()
    path = (parsed.path or "") + ("?" + parsed.query if parsed.query else "")

    if not host:
        return {
            "url": url,
            "host": "",
            "domain": "",
            "score": 0.0,
            "reasons": [],
            "official": False,
        }

    domain = "" if IPV4_RE.match(host) else registrable_domain(host)
    official = domain in OFFICIAL_DOMAINS

    def add(reason: str, weight: float, severity: str) -> None:
        nonlocal score
        score += weight
        reasons.append(
            {"reason": reason, "severity": severity, "weight": weight, "engine": "url"}
        )

    if official:
        return {
            "url": url,
            "host": host,
            "domain": domain,
            "score": 0.0,
            "official": True,
            "reasons": [
                {
                    "reason": f"The link goes to {domain}, which is the genuine official website.",
                    "severity": "low",
                    "weight": 0,
                    "engine": "url",
                }
            ],
        }

    if IPV4_RE.match(host):
        add(
            "The link points to a bare numeric address instead of a company name. "
            "Real banks and shops never send links that look like this.",
            20,
            "high",
        )

    if domain in SHORTENERS or host in SHORTENERS:
        add(
            "The link is hidden behind a URL shortener, so you cannot see where it "
            "actually takes you until it is too late.",
            15,
            "high",
        )

    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    if tld in SUSPICIOUS_TLDS:
        add(
            f"The web address ends in .{tld}, an extension cheaply used for "
            "short-lived fake websites.",
            14,
            "medium",
        )

    brand = _brand_in(host) or _brand_in(path)
    if brand:
        core = domain.split(".")[0] if domain else ""
        # A brand name that appears anywhere except the real registrable domain
        # is the single strongest lookalike signal.
        if core != brand and not core.endswith(brand) and not official:
            add(
                f"The address uses the name '{brand}' but the real website it belongs to "
                f"is '{domain or host}', which is not owned by that company.",
                22,
                "high",
            )

    if host.startswith("xn--") or ".xn--" in host:
        add(
            "The address uses look-alike foreign characters that imitate a real "
            "company name.",
            18,
            "high",
        )
    elif brand and HOMOGLYPH_HINTS.search(host.split(".")[0]):
        add(
            "The address swaps letters for look-alike characters to imitate a real "
            "company name.",
            12,
            "medium",
        )

    labels = host.split(".")
    if len(labels) >= 5:
        add(
            "The address is padded with many extra sub-parts to push the real website "
            "name out of view on a phone screen.",
            9,
            "medium",
        )

    if host.count("-") >= 2:
        add(
            "The website name is stitched together with several hyphens, a common trick "
            "in fake bank pages.",
            7,
            "medium",
        )

    hits = [word for word in CREDENTIAL_PATH_WORDS if word in path.lower()]
    if hits:
        add(
            "The link leads straight to a page asking you to log in or verify details, "
            f"which is where your credentials get stolen (page mentions: {', '.join(hits[:3])}).",
            11,
            "medium",
        )

    if parsed.scheme != "https":
        add(
            "The link is not a secure (https) address, so anything you type into it "
            "travels unprotected.",
            6,
            "low",
        )

    if len(url) > 90:
        add(
            "The link is unusually long, which is used to hide the real destination.",
            5,
            "low",
        )

    return {
        "url": url,
        "host": host,
        "domain": domain,
        "score": min(score, 45.0),
        "official": False,
        "reasons": reasons,
    }


def analyze(text: str) -> dict:
    """Analyse every URL in the text. Returns the worst score and merged reasons."""
    urls = extract_urls(text)
    if not urls:
        return {"score": 0.0, "reasons": [], "urls": [], "details": []}

    details = [analyze_url(u) for u in urls]
    worst = max(details, key=lambda d: d["score"])

    reasons: list[dict] = []
    seen: set[str] = set()
    for detail in sorted(details, key=lambda d: d["score"], reverse=True):
        for reason in detail["reasons"]:
            if reason["reason"] not in seen:
                seen.add(reason["reason"])
                reasons.append(reason)

    # Additional links beyond the worst one add a little, but never stack wildly.
    extra = min(sum(d["score"] for d in details) - worst["score"], 10.0)
    total = min(worst["score"] + max(extra, 0.0), 45.0)

    return {
        "score": total,
        "reasons": reasons[:6],
        "urls": urls,
        "details": details,
    }
