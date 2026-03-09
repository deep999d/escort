"""Auth API - anonymous sessions, registration, login."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.provider import Provider

router = APIRouter()


class AnonymousSessionResponse(BaseModel):
    """Anonymous session token."""

    session_id: str
    token: str
    expires_in_days: int = 7


class RegisterRequest(BaseModel):
    """Registration request."""

    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    """Login request."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user_id: str | None = None
    provider_id: str | None = None


class ProviderLoginRequest(BaseModel):
    """Provider login request."""

    email: str  # str to allow demo emails like provider1@demo.local
    password: str


@router.post("/anonymous", response_model=AnonymousSessionResponse)
async def create_anonymous_session():
    """Create anonymous session for browsing (no registration)."""
    import uuid
    from app.core.config import settings

    session_id = str(uuid.uuid4())
    token = create_access_token(
        subject=session_id,
        extra_claims={"anonymous": True, "session_id": session_id},
    )
    return AnonymousSessionResponse(
        session_id=session_id,
        token=token,
        expires_in_days=settings.ANONYMOUS_SESSION_EXPIRE_DAYS,
    )


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register new user. Demo user works without DB."""
    from app.core.config import settings
    from uuid import UUID

    # Demo user (no DB required)
    if request.email.strip().lower() == settings.DEMO_USER_EMAIL.lower() and request.password == settings.DEMO_USER_PASSWORD:
        token = create_access_token(subject=UUID(settings.DEMO_USER_ID))
        return TokenResponse(access_token=token, user_id=settings.DEMO_USER_ID)

    try:
        result = await db.execute(select(User).where(User.email == request.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=request.email,
            password_hash=get_password_hash(request.password),
            is_anonymous=False,
        )
        db.add(user)
        await db.flush()
        token = create_access_token(subject=user.id)
        return TokenResponse(access_token=token, user_id=str(user.id))
    except Exception as e:
        from sqlalchemy.exc import OperationalError
        if isinstance(e, (OperationalError, OSError)):
            raise HTTPException(status_code=503, detail="Database unavailable. Use demo: user@example.com / demo123")
        raise


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email/password. Demo user works without DB."""
    from app.core.config import settings
    from uuid import UUID

    # Demo user (no DB required)
    if request.email.strip().lower() == settings.DEMO_USER_EMAIL.lower() and request.password == settings.DEMO_USER_PASSWORD:
        token = create_access_token(subject=UUID(settings.DEMO_USER_ID))
        return TokenResponse(access_token=token, user_id=settings.DEMO_USER_ID)

    try:
        result = await db.execute(select(User).where(User.email == request.email))
        user = result.scalars().first()
        if not user or not user.password_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token(subject=user.id)
        return TokenResponse(access_token=token, user_id=str(user.id))
    except HTTPException:
        raise
    except Exception as e:
        from sqlalchemy.exc import OperationalError
        if isinstance(e, (OperationalError, OSError)):
            raise HTTPException(status_code=503, detail="Database unavailable. Use demo: user@example.com / demo123")
        raise


@router.post("/provider/login", response_model=TokenResponse)
async def provider_login(request: ProviderLoginRequest, db: AsyncSession = Depends(get_db)):
    """Provider login - for dashboard access. Demo credentials work without PostgreSQL."""
    from app.core.config import settings
    from uuid import UUID

    # Demo login (no DB required)
    if request.email.strip().lower() == settings.DEMO_PROVIDER_EMAIL.lower() and request.password == settings.DEMO_PROVIDER_PASSWORD:
        token = create_access_token(
            subject=UUID(settings.DEMO_PROVIDER_ID),
            extra_claims={"provider": True},
        )
        return TokenResponse(access_token=token, provider_id=settings.DEMO_PROVIDER_ID)

    # Real DB login
    result = await db.execute(select(Provider).where(Provider.email == request.email))
    provider = result.scalars().first()
    if not provider or not provider.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(request.password, provider.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=provider.id, extra_claims={"provider": True})
    return TokenResponse(access_token=token, provider_id=str(provider.id))
