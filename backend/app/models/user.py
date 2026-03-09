"""User model."""

from uuid import UUID

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class User(Base, TimestampMixin):
    """End user (client) who searches and books."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    preferences: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reliability_score: Mapped[float] = mapped_column(default=1.0)  # 0-1
    last_search_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relations
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="user", lazy="selectin")
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation", back_populates="user", foreign_keys="Conversation.user_id"
    )
