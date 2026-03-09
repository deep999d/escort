"""Matching engine - hybrid semantic + rules + availability."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.provider import Provider, ProviderProfile
from app.schemas.search import ParsedIntentSchema, ProviderPreview


class MatchingEngine:
    """Hybrid matching: hard filters -> vector similarity -> rerank -> availability."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def match(
        self,
        intent: ParsedIntentSchema,
        top_k: int = 50,
        availability_filter: bool = True,
    ) -> list[tuple[Provider, ProviderProfile]]:
        """
        Match providers to parsed intent.
        Returns (Provider, ProviderProfile) tuples ordered by relevance.
        """
        # 1. Hard filters (only activated, live_available)
        query = (
            select(Provider, ProviderProfile)
            .join(ProviderProfile, Provider.profile)
            .where(Provider.stage == "activated")
            .where(Provider.is_active.is_(True))
            .where(Provider.live_available.is_(True))
            .where(ProviderProfile.is_visible.is_(True))
        )

        if intent.city:
            query = query.where(ProviderProfile.city.ilike(f"%{intent.city}%"))
        if intent.country:
            query = query.where(ProviderProfile.country == intent.country.upper())
        if intent.budget_min is not None:
            query = query.where(ProviderProfile.price_max >= intent.budget_min)
        if intent.budget_max is not None:
            query = query.where(ProviderProfile.price_min <= intent.budget_max)

        result = await self.db.execute(query)
        rows = result.all()

        # 2. Score and sort (simple scoring; production would use vector + reranker)
        scored: list[tuple[float, Provider, ProviderProfile]] = []
        for provider, profile in rows:
            score = self._score_match(provider, profile, intent)
            scored.append((score, provider, profile))

        scored.sort(key=lambda x: -x[0])
        matched = [(p, pf) for _, p, pf in scored[:top_k]]

        return matched

    def _score_match(
        self,
        provider: Provider,
        profile: ProviderProfile,
        intent: ParsedIntentSchema,
    ) -> float:
        """Score provider against intent. Higher = better match."""
        score = 1.0
        # Response time (faster = better)
        if provider.response_time_avg_sec:
            if provider.response_time_avg_sec < 300:  # < 5 min
                score *= 1.2
            elif provider.response_time_avg_sec > 1800:  # > 30 min
                score *= 0.8
        # Availability trust
        score *= provider.availability_trust_score
        # Accept rate
        if provider.accept_rate:
            score *= 0.9 + 0.1 * provider.accept_rate
        return score

    def to_preview(
        self,
        provider: Provider,
        profile: ProviderProfile,
        availability_status: str = "pending",
    ) -> ProviderPreview:
        """Convert to ProviderPreview for API response."""
        price_ind = None
        if profile.price_min and profile.price_max:
            price_ind = f"{profile.price_min}-{profile.price_max} {profile.price_currency}"
        elif profile.price_min:
            price_ind = f"From {profile.price_min} {profile.price_currency}"

        return ProviderPreview(
            id=provider.id,
            display_name=profile.display_name,
            city=profile.city,
            price_indication=price_ind,
            availability_status=availability_status,
            response_time_sec=provider.response_time_avg_sec,
            is_verified=provider.is_verified,
        )
