"""Provider (advertiser) model."""

from uuid import UUID

from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Provider(Base, TimestampMixin):
    """Service provider (advertiser)."""

    __tablename__ = "providers"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    # Funnel stage: scraped | claimed | activated | monetised
    stage: Mapped[str] = mapped_column(String(32), default="scraped", index=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Metrics for matching
    response_time_avg_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    accept_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    availability_trust_score: Mapped[float] = mapped_column(Float, default=1.0)

    live_available: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_accept_when_slot_open: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relations
    profile: Mapped["ProviderProfile | None"] = relationship(
        "ProviderProfile", back_populates="provider", uselist=False
    )
    listings: Mapped[list["Listing"]] = relationship("Listing", back_populates="provider")
    availability_slots: Mapped[list["AvailabilitySlot"]] = relationship(
        "AvailabilitySlot", back_populates="provider"
    )


class ProviderProfile(Base, TimestampMixin):
    """Provider profile details."""

    __tablename__ = "provider_profiles"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    provider_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        unique=True,
    )

    display_name: Mapped[str] = mapped_column(String(100))
    city: Mapped[str] = mapped_column(String(100), index=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(2), index=True)

    bio: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    languages: Mapped[list] = mapped_column(JSONB, default=list)
    services: Mapped[list] = mapped_column(JSONB, default=list)
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)

    price_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    price_currency: Mapped[str] = mapped_column(String(3), default="EUR")

    # Embedding for semantic search
    embedding_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    raw_source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)

    provider: Mapped["Provider"] = relationship("Provider", back_populates="profile")
