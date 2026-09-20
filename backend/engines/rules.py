"""Weighted, explainable red-flag rules.

Every rule returns a plain-language reason a non-technical person can read. No
jargon, no rule ids, no regex fragments ever reach the user interface.

Two design decisions matter here:

1. Rules carry *weights*, not booleans. A single urgency phrase is weak evidence;
   urgency plus an authority claim plus a credential request is not.
2. The credential rule is negation-aware. A genuine bank SMS ("your OTP is
   738291, do not share it with anyone") contains the word OTP and the word
   share, and a naive keyword matcher flags it. We mask negated verb phrases
   before looking for an actual request, so real OTP alerts stay Safe.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class RuleHit:
    rule_id: str
    reason: str
    weight: float
    severity: str
    engine: str = "rules"
    matched: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "reason": self.reason,
            "severity": self.severity,
            "weight": round(self.weight, 1),
            "engine": self.engine,
        }


# --------------------------------------------------------------------- patterns
def _any(*alternatives: str) -> str:
    return "(?:" + "|".join(alternatives) + ")"


URGENCY = [
    r"\bwithin \d+\s*(?:hour|hours|hrs|minute|minutes|min|day|days)\b",
    r"\b(?:immediately|urgent(?:ly)?|right now|at once|asap|last warning|final (?:reminder|warning|notice))\b",
    r"\b(?:will be|hoga|ho jayega)\s+(?:blocked|suspended|deactivated|closed|frozen|freeze)\b",
    r"\b(?:account|khata|card|wallet|sim)\s+(?:will be\s+)?(?:blocked|band|suspended|deactivated|frozen)\b",
    r"\b(?:before|by)\s+(?:midnight|tonight|today|aaj)\b",
    r"\b(?:turant|jaldi karein|jaldi karo|abhi|foran|band ho jayega|block ho jayega)\b",
    r"\b(?:expires?|expiring)\s+(?:today|in \d+|soon)\b",
    r"\bonly (?:today|for today|valid till today)\b",
]

AUTHORITY = [
    r"\b(?:cbi|c\.b\.i|enforcement directorate|\bed\b officer|narcotics control bureau|ncb)\b",
    r"\b(?:cyber ?(?:cell|crime|police)|crime branch|police (?:station|department|officer)|inspector|sub[- ]inspector)\b",
    r"\b(?:rbi|reserve bank of india|trai|income tax department|it department|customs (?:department|officer)|gst department)\b",
    r"\b(?:we are|this is|calling) (?:from|the) (?:the )?(?:bank|police|cbi|rbi|customs|income tax)\b",
    r"\b(?:government|govt|official) (?:notice|order|warrant|summons)\b",
    r"\b(?:arrest warrant|non[- ]bailable|fir (?:has been )?(?:registered|filed)|legal action|court (?:notice|summons))\b",
    r"\bmain (?:bank|police|cbi) se (?:bol|baat) raha hoon\b",
]

CREDENTIAL_ASK = [
    r"\b(?:share|send|tell|give|provide|forward|reply with|resend|read out|confirm|type)\b[^.!?\n]{0,45}?\b(?:otp|o\.t\.p|one[- ]time password|pin|upi pin|mpin|cvv|card number|expiry date|password|passcode|net ?banking (?:id|password)|user ?id)\b",
    r"\b(?:otp|pin|cvv|password|card number)\b[^.!?\n]{0,45}?\b(?:share|send|tell|bata(?:iye|yein|na|do)?|bhej(?:o|ein|iye)|batao|de dijiye|provide|forward|reply)\b",
    r"\benter your (?:upi )?pin\b",
    r"\b(?:otp|pin)\s+(?:kya|kitna) (?:hai|aaya)\b",
    r"\bhumein (?:otp|pin|password) (?:batayein|bata dijiye|de dijiye)\b",
]

# Phrases that mean "we will never ask" - masked out before the ask patterns run.
NEGATED_SHARE = re.compile(
    r"\b(?:do not|don't|dont|never|do never|kabhi (?:bhi )?(?:na|nahi)|mat|na)\s+"
    r"(?:ever\s+)?(?:share|shares|sharing|disclose|reveal|tell|give|ask(?:s|ed|ing)?|"
    r"batana|bataiye|batayein|batao|dena|dijiye)\b",
    re.IGNORECASE,
)

PERSONAL_INFO = [
    r"\b(?:share|send|provide|upload|photo of|picture of)\b[^.!?\n]{0,40}\b(?:aadhaar|aadhar|pan card|pan number|debit card|credit card|passbook|cheque)\b",
    r"\b(?:aadhaar|aadhar|pan)\s+(?:number|card)\b[^.!?\n]{0,30}\b(?:send|share|batayein|bhejein|reply)\b",
    r"\bcard (?:front and back|dono side)\b",
]

MONEY_LURE = [
    r"\b(?:you (?:have )?won|winner|lucky (?:draw|winner|number)|jeeta hai|inaam|prize money|lottery)\b",
    r"\b(?:guaranteed|assured|100%|sure[- ]shot)\s+(?:return|returns|profit|income|earning)\b",
    r"\b(?:double|triple|2x|3x|5x|10x)\s+(?:your )?(?:money|paisa|investment|amount)\b",
    r"\bpaisa double\b",
    r"\b(?:earn|kamayein|kamao|income of)\s+(?:rs\.?\s*)?[\d,]+\s*(?:per day|daily|roz|a day|per week|weekly|/day)\b",
    r"\b(?:work from home|ghar baithe|part[- ]time job)\b[^.!?\n]{0,60}\b(?:earn|salary|income|kamay|rs\.?\s*\d)",
    r"\b(?:free gift|free recharge|cashback of rs|reward points? (?:are )?expiring)\b",
    r"\bno (?:risk|loss)\b[^.!?\n]{0,30}\b(?:profit|return|guaranteed)\b",
]

ADVANCE_FEE = [
    r"\b(?:pay|send|deposit|transfer|bhej(?:ein|o|iye)|jama kar)\b[^.!?\n]{0,60}\b(?:processing fee|registration fee|security deposit|clearance fee|customs (?:duty|fee|charge)|gst|rto charge|file charge|insurance charge|convenience fee|handling charge|refundable)\b",
    r"\b(?:processing|registration|clearance|activation|verification|membership)\s+(?:fee|charge|charges|amount)\b[^.!?\n]{0,50}\b(?:pay|send|deposit|transfer)\b",
    r"\bto (?:claim|receive|release|withdraw|unlock)\b[^.!?\n]{0,50}\b(?:pay|deposit|send|transfer|first recharge)\b",
    r"\bfirst (?:recharge|deposit|pay)\b[^.!?\n]{0,40}\b(?:to withdraw|upgrade|vip)\b",
]

SECRECY = [
    r"\b(?:do not|don't|dont|never)\s+(?:tell|inform|disclose to)\b[^.!?\n]{0,40}\b(?:anyone|anybody|family|police|bank|husband|wife|son|daughter)\b",
    r"\bkisi ko (?:mat|na|nahi)\s*(?:batana|bataiye|batayein|bolna)\b",
    r"\b(?:do not|don't|dont)\s+(?:disconnect|cut|end|hang up)\b",
    r"\b(?:stay|remain) on (?:the|this) (?:call|line)\b",
    r"\bcall (?:mat kato|mat kaatna|disconnect mat)\b",
    r"\b(?:keep (?:this|it) (?:confidential|secret)|strictly confidential|between us only)\b",
    r"\bsirf (?:mujhe|aap hi)\b[^.!?\n]{0,30}\b(?:batayein|bata|bolna)\b",
]

REMOTE_ACCESS = [
    r"\b(?:anydesk|teamviewer|quick ?support|airdroid|screen ?share|remote access|remote control)\b",
    r"\b(?:install|download)\b[^.!?\n]{0,40}\b(?:apk|our app|this app|the app)\b[^.!?\n]{0,40}\b(?:allow|permission|access)\b",
    r"\ballow (?:contacts|gallery|sms|camera|storage) (?:access|permission)\b",
]

APP_SIDELOAD = [
    r"\b(?:download|install)\s+(?:the\s+|our\s+|this\s+)?(?:app|apk|application)\b",
    r"\.apk\b",
    r"\bapp download kar\w*\b",
]

QR_SCAN = [
    r"\bscan (?:this|the|my)? ?(?:qr|qr code|barcode)\b[^.!?\n]{0,60}\b(?:receive|get|credit|refund|money|paisa|amount)\b",
    r"\bqr (?:code )?scan kar\w*\b[^.!?\n]{0,50}\b(?:paisa|paise|amount|receive)\b",
]

JOB_UNSOLICITED = [
    r"\b(?:hiring|vacancy|job opening|urgent hiring|we are hiring)\b[^.!?\n]{0,80}\b(?:whatsapp|telegram|join|contact)\b",
    r"\b(?:i am|this is)\s+hr\b",
    r"\b(?:resume|cv) (?:is |has been )?shortlisted\b",
    r"\b(?:task|prepaid task|rating task|like task)\b[^.!?\n]{0,50}\b(?:earn|commission|reward|paisa)\b",
    r"\bjoin (?:our|the) (?:telegram|whatsapp) (?:group|channel)\b",
]

INVESTMENT_PRESSURE = [
    r"\b(?:limited (?:slots|seats|offer)|only \d+ (?:slots|seats) left|hurry|last chance)\b",
    r"\b(?:vip|premium|pro)\s*(?:group|plan|level|\d)\b[^.!?\n]{0,40}\b(?:upgrade|recharge|deposit|join)\b",
    r"\b(?:trading bot|crypto plan|forex plan|ipo pre[- ]listing|pre[- ]ipo)\b",
]

THREAT_HARM = [
    r"\b(?:we will|hum)\s+(?:call|share|send|post)\b[^.!?\n]{0,50}\b(?:your contacts|all your contacts|your photo|photos|family)\b",
    r"\b(?:legal action|police case|arrest|jail|court)\b[^.!?\n]{0,50}\b(?:if you (?:do not|don't)|unless you|warna|otherwise)\b",
    r"\b(?:warna|otherwise|else)\b[^.!?\n]{0,40}\b(?:arrest|jail|case|block|freeze)\b",
    r"\bunder digital arrest\b",
]

VERIFICATION_ACCOUNT = [
    r"\b(?:safe|secure|verification|government|rbi)\s+account\b",
    r"\btransfer\b[^.!?\n]{0,60}\b(?:for verification|for audit|to verify|verification purpose)\b",
    r"\bmoney will be (?:returned|refunded)\b[^.!?\n]{0,40}\b(?:within|after)\b",
]

CHARITY_PRESSURE = [
    r"\b(?:donate|donation|daan)\b[^.!?\n]{0,60}\b(?:upi|@|forward to|share with|groups)\b",
    r"\bforward (?:this )?to \d+ (?:groups|people|contacts)\b",
]

ROMANCE_GIFT = [
    r"\b(?:gift|parcel|inheritance|package)\b[^.!?\n]{0,60}\b(?:customs|custom charge|clearance|duty)\b[^.!?\n]{0,40}\b(?:pay|fee|charge|bhar)\b",
    r"\b(?:i am|main)\b[^.!?\n]{0,40}\b(?:nri|army|soldier|doctor|engineer)\b[^.!?\n]{0,80}\b(?:send|transfer|pay|bhej)\b",
    r"\bstuck at (?:the )?(?:airport|customs)\b",
]

TECH_SCARE = [
    r"\b(?:your (?:computer|pc|laptop|phone|device|router))\b[^.!?\n]{0,50}\b(?:infected|virus|hacked|compromised|malware)\b",
    r"\b(?:microsoft|windows|apple)\b[^.!?\n]{0,50}\b(?:alert|licence|license|expired|support team)\b",
    r"\bhack ho gaya hai\b",
]

LOAN_PUSH = [
    r"\b(?:instant|pre[- ]approved|quick|emergency)\s+loan\b",
    r"\b(?:no|bina|zero)\s+(?:documents?|document|cibil|paperwork)\b[^.!?\n]{0,40}\bloan\b",
    r"\bloan\b[^.!?\n]{0,40}\b(?:no|bina)\s+(?:documents?|cibil)\b",
]

GENERIC_GREETING = [
    r"\bdear (?:customer|user|sir/madam|account holder)\b",
]

HINGLISH_RISK = [
    r"\b(?:paisa|paise|rupaye|rupay)\b[^.!?\n]{0,30}\b(?:bhej|dijiye|transfer|jama)\b",
    r"\b(?:khata|account)\s+band\b",
    r"\bturant\b",
    r"\binaam\b",
    r"\bjaldi kar\w*\b",
]


# rule_id, patterns, reason, weight, severity, channels (None = all)
RULE_TABLE: list[tuple[str, list[str], str, float, str, tuple[str, ...] | None]] = [
    (
        "credential_request",
        CREDENTIAL_ASK,
        "Someone is asking you for a secret code (OTP, PIN, CVV or password). No real bank, wallet or company will ever ask for these.",
        30,
        "high",
        None,
    ),
    (
        "authority_impersonation",
        AUTHORITY,
        "The message claims to be from the police, CBI, RBI, customs or the income tax department. Real agencies do not contact people this way or demand money over a call.",
        20,
        "high",
        None,
    ),
    (
        "digital_arrest_threat",
        THREAT_HARM,
        "You are being threatened with arrest, a police case or public embarrassment to make you act quickly. Threats like this are a pressure tactic, not a real legal process.",
        20,
        "high",
        None,
    ),
    (
        "verification_account",
        VERIFICATION_ACCOUNT,
        "You are being asked to move money to a so-called safe, RBI or verification account. No such account exists. Money sent there is gone.",
        24,
        "high",
        None,
    ),
    (
        "secrecy_pressure",
        SECRECY,
        "You are being told to keep this secret, not tell your family, or stay on the call. Scammers isolate people so no one can warn them.",
        18,
        "high",
        None,
    ),
    (
        "advance_fee",
        ADVANCE_FEE,
        "You are asked to pay a fee first in order to receive a bigger amount. Genuine prizes, refunds, jobs and loans never require an advance payment.",
        24,
        "high",
        None,
    ),
    (
        "money_lure",
        MONEY_LURE,
        "The message promises winnings, guaranteed returns or unusually high earnings. Offers like this are used to get your attention before asking for money.",
        18,
        "high",
        None,
    ),
    (
        "personal_info_request",
        PERSONAL_INFO,
        "You are asked to send your Aadhaar, PAN or card details or photos of them. These are enough for someone to impersonate you.",
        18,
        "high",
        None,
    ),
    (
        "urgency_pressure",
        URGENCY,
        "The message creates panic with a deadline, such as an account being blocked within hours. Urgency is used so you act before you think.",
        12,
        "medium",
        None,
    ),
    (
        "remote_access",
        REMOTE_ACCESS,
        "You are being asked to install a screen-sharing or remote-control app. That hands over full control of your phone or computer.",
        22,
        "high",
        None,
    ),
    (
        "qr_to_receive",
        QR_SCAN,
        "You are told to scan a QR code to receive money. Scanning a QR code and entering your PIN always sends money out, never brings it in.",
        22,
        "high",
        None,
    ),
    (
        "job_bait",
        JOB_UNSOLICITED,
        "This is an unsolicited job or task offer that moves the conversation to WhatsApp or Telegram. Real employers do not hire this way.",
        14,
        "medium",
        None,
    ),
    (
        "investment_pressure",
        INVESTMENT_PRESSURE,
        "The offer uses scarcity or a paid VIP upgrade to push you into investing quickly.",
        14,
        "medium",
        None,
    ),
    (
        "loan_push",
        LOAN_PUSH,
        "An instant loan with no documents or credit check is being offered. These apps typically charge hidden fees and harvest your contacts.",
        14,
        "medium",
        None,
    ),
    (
        "tech_scare",
        TECH_SCARE,
        "The message claims your device is infected or hacked to frighten you into calling a number or installing software.",
        16,
        "high",
        None,
    ),
    (
        "romance_gift",
        ROMANCE_GIFT,
        "Someone you met online says a gift, parcel or inheritance is stuck and needs a fee. This is a classic romance and gift-parcel scam.",
        20,
        "high",
        None,
    ),
    (
        "charity_pressure",
        CHARITY_PRESSURE,
        "An emotional donation appeal asks you to pay a personal UPI ID or forward the message. Registered charities do not collect this way.",
        14,
        "medium",
        None,
    ),
    (
        "app_sideload",
        APP_SIDELOAD,
        "You are asked to download and install an app from a link instead of the official Play Store or App Store.",
        10,
        "medium",
        None,
    ),
    (
        "generic_greeting",
        GENERIC_GREETING,
        "The message greets you as 'Dear Customer' instead of using your name. Your own bank knows your name.",
        6,
        "low",
        None,
    ),
    (
        "hinglish_pressure",
        HINGLISH_RISK,
        "The message uses common Hinglish scam phrasing about money, a blocked account or hurrying up.",
        8,
        "medium",
        None,
    ),
]


def mask_negations(text: str) -> str:
    """Blank out 'do not share' / 'never asks' style phrases.

    Keeps the sentence length stable (spaces instead of deletion) so the
    proximity windows in the ask patterns still behave sensibly.
    """
    return NEGATED_SHARE.sub(lambda m: " " * len(m.group(0)), text)


def _first_match(patterns: list[str], text: str) -> str | None:
    for pattern in patterns:
        found = re.search(pattern, text, re.IGNORECASE)
        if found:
            return found.group(0).strip()
    return None


def evaluate(text: str, channel: str = "message") -> list[RuleHit]:
    """Run every rule over the text and return the hits, strongest first."""
    if not text or not text.strip():
        return []

    normalised = " ".join(text.split())
    masked = mask_negations(normalised)

    hits: list[RuleHit] = []
    for rule_id, patterns, reason, weight, severity, channels in RULE_TABLE:
        if channels and channel not in channels:
            continue
        # The credential rule is the only one that must ignore negated phrasing.
        haystack = masked if rule_id == "credential_request" else normalised
        match = _first_match(patterns, haystack)
        if match:
            hits.append(
                RuleHit(
                    rule_id=rule_id,
                    reason=reason,
                    weight=weight,
                    severity=severity,
                    matched=[match[:80]],
                )
            )

    # A link on its own is weak, but a link next to a pressure or credential
    # rule is a meaningful escalation, so it is scored contextually.
    if re.search(r"https?://|\bwww\.", normalised, re.IGNORECASE):
        strong = any(h.severity == "high" for h in hits)
        hits.append(
            RuleHit(
                rule_id="link_present",
                reason=(
                    "The message contains a link and also pressures you to act. Opening it "
                    "is how most bank-detail thefts start."
                    if strong
                    else "The message contains a link. Check the address carefully before opening it."
                ),
                weight=10 if strong else 5,
                severity="medium" if strong else "low",
            )
        )

    hits.sort(key=lambda h: h.weight, reverse=True)
    return hits


# ------------------------------------------------------------------- extraction
PHONE_RE = re.compile(r"(?:(?:\+91|91)[\-\s]?)?[6-9]\d{9}\b|\b1800[\-\s]?\d{3}[\-\s]?\d{3,4}\b")
AMOUNT_RE = re.compile(
    r"(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:lakh|lakhs|crore|crores|cr|k))?"
    r"|\b[\d,]+\s*(?:lakh|lakhs|crore|crores)\b",
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")


def extract_phones(text: str) -> list[str]:
    seen: list[str] = []
    for match in PHONE_RE.finditer(text or ""):
        value = re.sub(r"[\s\-]", "", match.group(0))
        if value not in seen:
            seen.append(value)
    return seen[:10]


def extract_amounts(text: str) -> list[str]:
    seen: list[str] = []
    for match in AMOUNT_RE.finditer(text or ""):
        value = " ".join(match.group(0).split())
        if value not in seen:
            seen.append(value)
    return seen[:10]


def extract_emails(text: str) -> list[str]:
    """Email addresses, excluding UPI-style handles (which have no dot in the host)."""
    seen: list[str] = []
    for match in EMAIL_RE.finditer(text or ""):
        value = match.group(0)
        if value.lower() not in [s.lower() for s in seen]:
            seen.append(value)
    return seen[:10]
