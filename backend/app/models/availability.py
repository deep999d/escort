"""Availability model."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class AvailabilitySlot(Base, TimestampMixin):
    """Provider availability time slot."""

    __tablename__ = "availability_slots"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    provider_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        index=True,
    )

    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(50))

    status: Mapped[str] = mapped_column(String(32), default="open")  # open | booked | blocked
    source: Mapped[str] = mapped_column(String(50), default="manual")  # manual | calendar_sync

    provider: Mapped["Provider"] = relationship("Provider", back_populates="availability_slots")
