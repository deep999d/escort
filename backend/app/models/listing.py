"""Listing model."""

from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Listing(Base, TimestampMixin):
    """Individual listing (can be scraped or claimed)."""

    __tablename__ = "listings"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    provider_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        index=True,
    )

    # Source
    source: Mapped[str] = mapped_column(String(50))  # scraped | claimed
    source_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    fingerprint: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    category: Mapped[str] = mapped_column(String(100), index=True)

    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    duration_min: Mapped[int | None] = mapped_column(nullable=True)
    duration_max: Mapped[int | None] = mapped_column(nullable=True)

    location_text: Mapped[str | None] = mapped_column(String(200), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), index=True, nullable=True)

    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    embedding_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    provider: Mapped["Provider"] = relationship("Provider", back_populates="listings")
