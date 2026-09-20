"""Analysis endpoints. Works with or without a signed-in user."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from engines import fusion
from models import Scan, ThreatIntel, User, utcnow
from schemas import AnalyzeRequest, AnalyzeResponse, BulkResponse, BulkSummary
from security import get_optional_user

router = APIRouter(prefix="/api/analyze", tags=["analyze"])

MAX_BULK_ROWS = 200


def _truncate(content: str) -> str:
    limit = settings.max_stored_content_chars
    text = content.strip()
    return text if len(text) <= limit else text[:limit] + "..."


def _persist(db: Session, result: dict, content: str, user: User | None) -> None:
    """Store the scan and promote its flagged entities into threat intel."""
    scan = Scan(
        id=result["scan_id"],
        user_id=user.id if user else None,
        channel=result["channel"],
        content=_truncate(content),
        risk_score=result["risk_score"],
        verdict=result["verdict"],
        category=result["category"],
        confidence=result["confidence"],
        reasons=result["reasons"],
        entities=result["entities"],
    )
    db.add(scan)

    if result["risk_score"] >= 65:
        _promote_indicators(db, result["entities"])

    db.commit()


def _promote_indicators(db: Session, entities: dict) -> None:
    """A high-risk scan feeds its domains, UPI IDs and phones back into the blocklist."""
    candidates: list[tuple[str, str]] = []
    for domain in entities.get("domains", [])[:5]:
        candidates.append(("domain", domain.lower()))
    for upi_id in entities.get("upi_ids", [])[:5]:
        candidates.append(("upi", upi_id.lower()))
    for phone in entities.get("phones", [])[:5]:
        candidates.append(("phone", phone[-10:]))

    for indicator_type, value in candidates:
        if not value:
            continue
        row = (
            db.query(ThreatIntel)
            .filter(
                ThreatIntel.indicator_type == indicator_type,
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
                    indicator_type=indicator_type,
                    indicator_value=value,
                    risk_level="medium",
                    report_count=1,
                    source="community",
                )
            )


@router.post("", response_model=AnalyzeResponse)
@router.post("/", response_model=AnalyzeResponse, include_in_schema=False)
def analyze_one(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> AnalyzeResponse:
    result = fusion.analyze(payload.content, payload.channel, db=db)

    stored = False
    if payload.save:
        try:
            _persist(db, result, payload.content, user)
            stored = True
        except Exception:
            db.rollback()
            stored = False

    result["stored"] = stored
    result["content_preview"] = _truncate(payload.content)[:280]
    return AnalyzeResponse(**result)


@router.post("/bulk", response_model=BulkResponse)
async def analyze_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> BulkResponse:
    """Analyse a CSV of messages.

    Accepts a header row with a `content`/`text`/`message` column and an optional
    `channel` column, or a plain single-column file with no header at all.
    """
    if not file.filename or not file.filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a .csv or .txt file.",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty."
        )
    if len(raw) > 2_000_000:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Please upload a file under 2 MB.",
        )

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No rows could be read from the file.",
        )

    header = [c.strip().lower() for c in rows[0]]
    content_index, channel_index = 0, None
    body = rows

    for name in ("content", "text", "message", "body"):
        if name in header:
            content_index = header.index(name)
            channel_index = header.index("channel") if "channel" in header else None
            body = rows[1:]
            break

    results: list[AnalyzeResponse] = []
    skipped = 0
    for row in body[:MAX_BULK_ROWS]:
        if content_index >= len(row):
            skipped += 1
            continue
        content = (row[content_index] or "").strip()
        if not content:
            skipped += 1
            continue
        channel = "message"
        if channel_index is not None and channel_index < len(row):
            candidate = (row[channel_index] or "").strip().lower()
            if candidate in fusion.CHANNEL_LABELS:
                channel = candidate

        result = fusion.analyze(content, channel, db=db)
        try:
            _persist(db, result, content, user)
            result["stored"] = True
        except Exception:
            db.rollback()
            result["stored"] = False
        result["content_preview"] = _truncate(content)[:280]
        results.append(AnalyzeResponse(**result))

    if not results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable messages were found in that file.",
        )

    high = sum(1 for r in results if r.verdict == "High Risk")
    suspicious = sum(1 for r in results if r.verdict == "Suspicious")
    counts: dict[str, int] = {}
    for r in results:
        if r.category != "safe_none":
            counts[r.category_label] = counts.get(r.category_label, 0) + 1
    top = max(counts.items(), key=lambda kv: kv[1])[0] if counts else "No Scam Detected"

    return BulkResponse(
        results=results,
        summary=BulkSummary(
            total=len(results),
            high_risk=high,
            suspicious=suspicious,
            safe=len(results) - high - suspicious,
            average_risk=round(sum(r.risk_score for r in results) / len(results), 1),
            top_category=top,
        ),
        skipped_rows=skipped,
    )
