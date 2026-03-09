"""Booking schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class BookingCreate(BaseModel):
    """Create booking request."""

    provider_id: str  # UUID or mock id (e.g. m1)
    requested_at: datetime | str
    duration_minutes: int | None = None
    notes: str | None = None


class BookingResponse(BaseModel):
    """Booking response."""

    id: UUID
    status: str
    provider_id: UUID
    requested_at: datetime
    confirmed_at: datetime | None = None
    duration_minutes: int | None = None
    amount: float | None = None


class BookingStatusUpdate(BaseModel):
    """Update booking status (state machine)."""

    status: str  # availability_confirmed | time_locked | meeting_confirmed | completed | cancelled
