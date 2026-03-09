"""User features API: saved searches, favorites, reports, blocks, reviews."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.api.deps import get_optional_user_id, DbSession
from app.core.database import get_db
from app.models.saved_search import SavedSearch
from app.models.favorite import Favorite
from app.models.report import Report
from app.models.block import Block, ProviderBlocksUser
from app.models.review import Review
from app.models.provider import Provider, ProviderProfile

router = APIRouter()


# ---- Saved searches ----
class SavedSearchCreate(BaseModel):
    query: str
    name: str | None = None
    parsed_intent: dict | None = None
    session_id: str | None = None


class SavedSearchResponse(BaseModel):
    id: str
    query: str
    name: str | None = None
    parsed_intent: dict | None = None


@router.post("/saved-searches", response_model=SavedSearchResponse)
async def create_saved_search(
    body: SavedSearchCreate,
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
    x_session_id: str | None = Header(None),
):
    """Save a search. Uses user_id if authenticated, else session_id."""
    session_id = body.session_id or x_session_id
    if not user_id and not session_id:
        raise HTTPException(status_code=400, detail="session_id or authentication required")
    ss = SavedSearch(
        user_id=user_id,
        session_id=session_id,
        name=body.name,
        query=body.query,
        parsed_intent=body.parsed_intent,
    )
    db.add(ss)
    await db.flush()
    return SavedSearchResponse(id=str(ss.id), query=ss.query, name=ss.name, parsed_intent=ss.parsed_intent)


@router.get("/saved-searches", response_model=list[SavedSearchResponse])
async def list_saved_searches(
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
    x_session_id: str | None = Header(None),
):
    """List saved searches (by user or session)."""
    if not user_id and not x_session_id:
        return []
    try:
        q = select(SavedSearch).order_by(SavedSearch.created_at.desc())
        if user_id and x_session_id:
            q = q.where(or_(SavedSearch.user_id == user_id, SavedSearch.session_id == x_session_id))
        elif user_id:
            q = q.where(SavedSearch.user_id == user_id)
        else:
            q = q.where(SavedSearch.session_id == x_session_id)
        result = await db.execute(q)
        rows = result.scalars().all()
        return [SavedSearchResponse(id=str(r.id), query=r.query, name=r.name, parsed_intent=r.parsed_intent) for r in rows]
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for list_saved_searches: %s", e)
        return []


# ---- Favorites ----
@router.post("/favorites/{provider_id}")
async def add_favorite(
    provider_id: UUID,
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
    x_session_id: str | None = Header(None),
):
    """Add provider to favorites. Uses user_id if authenticated, else session_id (demo)."""
    session_id = x_session_id
    if not user_id and not session_id:
        raise HTTPException(status_code=400, detail="Sign in or use session (X-Session-ID) for favorites")
    r = await db.execute(select(Provider).where(Provider.id == provider_id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Provider not found")
    fav = Favorite(user_id=user_id, session_id=session_id, provider_id=provider_id)
    try:
        db.add(fav)
        await db.flush()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Already in favorites")
    return {"ok": True}


@router.delete("/favorites/{provider_id}")
async def remove_favorite(
    provider_id: UUID,
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
    x_session_id: str | None = Header(None),
):
    """Remove provider from favorites (by user or session)."""
    if user_id:
        r = await db.execute(select(Favorite).where(Favorite.user_id == user_id, Favorite.provider_id == provider_id))
    elif x_session_id:
        r = await db.execute(select(Favorite).where(Favorite.session_id == x_session_id, Favorite.provider_id == provider_id))
    else:
        raise HTTPException(status_code=400, detail="Sign in or use session for favorites")
    fav = r.scalar_one_or_none()
    if fav:
        await db.delete(fav)
    return {"ok": True}


class FavoritePreview(BaseModel):
    id: str
    provider_id: str
    display_name: str
    city: str


@router.get("/favorites", response_model=list[FavoritePreview])
async def list_favorites(
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
    x_session_id: str | None = Header(None),
):
    """List favorite providers (by user or session for demo)."""
    if not user_id and not x_session_id:
        return []
    try:
        if user_id:
            r = await db.execute(
                select(Favorite, Provider, ProviderProfile)
                .join(Provider, Favorite.provider_id == Provider.id)
                .join(ProviderProfile, Provider.id == ProviderProfile.provider_id)
                .where(Favorite.user_id == user_id)
            )
        else:
            r = await db.execute(
                select(Favorite, Provider, ProviderProfile)
                .join(Provider, Favorite.provider_id == Provider.id)
                .join(ProviderProfile, Provider.id == ProviderProfile.provider_id)
                .where(Favorite.session_id == x_session_id)
            )
        rows = r.all()
        return [
            FavoritePreview(
                id=str(f.id),
                provider_id=str(f.provider_id),
                display_name=pf.display_name or "Provider",
                city=pf.city or "",
            )
            for f, p, pf in rows
        ]
    except OperationalError as e:
        logger.warning("Database unavailable for list_favorites: %s", e)
        return []
    except OSError as e:
        logger.warning("Database connection failed for list_favorites: %s", e)
        return []


# ---- Reports ----
class ReportCreate(BaseModel):
    provider_id: str
    reason: str | None = None


@router.post("/reports")
async def create_report(
    body: ReportCreate,
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
):
    """Report a provider. Anonymous allowed. Accepts mock provider IDs (no-op)."""
    try:
        provider_id = UUID(body.provider_id)
    except ValueError:
        # Mock/demo provider id (e.g. m1, m2) – accept without persisting
        return {"ok": True}
    try:
        r = await db.execute(select(Provider).where(Provider.id == provider_id))
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Provider not found")
        rep = Report(
            reporter_user_id=user_id,
            reported_provider_id=provider_id,
            reason=body.reason,
        )
        db.add(rep)
        await db.flush()
        return {"ok": True}
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for create_report: %s", e)
        return {"ok": True}


# ---- Blocks (user blocks provider) ----
@router.post("/blocks/{provider_id}")
async def block_provider(
    provider_id: str,
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
):
    """Block a provider. Requires auth."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        pid = UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    try:
        r = await db.execute(select(Provider).where(Provider.id == pid))
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Provider not found")
        b = Block(user_id=user_id, blocked_provider_id=pid)
        try:
            db.add(b)
            await db.flush()
        except Exception:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Already blocked")
        return {"ok": True}
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for block_provider: %s", e)
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")


@router.delete("/blocks/{provider_id}")
async def unblock_provider(
    provider_id: str,
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
):
    """Unblock a provider."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        pid = UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid provider ID")
    try:
        r = await db.execute(select(Block).where(Block.user_id == user_id, Block.blocked_provider_id == pid))
        b = r.scalar_one_or_none()
        if b:
            await db.delete(b)
        return {"ok": True}
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for unblock_provider: %s", e)
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")


# ---- Reviews (create only; list is in providers.py) ----
class ReviewCreate(BaseModel):
    provider_id: str
    rating: int
    comment: str | None = None


@router.post("/reviews")
async def create_review(
    body: ReviewCreate,
    db: DbSession,
    user_id: Annotated[UUID | None, Depends(get_optional_user_id)] = None,
):
    """Create a review. User optional. Accepts mock provider IDs (no-op)."""
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    try:
        provider_id = UUID(body.provider_id)
    except ValueError:
        return {"id": "mock"}
    try:
        r = await db.execute(select(Provider).where(Provider.id == provider_id))
        if not r.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Provider not found")
        rev = Review(
            provider_id=provider_id,
            user_id=user_id,
            rating=body.rating,
            comment=body.comment,
        )
        db.add(rev)
        await db.flush()
        return {"id": str(rev.id)}
    except (OperationalError, OSError) as e:
        logger.warning("Database unavailable for create_review: %s", e)
        return {"id": "pending"}
