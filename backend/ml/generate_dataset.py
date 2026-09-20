"""Builds ml/dataset.csv - the labelled corpus behind the text classifier.

The corpus is hand-curated rather than scraped: every seed line below is written
in the style of scams actually reported in India (fake KYC, digital arrest, UPI
collect, task-based job fraud, parcel/customs, loan apps, matrimonial), in both
English and Hinglish, plus a deliberately large set of *legitimate* messages that
share vocabulary with scams (real OTP alerts, real delivery updates, real bank
debit notices). Those near-miss safe rows are what stop the model from flagging
every message that merely contains the word "OTP" or "bank".

Seeds are expanded with slot templates so the model sees each pattern with many
different banks, amounts, links and phrasings.

Run:  python generate_dataset.py
"""

from __future__ import annotations

import csv
import itertools
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent / "dataset.csv"
random.seed(20260906)

BANKS = [
    "SBI",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "PNB",
    "Kotak Bank",
    "Bank of Baroda",
    "Canara Bank",
]
WALLETS = ["Paytm", "PhonePe", "Google Pay", "Amazon Pay"]
BAD_LINKS = [
    "http://sbi-kyc-verify.info/update",
    "http://bit.ly/3xKyc9",
    "https://hdfc-secure-login.xyz/auth",
    "http://192.168.44.10/netbanking",
    "https://icici-rewards.top/claim",
    "http://tinyurl.com/kyc-updt",
    "https://axisbank.verify-account.click/login",
    "http://kyc-update-online.loan/form",
    "https://paytm-kyc.tk/verify",
    "http://rbi-refund.online/claim",
]
GOOD_LINKS = [
    "https://www.onlinesbi.sbi",
    "https://www.icicibank.com",
    "https://www.irctc.co.in",
    "https://cybercrime.gov.in",
    "https://www.hdfcbank.com",
]
AMOUNTS = ["4,999", "9,850", "25,000", "1,20,000", "2,500", "48,000", "75,000", "3,499"]
PRIZES = ["25 Lakh", "10 Lakh", "5 Crore", "12 Lakh", "50 Lakh"]
HOURS = ["2 hours", "24 hours", "1 hour", "today 6 PM", "30 minutes"]
UPIS = [
    "refund.helpdesk@okaxis",
    "kycsupport@ybl",
    "winner.claim@paytm",
    "rbi.verify@okicici",
    "taskpay01@upi",
]
AGENCIES = [
    "Mumbai Cyber Cell",
    "CBI",
    "Narcotics Control Bureau",
    "Delhi Police Crime Branch",
    "Customs Department",
]
MERCHANTS = [
    "Reliance Fresh",
    "More Supermarket",
    "Apollo Pharmacy",
    "Cafe Coffee Day",
    "Big Bazaar",
    "Croma",
    "Decathlon",
]
NAMES = ["Ramesh", "Sunita", "Arjun", "Meera", "Farhan", "Kavita", "Deepak"]
CITIES = ["Pune", "Indore", "Jaipur", "Kochi", "Lucknow", "Nagpur", "Bhopal"]

# --------------------------------------------------------------------- templates
# category -> template strings; {slots} are filled from the pools above.
TEMPLATES: dict[str, list[str]] = {
    "kyc_bank": [
        "Dear Customer, your {bank} account will be blocked within {hours} due to incomplete KYC. Update immediately at {bad_link}",
        "URGENT: {bank} netbanking suspended. Re-verify your PAN and Aadhaar now: {bad_link}",
        "Your {bank} account KYC has expired. Click {bad_link} and submit details to avoid deactivation.",
        "Priya from {bank} here, aapka khata band ho jayega. Turant KYC update karein {bad_link}",
        "ALERT {bank}: Debit card will be deactivated in {hours}. Verify card number and CVV here {bad_link}",
        "Aapka {bank} account KYC pending hai. Jaldi karein warna paisa block ho jayega. Link: {bad_link}",
        "{bank} Security: unusual login detected. Confirm your identity within {hours} at {bad_link} or the account freezes.",
        "Dear user your {wallet} KYC is incomplete, wallet will be closed in {hours}. Complete KYC {bad_link}",
        "Final reminder from {bank}. Account dormant hone se bachane ke liye {bad_link} par details bharein.",
        "RBI mandate: all {bank} customers must re-do KYC before {hours}. Failure means permanent block. {bad_link}",
    ],
    "lottery_prize": [
        "Congratulations! You have won Rs {prize} in the {wallet} Lucky Draw. Send Rs {amount} processing fee to claim.",
        "Aapne KBC lottery mein {prize} jeeta hai! Claim karne ke liye {upi} par {amount} bhejein.",
        "WINNER! Your mobile number is selected for a Rs {prize} prize. Share bank details at {bad_link}",
        "You are the lucky winner of {prize} from the Flipkart Big Billion Draw. Pay GST Rs {amount} to release the amount.",
        "Badhai ho! Aapka number lottery mein select hua hai. Inaam {prize}. WhatsApp karein aur {amount} fees bharein.",
        "Your verified account has won a free gift worth Rs {prize}. Claim now {bad_link} before it expires in {hours}.",
        "Dear customer you won {prize} in the Amazon anniversary lucky draw. Deposit refundable Rs {amount} at {upi}.",
    ],
    "job_investment": [
        "Work from home job! Earn Rs 5000 per day just by liking YouTube videos. No experience needed. WhatsApp us now.",
        "Part time task job: complete 20 hotel ratings daily and earn Rs {amount} weekly. Join the telegram group now.",
        "Ghar baithe kaam karein, roz 3000 rupaye kamayein. Sirf mobile chahiye. Registration fees {amount} only.",
        "Guaranteed 200% return in 30 days! Invest Rs {amount} in our crypto plan today. Limited slots.",
        "Double your money in 15 days with our trading bot. Minimum investment Rs {amount}. 100% safe, no risk.",
        "Hi, I am HR from a top company. We have a data entry vacancy, salary 35000 per month. Pay Rs {amount} security deposit to confirm.",
        "Stock tips group: aaj hi join karein, 3 din mein paisa double. Guaranteed profit, no loss. Fees Rs {amount}.",
        "Congratulations, your resume is shortlisted for Amazon work from home. Pay refundable registration {amount} at {upi}.",
        "Invest in our IPO pre-listing shares and get assured 5x returns. Send funds to {upi} before {hours}.",
    ],
    "digital_arrest": [
        "This is {agency}. A parcel in your name contains illegal items. Do not disconnect this call. Join the Skype video verification now.",
        "Sir aapke Aadhaar se ek SIM card mila hai jo money laundering mein use hua. Yeh {agency} ki investigation hai, kisi ko mat batana.",
        "You are under digital arrest by {agency}. Transfer Rs {amount} to the RBI verification account for clearance.",
        "{agency} speaking. Your bank account is linked to a terror funding case. Stay on the call, do not tell anyone, not even family.",
        "We are from {agency}. To prove your money is clean, deposit it in this safe government account {upi}. It will be returned in 2 hours.",
        "Warrant issued in your name by {agency}. Video call verification is mandatory within {hours} or the arrest team will reach your home.",
        "Aapka case CBI ke paas hai. Camera on rakhein, room se bahar mat jaiye, warna arrest hoga.",
    ],
    "otp_phishing": [
        "Sir I am calling from {bank}. To reverse the wrong transaction please share the OTP you just received.",
        "Your card is blocked. Tell us the 6 digit OTP sent on your mobile to unblock it immediately.",
        "{wallet} customer care: aapko jo OTP aaya hai woh humein batayein, tabhi refund process hoga.",
        "To complete your KYC please share the OTP and your debit card CVV with our executive on this call.",
        "Verification pending. Reply with the OTP received from {bank} to confirm you are the account holder.",
        "Hum {bank} se hain, aapke account mein galat paisa aa gaya hai. OTP share kijiye taaki wapas ho sake.",
        "Send us the OTP and UPI PIN to activate your cashback of Rs {amount}.",
    ],
    "upi_collect": [
        "You have a collect request of Rs {amount} from {upi}. Enter your UPI PIN to receive your refund.",
        "Refund initiated. Approve the payment request of Rs {amount} and enter PIN to get the money credited.",
        "Aapka refund ready hai. Request accept karke UPI PIN daaliye, paisa turant aa jayega.",
        "OLX buyer here, I am an army officer, I have sent Rs {amount}. Scan this QR code to receive the money.",
        "To receive your cashback of Rs {amount} scan the QR and enter your UPI PIN now.",
        "Payment request of Rs 1 sent for account verification. Approve it with PIN, then we will credit Rs {amount}.",
        "Electricity bill refund of Rs {amount} pending. Accept the collect request from {upi} using PIN.",
    ],
    "delivery_parcel": [
        "Your parcel is held at customs due to an incomplete address. Pay Rs {amount} clearance fee here {bad_link}",
        "India Post: shipment could not be delivered. Update the address within {hours} at {bad_link} or it will be returned.",
        "Aapka courier customs mein ruka hai. Rs {amount} duty {upi} par bhejein warna wapas chala jayega.",
        "FedEx: your package contains prohibited items. Call our officer immediately or legal action will follow.",
        "Delivery failed. Reschedule by paying a Rs 25 verification charge at {bad_link}",
        "Your Amazon order is stuck. Confirm card details at {bad_link} within {hours} to release the parcel.",
    ],
    "loan_app": [
        "Instant loan Rs {amount} approved without documents! Download our app from {bad_link} and get money in 5 minutes.",
        "Pre-approved personal loan of Rs {amount}. No CIBIL check. Pay Rs 999 processing fee at {upi} to disburse.",
        "Bina document ke loan chahiye? Turant {amount} paayein. App download karein {bad_link}",
        "Your loan is sanctioned. To release funds pay an insurance charge of Rs {amount} to {upi} today only.",
        "Loan recovery: pay Rs {amount} now or we will send your photo to all your contacts.",
        "Emergency cash loan approved! Zero interest first month. Click {bad_link} and allow contacts and gallery access.",
    ],
    "romance_matrimonial": [
        "Hello dear, I am a doctor working in the UK. I want to send you a gift parcel, just pay the customs fee of Rs {amount}.",
        "We matched on the matrimony site. I am posted abroad in the army. Please send Rs {amount} for my leave papers.",
        "My love, I am stuck at Delhi airport, customs is asking Rs {amount}. Please transfer to {upi}, I will return it.",
        "Aapse baat karke accha laga. Main foreign se gift bhej raha hoon, bas custom charge {amount} bhar dijiye.",
        "I have transferred my inheritance to your name. Send Rs {amount} legal fee to {upi} to complete the transfer.",
    ],
    "tech_support": [
        "Microsoft alert: your computer is infected with 5 viruses. Call our toll free number now for immediate removal.",
        "Your Windows license has expired. Allow remote access via AnyDesk so our engineer can fix it. Fee Rs {amount}.",
        "WiFi router hacked. Install this app {bad_link} and share your screen so we can secure your device.",
        "Aapka phone hack ho gaya hai. AnyDesk install karke screen share kijiye, hum theek kar denge.",
        "Antivirus subscription auto renewed for Rs {amount}. To cancel, call us and install our refund tool.",
    ],
    "charity_donation": [
        "Urgent: the flood relief fund needs your help. Donate Rs {amount} to {upi} and save lives today.",
        "PM Relief Fund special drive. Send a donation to {upi} and get a 100% tax exemption certificate instantly.",
        "Cancer patient bachi ki jaan bachaiye, Rs {amount} donate karein {upi} par. Aaj hi zaroorat hai.",
        "NGO temple donation drive, transfer to {upi}. Your name will be announced in the prayer in {hours}.",
    ],
    "safe_none": [
        "Your OTP for login is {otp}. Do not share this OTP with anyone. - {bank}",
        "{otp} is your One Time Password for a {wallet} transaction of Rs {amount}. Valid for 10 minutes. Never share it.",
        "Dear Customer, Rs {amount} debited from your {bank} A/c XX4521 on 12-08 to VPA grocerystore@okhdfc. Not you? Call the number on your card.",
        "Your {bank} A/c XX8834 is credited with Rs {amount} salary on 01-09. Available balance Rs 62,410.",
        "Your Amazon order 402-3399 has been shipped and will arrive by Friday. Track at {good_link}",
        "Reminder: your electricity bill of Rs {amount} is due on the 20th. Pay via the official app to avoid a late fee.",
        "Your train PNR 4523118090 is confirmed, coach B4 seat 22. Happy journey - IRCTC.",
        "Hi, this is Ramesh from the plumbing service. I will reach your flat around 5 PM today.",
        "Your appointment with Dr. Sharma is confirmed for Tuesday 11:00 AM at the clinic.",
        "{wallet}: You paid Rs {amount} to Kirana Store. UPI Ref 3348219. Thank you.",
        "Mummy, main office se nikal gaya hoon, ghar aane mein 40 minute lagenge.",
        "Your monthly statement for the {bank} credit card is ready. View it on the official app or {good_link}",
        "Congratulations, your {bank} fixed deposit of Rs {amount} has matured. Visit your branch or netbanking to renew.",
        "Swiggy: your order from Biryani House is out for delivery, arriving in 12 minutes.",
        "Team, the project review meeting is moved to 3 PM tomorrow in conference room 2.",
        "Your gas cylinder booking is confirmed. Delivery expected within 2 working days.",
        "School notice: parent teacher meeting on Saturday 10 AM. Kindly attend.",
        "Aapka recharge Rs {amount} ka safal raha. Validity 28 din.",
        "Your policy premium of Rs {amount} has been received. The policy remains active. Thank you.",
        "Zomato: Your refund of Rs 249 has been processed to the original payment method in 3-5 working days.",
        "Hello, this is the courier boy, I am at your gate with an Amazon package. Please come down.",
        "Your {bank} debit card ending 7712 has been dispatched and will reach you in 5 working days.",
        "Flight 6E-2043 Delhi to Pune is on time, boarding at gate 14 from 6:20 PM.",
        "Doctor said the reports are normal. Nothing to worry about. Will call you in the evening.",
        "Your CIBIL score has been updated to 782. Check the detailed report on the official website.",
        "{wallet}: Rs {amount} paid to {merchant}. UPI Ref {ref}. Your balance has been updated.",
        "Hi {name}, the {city} office visit is confirmed for next Tuesday. Travel desk will share the tickets.",
        "{bank}: Rs {amount} has been credited to your account by NEFT from {name}. Ref {ref}.",
        "Your order from {merchant} is packed and will be delivered to your {city} address tomorrow.",
        "{name} here from {merchant} support. Your replacement request {ref} is approved, pickup is scheduled tomorrow.",
        "Dear customer, your {bank} cheque book request {ref} has been dispatched to your registered address in {city}.",
        "{otp} is the verification code for your {wallet} account. This code is only for you. We will never call to ask for it.",
        "Your UPI mandate for the SIP of Rs {amount} will be debited on the 5th. No action needed.",
        "{merchant} loyalty: you earned 120 points on your last visit. Points never expire and no payment is needed to claim them.",
        "Hi {name}, sending the meeting notes from today. Let me know if I missed anything.",
        "Your {bank} account statement for August is attached in the secure inbox at {good_link}",
        "Reminder from the {city} municipal office: property tax can be paid online until 31st on the official portal.",
        "{name}, the plumber is coming at 6 PM. Please keep the main door open.",
        "Your {wallet} autopay for the mobile recharge of Rs {amount} was successful. Validity extended by 28 days.",
        "Congratulations {name}, your leave request has been approved by your manager.",
        "{bank} branch in {city} will remain closed on Saturday for the regional holiday. ATMs will work as usual.",
        "Your test results from the {city} lab are ready. Collect them from the reception or download from the portal.",
        "{merchant} sale starts Friday. Up to 40% off in store. No coupon or advance payment required.",
        "Hi, this is {name} from the {city} showroom. Your car service is complete, you can pick it up anytime today.",
    ],
}

# ------------------------------------------------------------------ curated seeds
# Verbatim, realistic examples that no template captures well.
SEEDS: list[tuple[str, str]] = [
    ("Dear SBI user, your account has been temporarily suspended for security reasons. Verify now at http://sbi-online-verify.info or your funds will be frozen permanently.", "kyc_bank"),
    ("YONO SBI: Your account will be blocked today because your PAN card is not updated. Update here http://yono-sbi-update.xyz/pan", "kyc_bank"),
    ("Aapka SBI YONO account aaj band ho jayega. PAN update karein: http://sbi-pan-kyc.top", "kyc_bank"),
    ("Attention customer, your net banking password expires in 3 hours. Reset immediately using this secure link http://bit.ly/nbreset otherwise access will be denied.", "kyc_bank"),
    ("Your ATM card is blocked due to KYC. Please send a photo of your card front and back on WhatsApp for reactivation.", "kyc_bank"),
    ("Dear customer, we have detected your Aadhaar is not linked. Share your Aadhaar number and OTP to link it before midnight.", "kyc_bank"),
    ("You have won Rs 25,00,000 in the KBC Sony Lucky Draw. Your lucky number is 8547. Contact Mr. Rana on WhatsApp to claim your prize.", "lottery_prize"),
    ("Aapko KBC lottery mein 25 lakh ka inaam mila hai. Jaldi karein, sirf aaj tak valid hai. Registration fees 6500 rupaye.", "lottery_prize"),
    ("Dear winner, your number won a Tata Safari in our anniversary draw. Pay Rs 18,500 RTO charges to take delivery.", "lottery_prize"),
    ("URGENT HIRING: Earn 2000-5000 daily from home. Only need a mobile phone. No target no boss. WhatsApp us to start.", "job_investment"),
    ("Sir aapko prepaid task diya gaya hai. 3 task complete karke 1500 rupaye kamayein. Pehle 5000 deposit karna hoga.", "job_investment"),
    ("Join our VIP trading group. Yesterday members made 4 lakh profit. Guaranteed daily returns, zero risk. Deposit minimum 10000.", "job_investment"),
    ("Your account has been credited with 1500 as task reward. To withdraw, first recharge 8000 to upgrade to VIP2 level.", "job_investment"),
    ("Do not cut the call. This is Inspector Sharma from Mumbai Cyber Crime. Your Aadhaar is used in a 6 crore money laundering case. You are under digital arrest.", "digital_arrest"),
    ("Sir yeh CBI ka official notice hai. Aapko 24 ghante tak camera ke saamne rehna hoga. Kisi ko batayenge to case badh jayega.", "digital_arrest"),
    ("Customs has seized a parcel in your name containing narcotics and 5 passports. Join the Skype call with the officer now.", "digital_arrest"),
    ("Transfer your entire bank balance to this RBI verification account. After the audit the money will be returned within 3 hours. Do not inform anyone.", "digital_arrest"),
    ("Madam your son is arrested in a serious case. Send Rs 50,000 immediately to settle the matter, do not tell your husband.", "digital_arrest"),
    ("Hello, I am calling from the HDFC card division. Your reward points of 8500 are expiring. Please tell me the OTP received to redeem them.", "otp_phishing"),
    ("Sir OTP mat batana kisi ko, sirf mujhe bata dijiye kyunki main bank se hi bol raha hoon.", "otp_phishing"),
    ("Dear customer, to stop the unauthorised transaction of Rs 49,999 reply with the OTP sent to your registered mobile.", "otp_phishing"),
    ("A collect request of Rs 24,999 has been received. Enter your UPI PIN in the next 5 minutes to receive the amount in your account.", "upi_collect"),
    ("Sir main army mein hoon, transfer ho gaya hai isliye fridge bech raha hoon. Maine paise bhej diye hain, QR scan karke PIN daaliye.", "upi_collect"),
    ("Refund of Rs 3,499 for your cancelled order is ready. Approve the PhonePe request and enter PIN to credit the amount.", "upi_collect"),
    ("Your India Post parcel PKT8823 is on hold. Pay Rs 45 redelivery charge at http://indiapost-redeliver.click/pay within 24 hours.", "delivery_parcel"),
    ("DHL: your international shipment needs a customs duty of Rs 3,200. Pay to customs.clearance@okaxis to release it today.", "delivery_parcel"),
    ("Get an instant loan up to 5 lakh without documents. Just download the RupeeFast app and allow permissions. Money in 10 minutes.", "loan_app"),
    ("Aapka loan approve ho gaya hai. Sirf 1499 file charge bhejiye, phir 2 lakh account mein aa jayega.", "loan_app"),
    ("You have not repaid the loan. We will call all your contacts and share your photos unless you pay Rs 12,000 now.", "loan_app"),
    ("Hi dear, I saw your profile on the matrimony app. I am an NRI engineer in London. I want to send you a gift, please pay the customs fee of Rs 45,000.", "romance_matrimonial"),
    ("Jaan main airport par phans gaya hoon, custom wale 60000 maang rahe hain. Please bhej do, wapas kar dunga.", "romance_matrimonial"),
    ("This is Microsoft technical support. Your PC IP address is compromised and hackers are stealing your bank data. Do not switch off, call us now.", "tech_support"),
    ("Sir screen share kijiye AnyDesk se, hum aapka phone virus free kar denge, sirf 2999 charge lagega.", "tech_support"),
    ("Save little Aarav, 4 years old, needs urgent heart surgery. Donate any amount to helpaarav@ybl. Please forward to 10 groups.", "charity_donation"),
    ("Temple renovation fund, donate 501 or 1100 to templefund@upi and receive prasad at home. Blessings guaranteed.", "charity_donation"),
    ("Your OTP for login is 738291. Do not share this OTP with anyone.", "safe_none"),
    ("738291 is your OTP for SBI netbanking login. Valid for 5 minutes. SBI never asks for your OTP.", "safe_none"),
    ("Rs 2,000 debited from A/c XX1123 on 05-09-26 towards UPI to swiggy@icici. Ref 552389.", "safe_none"),
    ("Your KYC has been successfully updated at the branch. No further action is required from your side.", "safe_none"),
    ("Aapka OTP 442198 hai. Kisi ke saath share na karein. Bank kabhi OTP nahi maangta.", "safe_none"),
    ("Beta ghar kab aa raha hai? Khana bana ke rakha hai.", "safe_none"),
    ("Your cab is arriving in 3 minutes. Driver Suresh, white hatchback, DL3C 4421.", "safe_none"),
    ("Interview scheduled for Monday 11 AM at our Noida office. Please bring two copies of your resume. No fee is charged at any stage.", "safe_none"),
    ("Your Netflix subscription renews on 14 Sep for Rs 649. Manage your plan in the app.", "safe_none"),
    ("Thank you for your donation of Rs 1,000. Your 80G receipt has been emailed to you.", "safe_none"),
    ("Result declared. Your semester 4 marks are available on the university portal. Login with your roll number.", "safe_none"),
    ("Water supply will be interrupted tomorrow 10 AM to 2 PM for pipeline maintenance.", "safe_none"),
    ("Package delivered. Your Flipkart order was handed over at the security desk.", "safe_none"),
    ("Sir, this is Rahul from your insurance branch. Your policy document is ready, you can collect it or I can courier it. There is no payment pending.", "safe_none"),
    ("Hello, calling from the clinic to remind you about your dental appointment tomorrow at 4 PM. Reply YES to confirm.", "safe_none"),
    ("Your salary slip for August has been uploaded to the employee portal.", "safe_none"),
    ("Match update: India won by 6 wickets. What a finish!", "safe_none"),
    ("Aaj shaam ko market chalenge? Sabzi khatam ho gayi hai.", "safe_none"),
    ("Your SIP of Rs 5,000 in the index fund has been processed for this month.", "safe_none"),
    ("Library reminder: the book you borrowed is due for return on 14 September.", "safe_none"),
]


def fill(template: str) -> str:
    return (
        template.replace("{bank}", random.choice(BANKS))
        .replace("{wallet}", random.choice(WALLETS))
        .replace("{bad_link}", random.choice(BAD_LINKS))
        .replace("{good_link}", random.choice(GOOD_LINKS))
        .replace("{amount}", random.choice(AMOUNTS))
        .replace("{prize}", random.choice(PRIZES))
        .replace("{hours}", random.choice(HOURS))
        .replace("{upi}", random.choice(UPIS))
        .replace("{agency}", random.choice(AGENCIES))
        .replace("{otp}", str(random.randint(100000, 999999)))
        .replace("{merchant}", random.choice(MERCHANTS))
        .replace("{name}", random.choice(NAMES))
        .replace("{city}", random.choice(CITIES))
        .replace("{ref}", str(random.randint(1000000, 9999999)))
    )


def build_rows() -> list[dict]:
    rows: dict[str, dict] = {}

    def add(text: str, category: str) -> None:
        text = " ".join(text.split())
        if text and text not in rows:
            rows[text] = {
                "text": text,
                "label": "safe" if category == "safe_none" else "scam",
                "category": category,
            }

    for text, category in SEEDS:
        add(text, category)

    # Expand each template several times; safe gets a bigger multiplier so the
    # final corpus stays close to a 55/45 scam-to-safe balance.
    for category, templates in TEMPLATES.items():
        repeats = 9 if category == "safe_none" else 4
        for template, _ in itertools.product(templates, range(repeats)):
            add(fill(template), category)

    return list(rows.values())


def main() -> None:
    rows = build_rows()
    random.shuffle(rows)
    with OUT.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["text", "label", "category"])
        writer.writeheader()
        writer.writerows(rows)

    scam = sum(r["label"] == "scam" for r in rows)
    print(f"Wrote {len(rows)} rows to {OUT}")
    print(f"  scam: {scam}   safe: {len(rows) - scam}")
    by_cat: dict[str, int] = {}
    for r in rows:
        by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
    for cat in sorted(by_cat):
        print(f"  {cat:24s} {by_cat[cat]}")


if __name__ == "__main__":
    main()
