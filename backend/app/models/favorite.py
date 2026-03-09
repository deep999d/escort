"""Favorite (user or session saves provider) model."""

from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class Favorite(Base, TimestampMixin):
    __tablename__ = "favorites"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    provider_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("providers.id", ondelete="CASCADE"))

    __table_args__ = (UniqueConstraint("user_id", "provider_id", name="uq_favorites_user_provider"),)
