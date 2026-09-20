"""API and engine tests.

Runs against a throwaway SQLite file so a developer's seeded demo database is
never touched.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_TMP_DB = Path(tempfile.gettempdir()) / "scamshield_test.db"
if _TMP_DB.exists():
    _TMP_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB.as_posix()}"

from fastapi.testclient import TestClient  # noqa: E402

from database import Base, engine  # noqa: E402
from engines import fusion, rules, upi_engine, url_engine  # noqa: E402
from main import app  # noqa: E402

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

USER = {
    "email": "tester@scamshield.in",
    "password": "Tester@123",
    "full_name": "Test User",
}

FAKE_KYC = (
    "Dear Customer, your SBI account will be blocked within 2 hours due to incomplete "
    "KYC. Update immediately at http://sbi-verify-kyc.info/update"
)
GENUINE_OTP = "Your OTP for login is 738291. Do not share this OTP with anyone."


@pytest.fixture(scope="module")
def token() -> str:
    client.post("/api/auth/register", json=USER)
    response = client.post(
        "/api/auth/login",
        data={"username": USER["email"], "password": USER["password"]},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------- system
def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ----------------------------------------------------------------------- auth
def test_register_duplicate_is_rejected(token):
    response = client.post("/api/auth/register", json=USER)
    assert response.status_code == 409


def test_login_with_wrong_password_fails():
    response = client.post(
        "/api/auth/login", data={"username": USER["email"], "password": "nope"}
    )
    assert response.status_code == 401


def test_me_requires_auth():
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_profile(auth):
    response = client.get("/api/auth/me", headers=auth)
    assert response.status_code == 200
    assert response.json()["email"] == USER["email"]


def test_register_rejects_bad_email():
    response = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "Abcdef1", "full_name": "X"},
    )
    assert response.status_code == 422


# -------------------------------------------------------------------- analyze
def test_analyze_works_without_login():
    response = client.post("/api/analyze", json={"content": FAKE_KYC, "channel": "message"})
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "High Risk"
    assert body["risk_score"] >= 65
    assert body["category"] == "kyc_bank"
    assert len(body["reasons"]) >= 4
    assert body["playbook"]["report_to"]


def test_genuine_otp_message_is_safe():
    response = client.post("/api/analyze", json={"content": GENUINE_OTP})
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "Safe"
    assert body["category"] == "safe_none"


def test_analyze_extracts_entities():
    response = client.post(
        "/api/analyze",
        json={
            "content": "Pay Rs 4,999 to winner.claim@paytm or call 9812345601. Link http://sbi-kyc-verify.info/x",
            "channel": "message",
        },
    )
    body = response.json()
    entities = body["entities"]
    assert "winner.claim@paytm" in entities["upi_ids"]
    assert "9812345601" in entities["phones"]
    assert entities["urls"]
    assert entities["amounts"]


def test_analyze_rejects_empty_content():
    assert client.post("/api/analyze", json={"content": "   "}).status_code == 422


def test_analyze_rejects_unknown_channel():
    response = client.post("/api/analyze", json={"content": "hello", "channel": "fax"})
    assert response.status_code == 422


def test_analyze_returns_explanation_tokens():
    body = client.post("/api/analyze", json={"content": FAKE_KYC}).json()
    assert body["explanation_tokens"]
    assert all("token" in t and "weight" in t for t in body["explanation_tokens"])


def test_bulk_analyze(auth):
    csv_body = (
        "content,channel\n"
        f'"{GENUINE_OTP}",message\n'
        '"You have won Rs 25 Lakh in the lucky draw. Pay Rs 4999 processing fee to claim.",message\n'
        '"A collect request of Rs 9999 received. Enter your UPI PIN to receive the refund.",upi\n'
    )
    response = client.post(
        "/api/analyze/bulk",
        files={"file": ("messages.csv", csv_body, "text/csv")},
        headers=auth,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["total"] == 3
    assert body["summary"]["high_risk"] >= 2


def test_bulk_rejects_wrong_file_type(auth):
    response = client.post(
        "/api/analyze/bulk",
        files={"file": ("photo.png", b"\x89PNG", "image/png")},
        headers=auth,
    )
    assert response.status_code == 400


# ----------------------------------------------------------------------- scans
def test_scan_history_requires_auth():
    assert client.get("/api/scans").status_code == 401


def test_scan_history_lists_own_scans(auth):
    client.post("/api/analyze", json={"content": FAKE_KYC}, headers=auth)
    response = client.get("/api/scans", headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert body["items"][0]["verdict"] in ("Safe", "Suspicious", "High Risk")


def test_scan_filters_and_detail(auth):
    client.post("/api/analyze", json={"content": FAKE_KYC}, headers=auth)
    listing = client.get("/api/scans?verdict=High Risk&channel=message", headers=auth).json()
    assert listing["total"] >= 1
    scan_id = listing["items"][0]["id"]

    detail = client.get(f"/api/scans/{scan_id}", headers=auth)
    assert detail.status_code == 200
    assert detail.json()["id"] == scan_id


def test_scan_detail_404(auth):
    assert client.get("/api/scans/does-not-exist", headers=auth).status_code == 404


def test_scan_bad_date_filter_is_422_not_500(auth):
    response = client.get("/api/scans?date_from=yesterday", headers=auth)
    assert response.status_code == 422


def test_scan_export_csv(auth):
    response = client.get("/api/scans/export?format=csv", headers=auth)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "scan_id" in response.text


def test_delete_own_scan(auth):
    scan_id = client.post("/api/analyze", json={"content": FAKE_KYC}, headers=auth).json()["scan_id"]
    assert client.delete(f"/api/scans/{scan_id}", headers=auth).status_code == 204
    assert client.get(f"/api/scans/{scan_id}", headers=auth).status_code == 404


# ------------------------------------------------------------------- dashboard
def test_dashboard_summary():
    response = client.get("/api/dashboard/summary?days=30")
    assert response.status_code == 200
    body = response.json()
    for key in (
        "total_scans",
        "high_risk_count",
        "threats_blocked",
        "estimated_money_protected",
        "pct_change_vs_prev_period",
    ):
        assert key in body


def test_dashboard_timeseries_length():
    body = client.get("/api/dashboard/timeseries?days=14").json()
    assert len(body) == 15
    assert set(body[0]) == {"date", "total", "high_risk", "suspicious", "safe"}


def test_dashboard_categories_and_channels():
    assert client.get("/api/dashboard/categories").status_code == 200
    channels = client.get("/api/dashboard/channels").json()
    assert len(channels) == 5


def test_dashboard_top_threats_and_alerts():
    assert client.get("/api/dashboard/top-threats").status_code == 200
    assert client.get("/api/dashboard/alerts").status_code == 200
    assert client.get("/api/dashboard/geography").status_code == 200


def test_dashboard_rejects_bad_days():
    assert client.get("/api/dashboard/timeseries?days=9999").status_code == 422


# ----------------------------------------------------------------------- intel
def test_intel_lookup_detects_types():
    domain = client.get("/api/intel/lookup", params={"value": "sbi-kyc-verify.info"}).json()
    assert domain["detected_type"] == "domain"

    upi = client.get("/api/intel/lookup", params={"value": "winner.claim@paytm"}).json()
    assert upi["detected_type"] == "upi"

    phone = client.get("/api/intel/lookup", params={"value": "9812345601"}).json()
    assert phone["detected_type"] == "phone"


def test_intel_lookup_flags_promoted_indicator():
    client.post("/api/analyze", json={"content": FAKE_KYC})
    body = client.get("/api/intel/lookup", params={"value": "sbi-verify-kyc.info"}).json()
    assert body["known_bad"] is True
    assert body["report_count"] >= 1


def test_intel_listing_is_public():
    assert client.get("/api/intel").status_code == 200


def test_intel_create_requires_analyst(auth):
    response = client.post(
        "/api/intel",
        json={"indicator_type": "domain", "indicator_value": "evil.example", "risk_level": "high"},
        headers=auth,
    )
    assert response.status_code == 403


# ------------------------------------------------------------------- community
def test_community_submit_and_feed():
    response = client.post(
        "/api/community/report",
        json={
            "channel": "message",
            "content": "I got an SMS saying my SBI account will be blocked, link was http://sbi-pan-kyc.top",
            "claimed_category": "kyc_bank",
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] in ("verified", "pending")

    feed = client.get("/api/community/reports?status=all")
    assert feed.status_code == 200
    assert feed.json()["total"] >= 1


def test_community_rejects_short_content():
    response = client.post("/api/community/report", json={"channel": "message", "content": "hi"})
    assert response.status_code == 422


def test_community_review_requires_analyst(auth):
    response = client.patch("/api/community/reports/1", json={"status": "verified"}, headers=auth)
    assert response.status_code == 403


# --------------------------------------------------------------------- engines
def test_negation_aware_credential_rule():
    """A genuine OTP alert must not trigger the credential-request rule."""
    hits = {h.rule_id for h in rules.evaluate(GENUINE_OTP)}
    assert "credential_request" not in hits

    asked = {h.rule_id for h in rules.evaluate("Please share the OTP you received on your mobile.")}
    assert "credential_request" in asked


def test_url_engine_trusts_official_domains():
    assert url_engine.analyze_url("https://www.onlinesbi.sbi")["score"] == 0
    assert url_engine.analyze_url("http://sbi-verify-kyc.info/update")["score"] > 20


def test_url_engine_flags_raw_ip_and_shortener():
    assert url_engine.analyze_url("http://192.168.44.10/netbanking")["score"] > 15
    assert url_engine.analyze_url("http://bit.ly/3xKyc9")["score"] > 10


def test_upi_engine_detects_pin_to_receive():
    result = upi_engine.analyze(
        "Enter your UPI PIN to receive the refund of Rs 9,999", "upi"
    )
    assert result["score"] >= 25


def test_upi_extraction_ignores_email_addresses():
    assert upi_engine.extract_upi_ids("write to me at ravi@gmail.com") == []
    assert upi_engine.extract_upi_ids("pay to ravi@okaxis") == ["ravi@okaxis"]


@pytest.mark.parametrize(
    "text,channel,expected",
    [
        (GENUINE_OTP, "message", "Safe"),
        ("Beta ghar kab aa raha hai? Khana bana ke rakha hai.", "message", "Safe"),
        (FAKE_KYC, "message", "High Risk"),
        (
            "Do not disconnect. This is the CBI. You are under digital arrest. Transfer your "
            "balance to the RBI verification account and do not tell anyone.",
            "call",
            "High Risk",
        ),
        (
            "A collect request of Rs 24,999 received. Enter your UPI PIN to receive the refund.",
            "upi",
            "High Risk",
        ),
    ],
)
def test_verdict_bands(text, channel, expected):
    assert fusion.analyze(text, channel)["verdict"] == expected


def test_reasons_are_plain_language():
    """User-facing reasons must not leak rule ids, regex or engine jargon."""
    body = client.post("/api/analyze", json={"content": FAKE_KYC}).json()
    banned = ["regex", "rule_id", "tf-idf", "tfidf", "classifier", "None", "\\b", "_"]
    for reason in body["reasons"]:
        text = reason["reason"]
        assert text[0].isupper()
        for token in banned:
            assert token not in text, f"jargon '{token}' leaked into: {text}"


def test_analysis_is_deterministic():
    first = fusion.analyze(FAKE_KYC, "message")
    second = fusion.analyze(FAKE_KYC, "message")
    assert first["risk_score"] == second["risk_score"]
    assert first["category"] == second["category"]
