"""Intent parsing service - extracts structured intent from natural language."""

from app.core.config import settings
from app.schemas.search import ParsedIntentSchema


class IntentParser:
    """LLM-based intent parser for natural language search queries."""

    def __init__(self) -> None:
        self._client = None  # Lazy init OpenAI/Anthropic

    def _get_llm_client(self):
        """Lazy load LLM client."""
        if self._client is None and settings.OPENAI_API_KEY:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def parse(self, query: str, session_id: str | None = None) -> ParsedIntentSchema:
        """
        Parse natural language query into structured intent.
        Falls back to keyword extraction if LLM unavailable.
        """
        client = self._get_llm_client()
        if client:
            return await self._parse_with_llm(client, query)
        return self._parse_fallback(query)

    async def _parse_with_llm(self, client, query: str) -> ParsedIntentSchema:
        """Use LLM to extract intent."""
        prompt = self._build_prompt(query)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content
        return self._parse_llm_response(query, content)

    def _build_prompt(self, query: str) -> str:
        return f"""Parse this search request into structured fields. Query: "{query}"
Return JSON with: intent_summary, location, city, country, datetime_start, datetime_end, timezone,
budget_min, budget_max, duration_min, preferences (object), exclusions (object), soft_signals (object).
Use null for unknown. For dates use ISO 8601. Be conservative - only extract what's clearly stated."""

    def _parse_llm_response(self, raw_query: str, content: str) -> ParsedIntentSchema:
        import json
        data = json.loads(content)
        return ParsedIntentSchema(
            raw_query=raw_query,
            intent_summary=data.get("intent_summary"),
            location=data.get("location"),
            city=data.get("city"),
            country=data.get("country"),
            datetime_start=data.get("datetime_start"),
            datetime_end=data.get("datetime_end"),
            timezone=data.get("timezone"),
            budget_min=data.get("budget_min"),
            budget_max=data.get("budget_max"),
            duration_min=data.get("duration_min"),
            preferences=data.get("preferences", {}),
            exclusions=data.get("exclusions", {}),
            soft_signals=data.get("soft_signals", {}),
        )

    def _parse_fallback(self, query: str) -> ParsedIntentSchema:
        """Fallback: simple keyword/pattern extraction when LLM unavailable."""
        q = query.lower().strip()
        # Basic city extraction (Barcelona, Paris, etc.)
        cities = ["barcelona", "paris", "milan", "madrid", "london", "berlin", "amsterdam"]
        city = next((c for c in cities if c in q), None)
        # Budget hints
        budget_min = budget_max = None
        if "cheap" in q or "budget" in q:
            budget_max = 200
        if "luxury" in q or "upscale" in q:
            budget_min = 300
        return ParsedIntentSchema(
            raw_query=query,
            intent_summary=q[:200] if len(q) > 200 else q,
            city=city,
            country="ES" if city == "barcelona" else None,
            budget_min=budget_min,
            budget_max=budget_max,
            preferences={"raw": q},
            exclusions={},
            soft_signals={},
        )


INTENT_SYSTEM_PROMPT = """You are an intent extraction system for a discrete concierge platform.
Extract structured search criteria from natural language. Output valid JSON only.
Handle euphemisms (discreet, GFE, upscale, travel friendly) as preferences.
Resolve relative times (tonight, this weekend, next Thursday) to ISO 8601.
Infer timezone from city when possible. Be conservative - null for uncertain values."""
