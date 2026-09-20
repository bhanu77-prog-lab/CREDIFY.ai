"""Dashboard aggregates.

The dashboard is the analyst view: it aggregates across every scan the platform
has seen, not just the signed-in user's, which is what makes the trend lines and
the top-indicator table meaningful.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from engines.categorizer import CATEGORY_LABELS, label_for
from engines.fusion import CHANNEL_LABELS
from models import Alert, Scan, ThreatIntel
from schemas import (
    AlertOut,
    CategoryStat,
    ChannelStat,
    DashboardSummary,
    GeoStat,
    TimeseriesPoint,
    TopThreat,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Average amount at stake per scam type, used to estimate money protected.
# Rounded, conservative figures reflecting the shape of reported losses in India:
# investment fraud dominates by value, digital arrest is next.
AVG_EXPOSURE = {
    "job_investment": 145000,
    "digital_arrest": 210000,
    "kyc_bank": 38000,
    "otp_phishing": 32000,
    "upi_collect": 21000,
    "lottery_prize": 26000,
    "delivery_parcel": 9500,
    "loan_app": 15000,
    "romance_matrimonial": 88000,
    "tech_support": 24000,
    "charity_donation": 6500,
    "safe_none": 0,
}

# Report volume by state. Clearly labelled as sample data in the UI.
GEO_SAMPLE = [
    ("Maharashtra", 148), ("Uttar Pradesh", 131), ("Karnataka", 112),
    ("Delhi", 104), ("Tamil Nadu", 89), ("Gujarat", 78), ("Telangana", 71),
    ("West Bengal", 64), ("Rajasthan", 57), ("Madhya Pradesh", 49),
]


def _window(days: int) -> tuple[datetime, datetime]:
    end = datetime.now(timezone.utc).replace(tzinfo=None)
    return end - timedelta(days=days), end


def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _daily_counts(db: Session, start: datetime, end: datetime) -> dict[str, dict[str, int]]:
    rows = (
        db.query(
            func.date(Scan.created_at).label("day"),
            Scan.verdict,
            func.count(Scan.id),
        )
        .filter(Scan.created_at >= start, Scan.created_at <= end)
        .group_by("day", Scan.verdict)
        .all()
    )
    out: dict[str, dict[str, int]] = defaultdict(lambda: {"High Risk": 0, "Suspicious": 0, "Safe": 0})
    for day, verdict, count in rows:
        key = str(day)[:10]
        if verdict in out[key]:
            out[key][verdict] = count
    return out


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), days: int = Query(30, ge=1, le=365)) -> DashboardSummary:
    start, end = _window(days)
    prev_start = start - timedelta(days=days)

    def window_stats(a: datetime, b: datetime) -> tuple[int, int, int]:
        rows = (
            db.query(Scan.verdict, func.count(Scan.id))
            .filter(Scan.created_at >= a, Scan.created_at < b)
            .group_by(Scan.verdict)
            .all()
        )
        counts = {verdict: count for verdict, count in rows}
        total = sum(counts.values())
        high = counts.get("High Risk", 0)
        blocked = high + counts.get("Suspicious", 0)
        return total, high, blocked

    total, high, blocked = window_stats(start, end + timedelta(seconds=1))
    prev_total, prev_high, prev_blocked = window_stats(prev_start, start)

    def money(a: datetime, b: datetime) -> int:
        rows = (
            db.query(Scan.category, func.count(Scan.id))
            .filter(
                Scan.created_at >= a,
                Scan.created_at < b,
                Scan.verdict == "High Risk",
            )
            .group_by(Scan.category)
            .all()
        )
        return sum(AVG_EXPOSURE.get(category, 20000) * count for category, count in rows)

    protected = money(start, end + timedelta(seconds=1))
    prev_protected = money(prev_start, start)

    daily = _daily_counts(db, start, end)
    spark_days = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days + 1)]
    spark_total, spark_high, spark_blocked, spark_money = [], [], [], []
    for day in spark_days:
        entry = daily.get(day, {"High Risk": 0, "Suspicious": 0, "Safe": 0})
        day_high = entry["High Risk"]
        spark_total.append(sum(entry.values()))
        spark_high.append(day_high)
        spark_blocked.append(day_high + entry["Suspicious"])
        spark_money.append(day_high * 45)

    return DashboardSummary(
        total_scans=total,
        high_risk_count=high,
        threats_blocked=blocked,
        estimated_money_protected=protected,
        pct_change_vs_prev_period={
            "total_scans": _pct_change(total, prev_total),
            "high_risk_count": _pct_change(high, prev_high),
            "threats_blocked": _pct_change(blocked, prev_blocked),
            "estimated_money_protected": _pct_change(protected, prev_protected),
        },
        sparklines={
            "total_scans": spark_total,
            "high_risk_count": spark_high,
            "threats_blocked": spark_blocked,
            "estimated_money_protected": spark_money,
        },
        period_days=days,
    )


@router.get("/timeseries", response_model=list[TimeseriesPoint])
def timeseries(
    db: Session = Depends(get_db), days: int = Query(30, ge=1, le=365)
) -> list[TimeseriesPoint]:
    start, end = _window(days)
    daily = _daily_counts(db, start, end)

    points: list[TimeseriesPoint] = []
    for i in range(days + 1):
        day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        entry = daily.get(day, {"High Risk": 0, "Suspicious": 0, "Safe": 0})
        points.append(
            TimeseriesPoint(
                date=day,
                total=sum(entry.values()),
                high_risk=entry["High Risk"],
                suspicious=entry["Suspicious"],
                safe=entry["Safe"],
            )
        )
    return points


@router.get("/categories", response_model=list[CategoryStat])
def categories(
    db: Session = Depends(get_db), days: int = Query(30, ge=1, le=365)
) -> list[CategoryStat]:
    start, end = _window(days)
    rows = (
        db.query(Scan.category, func.count(Scan.id))
        .filter(
            Scan.created_at >= start,
            Scan.created_at <= end,
            Scan.category != "safe_none",
        )
        .group_by(Scan.category)
        .order_by(func.count(Scan.id).desc())
        .all()
    )
    total = sum(count for _, count in rows) or 1
    return [
        CategoryStat(
            category=category,
            label=label_for(category),
            count=count,
            pct=round(count * 100 / total, 1),
        )
        for category, count in rows
    ]


@router.get("/channels", response_model=list[ChannelStat])
def channels(
    db: Session = Depends(get_db), days: int = Query(30, ge=1, le=365)
) -> list[ChannelStat]:
    start, end = _window(days)
    rows = (
        db.query(Scan.channel, func.count(Scan.id), func.avg(Scan.risk_score))
        .filter(Scan.created_at >= start, Scan.created_at <= end)
        .group_by(Scan.channel)
        .all()
    )
    found = {channel: (count, avg or 0) for channel, count, avg in rows}
    return [
        ChannelStat(
            channel=channel,
            label=label,
            count=found.get(channel, (0, 0))[0],
            avg_risk=round(float(found.get(channel, (0, 0))[1]), 1),
        )
        for channel, label in CHANNEL_LABELS.items()
    ]


@router.get("/top-threats", response_model=list[TopThreat])
def top_threats(db: Session = Depends(get_db), limit: int = Query(10, ge=1, le=50)) -> list[TopThreat]:
    rows = (
        db.query(ThreatIntel)
        .order_by(ThreatIntel.report_count.desc(), ThreatIntel.last_seen.desc())
        .limit(limit)
        .all()
    )
    return [
        TopThreat(
            value=row.indicator_value,
            type=row.indicator_type,
            count=row.report_count,
            risk_level=row.risk_level,
        )
        for row in rows
    ]


@router.get("/alerts", response_model=list[AlertOut])
def alerts(db: Session = Depends(get_db)) -> list[AlertOut]:
    rows = (
        db.query(Alert)
        .filter(Alert.active.is_(True))
        .order_by(Alert.created_at.desc())
        .limit(10)
        .all()
    )
    return [AlertOut.model_validate(row) for row in rows]


@router.get("/geography", response_model=list[GeoStat])
def geography() -> list[GeoStat]:
    total = sum(count for _, count in GEO_SAMPLE) or 1
    return [
        GeoStat(state=state, count=count, pct=round(count * 100 / total, 1))
        for state, count in GEO_SAMPLE
    ]


@router.get("/meta")
def meta() -> dict:
    """Taxonomy the frontend uses to build filter menus."""
    return {
        "categories": [{"value": k, "label": v} for k, v in CATEGORY_LABELS.items()],
        "channels": [{"value": k, "label": v} for k, v in CHANNEL_LABELS.items()],
        "verdicts": ["Safe", "Suspicious", "High Risk"],
    }
