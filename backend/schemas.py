"""Pydantic v2 request/response models."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Channel = Literal["message", "call", "email", "url", "upi"]
Verdict = Literal["Safe", "Suspicious", "High Risk"]
Severity = Literal["low", "medium", "high"]
IndicatorType = Literal["domain", "upi", "phone", "keyword"]
Role = Literal["user", "analyst", "admin"]


# --------------------------------------------------------------------------- auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ----------------------------------------------------------------------- analysis
class AnalyzeRequest(BaseModel):
    content: str = Field(min_length=1, max_length=20000)
    channel: Channel = "message"
    save: bool = True

    @field_validator("content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content cannot be empty.")
        return v


class Reason(BaseModel):
    reason: str
    severity: Severity
    weight: float
    engine: str


class ExplanationToken(BaseModel):
    token: str
    weight: float


class Entities(BaseModel):
    urls: list[str] = []
    upi_ids: list[str] = []
    phones: list[str] = []
    amounts: list[str] = []
    emails: list[str] = []
    domains: list[str] = []


class EntityIntel(BaseModel):
    value: str
    type: str
    known_bad: bool
    risk_level: str | None = None
    report_count: int = 0
    note: str


class Playbook(BaseModel):
    do: list[str]
    dont: list[str]
    report_to: str


class AnalyzeResponse(BaseModel):
    scan_id: str
    channel: str
    risk_score: int
    verdict: str
    confidence: float
    category: str
    category_label: str
    ml_probability: float
    reasons: list[Reason]
    explanation_tokens: list[ExplanationToken]
    entities: Entities
    entity_intel: list[EntityIntel] = []
    playbook: Playbook
    engine_scores: dict[str, float] = {}
    analyzed_at: datetime
    stored: bool = False
    content_preview: str = ""


class BulkSummary(BaseModel):
    total: int
    high_risk: int
    suspicious: int
    safe: int
    average_risk: float
    top_category: str


class BulkResponse(BaseModel):
    results: list[AnalyzeResponse]
    summary: BulkSummary
    skipped_rows: int = 0


# --------------------------------------------------------------------------- scans
class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    channel: str
    content: str
    risk_score: int
    verdict: str
    category: str
    confidence: float
    reasons: list = []
    entities: dict = {}
    created_at: datetime


class ScanPage(BaseModel):
    items: list[ScanOut]
    total: int
    page: int
    page_size: int
    pages: int


# ----------------------------------------------------------------------- dashboard
class DashboardSummary(BaseModel):
    total_scans: int
    high_risk_count: int
    threats_blocked: int
    estimated_money_protected: int
    pct_change_vs_prev_period: dict[str, float]
    sparklines: dict[str, list[int]]
    period_days: int


class TimeseriesPoint(BaseModel):
    date: str
    total: int
    high_risk: int
    suspicious: int
    safe: int


class CategoryStat(BaseModel):
    category: str
    label: str
    count: int
    pct: float


class ChannelStat(BaseModel):
    channel: str
    label: str
    count: int
    avg_risk: float


class TopThreat(BaseModel):
    value: str
    type: str
    count: int
    risk_level: str


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    severity: str
    active: bool
    created_at: datetime


class GeoStat(BaseModel):
    state: str
    count: int
    pct: float


# --------------------------------------------------------------------------- intel
class IntelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    indicator_type: str
    indicator_value: str
    risk_level: str
    report_count: int
    source: str
    first_seen: datetime
    last_seen: datetime


class IntelPage(BaseModel):
    items: list[IntelOut]
    total: int
    page: int
    page_size: int
    pages: int


class IntelCreate(BaseModel):
    indicator_type: IndicatorType
    indicator_value: str = Field(min_length=1, max_length=255)
    risk_level: Literal["low", "medium", "high"] = "high"


class IntelLookup(BaseModel):
    value: str
    detected_type: str
    known_bad: bool
    risk_level: str | None = None
    report_count: int = 0
    source: str | None = None
    message: str


# ----------------------------------------------------------------------- community
class ReportCreate(BaseModel):
    channel: Channel = "message"
    content: str = Field(min_length=5, max_length=5000)
    claimed_category: str = "safe_none"


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel: str
    content: str
    claimed_category: str
    status: str
    created_at: datetime


class ReportPage(BaseModel):
    items: list[ReportOut]
    total: int
    page: int
    page_size: int
    pages: int


class ReportPatch(BaseModel):
    status: Literal["pending", "verified", "rejected"]
