"""Parsed intent model for search requests."""

from uuid import UUID

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class ParsedIntent(Base, TimestampMixin):
    """Stored parsed intent from user search query."""

    __tablename__ = "parsed_intents"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)

    raw_query: Mapped[str] = mapped_column(String(2000))
    intent_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Extracted structured fields
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    datetime_start: Mapped[str | None] = mapped_column(String(50), nullable=True)
    datetime_end: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    budget_min: Mapped[float | None] = mapped_column(nullable=True)
    budget_max: Mapped[float | None] = mapped_column(nullable=True)
    duration_min: Mapped[int | None] = mapped_column(nullable=True)

    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    exclusions: Mapped[dict] = mapped_column(JSONB, default=dict)
    soft_signals: Mapped[dict] = mapped_column(JSONB, default=dict)
