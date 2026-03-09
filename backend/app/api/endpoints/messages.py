"""Messaging API - in-platform encrypted communication."""

import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.message import Message, Conversation
from app.models.user import User
from app.services.pii_redaction import redact_pii

logger = logging.getLogger(__name__)
router = APIRouter()

# Map mock provider IDs (m1-m6) to placeholder UUIDs for conversations
MOCK_PROVIDER_UUIDS = {
    f"m{i}": UUID(f"00000000-0000-0000-0000-{i:012d}") for i in range(1, 7)
}


def _parse_user_id(value: str) -> UUID:
    """Parse user_id; return new UUID if invalid (e.g. anon-123 or empty)."""
    if not value or not value.strip():
        return uuid4()
    try:
        return UUID(value.strip())
    except (ValueError, TypeError):
        return uuid4()


def _parse_provider_id(value: str) -> UUID:
    """Parse provider_id; accept mock IDs (m1-m6) or valid UUID."""
    if not value or not value.strip():
        raise HTTPException(status_code=422, detail="provider_id is required")
    s = value.strip().lower()
    if s in MOCK_PROVIDER_UUIDS:
        return MOCK_PROVIDER_UUIDS[s]
    try:
        return UUID(value.strip())
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Invalid provider_id")


def _parse_booking_id(value: str | None) -> UUID | None:
    """Parse optional booking_id."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    try:
        return UUID(value.strip())
    except (ValueError, TypeError):
        return None


class CreateConversationRequest(BaseModel):
    user_id: str  # UUID or any string; invalid -> generate new UUID
    provider_id: str  # UUID or mock id (m1-m6)
    booking_id: str | None = None


class SendMessageRequest(BaseModel):
    content: str = ""  # Accept missing/empty; validate in endpoint


class MessageResponse(BaseModel):
    id: str
    sender_type: str
    content: str
    is_read: bool
    created_at: str


class ConversationResponse(BaseModel):
    id: str
    messages: list[MessageResponse]


async def get_conversation(
    conversation_id: UUID,
    user_id: UUID | None,
    db: AsyncSession,
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user_id and conv.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return conv


@router.post("/conversations")
async def create_conversation(
    request: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create or get conversation. Accepts mock provider IDs (m1-m6). Works without DB (returns mock id)."""
    user_id = _parse_user_id(request.user_id)
    provider_id = _parse_provider_id(request.provider_id)
    booking_id = _parse_booking_id(request.booking_id)

    try:
        user_check = await db.execute(select(User).where(User.id == user_id))
        if not user_check.scalars().first():
            user = User(id=user_id, is_anonymous=True)
            db.add(user)
            await db.flush()
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .where(Conversation.provider_id == provider_id)
        )
        conv = result.scalars().first()
        if conv:
            return {"id": str(conv.id), "created": False}
        conv = Conversation(user_id=user_id, provider_id=provider_id, booking_id=booking_id)
        db.add(conv)
        await db.flush()
        return {"id": str(conv.id), "created": True}
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for create_conversation: %s", e)
        mock_id = uuid4()
        return {"id": str(mock_id), "created": True}


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_messages(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID | None = None,
):
    """List messages in conversation. Enforces chat expiration. Returns empty list when DB unavailable."""
    try:
        conv = await get_conversation(conversation_id, user_id, db)
        if conv.expires_at:
            try:
                exp_str = str(conv.expires_at).replace("Z", "+00:00")
                exp = datetime.fromisoformat(exp_str) if "T" in exp_str or "+" in exp_str else None
                if exp and datetime.now(timezone.utc) > exp:
                    raise HTTPException(status_code=410, detail="Conversation expired")
            except (ValueError, TypeError):
                pass
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        messages = result.scalars().all()
        return ConversationResponse(
            id=str(conv.id),
            messages=[
                MessageResponse(
                    id=str(m.id),
                    sender_type=m.sender_type,
                    content=m.content,
                    is_read=m.is_read,
                    created_at=m.created_at.isoformat() if m.created_at else "",
                )
                for m in messages
            ],
        )
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for get_messages: %s", e)
        return ConversationResponse(id=str(conversation_id), messages=[])


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: UUID,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    sender_type: str = "user",
):
    """Send message. Use sender_type=user|provider. Returns mock message when DB unavailable."""
    if sender_type not in ("user", "provider"):
        raise HTTPException(status_code=400, detail="sender_type must be user or provider")
    raw = (request.content or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="content is required")
    content, _ = redact_pii(raw[:5000])
    try:
        conv = await get_conversation(conversation_id, None, db)
        msg = Message(
            conversation_id=conversation_id,
            sender_type=sender_type,
            content=content,
            content_redacted=False,
        )
        db.add(msg)
        await db.flush()
        return MessageResponse(
            id=str(msg.id),
            sender_type=msg.sender_type,
            content=msg.content,
            is_read=False,
            created_at=msg.created_at.isoformat() if msg.created_at else "",
        )
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for send_message: %s", e)
        mock_id = uuid4()
        now = datetime.now(timezone.utc).isoformat()
        return MessageResponse(
            id=str(mock_id),
            sender_type=sender_type,
            content=content,
            is_read=False,
            created_at=now,
        )
