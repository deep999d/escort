# AI-First Classifieds Concierge Platform

> A platform where users never browse, advertisers never chase, and AI handles everything in between.

## Overview

This platform replaces filters, scrolling, and cold outreach with a discreet AI concierge that:

- **Understands intent**, not just keywords
- **Searches globally** across structured + unstructured listings
- **Acts on behalf of the user** to confirm availability, suitability, and timing
- **Orchestrates the journey**: discovery → validation → contact → booking

## Core Innovation

- **Real-time availability confirmation** — Only confirmed-available providers are shown
- **Natural language search** — No filters, no dropdowns; users describe what they want
- **AI agent orchestration** — Liaison bots contact advertisers, confirm availability, negotiate, and book
- **Privacy-first** — Temporary anonymised identities, no contact info until confirmation

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js / React)                        │
│  Single conversational bar • Voice input • Discreet profile cards       │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI INTENT ENGINE (LLM-based)                         │
│  Intent extraction • Constraint parsing • Time/location normalization   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              MATCHING ENGINE (Hybrid semantic + rules)                  │
│  Vector similarity • Hard filters • Reranking • Availability scoring    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATOR                                   │
│  Availability pings • Provider outreach • Status reporting • Booking    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            ENCRYPTED COMMUNICATION LAYER                                │
│  In-platform messaging • Auto-moderation • No contact exchange          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TypeScript |
| Backend | Python 3.11, FastAPI |
| Primary DB | PostgreSQL |
| Search | OpenSearch / Elasticsearch |
| Vector DB | Qdrant / OpenSearch kNN |
| Cache | Redis |
| Queue | Redis / SQS / PubSub |
| LLM | OpenAI / Anthropic (provider-agnostic) |
| Auth | OAuth2, JWT, anonymous sessions |

## Quick Start

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -e .
pip install uvicorn[standard]
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Full stack (Docker)
docker-compose up -d
```

### How to enable AI natural-language search

The home-page search bar can use **AI intent parsing** (OpenAI) so queries like *"Spanish, available now, Barcelona"* or *"dinner tonight under 300"* are understood as structured criteria. To turn that on:

1. **Get an OpenAI API key**  
   Create one at [platform.openai.com](https://platform.openai.com/api-keys).

2. **Configure the backend**  
   In the `backend` folder, copy the example env and set your key:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set:
   # OPENAI_API_KEY=sk-your-key-here
   ```

3. **Run PostgreSQL**  
   The matching engine reads from the database. Use a local Postgres or Docker:
   ```bash
   # Example: create DB
   createdb concierge
   # Or with Docker:
   # docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=concierge postgres:15
   ```
   Ensure `DATABASE_URL` in `.env` matches (default: `postgresql+asyncpg://postgres:postgres@localhost:5432/concierge`).

4. **Apply migrations and seed providers**  
   So the search has providers to match:
   ```bash
   cd backend
   alembic upgrade head
   python -m scripts.seed
   ```

5. **Restart the backend**  
   After changing `.env`, restart uvicorn so it picks up `OPENAI_API_KEY`.

Then use the **home page search bar**: your query is sent to the backend, the LLM parses it into intent (city, budget, time, language, etc.), the matching engine returns providers from the DB, and the frontend shows those results. If the API returns nothing (e.g. no DB or no match), the frontend falls back to **keyword-based demo results** from the mock list so you still see something.

## Project Structure

```
project/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/             # REST endpoints
│   │   ├── core/            # Config, security, deps
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   │   ├── intent/      # Intent parsing
│   │   │   ├── matching/    # Matching engine
│   │   │   ├── agent/       # Agent orchestration
│   │   │   ├── availability/
│   │   │   └── messaging/
│   │   └── workers/         # Async job workers
│   └── alembic/             # Migrations
├── frontend/                # Next.js application
│   ├── app/
│   │   ├── (chat)/          # Conversational search
│   │   ├── (dashboard)/     # User/provider dashboards
│   │   └── api/             # API routes
│   └── components/
├── infra/                   # Terraform, Docker
└── shared/                  # Shared types & contracts
```

## Environment Variables

See `.env.example` in backend and frontend directories.

## License

Proprietary. All rights reserved.
