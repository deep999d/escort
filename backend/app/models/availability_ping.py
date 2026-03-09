"""Availability ping - tracks provider response to availability requests."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class AvailabilityPing(Base, TimestampMixin):
    """Availability request sent to provider; provider responds available/unavailable."""

    __tablename__ = "availability_pings"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    provider_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        index=True,
    )
    search_session_id: Mapped[str] = mapped_column(String(64), index=True)

    intent_summary: Mapped[str] = mapped_column(Text)
    requested_slot_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    requested_slot_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # pending | available | unavailable
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    provider_responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    provider_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
