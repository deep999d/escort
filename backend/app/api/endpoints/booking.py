"""Booking API - inquiry, confirmation, status."""

import logging
from typing import Annotated
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user_id
from app.core.database import get_db
from app.services.mock_store import get_mock_store
from app.services.audit.logger import audit_log
from app.services.conversion.tracker import ConversionTracker
from app.models.booking import Booking
from app.schemas.booking import BookingStatusUpdate, BookingCreate, BookingResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Placeholder UUID for mock provider when provider_id is not a valid UUID (e.g. m1)
MOCK_PROVIDER_UUID = UUID("00000000-0000-0000-0000-000000000001")


def _parse_requested_at(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.post("", response_model=BookingResponse)
async def create_booking(
    request: BookingCreate,
    db: AsyncSession = Depends(get_db),
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
    x_session_id: str | None = Header(None),
):
    """
    Create booking inquiry. Works without DB (returns mock response when DB unavailable).
    """
    try:
        provider_id = UUID(request.provider_id)
    except ValueError:
        provider_id = MOCK_PROVIDER_UUID

    requested_at = _parse_requested_at(request.requested_at)
    if not user_id:
        user_id = uuid4()
    session_id = x_session_id

    try:
        booking = Booking(
            user_id=user_id,
            provider_id=provider_id,
            session_id=session_id,
            status="inquiry",
            requested_at=requested_at,
            duration_minutes=request.duration_minutes,
            notes={"raw": request.notes} if request.notes else None,
        )
        db.add(booking)
        await db.flush()
        audit_log("booking_created", "booking", str(booking.id), "user", None, {"provider_id": str(provider_id)})
        return BookingResponse(
            id=booking.id,
            status=booking.status,
            provider_id=booking.provider_id,
            requested_at=booking.requested_at,
            confirmed_at=booking.confirmed_at,
            duration_minutes=booking.duration_minutes,
            amount=booking.amount,
        )
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for create_booking: %s", e)
        store = get_mock_store()
        requested_at_str = requested_at.isoformat() if hasattr(requested_at, "isoformat") else str(requested_at)
        b = store.create_booking(
            user_id=str(user_id),
            provider_id=str(provider_id),
            requested_at=requested_at_str,
            duration_minutes=request.duration_minutes,
            session_id=session_id,
            notes=request.notes,
        )
        return BookingResponse(
            id=UUID(b.id),
            status=b.status,
            provider_id=provider_id,
            requested_at=requested_at,
            confirmed_at=None,
            duration_minutes=b.duration_minutes,
            amount=None,
        )


@router.get("", response_model=list[BookingResponse])
async def list_bookings(
    db: AsyncSession = Depends(get_db),
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
    x_session_id: str | None = Header(None),
):
    """List bookings for authenticated user or by session (demo). Returns [] when DB unavailable."""
    if not user_id and not x_session_id:
        return []
    try:
        if user_id:
            r = await db.execute(
                select(Booking)
                .where(Booking.user_id == user_id)
                .order_by(Booking.created_at.desc())
                .limit(50)
            )
        else:
            r = await db.execute(
                select(Booking)
                .where(Booking.session_id == x_session_id)
                .order_by(Booking.created_at.desc())
                .limit(50)
            )
        bookings = r.scalars().all()
        return [
            BookingResponse(
                id=b.id,
                status=b.status,
                provider_id=b.provider_id,
                requested_at=b.requested_at,
                confirmed_at=b.confirmed_at,
                duration_minutes=b.duration_minutes,
                amount=b.amount,
            )
            for b in bookings
        ]
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for list_bookings: %s", e)
        store = get_mock_store()
        uid = str(user_id) if user_id else None
        bookings = store.get_bookings_for_user(uid, x_session_id)
        def _to_uuid(s: str) -> UUID:
            try:
                return UUID(s) if len(s) == 36 and s.count("-") == 4 else MOCK_PROVIDER_UUID
            except ValueError:
                return MOCK_PROVIDER_UUID

        return [
            BookingResponse(
                id=UUID(b.id),
                status=b.status,
                provider_id=_to_uuid(b.provider_id),
                requested_at=datetime.fromisoformat(b.requested_at.replace("Z", "+00:00")),
                confirmed_at=None,
                duration_minutes=b.duration_minutes,
                amount=None,
            )
            for b in bookings
        ]


VALID_TRANSITIONS = {
    "inquiry": ["availability_confirmed", "cancelled"],
    "availability_confirmed": ["time_locked", "cancelled"],
    "time_locked": ["meeting_confirmed", "cancelled"],
    "meeting_confirmed": ["completed", "cancelled"],
    "completed": [],
    "cancelled": [],
}


@router.patch("/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: UUID,
    request: BookingStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update booking status. Returns mock response when DB unavailable."""
    try:
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalars().first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        allowed = VALID_TRANSITIONS.get(booking.status, [])
        if request.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition from {booking.status} to {request.status}",
            )

        booking.status = request.status
        if request.status in ("time_locked", "meeting_confirmed") and not booking.confirmed_at:
            booking.confirmed_at = datetime.now(timezone.utc)
        if request.status == "completed":
            booking.completed_at = datetime.now(timezone.utc)
            tracker = ConversionTracker(db)
            await tracker.log_conversion(
                booking_id=booking.id,
                provider_id=booking.provider_id,
                amount=booking.amount or 0,
                currency=booking.currency,
                platform_fee=0,
                attribution_type="deterministic",
            )
        audit_log("booking_status_updated", "booking", str(booking.id), None, None, {"new_status": request.status})
        return BookingResponse(
            id=booking.id,
            status=booking.status,
            provider_id=booking.provider_id,
            requested_at=booking.requested_at,
            confirmed_at=booking.confirmed_at,
            duration_minutes=booking.duration_minutes,
            amount=booking.amount,
        )
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for update_booking_status: %s", e)
        store = get_mock_store()
        b = store.get_booking(str(booking_id))
        if not b:
            raise HTTPException(status_code=404, detail="Booking not found")
        allowed = VALID_TRANSITIONS.get(b.status, ["cancelled"])  # inquiry -> availability_confirmed or cancelled
        if request.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition from {b.status} to {request.status}",
            )
        b = store.update_booking_status(str(booking_id), request.status)
        return BookingResponse(
            id=UUID(b.id),
            status=b.status,
            provider_id=MOCK_PROVIDER_UUID,
            requested_at=datetime.fromisoformat(b.requested_at.replace("Z", "+00:00")),
            confirmed_at=datetime.now(timezone.utc) if request.status in ("availability_confirmed", "time_locked", "meeting_confirmed", "completed") else None,
            duration_minutes=b.duration_minutes,
            amount=None,
        )
