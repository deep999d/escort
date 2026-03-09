"""Seed script - creates sample providers for demo."""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

# Import after DB URL is set
import os
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/concierge")

from app.core.config import settings
from app.models.provider import Provider, ProviderProfile
from app.models.availability import AvailabilitySlot


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if providers exist
        from sqlalchemy import select, func
        result = await session.execute(select(func.count()).select_from(Provider))
        count = result.scalar()
        if count > 0:
            print(f"Already {count} providers. Skip seed.")
            return

        samples = [
            {
                "email": "provider1@demo.local",
                "display_name": "Elena",
                "city": "Barcelona",
                "country": "ES",
                "price_min": 200,
                "price_max": 350,
                "languages": ["English", "Spanish", "Catalan"],
                "bio": "Professional, discreet, enjoys art and fine dining.",
                "response_sec": 180,
            },
            {
                "email": "provider2@demo.local",
                "display_name": "Sofia",
                "city": "Barcelona",
                "country": "ES",
                "price_min": 250,
                "price_max": 400,
                "languages": ["English", "Spanish"],
                "bio": "Travel-friendly, upscale preferences.",
                "response_sec": 300,
            },
            {
                "email": "provider3@demo.local",
                "display_name": "Maria",
                "city": "Madrid",
                "country": "ES",
                "price_min": 180,
                "price_max": 300,
                "languages": ["Spanish", "English"],
                "bio": "Warm, discreet, central Madrid.",
                "response_sec": 420,
            },
        ]

        from app.core.security import get_password_hash

        for s in samples:
            p = Provider(
                id=uuid.uuid4(),
                email=s["email"],
                password_hash=get_password_hash("demo123"),
                stage="activated",
                is_verified=True,
                response_time_avg_sec=s["response_sec"],
                accept_rate=0.85,
                availability_trust_score=0.9,
                live_available=True,
                auto_accept_when_slot_open=True,
            )
            session.add(p)
            await session.flush()

            pp = ProviderProfile(
                id=uuid.uuid4(),
                provider_id=p.id,
                display_name=s["display_name"],
                city=s["city"],
                country=s["country"],
                bio=s["bio"],
                languages=s["languages"],
                services=["Companionship", "Dining", "Travel"],
                price_min=s["price_min"],
                price_max=s["price_max"],
                price_currency="EUR",
            )
            session.add(pp)

            # Add availability slots (next 7 days)
            now = datetime.now(timezone.utc)
            for d in range(7):
                start = (now + timedelta(days=d)).replace(hour=19, minute=0, second=0)
                end = start + timedelta(hours=3)
                slot = AvailabilitySlot(
                    id=uuid.uuid4(),
                    provider_id=p.id,
                    start_at=start,
                    end_at=end,
                    timezone="Europe/Madrid",
                    status="open",
                )
                session.add(slot)

        await session.commit()
        print(f"Seeded {len(samples)} providers with availability slots.")


if __name__ == "__main__":
    asyncio.run(seed())
