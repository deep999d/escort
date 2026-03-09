"""Search and intent schemas."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ParsedIntentSchema(BaseModel):
    """Parsed intent from natural language query."""

    raw_query: str
    intent_summary: str | None = None
    location: str | None = None
    city: str | None = None
    country: str | None = None
    datetime_start: str | None = None
    datetime_end: str | None = None
    timezone: str | None = None
    budget_min: float | None = None
    budget_max: float | None = None
    duration_min: int | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)
    exclusions: dict[str, Any] = Field(default_factory=dict)
    soft_signals: dict[str, Any] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    """Search request - natural language or structured."""

    query: str | None = None
    voice_transcript: str | None = None
    session_id: str | None = None
    confirmed_only: bool = True  # Client spec: only show confirmed-available providers
    user_id: UUID | None = None

    # Optional structured overrides
    city: str | None = None
    country: str | None = None
    datetime_start: str | None = None
    datetime_end: str | None = None
    budget_min: float | None = None
    budget_max: float | None = None
    radius_km: float | None = None


class ProviderPreview(BaseModel):
    """Minimal provider preview for search results."""

    id: UUID
    display_name: str
    city: str
    price_indication: str | None = None
    availability_status: str  # available | pending | unavailable
    response_time_sec: float | None = None
    is_verified: bool = False


class AvailabilityPingResult(BaseModel):
    """Result of availability ping to provider."""

    provider_id: UUID
    status: str  # available | unavailable | pending
    message: str | None = None


class SearchResponse(BaseModel):
    """Search response with confirmed availability."""

    session_id: str = ""
    parsed_intent: ParsedIntentSchema
    results: list[ProviderPreview] = Field(default_factory=list)
    pending_count: int = 0
    total_matched: int = 0
    fallback_suggestions: list[str] = Field(default_factory=list)  # When no confirmed results


class SearchStatusResponse(BaseModel):
    """Poll endpoint - availability status updates."""

    results: list[ProviderPreview] = Field(default_factory=list)
    pending_count: int = 0
    fallback_suggestions: list[str] = Field(default_factory=list)
