"""Threat-intelligence blocklist: lookup, listing and analyst additions."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import ThreatIntel, User, utcnow
from schemas import IntelCreate, IntelLookup, IntelOut, IntelPage
from security import require_analyst

router = APIRouter(prefix="/api/intel", tags=["intel"])

PHONE_RE = re.compile(r"^\+?\d[\d\s\-]{7,15}$")
UPI_RE = re.compile(r"^[A-Za-z0-9._\-]{2,}@[A-Za-z][A-Za-z0-9]{1,20}$")
DOMAIN_RE = re.compile(r"^(?:https?://)?(?:www\.)?([A-Za-z0-9\-._]+\.[A-Za-z]{2,})", re.IGNORECASE)


def detect_type(value: str) -> tuple[str, str]:
    """Guess the indicator type and return (type, normalised value)."""
    raw = value.strip()
    if UPI_RE.match(raw) and "." not in raw.split("@")[-1]:
        return "upi", raw.lower()
    digits = re.sub(r"[\s\-+]", "", raw)
    if PHONE_RE.match(raw) and digits.isdigit() and 8 <= len(digits) <= 15:
        return "phone", digits[-10:]
    match = DOMAIN_RE.match(raw)
    if match:
        return "domain", match.group(1).lower()
    return "keyword", raw.lower()


@router.get("/lookup", response_model=IntelLookup)
def lookup(
    value: str = Query(..., min_length=1, max_length=255),
    db: Session = Depends(get_db),
) -> IntelLookup:
    indicator_type, normalised = detect_type(value)

    row = (
        db.query(ThreatIntel)
        .filter(
            ThreatIntel.indicator_type == indicator_type,
            ThreatIntel.indicator_value == normalised,
        )
        .first()
    )

    readable = {
        "domain": "website",
        "upi": "payment address",
        "phone": "phone number",
        "keyword": "phrase",
    }[indicator_type]

    if row:
        return IntelLookup(
            value=normalised,
            detected_type=indicator_type,
            known_bad=True,
            risk_level=row.risk_level,
            report_count=row.report_count,
            source=row.source,
            message=(
                f"This {readable} has been reported {row.report_count} time(s) and is on the "
                "CREDIFY.ai blocklist. Do not interact with it."
            ),
        )

    return IntelLookup(
        value=normalised,
        detected_type=indicator_type,
        known_bad=False,
        message=(
            f"This {readable} is not on our reported list. That does not prove it is safe - "
            "new scam addresses appear every day, so still check it carefully."
        ),
    )


@router.get("", response_model=IntelPage)
@router.get("/", response_model=IntelPage, include_in_schema=False)
def list_intel(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    indicator_type: str | None = None,
    risk_level: str | None = None,
    q: str | None = None,
) -> IntelPage:
    query = db.query(ThreatIntel)
    if indicator_type:
        query = query.filter(ThreatIntel.indicator_type == indicator_type)
    if risk_level:
        query = query.filter(ThreatIntel.risk_level == risk_level)
    if q:
        query = query.filter(ThreatIntel.indicator_value.ilike(f"%{q.strip()}%"))

    total = query.count()
    items = (
        query.order_by(ThreatIntel.report_count.desc(), ThreatIntel.last_seen.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return IntelPage(
        items=[IntelOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=IntelOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=IntelOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def add_intel(
    payload: IntelCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_analyst),
) -> IntelOut:
    _, normalised = detect_type(payload.indicator_value)

    existing = (
        db.query(ThreatIntel)
        .filter(
            ThreatIntel.indicator_type == payload.indicator_type,
            ThreatIntel.indicator_value == normalised,
        )
        .first()
    )
    if existing:
        existing.report_count += 1
        existing.risk_level = payload.risk_level
        existing.last_seen = utcnow()
        existing.source = "analyst"
        db.commit()
        db.refresh(existing)
        return IntelOut.model_validate(existing)

    if not normalised:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="That indicator could not be understood.",
        )

    row = ThreatIntel(
        indicator_type=payload.indicator_type,
        indicator_value=normalised,
        risk_level=payload.risk_level,
        report_count=1,
        source="analyst",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return IntelOut.model_validate(row)
