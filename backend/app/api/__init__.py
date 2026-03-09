"""API routes."""

from fastapi import APIRouter

from app.api.endpoints import search, auth, providers, booking, provider_dashboard, messages, user_features, mocks

router = APIRouter()

router.include_router(search.router, prefix="/search", tags=["search"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(providers.router, prefix="/providers", tags=["providers"])
router.include_router(provider_dashboard.router, prefix="/provider-dashboard", tags=["provider-dashboard"])
router.include_router(booking.router, prefix="/bookings", tags=["bookings"])
router.include_router(messages.router, prefix="/messages", tags=["messages"])
router.include_router(user_features.router, prefix="/user", tags=["user-features"])
router.include_router(mocks.router, prefix="/mocks", tags=["mocks"])
