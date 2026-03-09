"""Profile impression - tracks views for conversion attribution."""

from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, generate_uuid


class ProfileImpression(Base):
    """Profile view/impression for per-profile metrics."""

    __tablename__ = "profile_impressions"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    provider_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        index=True,
    )
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    source: Mapped[str] = mapped_column(String(32))  # search | profile | chat
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
