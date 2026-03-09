"""Mock endpoints for features that will use real APIs later."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ---- Autocomplete (mock suggestions) ----
class AutocompleteItem(BaseModel):
    text: str
    type: str  # city | service | suggestion


MOCK_AUTOCOMPLETE = [
    AutocompleteItem(text="New York", type="city"),
    AutocompleteItem(text="Los Angeles", type="city"),
    AutocompleteItem(text="London", type="city"),
    AutocompleteItem(text="dinner tonight", type="suggestion"),
    AutocompleteItem(text="weekend massage", type="suggestion"),
    AutocompleteItem(text="evening companionship", type="suggestion"),
]


@router.get("/autocomplete", response_model=list[AutocompleteItem])
async def autocomplete(q: str = ""):
    """Mock autocomplete. Replace with real search/geo API."""
    q = (q or "").strip().lower()
    if not q:
        return MOCK_AUTOCOMPLETE[:5]
    return [a for a in MOCK_AUTOCOMPLETE if q in a.text.lower()][:10]


# ---- Geo (mock location) ----
class GeoLocation(BaseModel):
    lat: float
    lng: float
    city: str
    country: str


MOCK_GEO = GeoLocation(lat=40.7128, lng=-74.0060, city="New York", country="US")


@router.get("/geo", response_model=GeoLocation)
async def get_geo_location():
    """Mock geo. Replace with real IP/geo API."""
    return MOCK_GEO


# ---- 2FA (mock OTP) ----
class TwoFactorVerifyRequest(BaseModel):
    code: str


@router.post("/2fa/send")
async def send_2fa_code():
    """Mock: send OTP. Replace with real SMS/email provider."""
    return {"ok": True, "message": "Code sent (mock)"}


@router.post("/2fa/verify")
async def verify_2fa(body: TwoFactorVerifyRequest):
    """Mock: verify OTP. Replace with real verification."""
    return {"ok": True}


# ---- Identity verification (mock) ----
@router.post("/verification/start")
async def start_verification():
    """Mock: start ID verification. Replace with real KYC provider."""
    return {"session_id": "mock_verification_session", "status": "pending"}


@router.get("/verification/status")
async def verification_status(session_id: str = ""):
    """Mock: check verification status."""
    return {"status": "verified", "session_id": session_id or "mock"}


# ---- AI recommendations (mock) ----
class RecommendationItem(BaseModel):
    provider_id: str
    reason: str
    score: float


MOCK_RECOMMENDATIONS = [
    RecommendationItem(provider_id="00000000-0000-0000-0000-000000000001", reason="Matches your preferences", score=0.92),
    RecommendationItem(provider_id="00000000-0000-0000-0000-000000000002", reason="Similar to past bookings", score=0.88),
]


@router.get("/recommendations", response_model=list[RecommendationItem])
async def get_recommendations():
    """Mock AI recommendations. Replace with real ML service."""
    return MOCK_RECOMMENDATIONS


# ---- Add to calendar (mock .ics) ----
@router.get("/calendar/ics")
async def get_calendar_ics(
    title: str = "Booking",
    start: str = "",
    end: str = "",
):
    """Generate .ics for add-to-calendar. Replace with real booking times."""
    from fastapi.responses import PlainTextResponse
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    start_dt = now + datetime.timedelta(hours=1)
    end_dt = start_dt + datetime.timedelta(hours=1)
    if start:
        try:
            start_dt = datetime.datetime.fromisoformat(start.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass
    if end:
        try:
            end_dt = datetime.datetime.fromisoformat(end.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass
    ics = f"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:{start_dt.strftime("%Y%m%dT%H%M%SZ")}
DTEND:{end_dt.strftime("%Y%m%dT%H%M%SZ")}
SUMMARY:{title}
END:VEVENT
END:VCALENDAR"""
    return PlainTextResponse(ics, media_type="text/calendar")
