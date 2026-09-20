"""Scan history: listing, filtering, detail, CSV export and deletion."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from engines.categorizer import label_for
from models import Scan, User
from schemas import ScanOut, ScanPage
from security import get_current_user

router = APIRouter(prefix="/api/scans", tags=["scans"])

SORT_FIELDS = {
    "created_at": Scan.created_at,
    "risk_score": Scan.risk_score,
    "channel": Scan.channel,
    "verdict": Scan.verdict,
    "category": Scan.category,
}


def _parse_date(value: str | None, field: str) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"{field} must look like 2026-09-01.",
    )


def _filtered_query(
    db: Session,
    user: User,
    channel: str | None,
    verdict: str | None,
    category: str | None,
    date_from: str | None,
    date_to: str | None,
    q: str | None,
):
    query = db.query(Scan).filter(Scan.user_id == user.id)

    if channel:
        query = query.filter(Scan.channel == channel)
    if verdict:
        query = query.filter(Scan.verdict == verdict)
    if category:
        query = query.filter(Scan.category == category)

    start = _parse_date(date_from, "date_from")
    end = _parse_date(date_to, "date_to")
    if start:
        query = query.filter(Scan.created_at >= start)
    if end:
        query = query.filter(Scan.created_at <= end.replace(hour=23, minute=59, second=59))
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter(
            or_(Scan.content.ilike(needle), Scan.category.ilike(needle))
        )
    return query


@router.get("", response_model=ScanPage)
@router.get("/", response_model=ScanPage, include_in_schema=False)
def list_scans(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    channel: str | None = None,
    verdict: str | None = None,
    category: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
) -> ScanPage:
    query = _filtered_query(db, user, channel, verdict, category, date_from, date_to, q)

    column = SORT_FIELDS.get(sort_by, Scan.created_at)
    query = query.order_by(column.asc() if sort_dir == "asc" else column.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return ScanPage(
        items=[ScanOut.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/export")
def export_scans(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    format: str = Query("csv", pattern="^csv$"),
    channel: str | None = None,
    verdict: str | None = None,
    category: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
) -> Response:
    query = _filtered_query(db, user, channel, verdict, category, date_from, date_to, q)
    rows = query.order_by(Scan.created_at.desc()).limit(5000).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["scan_id", "analyzed_at", "channel", "verdict", "risk_score", "category", "confidence", "top_reason", "content"]
    )
    for scan in rows:
        reasons = scan.reasons or []
        writer.writerow(
            [
                scan.id,
                scan.created_at.isoformat(),
                scan.channel,
                scan.verdict,
                scan.risk_score,
                label_for(scan.category),
                scan.confidence,
                (reasons[0].get("reason", "") if reasons else ""),
                scan.content.replace("\n", " "),
            ]
        )

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="credify-scans-{stamp}.csv"'
        },
    )


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ScanOut:
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="That scan could not be found.")
    if scan.user_id != user.id and user.role not in ("analyst", "admin"):
        raise HTTPException(status_code=403, detail="This scan belongs to another account.")
    return ScanOut.model_validate(scan)


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="That scan could not be found.")
    if scan.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own scans.")
    db.delete(scan)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
