# Implementation vs Requirements Mapping

This document maps each client requirement to the implemented components.

## Core Product Thesis

| Requirement | Implementation |
|-------------|----------------|
| AI-First Concierge (no browsing) | `backend/app/services/intent/parser.py` — LLM-based intent parsing |
| Understands intent, not keywords | `IntentParser` extracts city, time, budget, preferences from natural language |
| Searches across structured + unstructured | `MatchingEngine` — hybrid filters + scoring (vector-ready) |
| Confirms availability before showing | `AgentOrchestrator` — availability pings; `AvailabilityService` — slot checks |
| Orchestrates discovery → validation → contact → booking | Search API → Matching → Pings → Booking API flow |

## User Experience

| Requirement | Implementation |
|-------------|----------------|
| Typed prompt, voice input | `SearchBar` accepts text; `SearchRequest` supports `voice_transcript` |
| No filters, no dropdowns | Single conversational input in `SearchBar` |
| Intent extraction (LLM) | `IntentParser` with GPT-4o-mini; fallback keyword extraction |
| Matches: profiles, availability, acceptance patterns | `MatchingEngine._score_match` uses response_time, accept_rate, trust_score |
| Results ranked by likelihood of success | Scored and sorted in `MatchingEngine.match` |

## Agent-Based Automation

| Requirement | Implementation |
|-------------|----------------|
| AI liaison bot contacts advertisers | `AgentOrchestrator.ping_availability` |
| Confirms availability, willingness | `AvailabilityPingResult` status: available | unavailable | pending |
| Reports back in real time | `ProviderPreview.availability_status` in search results |
| Negotiates logistics, schedules | Scaffolding in `AgentOrchestrator`; booking flow in `BookingCreate` |

## Provider Experience

| Requirement | Implementation |
|-------------|----------------|
| Profile management | `ProviderProfile`, `ProviderProfileDetail` |
| Availability calendar | `AvailabilitySlot`, `AvailabilityService.get_availability_preview` |
| AI-screened requests | Intent summary passed to `ping_availability` |
| Stage funnel: scraped → claimed → activated | `Provider.stage` field |

## System Architecture

| Component | Implementation |
|-----------|----------------|
| Intent Parser (LLM) | `app/services/intent/parser.py` |
| Matching Engine | `app/services/matching/engine.py` |
| Agent Orchestrator | `app/services/agent/orchestrator.py` |
| Real-time Availability Layer | `app/services/availability/service.py` |
| Encrypted messaging (scaffolding) | `Conversation`, `Message` models |
| Trust & verification | `User.is_verified`, `Provider.is_verified` |

## Trust & Safety

| Requirement | Implementation |
|-------------|----------------|
| Temporary anonymised identities | `Conversation.user_anon_id` |
| No contact exchange until confirmation | All coordination via platform; no phone/email in schemas |
| Auto-expiration of chats | `Conversation.expires_at` |
| Opt-in AI delegation | `ENABLE_AGENT_OUTREACH` config |

## Platform Functionalities (Selected)

| Feature | Implementation |
|---------|----------------|
| Natural language search | `POST /api/v1/search` with `query` |
| Geo-location, time, budget filters | Extracted in `ParsedIntentSchema` |
| Live availability status | `availability_status` in `ProviderPreview` |
| Discreet profile cards | `ProviderCard`, `ProviderProfilePublic` |
| Booking request flow | `POST /api/v1/bookings`, `/book` page |
| In-platform messaging | `Conversation`, `Message` models (API to be extended) |
| Conversion-based revenue | `ConversionEvent` model |
| Provider subscription (post-first-booking) | `Provider.stage` = monetised |

## Technical Stack (Per Spec)

| Layer | Spec | Implementation |
|-------|------|----------------|
| Frontend | Next.js / React | Next.js 14, React 18 |
| Backend | Python 3.11, FastAPI | FastAPI, async |
| Primary DB | PostgreSQL | PostgreSQL + asyncpg |
| Search | OpenSearch/Elastic | Ready (filters in SQL); vector index pluggable |
| Vector DB | Qdrant/OpenSearch kNN | Config in settings; embedding pipeline ready |
| Cache | Redis | Redis URL in config |
| LLM | OpenAI/Anthropic | OpenAI (OpenAI API key) |
| Auth | OAuth2, anonymous | JWT + anonymous session |

## Barcelona Launch, Mass Market

- City filter: `intent.city`, `ProviderProfile.city`
- Provider funnel: Scraped → Claimed → Activated → Monetised
- Subscription triggered after first completed booking (logic in `ConversionEvent`)

## Newly Implemented Features

| Feature | Implementation |
|---------|----------------|
| Provider dashboard | `/provider` - login, list pings, respond available/unavailable |
| Real availability flow | `AvailabilityPing` model, AgentOrchestrator creates pings, checks responses |
| Auto-confirm (demo) | Providers with open slots auto-marked available |
| Messaging API | `POST /messages/conversations`, `GET/POST` messages |
| Chat UI | `/chat?provider=...`, `/chat/[id]` |
| Voice input | `VoiceInput` component (Web Speech API) |
| Dark/light mode toggle | `ThemeProvider`, `ThemeToggle` |
| Quick exit | `QuickExit` - Esc key or button |
| Search status polling | `GET /search/status/{session_id}`, frontend polls when pending |
| Confirmed-only filter | `confirmed_only=true` in search request |
| Conversion tracking | `ConversionTracker`; conversion logged when booking → completed |
| Audit logging | `audit_log()` for booking_created, booking_status_updated |
| Default confirmed_only | `confirmed_only=True` per client spec |
| Booking state machine | `PATCH /bookings/{id}/status`; inquiry → availability_confirmed → time_locked → meeting_confirmed → completed |
| Profile impressions | `ProfileImpression` on provider view |
| PII redaction | Phone/email redacted in messages |
| Chat expiration | Enforced on `GET /messages/conversations/{id}` |
| Provider live_available | Toggle via `PATCH /provider-dashboard/settings` |
| Provider profile edit | `PATCH /provider-dashboard/profile` |
| Auto-accept rules | `auto_accept_when_slot_open` on Provider |
| Fallback suggestions | Returned when no confirmed results |
| Response countdown | Frontend timer when pending |
| Anonymous session | Created on mount; passed to search |

## Running the Project

```bash
# 1. Start infra
docker-compose up -d postgres redis

# 2. Backend
cd backend && poetry install && poetry run alembic upgrade head && poetry run python scripts/seed.py && poetry run uvicorn app.main:app --reload

# 3. Frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:3000 — search e.g. "Barcelona, Thursday evening, English".
