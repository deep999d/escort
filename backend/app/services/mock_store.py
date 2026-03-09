"""In-memory mock store for demo mode without PostgreSQL. Persists across requests."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any
from uuid import UUID, uuid4


@dataclass
class MockMessage:
    id: str
    sender_type: str
    content: str
    is_read: bool
    created_at: str


@dataclass
class MockConversation:
    id: str
    user_id: str
    provider_id: str
    messages: list[MockMessage] = field(default_factory=list)


@dataclass
class MockBooking:
    id: str
    user_id: str
    provider_id: str
    status: str
    requested_at: str
    duration_minutes: int | None
    session_id: str | None
    notes: str | None


@dataclass
class MockAvailabilitySlot:
    start: str
    end: str
    booked_by: str | None = None  # booking_id if taken


@dataclass
class MockAvailabilityPing:
    id: str
    provider_id: str
    search_session_id: str
    intent_summary: str
    requested_slot_start: str | None
    status: str  # pending | available | unavailable
    created_at: str


def _provider_key(pid: str | UUID) -> str:
    return str(pid).lower()


class MockStore:
    """Thread-safe in-memory store for demo. Uses simple dicts."""

    def __init__(self) -> None:
        self._conversations: dict[str, MockConversation] = {}
        self._user_provider_to_conv: dict[str, str] = {}  # "user_id|provider_id" -> conv_id
        self._bookings: dict[str, MockBooking] = {}
        self._availability: dict[str, list[MockAvailabilitySlot]] = {}
        self._pings: dict[str, MockAvailabilityPing] = {}

    def get_pending_pings(self, provider_id: str) -> list[MockAvailabilityPing]:
        pid = _provider_key(provider_id)
        out = [p for p in self._pings.values() if p.provider_id == pid and p.status == "pending"]
        out.sort(key=lambda x: x.created_at, reverse=True)
        return out[:20]

    def ensure_default_pings(self, provider_id: str) -> None:
        """Seed 2 demo pings if provider has none (for demo workflow)."""
        pid = _provider_key(provider_id)
        existing = [p for p in self._pings.values() if p.provider_id == pid]
        if existing:
            return
        now = datetime.now(timezone.utc)
        for i, (summary, days, hours) in enumerate([
            ("Dinner companion for Saturday evening, Barcelona", 1, 19),
            ("City guide for this weekend", 2, 12),
        ]):
            req = now + timedelta(days=days, hours=hours)
            ping = MockAvailabilityPing(
                id=str(uuid4()),
                provider_id=pid,
                search_session_id="mock-session-" + str(i + 1),
                intent_summary=summary,
                requested_slot_start=req.isoformat(),
                status="pending",
                created_at=(now - timedelta(minutes=15 * (i + 1))).isoformat(),
            )
            self._pings[ping.id] = ping

    def respond_to_ping(self, ping_id: str, provider_id: str, status: str) -> MockAvailabilityPing | None:
        ping = self._pings.get(ping_id)
        if not ping or ping.provider_id != _provider_key(provider_id):
            return None
        if ping.status != "pending":
            return ping
        ping.status = status
        return ping

    def get_or_create_conversation(self, user_id: str, provider_id: str) -> MockConversation:
        key = f"{user_id}|{_provider_key(provider_id)}"
        if key in self._user_provider_to_conv:
            return self._conversations[self._user_provider_to_conv[key]]
        conv_id = str(uuid4())
        conv = MockConversation(id=conv_id, user_id=user_id, provider_id=_provider_key(provider_id))
        self._conversations[conv_id] = conv
        self._user_provider_to_conv[key] = conv_id
        return conv

    def get_conversation(self, conv_id: str) -> MockConversation | None:
        return self._conversations.get(conv_id)

    def add_message(self, conv_id: str, sender_type: str, content: str) -> MockMessage | None:
        conv = self._conversations.get(conv_id)
        if not conv:
            return None
        msg = MockMessage(
            id=str(uuid4()),
            sender_type=sender_type,
            content=content,
            is_read=False,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        conv.messages.append(msg)
        return msg

    def get_conversations_for_provider(self, provider_id: str) -> list[dict[str, Any]]:
        pid = _provider_key(provider_id)
        out = []
        for c in self._conversations.values():
            if c.provider_id == pid:
                last = c.messages[-1] if c.messages else None
                out.append({
                    "id": c.id,
                    "user_id": c.user_id,
                    "created_at": last.created_at if last else datetime.now(timezone.utc).isoformat(),
                })
        out.sort(key=lambda x: x["created_at"], reverse=True)
        return out[:20]

    def get_conversations_for_user(self, user_id: str) -> list[dict[str, Any]]:
        out = []
        for c in self._conversations.values():
            if c.user_id == str(user_id):
                last = c.messages[-1] if c.messages else None
                out.append({
                    "id": c.id,
                    "provider_id": c.provider_id,
                    "created_at": last.created_at if last else datetime.now(timezone.utc).isoformat(),
                })
        out.sort(key=lambda x: x["created_at"], reverse=True)
        return out[:20]

    def create_booking(
        self,
        user_id: str,
        provider_id: str,
        requested_at: str,
        duration_minutes: int | None,
        session_id: str | None,
        notes: str | None,
    ) -> MockBooking:
        bid = str(uuid4())
        duration = duration_minutes or 60
        try:
            start = datetime.fromisoformat(requested_at.replace("Z", "+00:00"))
            end = start + timedelta(minutes=duration)
            end_ts = end.isoformat()
            self.mark_slot_booked(provider_id, requested_at, end_ts, bid)
        except Exception:
            pass
        b = MockBooking(
            id=bid,
            user_id=str(user_id),
            provider_id=_provider_key(provider_id),
            status="inquiry",
            requested_at=requested_at,
            duration_minutes=duration_minutes,
            session_id=session_id,
            notes=notes,
        )
        self._bookings[bid] = b
        return b

    def get_booking(self, bid: str) -> MockBooking | None:
        return self._bookings.get(bid)

    def update_booking_status(self, bid: str, status: str) -> MockBooking | None:
        b = self._bookings.get(bid)
        if not b:
            return None
        b.status = status
        return b

    def get_bookings_for_provider(self, provider_id: str) -> list[MockBooking]:
        pid = _provider_key(provider_id)
        out = [b for b in self._bookings.values() if b.provider_id == pid]
        out.sort(key=lambda x: x.requested_at, reverse=True)
        return out[:20]

    def get_bookings_for_user(
        self, user_id: str | None, session_id: str | None
    ) -> list[MockBooking]:
        out: list[MockBooking] = []
        if user_id:
            out = [b for b in self._bookings.values() if b.user_id == str(user_id)]
        if session_id:
            for b in self._bookings.values():
                if b.session_id == session_id and b not in out:
                    out.append(b)
        out.sort(key=lambda x: x.requested_at, reverse=True)
        return out[:20]

    def get_availability(self, provider_id: str) -> list[dict[str, str]]:
        pid = _provider_key(provider_id)
        if pid not in self._availability:
            # Default mock slots for next 7 days
            slots = []
            now = datetime.now(timezone.utc)
            for i in range(1, 8):
                start = now + timedelta(days=i)
                start = start.replace(hour=18, minute=0, second=0, microsecond=0)
                end = start + timedelta(hours=4)
                slots.append(MockAvailabilitySlot(
                    start=start.isoformat(),
                    end=end.isoformat(),
                    booked_by=None,
                ))
            self._availability[pid] = slots
        return [
            {"start": s.start, "end": s.end, "booked_by": s.booked_by}
            for s in self._availability[pid]
            if not s.booked_by
        ]

    def set_availability(self, provider_id: str, slots: list[dict[str, str]]) -> None:
        pid = _provider_key(provider_id)
        self._availability[pid] = [
            MockAvailabilitySlot(
                start=s["start"],
                end=s["end"],
                booked_by=s.get("booked_by"),
            )
            for s in slots
        ]

    def add_availability_slot(self, provider_id: str, start: str, end: str) -> None:
        pid = _provider_key(provider_id)
        if pid not in self._availability:
            self._availability[pid] = []
        self._availability[pid].append(MockAvailabilitySlot(start=start, end=end, booked_by=None))

    def mark_slot_booked(self, provider_id: str, start: str, end: str, booking_id: str) -> bool:
        """Mark a slot as booked if it overlaps with [start, end]. Uses start containment."""
        pid = _provider_key(provider_id)
        for s in self._availability.get(pid, []):
            if s.booked_by:
                continue
            # Match slot that contains this start time
            if s.start <= start <= s.end:
                s.booked_by = booking_id
                return True
            # Or exact match
            if s.start == start and s.end == end:
                s.booked_by = booking_id
                return True
        return False


_mock_store = MockStore()


def get_mock_store() -> MockStore:
    return _mock_store
