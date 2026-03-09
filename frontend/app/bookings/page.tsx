"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Booking {
  id: string;
  status: string;
  provider_id: string;
  requested_at: string;
  confirmed_at?: string | null;
  duration_minutes?: number | null;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const sessionId = typeof localStorage !== "undefined" ? localStorage.getItem("anon_session_id") : null;
    if (sessionId) headers["X-Session-ID"] = sessionId;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch("/api/v1/bookings", { headers })
      .then((r) => r.json())
      .then((d) => setBookings(Array.isArray(d) ? d : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter(
    (b) => !["cancelled", "completed"].includes(b.status) && new Date(b.requested_at) >= new Date()
  );
  const past = bookings.filter(
    (b) => ["cancelled", "completed"].includes(b.status) || new Date(b.requested_at) < new Date()
  );

    const DEMO_PROVIDER_UUID = "00000000-0000-0000-0000-000000000001";
  const providerLink = (pid: string) => {
    if (pid === DEMO_PROVIDER_UUID) return "/providers/m1";
    return `/providers/${pid}`;
  };

  const statusLabel: Record<string, string> = {
    inquiry: "Pending",
    availability_confirmed: "Confirmed",
    time_locked: "Time locked",
    meeting_confirmed: "Meeting confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to search
      </Link>
      <h1 className="text-xl font-light text-zinc-900 dark:text-zinc-100 mb-6">My bookings</h1>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : (
        <>
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-zinc-500 text-sm mb-6">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3 mb-8">
              {upcoming.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 flex justify-between items-start"
                >
                  <div>
                    <p className="font-medium capitalize">{statusLabel[b.status] || b.status.replace(/_/g, " ")}</p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {new Date(b.requested_at).toLocaleString()}
                      {b.duration_minutes ? ` • ${b.duration_minutes} min` : ""}
                    </p>
                  </div>
                  <Link
                    href={providerLink(b.provider_id)}
                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
                  >
                    View provider
                  </Link>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">History</h2>
          {past.length === 0 ? (
            <p className="text-zinc-500 text-sm">No past bookings.</p>
          ) : (
            <div className="space-y-3">
              {past.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 opacity-75"
                >
                  <p className="font-medium capitalize">{statusLabel[b.status] || b.status.replace(/_/g, " ")}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {new Date(b.requested_at).toLocaleString()}
                    {b.duration_minutes ? ` • ${b.duration_minutes} min` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
