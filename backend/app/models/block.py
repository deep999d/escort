"""Block (user blocks provider, provider blocks user) models."""

from uuid import UUID

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, generate_uuid


class Block(Base, TimestampMixin):
    """User blocks provider."""

    __tablename__ = "blocks"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    blocked_provider_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("providers.id", ondelete="CASCADE"))

    __table_args__ = (UniqueConstraint("user_id", "blocked_provider_id", name="uq_blocks_user_provider"),)


class ProviderBlocksUser(Base, TimestampMixin):
    """Provider blocks user (blocklist)."""

    __tablename__ = "provider_blocks_user"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    provider_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("providers.id", ondelete="CASCADE"))
    blocked_user_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    __table_args__ = (UniqueConstraint("provider_id", "blocked_user_id", name="uq_provider_blocks_user"),)
