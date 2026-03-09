"""Providers API - profile viewing, discreet cards."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.provider import Provider, ProviderProfile
from app.models.profile_impression import ProfileImpression
from app.models.review import Review
from app.schemas.provider import ProviderProfilePublic, ProviderProfileDetail
from app.services.availability.service import AvailabilityService

router = APIRouter()


@router.get("/{provider_id}", response_model=ProviderProfileDetail)
async def get_provider(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
    expand: bool = False,
    x_session_id: str | None = Header(None),
):
    """Get provider profile. Discreet preview by default; full details with expand=true."""
    result = await db.execute(
        select(Provider, ProviderProfile)
        .join(ProviderProfile, Provider.profile)
        .where(Provider.id == provider_id)
        .where(Provider.is_active.is_(True))
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider, profile = row

    imp = ProfileImpression(
        provider_id=provider_id,
        session_id=x_session_id,
        source="profile",
    )
    db.add(imp)
    await db.flush()

    availability_preview = []
    if expand:
        avail_svc = AvailabilityService(db)
        availability_preview = await avail_svc.get_availability_preview(provider_id, days_ahead=7)

    return ProviderProfileDetail(
        id=provider.id,
        display_name=profile.display_name,
        city=profile.city,
        region=profile.region,
        country=profile.country,
        price_min=profile.price_min,
        price_max=profile.price_max,
        price_currency=profile.price_currency,
        languages=profile.languages,
        bio=profile.bio if expand else None,
        services=profile.services if expand else [],
        attributes=profile.attributes if expand else {},
        is_verified=provider.is_verified,
        response_time_avg_sec=provider.response_time_avg_sec,
        availability_trust_score=provider.availability_trust_score,
        availability_preview=availability_preview,
    )


class ReviewItem(BaseModel):
    id: str
    rating: int
    comment: str | None = None
    created_at: str | None = None


@router.get("/{provider_id}/reviews", response_model=list[ReviewItem])
async def list_provider_reviews(
    provider_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """List visible reviews for a provider."""
    r = await db.execute(
        select(Review)
        .where(Review.provider_id == provider_id, Review.is_visible.is_(True))
        .order_by(Review.created_at.desc())
        .limit(50)
    )
    rows = r.scalars().all()
    return [
        ReviewItem(
            id=str(rev.id),
            rating=rev.rating,
            comment=rev.comment,
            created_at=rev.created_at.isoformat() if rev.created_at else None,
        )
        for rev in rows
    ]
