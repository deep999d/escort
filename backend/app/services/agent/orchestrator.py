"""Agent orchestrator - AI liaison bots for availability confirmation."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.availability_ping import AvailabilityPing
from app.models.availability import AvailabilitySlot
from app.models.provider import Provider
from app.schemas.search import AvailabilityPingResult, ProviderPreview


class AgentOrchestrator:
    """
    Orchestrates AI liaison bots that:
    1. Create availability pings in DB (providers respond via dashboard)
    2. Check existing ping responses
    3. Auto-confirm available if provider has open slot (demo)
    4. Report back: available | unavailable | pending
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def ping_availability(
        self,
        provider_ids: list[UUID],
        intent_summary: str,
        search_session_id: str,
        requested_slot_start: datetime | None = None,
    ) -> list[AvailabilityPingResult]:
        """
        Create availability pings in DB. Check for existing responses.
        Optionally auto-confirm if provider has open slot (demo).
        """
        if not settings.ENABLE_AGENT_OUTREACH:
            return [
                AvailabilityPingResult(provider_id=pid, status="pending", message="Agent outreach disabled")
                for pid in provider_ids
            ]

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        results: list[AvailabilityPingResult] = []

        for pid in provider_ids:
            # Check for existing ping response for this session
            existing = await self.db.execute(
                select(AvailabilityPing)
                .where(AvailabilityPing.provider_id == pid)
                .where(AvailabilityPing.search_session_id == search_session_id)
                .where(AvailabilityPing.expires_at > datetime.now(timezone.utc))
            )
            ping = existing.scalars().first()

            if ping and ping.status != "pending":
                results.append(
                    AvailabilityPingResult(
                        provider_id=pid,
                        status=ping.status,
                        message=ping.provider_notes,
                    )
                )
                continue

            # Create new ping if none exists
            if not ping:
                ping = AvailabilityPing(
                    provider_id=pid,
                    search_session_id=search_session_id,
                    intent_summary=intent_summary[:2000],
                    requested_slot_start=requested_slot_start,
                    expires_at=expires_at,
                    status="pending",
                )
                self.db.add(ping)
                await self.db.flush()

            # Auto-confirm if provider has open slot AND (auto_accept_when_slot_open OR demo fallback)
            prov_result = await self.db.execute(select(Provider).where(Provider.id == pid))
            provider = prov_result.scalars().first()
            auto_accept = provider.auto_accept_when_slot_open if provider else False
            has_slot = await self._has_open_slot(pid, requested_slot_start)
            if has_slot and ping.status == "pending" and auto_accept:
                ping.status = "available"
                ping.provider_responded_at = datetime.now(timezone.utc)
                ping.provider_notes = "Auto-confirmed (provider has open slot)"
                results.append(AvailabilityPingResult(provider_id=pid, status="available", message=None))
            else:
                results.append(
                    AvailabilityPingResult(
                        provider_id=pid,
                        status=ping.status,
                        message="Awaiting provider response." if ping.status == "pending" else None,
                    )
                )

        await self.db.flush()
        return results

    async def _has_open_slot(self, provider_id: UUID, requested: datetime | None) -> bool:
        """Check if provider has an open availability slot (for demo auto-confirm)."""
        if not requested:
            return False
        window_start = requested - timedelta(hours=1)
        window_end = requested + timedelta(hours=2)
        result = await self.db.execute(
            select(AvailabilitySlot)
            .where(AvailabilitySlot.provider_id == provider_id)
            .where(AvailabilitySlot.status == "open")
            .where(AvailabilitySlot.start_at <= window_end)
            .where(AvailabilitySlot.end_at >= window_start)
        )
        return result.scalars().first() is not None

    async def get_ping_statuses(
        self,
        search_session_id: str,
        provider_ids: list[UUID],
    ) -> dict[UUID, str]:
        """Get current ping statuses for a search session (for polling)."""
        result = await self.db.execute(
            select(AvailabilityPing.provider_id, AvailabilityPing.status)
            .where(AvailabilityPing.search_session_id == search_session_id)
            .where(AvailabilityPing.provider_id.in_(provider_ids))
        )
        return {row[0]: row[1] for row in result.all()}

    async def update_previews_with_availability(
        self,
        previews: list[ProviderPreview],
        ping_results: list[AvailabilityPingResult],
    ) -> list[ProviderPreview]:
        """Merge availability ping results into provider previews."""
        status_map = {r.provider_id: r.status for r in ping_results}
        updated = []
        for p in previews:
            status = status_map.get(p.id, "pending")
            updated.append(ProviderPreview(**{**p.model_dump(), "availability_status": status}))
        return updated
