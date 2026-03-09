"""Messaging API - in-platform encrypted communication."""

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.message import Message, Conversation
from app.models.user import User
from app.services.pii_redaction import redact_pii

router = APIRouter()


class CreateConversationRequest(BaseModel):
    user_id: UUID
    provider_id: UUID
    booking_id: UUID | None = None


class SendMessageRequest(BaseModel):
    content: str


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
    """Create or get conversation between user and provider."""
    user_id = request.user_id
    provider_id = request.provider_id
    booking_id = request.booking_id

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


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_messages(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID | None = None,
):
    """List messages in conversation. Enforces chat expiration."""
    conv = await get_conversation(conversation_id, user_id, db)
    from datetime import datetime, timezone
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


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: UUID,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    sender_type: str = "user",
):
    """Send message. Use sender_type=user|provider."""
    if sender_type not in ("user", "provider"):
        raise HTTPException(status_code=400, detail="sender_type must be user or provider")
    conv = await get_conversation(conversation_id, None, db)
    content, was_redacted = redact_pii(request.content[:5000])
    msg = Message(
        conversation_id=conversation_id,
        sender_type=sender_type,
        content=content,
        content_redacted=was_redacted,
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
