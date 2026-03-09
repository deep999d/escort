# Concierge — Feature Guide

Use this doc to find and use **every implemented feature**. Nothing is omitted.

---

## Table of contents

1. [Navigation & global UI](#1-navigation--global-ui)
2. [Home page & search](#2-home-page--search)
3. [Discover (browse)](#3-discover-browse)
4. [Provider profile](#4-provider-profile)
5. [Booking](#5-booking)
6. [Messages / chat](#6-messages--chat)
7. [Account](#7-account)
8. [Provider dashboard](#8-provider-dashboard)
9. [Privacy & theme](#9-privacy--theme)
10. [Backend API reference](#10-backend-api-reference)
11. [Demo & mock data](#11-demo--mock-data)

---

## 1. Navigation & global UI

| Feature | Where | How to use |
|--------|------|------------|
| **Top nav** | Every page | Links: **Concierge** (home), **Discover**, **Messages**, **Bookings**, **Account**, **Provider**. Right side: **Privacy** toggle, **theme** (light/dark). |
| **Quick exit** | Every page | Press **Escape** or click the **Exit** button (bottom-right). Redirects to a safe URL (e.g. Google). For discretion. |
| **Theme toggle** | Top nav | Click to switch light/dark. |

---

## 2. Home page & search

| Feature | How to use |
|--------|------------|
| **Natural-language search** | Type in the search bar (e.g. *"Spanish, available now"*, *"near Barcelona"*, *"dinner tonight"*) and press Enter or submit. |
| **Voice input** | Click the **microphone** icon in the search bar. Speak; transcript fills the search box (browser must support Web Speech API). |
| **AI search (backend)** | If `OPENAI_API_KEY` and PostgreSQL are set (see README): query is parsed by LLM → intent → DB matching → availability pings. Results show as “Search results”. |
| **Demo results (fallback)** | If the API returns no results or fails: home page shows **demo matches** from mock data filtered by your query (e.g. “Spanish”, “available now”, “barcelona”). You see cards and a link to **Discover**. |
| **Save search** | After a search, click **Save search** next to “Understanding: …”. The query is stored for your session. |
| **Browse Now** | Click **Browse Now →** to go to **Discover** and see all mock providers with filters. |
| **Re-run saved search** | Go to **Account** → **Saved searches** → click a query. You are sent to `/?q=...` and that search runs again. |

---

## 3. Discover (browse)

| Feature | Where | How to use |
|--------|------|------------|
| **Discover** | Nav → **Discover** or **Browse Now** from home | Browse 6 mock providers (Carmen, Isabella, Valentina, Sofia, Elena, Maria) without backend. |
| **Search box** | Top of main area | Type to filter by **name**, **tagline**, **city**, **neighborhood**, **languages**, **services**. |
| **Sort** | Left sidebar + toolbar | **Sort by**: Relevance, Highest Rated, Price low→high, Price high→low. |
| **Location** | Left sidebar | **Location**: All Barcelona, Gracia, Eixample, Gothic Quarter, El Born. Filters by neighborhood. |
| **Budget** | Left sidebar | **Budget (EUR)**: Min/Max number inputs. |
| **Availability** | Left sidebar | **Availability**: Any Time, Available Now, Tonight, This Weekend. |
| **Language** | Left sidebar | **Language**: Any Language, Spanish, English, Catalan. |
| **View toggle** | Toolbar (icons) | **Grid (gallery)** vs **list (details)** view for provider cards. |
| **Provider cards** | Main area | Click a card → provider profile. Cards show photo, Verified/Premium, Available Now, name, age, neighborhood, tagline, rating, languages, response time, reliability %, price. |
| **Privacy blur** | Applies when **Privacy** is ON in nav | Profile photos are blurred on cards and list. Turn **Privacy** OFF in nav to show clear mock images. |

---

## 4. Provider profile

| Feature | How to use |
|--------|------------|
| **Open profile** | From home search results, Discover cards/list, or Account (favorites/bookings). URL: `/providers/{id}`. Mock IDs: `m1`–`m6`. |
| **Back to results** | Click **← Back to results** → Discover. |
| **Photo & blur** | Main image uses mock photo. If **Privacy** is ON: image is blurred; click **Reveal** to unblur on this page. |
| **Favorite** | Click **heart** icon. Adds to Account → Favorites. Requires session (anonymous is fine). For mock IDs, favorite may persist only in session. |
| **Report** | **⋮** menu → **Report** → enter reason → Submit. |
| **Block** | **⋮** menu → **Block** → confirm. Requires logged-in user (not anonymous). |
| **Request booking** | Click **Request booking** → `/book?provider={id}`. |
| **Message** | Click **Message** → `/chat?provider={id}` → creates conversation → redirect to chat. |
| **Write review** | Click **Write a review** / **Be the first to review** → rate 1–5 stars, optional comment → Submit. |
| **About / Services / Reviews** | Profile shows bio, languages, travel zones, location type, pricing, body/height/hair/ethnicity (mock), and **Services** / **Reviews** tabs when implemented. |

---

## 5. Booking

| Feature | How to use |
|--------|------------|
| **Start booking** | From a provider profile, click **Request booking**. URL: `/book?provider={id}`. |
| **Form** | Enter **Date**, **Time**, **Duration (minutes**, optional), **Notes** (optional). Submit. |
| **Submit** | Sends `POST /api/v1/bookings`. Requires backend + DB; for mock provider IDs (e.g. `m1`) the API may reject if it expects a UUID. |
| **After submit** | “Request sent” confirmation; link back to search. |
| **Booking history** | **Account** → **Booking history**. Lists bookings for current session or user. |

---

## 6. Messages / chat

| Feature | How to use |
|--------|------------|
| **Start chat** | From provider profile, click **Message**, or go to **Messages** in nav (list of conversations when implemented). URL: `/chat?provider={id}`. |
| **Create conversation** | Frontend sends `POST /api/v1/messages/conversations` with `user_id` (random UUID) and `provider_id`. Backend creates or returns conversation, then redirects to `/chat/{conversationId}`. |
| **Chat page** | View messages; type in input and send. Sends `POST .../messages?sender_type=user`. Content is PII-redacted on the backend. |
| **Requirement** | Provider must exist in DB (UUID). Mock IDs (`m1`–`m6`) are not UUIDs; use a seeded provider ID for real messaging. |

---

## 7. Account

| Feature | How to use |
|--------|------------|
| **Open Account** | Nav → **Account** or **Bookings**. |
| **Saved searches** | List of searches you saved from the home page. Click one → `/?q=...` and that search runs. |
| **Favorites** | List of providers you hearted. Click → provider profile. Click heart again on profile to remove. |
| **Booking history** | List of your booking requests. Click → provider profile. |
| **Session** | Saved searches, favorites, and bookings use **anonymous session** (no login) or logged-in user. Session ID is created on first home load. |

---

## 8. Provider dashboard

| Feature | How to use |
|--------|------------|
| **Open** | Nav → **Provider**. |
| **Demo login (no DB)** | Email: **provider1@demo.local**, Password: **demo123**. Logs you in and stores `provider_id` + token. |
| **Paste provider ID** | Alternatively paste a provider UUID (from a profile URL or DB) and click **View dashboard**. No password. |
| **Logout** | Click **Logout** (clears provider_id and token). |
| **Live availability** | Toggle **On** / **Off**. Sends `PATCH /api/v1/provider-dashboard/settings` with `live_available`. Affects whether you appear in backend search matches. |
| **Stats** | **Pending requests**, **Total bookings**, **Response rate** (from DB). |
| **Availability requests** | List of **pending** availability pings from user searches. Buttons: **Available** / **Unavailable**. Sends `POST .../pings/{id}/respond`. |
| **Backend** | Dashboard reads/writes provider-dashboard and auth APIs; stats and pings require PostgreSQL and seeded data. Demo login works without DB. |

---

## 9. Privacy & theme

| Feature | How to use |
|--------|------------|
| **Privacy (blur)** | Nav → **Privacy**. Toggle to **blur** or **show** profile images app-wide. Stored in `localStorage` (`privacy_blur`). When ON: Discover cards and provider profile images are blurred; on profile you can click **Reveal** for that page only. |
| **Theme** | Nav → theme toggle. Light/dark; typically persisted. |

---

## 10. Backend API reference

Base URL: `/api/v1` (frontend rewrites to backend, e.g. `http://localhost:8000/api/v1`).

| Area | Endpoints | Purpose |
|------|-----------|--------|
| **Auth** | `POST /auth/anonymous` | Create anonymous session (returns session_id, token). |
| | `POST /auth/register` | Register user (email, password). |
| | `POST /auth/login` | User login. |
| | `POST /auth/provider/login` | Provider login. Demo: provider1@demo.local / demo123 (no DB). |
| **Search** | `POST /search` | Body: query, session_id?, confirmed_only?. Returns parsed_intent, results, pending_count, fallback_suggestions. |
| | `GET /search/status/{session_id}` | Poll for availability updates. |
| **Providers** | `GET /providers/{id}?expand=true` | Get provider profile; expand for bio, services, availability_preview. |
| | `GET /providers/{id}/reviews` | List reviews. |
| **Provider dashboard** | `GET /provider-dashboard/pings?status=pending` | List pings. Header: X-Provider-ID. |
| | `POST /provider-dashboard/pings/{id}/respond` | Body: status (available\|unavailable). |
| | `GET /provider-dashboard/stats` | Pending count, total bookings, response rate. |
| | `PATCH /provider-dashboard/settings` | Body: live_available?, auto_accept_when_slot_open?. |
| | `PATCH /provider-dashboard/profile` | Update display_name, bio, languages, services, price_min, price_max. |
| | `GET /provider-dashboard/blocklist` | List blocked users. |
| | `POST /provider-dashboard/blocklist/{user_id}` | Block user. |
| | `DELETE /provider-dashboard/blocklist/{user_id}` | Unblock user. |
| **Bookings** | `POST /bookings` | Body: provider_id, requested_at, duration_minutes?, notes?. |
| | `GET /bookings` | List (by user or X-Session-ID). |
| | `PATCH /bookings/{id}/status` | Body: status. State flow: inquiry → availability_confirmed → time_locked → meeting_confirmed → completed | cancelled. |
| **Messages** | `POST /messages/conversations` | Body: user_id, provider_id, booking_id?. Returns conversation id. |
| | `GET /messages/conversations/{id}` | List messages. |
| | `POST /messages/conversations/{id}/messages?sender_type=user|provider` | Body: content. Send message; PII redacted. |
| **User** | `POST /user/saved-searches` | Body: query, parsed_intent?, session_id?. |
| | `GET /user/saved-searches` | List (by user or X-Session-ID). |
| | `POST /user/favorites/{provider_id}` | Add favorite. |
| | `DELETE /user/favorites/{provider_id}` | Remove favorite. |
| | `GET /user/favorites` | List favorites. |
| | `POST /user/reports` | Body: provider_id, reason?. |
| | `POST /user/blocks/{provider_id}` | Block provider (auth required). |
| | `DELETE /user/blocks/{provider_id}` | Unblock. |
| | `POST /user/reviews` | Body: provider_id, rating, comment?. |
| **Mocks** | Under `/mocks` | Any mock/demo endpoints. |

---

## 11. Demo & mock data

| Item | What it is |
|------|------------|
| **Mock providers (m1–m6)** | Carmen, Isabella, Valentina, Sofia, Elena, Maria. Used on **Discover** and **home demo results**. Each has city Barcelona, neighborhood, languages, services, price range, rating, availability. |
| **Mock images** | Each mock provider has an `image_url` (e.g. picsum.photos). Privacy blur applies to these. |
| **Anonymous session** | Created on first home page load via `POST /auth/anonymous`. Stored in `localStorage` as `anon_session_id`. Used for saved searches, favorites, bookings when not logged in. |
| **Demo provider login** | provider1@demo.local / demo123 works without PostgreSQL; backend returns a fixed provider_id and token. |
| **What works without DB** | Home (search + demo results), Discover (filters, gallery/list, mock cards), provider profile for mock IDs (view, blur), Account (if session exists), Provider dashboard (demo login). |
| **What needs DB** | Real search results (AI + matching), real provider profiles by UUID, bookings creation/list, messages, favorites/saved searches persistence, provider dashboard stats and pings. Run migrations + seed (see README). |

---

## Quick checklist (use every feature)

- [ ] **Home**: Run a search (e.g. “Spanish, available now”, “near Barcelona”), use voice if available, save a search, open demo results, click Browse Now.
- [ ] **Discover**: Use filters (sort, location, budget, availability, language), switch gallery/list view, use search box, toggle Privacy and see blur, open a provider.
- [ ] **Provider profile**: Toggle Privacy and Reveal, favorite, open ⋮ (Report/Block), Request booking, Message, write a review.
- [ ] **Booking**: From profile go to Request booking, fill date/time/duration/notes, submit (backend required for success).
- [ ] **Messages**: From profile go to Message (backend + UUID provider for real chat).
- [ ] **Account**: Open saved searches and re-run one, open favorites and remove one, check booking history.
- [ ] **Provider**: Log in with provider1@demo.local / demo123 (or paste UUID), toggle Live availability, view stats and availability requests, respond Available/Unavailable.
- [ ] **Global**: Use Privacy toggle, theme toggle, Quick exit (Escape or Exit button).

If something doesn’t work, check README for backend/env setup and “How to enable AI natural-language search”; use mock data and demo login for features that work without DB.
