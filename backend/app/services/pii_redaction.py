"""PII redaction - phone numbers, emails in message content."""

import re


PHONE_PATTERN = re.compile(
    r"\+?[\d\s\-\(\)]{10,20}|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"
)
EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
)


def redact_pii(content: str) -> tuple[str, bool]:
    """Redact phone numbers and emails. Returns (redacted_content, was_redacted)."""
    if not content:
        return content, False
    redacted = content
    redacted = PHONE_PATTERN.sub("[REDACTED]", redacted)
    redacted = EMAIL_PATTERN.sub("[REDACTED]", redacted)
    return redacted, redacted != content
