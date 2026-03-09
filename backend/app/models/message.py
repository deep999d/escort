"""Message and conversation models."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from app.models.user import User


class Conversation(Base, TimestampMixin):
    """Chat conversation between user and provider."""

    __tablename__ = "conversations"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
    )
    provider_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id"),
        index=True,
    )
    booking_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("bookings.id"),
        nullable=True,
    )

    # Temporary anonymised identity for user (until booking confirmed)
    user_anon_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="conversation")


class Message(Base, TimestampMixin):
    """Single message in a conversation."""

    __tablename__ = "messages"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        index=True,
    )

    sender_type: Mapped[str] = mapped_column(String(20))  # user | provider | system
    content: Mapped[str] = mapped_column(Text)
    content_redacted: Mapped[bool] = mapped_column(Boolean, default=False)

    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    self_destruct_at: Mapped[str | None] = mapped_column(String(50), nullable=True)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
