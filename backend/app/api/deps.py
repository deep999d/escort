"""API dependencies."""

from uuid import UUID
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token

security = HTTPBearer(auto_error=False)
anon_header = APIKeyHeader(name="X-Session-ID", auto_error=False)


async def get_optional_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    session_id: Annotated[str | None, Depends(anon_header)],
) -> UUID | None:
    """Extract user ID from JWT if present, else None (anonymous)."""
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload and not payload.get("anonymous"):
            return UUID(payload["sub"])
    return None


async def get_required_user_id(
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)],
) -> UUID:
    """Require authenticated user."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


DbSession = Annotated[AsyncSession, Depends(get_db)]
