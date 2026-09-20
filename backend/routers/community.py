"""Community reporting: submit a scam you received, and read the verified feed."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from engines import fusion
from models import CommunityReport, ThreatIntel, User, utcnow
from schemas import ReportCreate, ReportOut, ReportPage, ReportPatch
from security import get_optional_user, require_analyst

router = APIRouter(prefix="/api/community", tags=["community"])


@router.post("/report", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def submit_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> ReportOut:
    content = payload.content.strip()[: settings.max_stored_content_chars]

    # Run the report through the pipeline so obvious scams are auto-verified and
    # the feed is useful immediately, instead of waiting on a human reviewer.
    result = fusion.analyze(content, payload.channel, db=db)
    category = payload.claimed_category
    if category in ("", "safe_none", "unknown"):
        category = result["category"]

    report = CommunityReport(
        user_id=user.id if user else None,
        channel=payload.channel,
        content=content,
        claimed_category=category,
        status="verified" if result["risk_score"] >= 65 else "pending",
    )
    db.add(report)

    if result["risk_score"] >= 65:
        for kind, values in (
            ("domain", result["entities"].get("domains", [])),
            ("upi", result["entities"].get("upi_ids", [])),
            ("phone", [p[-10:] for p in result["entities"].get("phones", [])]),
        ):
            for value in values[:3]:
                value = value.lower()
                row = (
                    db.query(ThreatIntel)
                    .filter(
                        ThreatIntel.indicator_type == kind,
                        ThreatIntel.indicator_value == value,
                    )
                    .first()
                )
                if row:
                    row.report_count += 1
                    row.last_seen = utcnow()
                else:
                    db.add(
                        ThreatIntel(
                            indicator_type=kind,
                            indicator_value=value,
                            risk_level="medium",
                            report_count=1,
                            source="community",
                        )
                    )

    db.commit()
    db.refresh(report)
    return ReportOut.model_validate(report)


@router.get("/reports", response_model=ReportPage)
def list_reports(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    category: str | None = None,
    channel: str | None = None,
    status_filter: str = Query("verified", alias="status"),
) -> ReportPage:
    query = db.query(CommunityReport)
    if status_filter != "all":
        query = query.filter(CommunityReport.status == status_filter)
    if category:
        query = query.filter(CommunityReport.claimed_category == category)
    if channel:
        query = query.filter(CommunityReport.channel == channel)

    total = query.count()
    items = (
        query.order_by(CommunityReport.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ReportPage(
        items=[ReportOut.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.patch("/reports/{report_id}", response_model=ReportOut)
def review_report(
    report_id: int,
    payload: ReportPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
) -> ReportOut:
    report = db.query(CommunityReport).filter(CommunityReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="That report could not be found.")

    report.status = payload.status
    report.reviewed_by = user.id
    db.commit()
    db.refresh(report)
    return ReportOut.model_validate(report)
