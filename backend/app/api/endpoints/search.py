"""Search API - natural language + intent parsing + matching."""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.search import SearchRequest, SearchResponse, SearchStatusResponse, ParsedIntentSchema, ProviderPreview
from app.services.intent.parser import IntentParser
from app.services.matching.engine import MatchingEngine
from app.services.agent.orchestrator import AgentOrchestrator

router = APIRouter()


@router.post("", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    AI-first search: natural language query → intent → matching → availability pings.

    Users describe what they want. System:
    1. Parses intent (LLM or fallback)
    2. Matches providers
    3. Sends availability pings
    4. Returns only providers who confirm (or pending)
    """
    query = request.query or request.voice_transcript or ""
    if not query.strip():
        return SearchResponse(
            session_id="",
            parsed_intent=ParsedIntentSchema(raw_query=""),
            results=[],
            pending_count=0,
            total_matched=0,
            fallback_suggestions=[],
        )

    session_id = request.session_id or str(uuid.uuid4())

    # 1. Parse intent
    parser = IntentParser()
    intent = await parser.parse(query, session_id)

    # Override with structured fields if provided
    if request.city:
        intent.city = request.city
    if request.country:
        intent.country = request.country
    if request.datetime_start:
        intent.datetime_start = request.datetime_start
    if request.budget_min is not None:
        intent.budget_min = request.budget_min
    if request.budget_max is not None:
        intent.budget_max = request.budget_max

    # 2. Match
    engine = MatchingEngine(db)
    matched = await engine.match(intent, top_k=20)

    # 3. Trigger availability pings (agent outreach) - creates DB records
    agent = AgentOrchestrator(db)
    provider_ids = [p.id for p, _ in matched]
    requested_slot = None
    if intent.datetime_start:
        try:
            requested_slot = datetime.fromisoformat(intent.datetime_start.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass
    ping_results = await agent.ping_availability(
        provider_ids=provider_ids,
        intent_summary=intent.intent_summary or intent.raw_query[:200],
        search_session_id=session_id,
        requested_slot_start=requested_slot,
    )

    # 4. Build previews with availability status; filter by confirmed_only if requested
    previews: list[ProviderPreview] = []
    for provider, profile in matched:
        status = next((r.status for r in ping_results if r.provider_id == provider.id), "pending")
        if request.confirmed_only and status != "available":
            continue
        previews.append(engine.to_preview(provider, profile, availability_status=status))

    pending = sum(1 for r in ping_results if r.status == "pending")

    fallback_suggestions: list[str] = []
    if request.confirmed_only and len(previews) == 0 and len(matched) > 0:
        fallback_suggestions = [
            "Try a different date or time",
            "Check back in a few minutes—providers are confirming availability",
            "Expand your search area",
        ]
    elif request.confirmed_only and len(previews) == 0:
        fallback_suggestions = [
            "Try broadening your search (e.g. nearby cities)",
            "Adjust your budget or preferences",
        ]

    return SearchResponse(
        session_id=session_id,
        parsed_intent=intent,
        results=previews,
        pending_count=pending,
        total_matched=len(matched),
        fallback_suggestions=fallback_suggestions,
    )


@router.get("/status/{session_id}", response_model=SearchStatusResponse)
async def search_status(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Poll for availability status updates. Returns updated results."""
    from app.models.availability_ping import AvailabilityPing
    from sqlalchemy import select

    result = await db.execute(
        select(AvailabilityPing)
        .where(AvailabilityPing.search_session_id == session_id)
    )
    pings = result.scalars().all()
    if not pings:
        return SearchStatusResponse(results=[], pending_count=0, fallback_suggestions=[])

    provider_ids = list({p.provider_id for p in pings})
    agent = AgentOrchestrator(db)
    statuses = await agent.get_ping_statuses(session_id, provider_ids)
    from app.models.provider import Provider, ProviderProfile
    from sqlalchemy.orm import selectinload

    prov_result = await db.execute(
        select(Provider, ProviderProfile)
        .join(ProviderProfile, Provider.profile)
        .where(Provider.id.in_(provider_ids))
    )
    rows = prov_result.all()
    engine = MatchingEngine(db)
    previews = [
        engine.to_preview(p, pf, availability_status=statuses.get(p.id, "pending"))
        for p, pf in rows
    ]
    pending = sum(1 for s in statuses.values() if s == "pending")
    fallback = []
    if pending > 0 and not any(s == "available" for s in statuses.values()):
        fallback = ["Check back in a moment—providers are confirming."]
    return SearchStatusResponse(results=previews, pending_count=pending, fallback_suggestions=fallback)
