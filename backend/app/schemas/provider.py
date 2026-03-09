"""Provider schemas."""

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProviderProfilePublic(BaseModel):
    """Public profile view (discreet cards)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    display_name: str
    city: str
    region: str | None = None
    country: str
    price_min: float | None = None
    price_max: float | None = None
    price_currency: str = "EUR"
    languages: list[str] = Field(default_factory=list)
    is_verified: bool = False
    response_time_avg_sec: float | None = None
    availability_trust_score: float = 1.0


class ProviderProfileDetail(ProviderProfilePublic):
    """Full profile (after user expands)."""

    bio: str | None = None
    services: list[str] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)
    availability_preview: list[dict] = Field(default_factory=list)
