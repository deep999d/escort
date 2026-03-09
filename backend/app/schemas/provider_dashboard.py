"""Provider dashboard schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AvailabilityPingResponse(BaseModel):
    """Availability ping for provider dashboard."""

    id: UUID
    search_session_id: str
    intent_summary: str
    requested_slot_start: datetime | None
    status: str
    created_at: datetime


class RespondToPingRequest(BaseModel):
    """Provider response to availability ping."""

    status: str  # available | unavailable
    notes: str | None = None


class ProviderDashboardStats(BaseModel):
    """Provider dashboard summary."""

    pending_pings: int
    total_bookings: int
    response_rate: float


class ProviderSettingsUpdate(BaseModel):
    """Update provider settings."""

    live_available: bool | None = None
    auto_accept_when_slot_open: bool | None = None


class ProfileUpdate(BaseModel):
    """Update provider profile (partial)."""

    display_name: str | None = None
    bio: str | None = None
    languages: list[str] | None = None
    services: list[str] | None = None
    price_min: float | None = None
    price_max: float | None = None
