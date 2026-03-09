"""Application configuration."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    PROJECT_NAME: str = "AI Concierge Platform"
    DEBUG: bool = False

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/concierge"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenSearch / Elasticsearch
    OPENSEARCH_URL: str = "http://localhost:9200"

    # Vector DB (Qdrant)
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None

    # LLM
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    LLM_PROVIDER: str = "openai"  # openai | anthropic
    EMBEDDING_MODEL: str = "text-embedding-3-large"
    EMBEDDING_DIMENSIONS: int = 3072

    # Auth
    SECRET_KEY: str = "CHANGE_IN_PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    ANONYMOUS_SESSION_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # S3 / Storage
    S3_BUCKET: str = "concierge-assets"
    S3_REGION: str = "eu-west-1"

    # Queue (Redis / SQS)
    TASK_QUEUE_URL: str | None = None

    # Feature flags
    ENABLE_VOICE_INPUT: bool = True
    ENABLE_AGENT_OUTREACH: bool = True

    # Demo (no DB required for demo provider login)
    DEMO_PROVIDER_EMAIL: str = "provider1@demo.local"
    DEMO_PROVIDER_PASSWORD: str = "demo123"
    DEMO_PROVIDER_ID: str = "00000000-0000-0000-0000-000000000001"

    # Demo user (no DB required for client login/register)
    DEMO_USER_EMAIL: str = "user@example.com"
    DEMO_USER_PASSWORD: str = "demo123"
    DEMO_USER_ID: str = "00000000-0000-0000-0000-000000000002"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
