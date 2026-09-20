"""Vishing and digital-arrest script detection for call transcripts.

Phone scams follow a script, and the script is the signal. A caller who claims to
be an agency, forbids you from hanging up, forbids you from telling your family
and then asks for a transfer is running the digital-arrest playbook - the scam
that accounts for roughly 8% of reported fraud losses in India.
"""

from __future__ import annotations

import re

DIGITAL_ARREST = [
    r"\bdigital arrest\b",
    r"\byou are under (?:arrest|investigation|surveillance)\b",
    r"\barrest (?:warrant|team)\b",
    r"\b(?:non[- ]bailable|money laundering|terror funding|narcotics|drugs|mdma)\b[^.!?\n]{0,60}\b(?:case|parcel|your name|aadhaar)\b",
    r"\b(?:parcel|courier|package)\b[^.!?\n]{0,60}\b(?:your name|aadhaar)\b[^.!?\n]{0,60}\b(?:illegal|drugs|narcotics|passport|prohibited)\b",
    r"\bcase (?:register|registered|file|filed) (?:ho gaya|against you)\b",
]

DO_NOT_DISCONNECT = [
    r"\b(?:do not|don't|dont|never)\s+(?:disconnect|cut|hang up|end the call|switch off)\b",
    r"\b(?:stay|remain|be)\s+on (?:the|this) (?:call|line)\b",
    r"\bcall (?:mat|na) (?:kato|katna|kaatna|karo)\b",
    r"\bphone (?:mat|na) rakhna\b",
    r"\b(?:camera|video) (?:on|chalu) (?:rakh|rakhein|rakhiye|karein)\b",
    r"\bskype\b[^.!?\n]{0,40}\b(?:verification|call|join|video)\b",
    r"\b(?:24|twenty[- ]four) (?:hours|ghante)\b[^.!?\n]{0,40}\b(?:camera|watch|monitor|saamne)\b",
]

SAFE_ACCOUNT_DEMAND = [
    r"\b(?:transfer|deposit|move|send)\b[^.!?\n]{0,60}\b(?:safe|secure|verification|government|rbi|escrow)\s+account\b",
    r"\b(?:safe|verification|rbi)\s+account\b[^.!?\n]{0,50}\b(?:transfer|deposit|send)\b",
    r"\bto (?:prove|verify|check)\b[^.!?\n]{0,50}\b(?:money|funds|account) (?:is|are) (?:clean|legal|legitimate)\b",
    r"\b(?:entire|full|whole)\s+(?:bank )?balance\b",
    r"\bpaisa (?:wapas|return) (?:kar denge|ho jayega|mil jayega)\b",
]

IDENTITY_PROBE = [
    r"\b(?:confirm|verify|tell me|batayein|bataiye)\b[^.!?\n]{0,40}\b(?:aadhaar|aadhar|pan|date of birth|account number|mother's name)\b",
    r"\b(?:last|first) (?:four|4|six|6) digits\b",
]

IMPERSONATION_OPENER = [
    r"\b(?:i am|this is|main)\b[^.!?\n]{0,40}\b(?:inspector|sub[- ]inspector|officer|constable|advocate|manager)\b",
    r"\bcalling from\b[^.!?\n]{0,40}\b(?:cyber|police|cbi|rbi|bank|customs|trai|income tax|department)\b",
    r"\b(?:cbi|ncb|ed|customs|trai|rbi)\b[^.!?\n]{0,30}\b(?:speaking|se bol raha|se baat)\b",
]

CALLBACK_PRESSURE = [
    r"\b(?:call|dial)\b[^.!?\n]{0,30}\b(?:toll free|helpline|this number)\b[^.!?\n]{0,40}\b(?:immediately|now|urgent)\b",
    r"\bpress \d\b[^.!?\n]{0,40}\b(?:to (?:speak|connect|talk))\b",
]

RULES: list[tuple[list[str], str, float, str]] = [
    (
        DIGITAL_ARREST,
        "The caller claims you are under arrest or linked to a criminal case. Indian police "
        "never arrest, investigate or question anyone over a phone or video call - there is "
        "no such thing as a digital arrest.",
        28,
        "high",
    ),
    (
        SAFE_ACCOUNT_DEMAND,
        "You are being asked to move your money to a 'safe' or 'verification' account so it "
        "can be checked. No such account exists and the money is never returned.",
        26,
        "high",
    ),
    (
        DO_NOT_DISCONNECT,
        "The caller forbids you from hanging up or insists you stay on video. This is done so "
        "you cannot call your bank or your family to check.",
        22,
        "high",
    ),
    (
        IMPERSONATION_OPENER,
        "The caller opens by claiming to be a police officer, agency official or bank manager. "
        "Anyone can say this on a call - it proves nothing.",
        16,
        "high",
    ),
    (
        IDENTITY_PROBE,
        "The caller is fishing for your Aadhaar, PAN, date of birth or account number. A real "
        "bank already has these and would not ask.",
        16,
        "high",
    ),
    (
        CALLBACK_PRESSURE,
        "You are pushed to call a number in the message immediately. Always dial the number "
        "printed on your own card or the official website instead.",
        10,
        "medium",
    ),
]


def analyze(text: str) -> dict:
    """Score a call transcript. Returns score (0-45) and reasons."""
    if not text or not text.strip():
        return {"score": 0.0, "reasons": [], "script_markers": 0}

    normalised = " ".join(text.split())
    reasons: list[dict] = []
    score = 0.0
    markers = 0

    for patterns, reason, weight, severity in RULES:
        if any(re.search(p, normalised, re.IGNORECASE) for p in patterns):
            markers += 1
            score += weight
            reasons.append(
                {
                    "reason": reason,
                    "severity": severity,
                    "weight": weight,
                    "engine": "call",
                }
            )

    # Three or more script markers together is the full digital-arrest playbook.
    if markers >= 3:
        score += 8
        reasons.append(
            {
                "reason": "Several parts of a known scam call script appear together here, which "
                "almost never happens in a genuine call.",
                "severity": "high",
                "weight": 8,
                "engine": "call",
            }
        )

    return {
        "score": min(score, 45.0),
        "reasons": reasons[:6],
        "script_markers": markers,
    }
