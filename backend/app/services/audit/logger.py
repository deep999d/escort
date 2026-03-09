"""Audit logging - structured audit trail without exposing parties."""

import structlog
from datetime import datetime, timezone
from typing import Any
from uuid import UUID


def audit_log(
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    actor_type: str | None = None,
    actor_id_hashed: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Log audit event. Never log raw PII - use hashed IDs only."""
    log = structlog.get_logger("audit")
    log.info(
        action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_type=actor_type,
        actor_id_hashed=actor_id_hashed,
        metadata=metadata or {},
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
