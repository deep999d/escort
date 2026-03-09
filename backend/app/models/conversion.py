"""Conversion event for revenue attribution."""

from uuid import UUID

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class ConversionEvent(Base, TimestampMixin):
    """Conversion event - logged when offline meeting attributable to platform."""

    __tablename__ = "conversion_events"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    booking_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bookings.id"),
        index=True,
    )
    provider_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id"),
        index=True,
    )

    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3))
    platform_fee: Mapped[float] = mapped_column(Float, default=0.0)

    attribution_type: Mapped[str] = mapped_column(String(32))  # deterministic | probabilistic
