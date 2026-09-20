"""Scam-category classification and the per-category action playbooks.

Categorisation is keyword-scored rather than learned, on purpose: with a modest
corpus a 12-way learned classifier is unstable, while the categories themselves
are defined by unmistakable vocabulary ("collect request", "digital arrest",
"customs duty"). Rule hits from rules.py act as strong priors on top of that.
"""

from __future__ import annotations

import re

CATEGORY_LABELS: dict[str, str] = {
    "kyc_bank": "Fake KYC / Bank Alert",
    "lottery_prize": "Lottery & Prize Scam",
    "job_investment": "Fake Job / Investment Scam",
    "digital_arrest": "Digital Arrest / Police Impersonation",
    "otp_phishing": "OTP & Credential Phishing",
    "upi_collect": "UPI Collect-Request Fraud",
    "delivery_parcel": "Parcel & Customs Scam",
    "loan_app": "Predatory Loan App",
    "romance_matrimonial": "Romance / Matrimonial Fraud",
    "tech_support": "Fake Tech Support",
    "charity_donation": "Fake Charity Appeal",
    "safe_none": "No Scam Detected",
}

CATEGORY_ORDER = list(CATEGORY_LABELS.keys())

# category -> [(pattern, weight)]
SIGNALS: dict[str, list[tuple[str, float]]] = {
    "digital_arrest": [
        (r"\bdigital arrest\b", 12),
        (r"\b(?:cbi|narcotics|ncb|enforcement directorate|crime branch|cyber cell)\b", 6),
        (r"\b(?:arrest|warrant|money laundering|terror funding)\b", 5),
        (r"\b(?:do not|don't|dont) (?:disconnect|cut|hang up)\b", 6),
        (r"\b(?:safe|verification|rbi) account\b", 6),
        (r"\bskype\b", 4),
        (r"\bkisi ko (?:mat|na) batana\b", 5),
    ],
    "kyc_bank": [
        (r"\bkyc\b", 8),
        (r"\b(?:account|khata|card|wallet)\b[^.!?\n]{0,30}\b(?:block|band|suspend|deactivat|freeze|dormant)\w*\b", 7),
        (r"\b(?:pan|aadhaar|aadhar)\b[^.!?\n]{0,30}\b(?:update|link|verify)\b", 5),
        (r"\bnet ?banking\b", 4),
        (r"\bre-?verify\b", 4),
        (r"\bdear (?:customer|user)\b", 2),
    ],
    "otp_phishing": [
        (r"\botp\b", 5),
        (r"\b(?:cvv|card number|expiry date|upi pin|mpin)\b", 6),
        (r"\b(?:share|tell|send|reply with|batayein|bhejein)\b[^.!?\n]{0,40}\b(?:otp|pin|cvv|password)\b", 9),
        (r"\breward points?\b", 3),
        (r"\bunblock\b", 3),
    ],
    "upi_collect": [
        (r"\bcollect request\b", 12),
        (r"\b(?:payment|money) request\b", 8),
        (r"\b(?:approve|accept)\b[^.!?\n]{0,30}\brequest\b", 7),
        (r"\benter (?:your )?(?:upi )?pin\b", 6),
        (r"\bscan\b[^.!?\n]{0,25}\bqr\b", 6),
        (r"\b(?:refund|cashback)\b[^.!?\n]{0,40}\b(?:receive|credit|approve)\b", 5),
        (r"@(?:ok\w+|ybl|paytm|upi|axl|apl)\b", 4),
    ],
    "lottery_prize": [
        (r"\b(?:lottery|lucky draw|lucky number|jackpot)\b", 10),
        (r"\byou (?:have )?won\b", 9),
        (r"\b(?:winner|inaam|jeeta hai|prize)\b", 7),
        (r"\bkbc\b", 8),
        (r"\b(?:crore|lakh)\b[^.!?\n]{0,30}\b(?:won|win|prize|claim)\b", 5),
        (r"\bfree gift\b", 4),
    ],
    "job_investment": [
        (r"\b(?:work from home|ghar baithe|part[- ]time job|data entry)\b", 8),
        (r"\b(?:invest|investment|trading|crypto|forex|ipo|stock tips)\b", 7),
        (r"\b(?:guaranteed|assured)\b[^.!?\n]{0,25}\b(?:return|profit|income)\b", 8),
        (r"\b(?:double|paisa double|5x|200%)\b", 6),
        (r"\b(?:hiring|vacancy|resume|shortlisted|hr)\b", 5),
        (r"\b(?:task|rating task|prepaid task|telegram group)\b", 6),
        (r"\bearn\b[^.!?\n]{0,25}\b(?:per day|daily|weekly|roz)\b", 6),
    ],
    "delivery_parcel": [
        (r"\b(?:parcel|courier|shipment|package|consignment)\b", 8),
        (r"\bcustoms\b", 7),
        (r"\b(?:india post|dhl|fedex|bluedart|delhivery|dtdc)\b", 7),
        (r"\b(?:delivery (?:failed|attempt)|redeliver\w*|reschedule)\b", 7),
        (r"\b(?:clearance|duty|handling) (?:fee|charge|charges)\b", 6),
        (r"\baddress\b[^.!?\n]{0,25}\b(?:incomplete|update|confirm)\b", 4),
    ],
    "loan_app": [
        (r"\bloan\b", 8),
        (r"\b(?:cibil|no documents|bina document|pre[- ]approved|instant loan)\b", 7),
        (r"\b(?:processing|file|insurance) (?:fee|charge)\b[^.!?\n]{0,40}\b(?:loan|disburse|release)\b", 6),
        (r"\b(?:recovery|repay|contacts|morphed)\b", 4),
        (r"\b(?:download|install)\b[^.!?\n]{0,25}\bapp\b", 3),
    ],
    "romance_matrimonial": [
        (r"\b(?:matrimony|matrimonial|dating|matched)\b", 9),
        (r"\b(?:dear|my love|jaan|honey|darling)\b", 4),
        (r"\b(?:nri|london|uk|us army|soldier)\b[^.!?\n]{0,60}\b(?:gift|send|money|customs)\b", 7),
        (r"\b(?:gift|parcel|inheritance)\b[^.!?\n]{0,50}\bcustoms\b", 8),
        (r"\bstuck at\b[^.!?\n]{0,25}\b(?:airport|customs)\b", 8),
    ],
    "tech_support": [
        (r"\b(?:anydesk|teamviewer|screen ?share|remote access)\b", 10),
        (r"\b(?:virus|infected|malware|hacked|compromised)\b", 8),
        (r"\b(?:microsoft|windows|antivirus|norton|mcafee)\b", 7),
        (r"\b(?:computer|laptop|pc|router|wifi)\b", 4),
        (r"\btechnical support\b", 6),
    ],
    "charity_donation": [
        (r"\b(?:donate|donation|daan|relief fund|ngo|charity)\b", 9),
        (r"\b(?:surgery|cancer|orphan|flood|earthquake|temple)\b", 6),
        (r"\bforward (?:this )?to\b[^.!?\n]{0,25}\b(?:groups|people|contacts)\b", 6),
        (r"\b(?:80g|tax exemption)\b", 3),
    ],
}

# Rules that strongly imply a category regardless of vocabulary overlap.
RULE_PRIORS: dict[str, list[tuple[str, float]]] = {
    "credential_request": [("otp_phishing", 8)],
    "verification_account": [("digital_arrest", 10)],
    "digital_arrest_threat": [("digital_arrest", 8)],
    "secrecy_pressure": [("digital_arrest", 5)],
    "qr_to_receive": [("upi_collect", 9)],
    "remote_access": [("tech_support", 9)],
    "romance_gift": [("romance_matrimonial", 9)],
    "loan_push": [("loan_app", 8)],
    "job_bait": [("job_investment", 7)],
    "investment_pressure": [("job_investment", 6)],
    "charity_pressure": [("charity_donation", 8)],
    "money_lure": [("lottery_prize", 4), ("job_investment", 3)],
    "tech_scare": [("tech_support", 8)],
}

CHANNEL_PRIORS: dict[str, list[tuple[str, float]]] = {
    "call": [("digital_arrest", 3), ("otp_phishing", 2), ("tech_support", 2)],
    "upi": [("upi_collect", 6)],
    "url": [("kyc_bank", 2)],
}

PLAYBOOKS: dict[str, dict] = {
    "kyc_bank": {
        "do": [
            "Open your bank's own app or type the bank's website address yourself, and check whether any KYC action is genuinely pending.",
            "Call the customer care number printed on the back of your debit card or on your passbook.",
            "Visit your home branch if anything about your account really needs updating.",
        ],
        "dont": [
            "Do not open the link in the message, even to 'just check'.",
            "Do not enter your card number, CVV, PIN, net-banking password or OTP on any page you reached from a message.",
            "Do not send photos of your card, Aadhaar or PAN to anyone on WhatsApp.",
        ],
    },
    "otp_phishing": {
        "do": [
            "End the call immediately and call your bank yourself on the number printed on your card.",
            "If you already shared an OTP or PIN, call 1930 and block the card or account through your bank's app right away.",
            "Change your net-banking and UPI passwords from the official app.",
        ],
        "dont": [
            "Never read out an OTP, PIN, CVV or password to anyone, however official they sound.",
            "Do not believe a caller who says money was credited by mistake and must be sent back.",
            "Do not let anyone stay on the call while you open your banking app.",
        ],
    },
    "upi_collect": {
        "do": [
            "Decline the request and delete it. A genuine refund is credited automatically, with nothing to approve.",
            "Check your balance in your bank's own app to confirm nothing has left your account.",
            "Report the UPI ID inside your payment app so it can be blocked for others too.",
        ],
        "dont": [
            "Do not enter your UPI PIN. Receiving money never requires a PIN.",
            "Do not scan any QR code that someone says will 'send you' money.",
            "Do not accept a small 'test' payment request as proof of good faith.",
        ],
    },
    "digital_arrest": {
        "do": [
            "Hang up. Then call 1930 or your local police station on a number you looked up yourself.",
            "Tell a family member or a friend what happened, right now, even if you were told not to.",
            "Keep the caller's number and any screenshots as evidence for your complaint.",
        ],
        "dont": [
            "Do not transfer money to any 'safe', 'RBI' or 'verification' account. There is no such thing.",
            "Do not stay on a video call or keep your camera on because someone demanded it.",
            "Do not share your Aadhaar, PAN, bank details or a scan of any document.",
        ],
    },
    "lottery_prize": {
        "do": [
            "Delete the message. You cannot win a lottery you never entered.",
            "Warn any older relatives who may receive the same message.",
        ],
        "dont": [
            "Do not pay any processing fee, GST, RTO charge or 'refundable deposit' to release a prize.",
            "Do not share your bank account or Aadhaar details to 'claim' winnings.",
            "Do not continue the conversation on WhatsApp or Telegram.",
        ],
    },
    "job_investment": {
        "do": [
            "Verify the company on its official website and call its listed HR number.",
            "Check whether the investment platform is registered with SEBI before putting in any money.",
            "Treat 'guaranteed returns' as a warning sign, not a selling point.",
        ],
        "dont": [
            "Do not pay any registration fee, security deposit or 'VIP upgrade' to get a job or withdraw your earnings.",
            "Do not join Telegram or WhatsApp groups that promise daily profits.",
            "Do not send your Aadhaar or PAN to a recruiter you met only over chat.",
        ],
    },
    "delivery_parcel": {
        "do": [
            "Track the parcel only in the courier's official app or on the address you type in yourself.",
            "Call the courier company's published customer care number to confirm any real duty.",
        ],
        "dont": [
            "Do not pay customs or redelivery charges through a link in a message.",
            "Do not believe claims that a parcel in your name contains drugs or passports - that is the opening line of a digital-arrest scam.",
        ],
    },
    "loan_app": {
        "do": [
            "Borrow only from an RBI-registered bank or NBFC and check the lender's name on the RBI website.",
            "Read the app's permissions before installing, and refuse access to contacts, photos and SMS.",
            "If you are being harassed by a recovery agent, report it at cybercrime.gov.in and to the police.",
        ],
        "dont": [
            "Do not pay any advance processing, insurance or file charge to receive a loan.",
            "Do not install a loan app from a link instead of the official app store.",
            "Do not give a lending app access to your contacts or gallery.",
        ],
    },
    "romance_matrimonial": {
        "do": [
            "Do a reverse image search on the photos and insist on a live video call.",
            "Talk to a family member or friend before sending money to anyone you met online.",
        ],
        "dont": [
            "Do not pay any customs, clearance or 'stuck at the airport' fee for a gift or parcel.",
            "Do not move the conversation off the platform where you can report the profile.",
            "Do not share personal photos or documents.",
        ],
    },
    "tech_support": {
        "do": [
            "Close the message or hang up, then run a scan with the security software already on your device.",
            "If you granted remote access, disconnect from the internet, uninstall the remote app and change your banking passwords from a different device.",
        ],
        "dont": [
            "Do not install AnyDesk, TeamViewer or any screen-sharing app because a caller asked you to.",
            "Do not call the number shown in a pop-up or SMS warning about a virus.",
            "Do not pay for a 'repair' or 'licence renewal' over a call.",
        ],
    },
    "charity_donation": {
        "do": [
            "Donate only through the charity's official website or a registered payment page.",
            "Check the organisation's registration and 80G status before giving.",
        ],
        "dont": [
            "Do not send money to a personal UPI ID for a cause you heard about in a forwarded message.",
            "Do not forward the appeal onward - that is how these spread.",
        ],
    },
    "safe_none": {
        "do": [
            "You can proceed, but still open apps and websites yourself rather than through links in messages.",
            "If anything about this later asks you for an OTP, PIN or payment, stop and check again.",
        ],
        "dont": [
            "Do not share OTPs, PINs or card details with anyone, even when a message looks genuine.",
            "Do not assume a message is safe only because it uses a bank's name.",
        ],
    },
}

REPORT_TO = "cybercrime.gov.in / 1930"


def label_for(category: str) -> str:
    return CATEGORY_LABELS.get(category, "Suspicious Activity")


def classify(
    text: str,
    channel: str = "message",
    rule_ids: list[str] | None = None,
) -> tuple[str, dict[str, float]]:
    """Return the best-matching scam category and the full score breakdown."""
    normalised = " ".join((text or "").split())
    scores: dict[str, float] = {c: 0.0 for c in SIGNALS}

    for category, signals in SIGNALS.items():
        for pattern, weight in signals:
            if re.search(pattern, normalised, re.IGNORECASE):
                scores[category] += weight

    for rule_id in rule_ids or []:
        for category, weight in RULE_PRIORS.get(rule_id, []):
            scores[category] = scores.get(category, 0.0) + weight

    for category, weight in CHANNEL_PRIORS.get(channel, []):
        if scores.get(category, 0.0) > 0:
            scores[category] += weight

    best = max(scores.items(), key=lambda kv: kv[1])
    if best[1] <= 0:
        return "safe_none", scores
    return best[0], scores


def playbook_for(category: str, verdict: str) -> dict:
    """Action plan for a category, with a verdict-appropriate opening step."""
    base = PLAYBOOKS.get(category, PLAYBOOKS["safe_none"])
    do = list(base["do"])
    dont = list(base["dont"])

    if verdict == "High Risk":
        do.insert(0, "Stop and do not respond, click, call back or pay anything.")
        do.append(
            "Report this at cybercrime.gov.in or call 1930. If money has already left your "
            "account, report within the first few hours - that is when it can still be frozen."
        )
    elif verdict == "Suspicious":
        do.insert(
            0,
            "Pause before acting, and verify through an official app or a number you look up yourself.",
        )

    return {"do": do[:6], "dont": dont[:5], "report_to": REPORT_TO}
