"""Real-time availability service."""

from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.availability import AvailabilitySlot
from app.models.provider import Provider


class AvailabilityService:
    """Real-time availability checks and slot management."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def is_available(
        self,
        provider_id: UUID,
        start: datetime,
        end: datetime | None = None,
        buffer_minutes: int = 0,
    ) -> bool:
        """Check if provider has open slot for given time range."""
        end = end or start + timedelta(hours=2)
        start_adj = start - timedelta(minutes=buffer_minutes)
        end_adj = end + timedelta(minutes=buffer_minutes)

        result = await self.db.execute(
            select(AvailabilitySlot)
            .where(AvailabilitySlot.provider_id == provider_id)
            .where(AvailabilitySlot.status == "open")
            .where(AvailabilitySlot.start_at <= start_adj)
            .where(AvailabilitySlot.end_at >= end_adj)
        )
        return result.scalars().first() is not None

    async def get_availability_preview(
        self,
        provider_id: UUID,
        days_ahead: int = 7,
    ) -> list[dict]:
        """Get availability preview for profile display."""
        now = datetime.utcnow()
        end = now + timedelta(days=days_ahead)
        result = await self.db.execute(
            select(AvailabilitySlot)
            .where(AvailabilitySlot.provider_id == provider_id)
            .where(AvailabilitySlot.status == "open")
            .where(AvailabilitySlot.start_at >= now)
            .where(AvailabilitySlot.start_at <= end)
            .order_by(AvailabilitySlot.start_at)
            .limit(20)
        )
        slots = result.scalars().all()
        return [
            {"start": s.start_at.isoformat(), "end": s.end_at.isoformat()}
            for s in slots
        ]
