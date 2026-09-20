"""Seeds the database with demo users, threat intel, alerts and ~400 scans.

The scans are not random noise. Each one is a real sample message pushed through
the actual detection pipeline, so every score, verdict, category and reason in the
dashboard is genuinely produced by the engines rather than made up. Only the
timestamps are synthesised, along a trend with weekly seasonality, so the charts
show the shape real reporting data has: a steady climb with weekday peaks.

Run:  python seed.py          (from backend/)
      python -m backend.seed  (from the repo root)
"""

from __future__ import annotations

import math
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Allow both `python seed.py` and `python -m backend.seed`.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import Base, SessionLocal, engine  # noqa: E402
from engines import fusion  # noqa: E402
from models import Alert, CommunityReport, Scan, ThreatIntel, User  # noqa: E402
from security import hash_password  # noqa: E402

random.seed(7)

DAYS = 90
TARGET_SCANS = 400


# --------------------------------------------------------------------- content
SCAM_SAMPLES: list[tuple[str, str]] = [
    ("message", "Dear Customer, your SBI account will be blocked within 2 hours due to incomplete KYC. Update immediately at http://sbi-verify-kyc.info/update"),
    ("message", "URGENT: HDFC Bank netbanking has been suspended. Re-verify your PAN and Aadhaar now at http://hdfc-secure-login.xyz/auth"),
    ("message", "Your ICICI Bank debit card will be deactivated today. Verify your card number and CVV here http://icici-rewards.top/claim"),
    ("message", "Aapka Axis Bank account KYC pending hai. Jaldi karein warna paisa block ho jayega. Link: http://kyc-update-online.loan/form"),
    ("message", "YONO SBI: Your account will be blocked today because your PAN card is not updated. Update here http://yono-sbi-update.xyz/pan"),
    ("message", "Dear user your Paytm KYC is incomplete, the wallet will be closed in 24 hours. Complete KYC https://paytm-kyc.tk/verify"),
    ("message", "Congratulations! You have won Rs 25 Lakh in the Paytm Lucky Draw. Send Rs 4,999 processing fee to winner.claim@paytm to claim."),
    ("message", "Aapne KBC lottery mein 25 Lakh jeeta hai! Claim karne ke liye winner.claim@paytm par 9,850 bhejein."),
    ("message", "You are the lucky winner of 10 Lakh from the Flipkart Big Billion Draw. Pay GST Rs 25,000 to release the amount."),
    ("message", "Dear winner, your number won a car in our anniversary draw. Pay Rs 18,500 RTO charges to take delivery."),
    ("message", "Work from home job! Earn Rs 5000 per day just by liking YouTube videos. No experience needed. Join our telegram group now."),
    ("message", "Part time task job: complete 20 hotel ratings daily and earn Rs 25,000 weekly. Pay Rs 2,500 registration to start."),
    ("message", "Guaranteed 200% return in 30 days! Invest Rs 48,000 in our crypto plan today. Limited slots."),
    ("message", "Double your money in 15 days with our trading bot. Minimum investment Rs 75,000. 100% safe, no risk."),
    ("message", "Your account has been credited with 1500 as task reward. To withdraw, first recharge 8000 to upgrade to VIP2 level."),
    ("message", "Ghar baithe kaam karein, roz 3000 rupaye kamayein. Sirf mobile chahiye. Registration fees 2,500 only."),
    ("upi", "A collect request of Rs 24,999 has been received from refund.helpdesk@okaxis. Enter your UPI PIN in the next 5 minutes to receive the amount."),
    ("upi", "Refund of Rs 3,499 for your cancelled order is ready. Approve the PhonePe request and enter PIN to credit the amount."),
    ("upi", "To receive your cashback of Rs 2,500 scan the QR code and enter your UPI PIN now."),
    ("upi", "Payment request of Rs 1 sent for account verification. Approve it with PIN, then we will credit Rs 48,000."),
    ("upi", "Sir main army mein hoon, transfer ho gaya hai isliye fridge bech raha hoon. Maine paise bhej diye hain, QR scan karke PIN daaliye."),
    ("upi", "Electricity bill refund of Rs 9,850 pending. Accept the collect request from rbi.verify@okicici using your PIN."),
    ("call", "Do not disconnect this call. This is Inspector Sharma from Mumbai Cyber Cell. A parcel in your name contains narcotics and you are under digital arrest. Transfer your entire balance to the RBI verification account and do not tell anyone."),
    ("call", "Sir yeh CBI ka official notice hai. Aapko 24 ghante tak camera ke saamne rehna hoga. Kisi ko batayenge to case badh jayega."),
    ("call", "We are from the Customs Department. To prove your money is clean, deposit it in this safe government account. It will be returned in 2 hours."),
    ("call", "Warrant issued in your name by the Delhi Police Crime Branch. Video call verification is mandatory within 1 hour or the arrest team will reach your home."),
    ("call", "Hello, I am calling from the HDFC card division. Your reward points of 8500 are expiring. Please tell me the OTP received to redeem them."),
    ("call", "Your card is blocked. Tell us the 6 digit OTP sent on your mobile to unblock it immediately."),
    ("call", "This is Microsoft technical support. Your computer is infected with 5 viruses and hackers are stealing your bank data. Install AnyDesk and share your screen so our engineer can fix it."),
    ("call", "Aapka phone hack ho gaya hai. AnyDesk install karke screen share kijiye, hum theek kar denge, sirf 2999 charge lagega."),
    ("message", "Your India Post parcel PKT8823 is held at customs. Pay Rs 45 clearance fee within 24 hours at http://indiapost-redeliver.click/pay"),
    ("message", "DHL: your international shipment needs a customs duty of Rs 3,200. Pay to customs.clearance@okaxis to release it today."),
    ("message", "Delivery failed. Reschedule by paying a Rs 25 verification charge at http://tinyurl.com/kyc-updt"),
    ("message", "Instant loan Rs 1,20,000 approved without documents! Download our app from http://kyc-update-online.loan/form and get money in 5 minutes."),
    ("message", "Pre-approved personal loan of Rs 75,000. No CIBIL check. Pay Rs 999 processing fee at taskpay01@upi to disburse."),
    ("message", "You have not repaid the loan. We will call all your contacts and share your photos unless you pay Rs 12,000 now."),
    ("message", "Hi dear, I saw your profile on the matrimony app. I am an NRI engineer in London and want to send you a gift, please pay the customs fee of Rs 45,000."),
    ("message", "Jaan main airport par phans gaya hoon, custom wale 60000 maang rahe hain. Please bhej do, wapas kar dunga."),
    ("message", "Save little Aarav, 4 years old, needs urgent heart surgery. Donate any amount to helpaarav@ybl. Please forward to 10 groups."),
    ("message", "Temple renovation fund, donate 501 or 1100 to templefund@upi and receive prasad at home. Blessings guaranteed."),
    ("email", "From: SBI Security Team <alerts@sbi-secure-verify.xyz>\nReply-To: recovery.desk@gmail.com\nSubject: URGENT: Your account will be suspended\n\nDear Customer, your net banking will be suspended today. Verify your account at http://sbi-secure-verify.xyz/login"),
    ("email", "From: Amazon Rewards <no-reply@amazon-rewards-claim.top>\nSubject: Action required: claim your prize\n\nYou have won a gift worth Rs 12 Lakh in the Amazon anniversary draw. Claim now http://icici-rewards.top/claim before it expires in 24 hours."),
    ("email", "From: Income Tax Refund <refunds@incometax-refund.info>\nReply-To: taxdesk.helpline@yahoo.com\nSubject: Immediate action: refund pending\n\nYour income tax refund of Rs 48,000 is pending. Confirm your bank account and PAN at http://rbi-refund.online/claim"),
    ("url", "http://sbi-kyc-verify.info/update"),
    ("url", "https://axisbank.verify-account.click/login"),
    ("url", "http://192.168.44.10/netbanking"),
    ("url", "http://bit.ly/3xKyc9"),
    ("url", "https://hdfc-secure-login.xyz/auth"),
]

SUSPICIOUS_SAMPLES: list[tuple[str, str]] = [
    ("message", "Dear Customer, your bill payment is pending. Please complete it today at http://billpay-online.site/pay"),
    ("message", "Limited offer! Get 50% cashback on your next recharge. Click http://recharge-offer.buzz/get to claim before midnight."),
    ("message", "Your subscription is expiring. Renew now at http://tinyurl.com/renew-now to avoid interruption."),
    ("message", "Hi, I am HR from a placement agency. We have an urgent vacancy. WhatsApp us to know more."),
    ("message", "Dear user, please update your address details urgently to continue receiving deliveries."),
    ("url", "http://offers-today.xyz/win"),
    ("url", "https://secure-login-portal.online/account/verify"),
    ("url", "http://rb.gy/promo22"),
    ("upi", "You have a payment request of Rs 500 pending approval."),
    ("call", "Sir, calling from the bank regarding your credit card offer. Can you confirm your date of birth for verification?"),
    ("message", "Congratulations, you are eligible for a free gift. Reply YES to know more."),
    ("email", "From: Billing <billing@invoice-portal.online>\nSubject: Invoice overdue\n\nYour invoice is overdue. Please settle it immediately at http://invoice-portal.online/pay"),
]

SAFE_SAMPLES: list[tuple[str, str]] = [
    ("message", "Your OTP for login is 738291. Do not share this OTP with anyone."),
    ("message", "482913 is your One Time Password for a PhonePe transaction of Rs 2,500. Valid for 10 minutes. Never share it."),
    ("message", "Dear Customer, Rs 2,000 debited from your HDFC Bank A/c XX4521 on 12-08 to VPA grocerystore@okhdfc. Ref 552389."),
    ("message", "Your SBI A/c XX8834 is credited with Rs 48,000 salary on 01-09. Available balance Rs 62,410."),
    ("message", "Your Amazon order 402-3399 has been shipped and will arrive by Friday. Track at https://www.amazon.in"),
    ("message", "Your train PNR 4523118090 is confirmed, coach B4 seat 22. Happy journey - IRCTC."),
    ("message", "Swiggy: your order from Biryani House is out for delivery, arriving in 12 minutes."),
    ("message", "Reminder: your electricity bill of Rs 2,500 is due on the 20th. Pay via the official app to avoid a late fee."),
    ("message", "Beta ghar kab aa raha hai? Khana bana ke rakha hai."),
    ("message", "Team, the project review meeting is moved to 3 PM tomorrow in conference room 2."),
    ("message", "Your gas cylinder booking is confirmed. Delivery expected within 2 working days."),
    ("message", "School notice: parent teacher meeting on Saturday 10 AM. Kindly attend."),
    ("message", "Your policy premium of Rs 9,850 has been received. The policy remains active."),
    ("message", "Interview scheduled for Monday 11 AM at our Noida office. Please bring two copies of your resume. No fee is charged at any stage."),
    ("message", "Your CIBIL score has been updated to 782. Check the detailed report on the official website."),
    ("message", "Aapka recharge Rs 3,499 ka safal raha. Validity 28 din."),
    ("call", "Hello, calling from the clinic to remind you about your dental appointment tomorrow at 4 PM. Reply YES to confirm."),
    ("call", "Sir, this is Rahul from your insurance branch. Your policy document is ready, you can collect it from the branch. There is no payment pending."),
    ("call", "Hi, this is the courier boy, I am at your gate with an Amazon package. Please come down."),
    ("email", "From: Zomato <no-reply@zomato.com>\nSubject: Refund processed\n\nYour refund of Rs 249 has been processed to the original payment method in 3-5 working days."),
    ("email", "From: LinkedIn <notifications@linkedin.com>\nSubject: You have 3 new profile views\n\nSee who viewed your profile this week."),
    ("url", "https://www.irctc.co.in"),
    ("url", "https://cybercrime.gov.in"),
    ("url", "https://www.onlinesbi.sbi"),
    ("upi", "PhonePe: You paid Rs 2,500 to Kirana Store. UPI Ref 3348219. Thank you."),
    ("upi", "Your UPI mandate for the SIP of Rs 4,999 will be debited on the 5th. No action needed."),
]

REQUESTED_HISTORY_SAMPLES: list[tuple[str, str]] = [
    ("message", "Your SBI account will be blocked today. Complete KYC at http://sbi-verify-kyc.example"),
    ("message", "Congratulations, you won Rs 25 lakh. Pay Rs 4,999 processing fee to claim."),
    ("message", "Your parcel is held by customs. Pay Rs 850 immediately to release it."),
    ("message", "Earn Rs 5,000 daily by rating hotels. Pay Rs 2,000 to activate your account."),
    ("message", "Your electricity connection will be disconnected tonight. Verify your bill using this link."),
    ("message", "Invest Rs 10,000 today and receive guaranteed 300% returns in one week."),
    ("message", "Your bank card is suspended. Send your CVV and OTP to reactivate it."),
    ("message", "Your loan is approved. Pay a Rs 1,200 release fee first."),
    ("message", "Your KYC expires in 30 minutes. Click here and enter your Aadhaar and PIN."),
    ("message", "You have won a new car. Pay road tax before delivery."),
    ("message", "Your refund is waiting. Approve this UPI collect request and enter your PIN."),
    ("message", "Scan this QR code to receive your cashback."),
    ("message", "Send Rs 1 to verify your UPI account and receive Rs 10,000."),
    ("message", "Your Amazon account will close unless you verify your card here."),
    ("message", "Urgent: police complaint registered against your mobile number. Call now."),
    ("call", "Do not disconnect. I am from the cybercrime department. Transfer money to a safe RBI account."),
    ("call", "Your parcel contains illegal items. Stay on video call while we verify your identity."),
    ("call", "This is your bank. Tell me the OTP sent to your phone to stop a transaction."),
    ("call", "Install AnyDesk so our technician can remove the virus from your computer."),
    ("call", "Your SIM will be blocked. Confirm your Aadhaar number and bank details."),
    ("email", "From: alerts@secure-sbi.example, your account will be suspended. Verify immediately."),
    ("email", "You have won an investment prize. Send your bank details to receive it."),
    ("email", "Your tax refund is pending. Confirm PAN and account information at this link."),
    ("email", "Your Microsoft subscription expired. Pay immediately to avoid account closure."),
    ("email", "Your invoice is overdue. Download the attached payment file and transfer funds."),
    ("url", "http://secure-bank-login.example/verify"),
    ("url", "http://sbi-refund-claim.example/login"),
    ("url", "http://192.0.2.44/bank/update"),
    ("url", "http://free-prize-claim.example/winner"),
    ("url", "http://kyc-expire-now.example/aadhaar"),
    ("upi", "Refund collect request received. Approve it and enter your UPI PIN."),
    ("upi", "Pay Rs 5,000 to winner.claim@upi to release your lottery prize."),
    ("upi", "Send Rs 1 verification payment to receive Rs 20,000 cashback."),
    ("upi", "A government fine is pending. Transfer money to rbi.verify@upi."),
    ("upi", "Your buyer sent a payment request. Approve it to receive the money."),
    ("message", "Your OTP is 482913. Never share this OTP with anyone."),
    ("message", "Rs 2,500 was debited from your account at a grocery store."),
    ("message", "Your train ticket is confirmed. PNR 4523118090."),
    ("message", "Your food order is out for delivery and will arrive soon."),
    ("message", "Your electricity bill is due on the 20th. Pay through the official app."),
    ("message", "Your salary of Rs 48,000 has been credited to your account."),
    ("message", "Your appointment is confirmed for Monday at 10 AM."),
    ("message", "Your recharge was successful. Validity is 28 days."),
    ("call", "Hello, this is the clinic calling to remind you about tomorrow's appointment."),
    ("call", "Your courier has arrived at the building entrance. Please collect it."),
    ("call", "This is your insurance branch. Your policy document is ready for collection."),
    ("email", "Your online order has shipped and will arrive on Friday."),
    ("email", "Your password was changed successfully. Contact support if you did not make this change."),
    ("url", "https://www.irctc.co.in"),
    ("url", "https://www.cybercrime.gov.in"),
]

INTEL_SEED: list[tuple[str, str, str, int]] = [
    ("domain", "sbi-kyc-verify.info", "high", 47),
    ("domain", "hdfc-secure-login.xyz", "high", 41),
    ("domain", "icici-rewards.top", "high", 38),
    ("domain", "yono-sbi-update.xyz", "high", 35),
    ("domain", "kyc-update-online.loan", "high", 33),
    ("domain", "paytm-kyc.tk", "high", 31),
    ("domain", "rbi-refund.online", "high", 29),
    ("domain", "indiapost-redeliver.click", "high", 28),
    ("domain", "sbi-secure-verify.xyz", "high", 26),
    ("domain", "amazon-rewards-claim.top", "high", 24),
    ("domain", "incometax-refund.info", "high", 23),
    ("domain", "verify-account.click", "high", 21),
    ("domain", "sbi-online-verify.info", "high", 20),
    ("domain", "sbi-pan-kyc.top", "high", 19),
    ("domain", "bit.ly", "medium", 18),
    ("domain", "tinyurl.com", "medium", 17),
    ("domain", "billpay-online.site", "medium", 14),
    ("domain", "recharge-offer.buzz", "medium", 13),
    ("domain", "secure-login-portal.online", "medium", 12),
    ("domain", "invoice-portal.online", "medium", 11),
    ("domain", "offers-today.xyz", "medium", 10),
    ("domain", "kyc-verify-now.cf", "high", 16),
    ("domain", "npci-refund.ga", "high", 15),
    ("domain", "customs-clearance-in.top", "high", 14),
    ("domain", "loan-approve-fast.work", "medium", 12),
    ("upi", "refund.helpdesk@okaxis", "high", 52),
    ("upi", "kycsupport@ybl", "high", 44),
    ("upi", "winner.claim@paytm", "high", 39),
    ("upi", "rbi.verify@okicici", "high", 36),
    ("upi", "taskpay01@upi", "high", 34),
    ("upi", "customs.clearance@okaxis", "high", 30),
    ("upi", "helpaarav@ybl", "medium", 22),
    ("upi", "templefund@upi", "medium", 19),
    ("upi", "quickloan.fee@ybl", "high", 27),
    ("upi", "prize.release@okhdfcbank", "high", 25),
    ("upi", "verify.account@oksbi", "high", 24),
    ("upi", "taskreward.vip@paytm", "high", 21),
    ("upi", "cyber.cell.fine@okaxis", "high", 20),
    ("upi", "parcel.duty@ybl", "medium", 17),
    ("upi", "insurance.charge@upi", "medium", 15),
    ("phone", "9812345601", "high", 43),
    ("phone", "9723456712", "high", 37),
    ("phone", "8899776655", "high", 32),
    ("phone", "7011223344", "high", 29),
    ("phone", "9988112233", "high", 27),
    ("phone", "9090909012", "medium", 23),
    ("phone", "8123456789", "medium", 21),
    ("phone", "9345612780", "high", 26),
    ("phone", "7788990011", "medium", 18),
    ("phone", "9001234567", "medium", 16),
    ("phone", "8567123490", "high", 25),
    ("phone", "9456781230", "medium", 14),
    ("keyword", "digital arrest", "high", 61),
    ("keyword", "collect request refund", "high", 48),
    ("keyword", "rbi verification account", "high", 45),
    ("keyword", "kbc lottery", "high", 40),
    ("keyword", "prepaid task job", "high", 35),
    ("keyword", "customs clearance fee", "medium", 31),
    ("keyword", "anydesk screen share", "high", 28),
    ("keyword", "guaranteed double money", "high", 26),
    ("keyword", "no cibil instant loan", "medium", 22),
]

ALERTS = [
    (
        "Digital arrest calls rising sharply this month",
        "Callers claiming to be from the CBI, customs or a cyber cell are keeping victims on video "
        "calls for hours and demanding transfers to a 'RBI verification account'. No Indian agency "
        "arrests, questions or fines anyone over a phone or video call. Hang up and dial 1930.",
        "high",
    ),
    (
        "Fake KYC links imitating bank domains",
        "A wave of SMS messages uses addresses like sbi-verify-kyc.info and hdfc-secure-login.xyz. "
        "The bank's name appears in the address but the real website behind it is not the bank's. "
        "Open your banking app directly instead of tapping links.",
        "high",
    ),
    (
        "UPI collect-request refund trap",
        "Victims are told a refund is ready and asked to approve a request and enter their UPI PIN. "
        "Receiving money on UPI never needs a PIN - approving the request sends money out instead.",
        "high",
    ),
    (
        "Task-based job fraud on Telegram",
        "Groups promising Rs 3,000-5,000 a day for liking videos or rating hotels pay small amounts "
        "first, then demand a 'VIP upgrade' deposit before any withdrawal is allowed. No genuine "
        "employer asks you to pay to get paid.",
        "medium",
    ),
]

COMMUNITY_SAMPLES = [
    ("message", "Got this today: your SBI account will be blocked, update KYC at http://sbi-pan-kyc.top - my father almost clicked it.", "kyc_bank"),
    ("call", "Someone called saying he was from the cyber cell and that a parcel with drugs was found in my name. He told me not to disconnect and not to tell my family.", "digital_arrest"),
    ("upi", "Received a collect request of Rs 18,000 saying it was a refund for a cancelled flight. It asked for my UPI PIN.", "upi_collect"),
    ("message", "WhatsApp message offering Rs 4000 daily for liking YouTube videos, then asked for a 5000 deposit to unlock withdrawals.", "job_investment"),
    ("message", "SMS saying I won 25 lakh in a KBC lucky draw and to pay 9850 as processing fee.", "lottery_prize"),
    ("message", "Parcel held at customs message with a link asking for a 45 rupee clearance fee. The link was indiapost-redeliver.click.", "delivery_parcel"),
    ("call", "Caller said my computer was infected and asked me to install AnyDesk so he could clean it.", "tech_support"),
    ("message", "Loan app approved 2 lakh instantly, then demanded 1499 file charge before releasing anything.", "loan_app"),
    ("message", "Matrimony match said he is an NRI doctor and his gift parcel is stuck at customs, needs 45000.", "romance_matrimonial"),
    ("message", "Forwarded donation appeal for a child's surgery asking to pay a personal UPI ID and forward to 10 groups.", "charity_donation"),
    ("call", "Bank caller asked me to read out the OTP to reverse a wrong transaction. I hung up and called the number on my card instead.", "otp_phishing"),
    ("message", "Aapka khata band ho jayega, turant KYC update karein - link tha kyc-verify-now.cf", "kyc_bank"),
    ("upi", "Someone selling a fridge on OLX said he is an army officer and sent a QR code to scan to receive money.", "upi_collect"),
    ("message", "Investment group on Telegram promised guaranteed 200% return in 30 days on crypto.", "job_investment"),
    ("message", "Got an email from alerts@sbi-secure-verify.xyz claiming my net banking is suspended.", "kyc_bank"),
    ("call", "Person claimed to be from TRAI and said my SIM would be blocked in 2 hours because of illegal activity.", "digital_arrest"),
    ("message", "Message said my electricity would be disconnected tonight unless I called a number and paid immediately.", "kyc_bank"),
    ("upi", "A 1 rupee 'verification' request came first, then a 25000 request right after.", "upi_collect"),
]


# ------------------------------------------------------------------ timestamps
def _day_weight(day_index: int) -> float:
    """Upward trend plus weekly seasonality.

    day_index 0 is the oldest day in the window. Volume grows ~2.2x across the
    period and dips on weekends, which is the shape reported-fraud data has.
    """
    trend = 1.0 + 1.2 * (day_index / DAYS)
    date = datetime.now(timezone.utc) - timedelta(days=DAYS - day_index)
    weekday = date.weekday()  # 0 = Monday
    seasonal = 1.0 + 0.22 * math.sin((weekday / 7.0) * 2 * math.pi + 0.6)
    if weekday >= 5:
        seasonal *= 0.68
    return max(trend * seasonal, 0.05)


def _timestamps(count: int) -> list[datetime]:
    weights = [_day_weight(i) for i in range(DAYS)]
    days = random.choices(range(DAYS), weights=weights, k=count)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    stamps: list[datetime] = []
    for day in days:
        base = now - timedelta(days=DAYS - day)
        # Cluster within waking hours, heavier in the evening.
        hour = min(23, max(6, int(random.gauss(15, 4))))
        stamps.append(
            base.replace(
                hour=hour,
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
                microsecond=0,
            )
        )
    return sorted(stamps)


# ----------------------------------------------------------------------- seeding
def reset(db) -> None:
    for model in (Scan, CommunityReport, Alert, ThreatIntel, User):
        db.query(model).delete()
    db.commit()


def seed_users(db) -> dict[str, User]:
    people = [
        ("admin@scamshield.in", "Admin@123", "Bhanu", "admin"),
        ("demo@scamshield.in", "Demo@123", "Demo User", "user"),
        ("analyst@scamshield.in", "Analyst@123", "Aman", "analyst"),
    ]
    created: dict[str, User] = {}
    for email, password, name, role in people:
        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=name,
            role=role,
        )
        db.add(user)
        created[role] = user
    db.commit()
    for user in created.values():
        db.refresh(user)
    return created


def seed_intel(db) -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for indicator_type, value, level, count in INTEL_SEED:
        db.add(
            ThreatIntel(
                indicator_type=indicator_type,
                indicator_value=value.lower(),
                risk_level=level,
                report_count=count,
                source="seed",
                first_seen=now - timedelta(days=random.randint(30, DAYS)),
                last_seen=now - timedelta(hours=random.randint(1, 72)),
            )
        )
    db.commit()


def seed_alerts(db) -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for index, (title, body, severity) in enumerate(ALERTS):
        db.add(
            Alert(
                title=title,
                body=body,
                severity=severity,
                active=True,
                created_at=now - timedelta(days=index * 3 + 1, hours=random.randint(0, 20)),
            )
        )
    db.commit()


def seed_scans(db, users: dict[str, User]) -> tuple[int, dict[str, int]]:
    """Push real sample content through the real pipeline, then backdate it."""
    pool: list[tuple[str, str]] = []
    # Roughly 45% high-risk / 22% suspicious / 33% safe, which mirrors the mix a
    # tool like this actually sees: most people paste things that worry them.
    pool += SCAM_SAMPLES * 4
    pool += SUSPICIOUS_SAMPLES * 8
    pool += SAFE_SAMPLES * 5

    random.shuffle(pool)
    chosen = [pool[i % len(pool)] for i in range(TARGET_SCANS)]
    stamps = _timestamps(TARGET_SCANS)

    owners = [users["user"].id, users["user"].id, users["analyst"].id, None, None]

    verdict_counts: dict[str, int] = {"High Risk": 0, "Suspicious": 0, "Safe": 0}
    for (channel, content), created_at in zip(chosen, stamps):
        result = fusion.analyze(content, channel, db=None)
        verdict_counts[result["verdict"]] = verdict_counts.get(result["verdict"], 0) + 1
        db.add(
            Scan(
                id=result["scan_id"],
                user_id=random.choice(owners),
                channel=channel,
                content=content[:2000],
                risk_score=result["risk_score"],
                verdict=result["verdict"],
                category=result["category"],
                confidence=result["confidence"],
                reasons=result["reasons"],
                entities=result["entities"],
                created_at=created_at,
            )
        )
    db.commit()
    return TARGET_SCANS, verdict_counts


def seed_requested_history(db, user: User) -> int:
    """Store the requested examples separately, one per day for the demo user."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for index, (channel, content) in enumerate(REQUESTED_HISTORY_SAMPLES):
        result = fusion.analyze(content, channel, db=None)
        db.add(
            Scan(
                id=result["scan_id"],
                user_id=user.id,
                channel=channel,
                content=content[:2000],
                risk_score=result["risk_score"],
                verdict=result["verdict"],
                category=result["category"],
                confidence=result["confidence"],
                reasons=result["reasons"],
                entities=result["entities"],
                created_at=now - timedelta(days=len(REQUESTED_HISTORY_SAMPLES) - 1 - index, hours=12),
            )
        )
    db.commit()
    return len(REQUESTED_HISTORY_SAMPLES)


def seed_reports(db, users: dict[str, User]) -> int:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    total = 0
    for index, (channel, content, category) in enumerate(COMMUNITY_SAMPLES):
        db.add(
            CommunityReport(
                user_id=random.choice([users["user"].id, users["analyst"].id, None]),
                channel=channel,
                content=content,
                claimed_category=category,
                status="verified" if index % 6 != 5 else "pending",
                reviewed_by=users["analyst"].id if index % 6 != 5 else None,
                created_at=now - timedelta(days=index * 2, hours=random.randint(0, 20)),
            )
        )
        total += 1
    db.commit()
    return total


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Clearing existing data...")
        reset(db)

        users = seed_users(db)
        print(f"  users            {len(users)}")

        seed_intel(db)
        print(f"  threat indicators {len(INTEL_SEED)}")

        seed_alerts(db)
        print(f"  active alerts     {len(ALERTS)}")

        print(f"  analysing {TARGET_SCANS} sample messages through the live pipeline...")
        count, verdicts = seed_scans(db, users)
        print(f"  scans             {count}  {verdicts}")

        requested_count = seed_requested_history(db, users["user"])
        print(f"  requested history {requested_count} (one per day for demo user)")

        reports = seed_reports(db, users)
        print(f"  community reports {reports}")

        print("\nSeed complete. Demo accounts:")
        print("  admin@scamshield.in   / Admin@123   (admin)")
        print("  analyst@scamshield.in / Analyst@123 (analyst)")
        print("  demo@scamshield.in    / Demo@123    (user)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
