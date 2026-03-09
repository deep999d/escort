"""Conversion tracking - logs conversion events for revenue attribution."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversion import ConversionEvent


class ConversionTracker:
    """Log conversion events when offline meeting attributable to platform."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log_conversion(
        self,
        booking_id: UUID,
        provider_id: UUID,
        amount: float,
        currency: str,
        platform_fee: float = 0.0,
        attribution_type: str = "deterministic",
    ) -> ConversionEvent:
        """Log a conversion event after verified meeting completion."""
        event = ConversionEvent(
            booking_id=booking_id,
            provider_id=provider_id,
            amount=amount,
            currency=currency,
            platform_fee=platform_fee,
            attribution_type=attribution_type,
        )
        self.db.add(event)
        await self.db.flush()
        return event
