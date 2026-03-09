"""Provider dashboard - receive and respond to availability pings."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.availability_ping import AvailabilityPing
from app.models.provider import Provider
from app.models.booking import Booking
from app.models.provider import ProviderProfile
from app.models.block import ProviderBlocksUser
from app.schemas.provider_dashboard import (
    AvailabilityPingResponse,
    RespondToPingRequest,
    ProviderDashboardStats,
    ProviderSettingsUpdate,
    ProfileUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Mock provider IDs (Discover) map to demo UUID so dashboard works without DB
MOCK_PROVIDER_IDS = {"m1", "m2", "m3", "m4", "m5", "m6"}


async def get_provider_id(x_provider_id: str | None = Header(None)) -> UUID:
    """Extract provider ID from X-Provider-ID header. Accepts UUID or mock id (m1-m6)."""
    if not x_provider_id:
        raise HTTPException(status_code=401, detail="X-Provider-ID header required")
    x = x_provider_id.strip().lower()
    if x in MOCK_PROVIDER_IDS:
        return UUID(settings.DEMO_PROVIDER_ID)
    try:
        return UUID(x_provider_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid provider ID")


@router.get("/pings", response_model=list[AvailabilityPingResponse])
async def list_pending_pings(
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
):
    """List availability pings for provider. Use ?status=pending for new requests. Returns [] when DB unavailable."""
    try:
        now = datetime.now(timezone.utc)
        query = (
            select(AvailabilityPing)
            .where(AvailabilityPing.provider_id == provider_id)
            .where(AvailabilityPing.expires_at > now)
        )
        if status:
            query = query.where(AvailabilityPing.status == status)
        query = query.order_by(AvailabilityPing.created_at.desc()).limit(50)
        result = await db.execute(query)
        pings = result.scalars().all()
        return [
            AvailabilityPingResponse(
                id=p.id,
                search_session_id=p.search_session_id,
                intent_summary=p.intent_summary,
                requested_slot_start=p.requested_slot_start,
                status=p.status,
                created_at=p.created_at,
            )
            for p in pings
        ]
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for list_pending_pings: %s", e)
        return []


@router.post("/pings/{ping_id}/respond")
async def respond_to_ping(
    ping_id: UUID,
    request: RespondToPingRequest,
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
):
    """Provider responds available or unavailable to an availability ping. No-op when DB unavailable."""
    if request.status not in ("available", "unavailable"):
        raise HTTPException(status_code=400, detail="status must be 'available' or 'unavailable'")

    try:
        result = await db.execute(
            select(AvailabilityPing).where(
                AvailabilityPing.id == ping_id,
                AvailabilityPing.provider_id == provider_id,
            )
        )
        ping = result.scalars().first()
        if not ping:
            raise HTTPException(status_code=404, detail="Ping not found")

        if ping.status != "pending":
            raise HTTPException(status_code=400, detail="Already responded")

        ping.status = request.status
        ping.provider_responded_at = datetime.now(timezone.utc)
        ping.provider_notes = request.notes
        await db.commit()
        return {"status": ping.status}
    except HTTPException:
        raise
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for respond_to_ping: %s", e)
        return {"status": request.status}


@router.get("/stats", response_model=ProviderDashboardStats)
async def get_dashboard_stats(
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
):
    """Provider dashboard statistics. Returns zeros when DB unavailable."""
    try:
        now = datetime.now(timezone.utc)
        pending = await db.scalar(
            select(func.count()).select_from(AvailabilityPing).where(
                AvailabilityPing.provider_id == provider_id,
                AvailabilityPing.status == "pending",
                AvailabilityPing.expires_at > now,
            )
        )
        total_bookings = await db.scalar(
            select(func.count()).select_from(Booking).where(Booking.provider_id == provider_id)
        )
        provider_result = await db.execute(select(Provider).where(Provider.id == provider_id))
        p = provider_result.scalars().first()
        response_rate = (p.accept_rate or 0) * 100 if p else 0
        return ProviderDashboardStats(
            pending_pings=pending or 0,
            total_bookings=total_bookings or 0,
            response_rate=response_rate,
        )
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for get_dashboard_stats: %s", e)
        return ProviderDashboardStats(pending_pings=0, total_bookings=0, response_rate=0)


@router.patch("/settings")
async def update_provider_settings(
    request: ProviderSettingsUpdate,
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
):
    """Update provider availability toggle and auto-accept rules. Succeeds with requested values when DB unavailable."""
    try:
        result = await db.execute(select(Provider).where(Provider.id == provider_id))
        p = result.scalars().first()
        if not p:
            raise HTTPException(status_code=404, detail="Provider not found")
        if request.live_available is not None:
            p.live_available = request.live_available
        if request.auto_accept_when_slot_open is not None:
            p.auto_accept_when_slot_open = request.auto_accept_when_slot_open
        await db.commit()
        return {"live_available": p.live_available, "auto_accept_when_slot_open": p.auto_accept_when_slot_open}
    except HTTPException:
        raise
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for update_provider_settings: %s", e)
        live = request.live_available if request.live_available is not None else True
        auto = request.auto_accept_when_slot_open if request.auto_accept_when_slot_open is not None else False
        return {"live_available": live, "auto_accept_when_slot_open": auto}


@router.patch("/profile")
async def update_provider_profile(
    request: ProfileUpdate,
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
):
    """Update provider profile (profile editor)."""
    result = await db.execute(
        select(ProviderProfile).where(ProviderProfile.provider_id == provider_id)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if request.display_name is not None:
        profile.display_name = request.display_name[:100]
    if request.bio is not None:
        profile.bio = request.bio[:2000]
    if request.languages is not None:
        profile.languages = request.languages
    if request.services is not None:
        profile.services = request.services
    if request.price_min is not None:
        profile.price_min = request.price_min
    if request.price_max is not None:
        profile.price_max = request.price_max
    await db.commit()
    return {"updated": True}


# ---- Blocklist (provider blocks users) ----
@router.get("/blocklist")
async def list_blocked_users(
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
):
    """List users blocked by provider."""
    r = await db.execute(
        select(ProviderBlocksUser)
        .where(ProviderBlocksUser.provider_id == provider_id)
        .order_by(ProviderBlocksUser.created_at.desc())
    )
    rows = r.scalars().all()
    return [{"blocked_user_id": str(b.blocked_user_id), "created_at": b.created_at.isoformat() if b.created_at else None} for b in rows]


@router.post("/blocklist/{user_id}")
async def block_user(
    user_id: UUID,
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
):
    """Block a user."""
    b = ProviderBlocksUser(provider_id=provider_id, blocked_user_id=user_id)
    try:
        db.add(b)
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Already blocked")
    return {"ok": True}


@router.delete("/blocklist/{user_id}")
async def unblock_user(
    user_id: UUID,
    provider_id: UUID = Depends(get_provider_id),
    db: AsyncSession = Depends(get_db),
):
    """Unblock a user."""
    r = await db.execute(
        select(ProviderBlocksUser).where(
            ProviderBlocksUser.provider_id == provider_id,
            ProviderBlocksUser.blocked_user_id == user_id,
        )
    )
    b = r.scalar_one_or_none()
    if b:
        await db.delete(b)
        await db.commit()
    return {"ok": True}
