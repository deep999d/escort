"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BookPage() {
  const searchParams = useSearchParams();
  const providerId = searchParams.get("provider");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!providerId) return;
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const requested_at = fd.get("date") + "T" + fd.get("time") + ":00Z";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const sessionId = typeof localStorage !== "undefined" ? localStorage.getItem("anon_session_id") : null;
    if (sessionId) headers["X-Session-ID"] = sessionId;
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers,
        body: JSON.stringify({
          provider_id: providerId,
          requested_at,
          duration_minutes: fd.get("duration") ? parseInt(String(fd.get("duration"))) : null,
          notes: fd.get("notes") || null,
        }),
      });
      if (!res.ok) throw new Error("Booking request failed");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!providerId) {
    return (
      <main className="min-h-screen p-6 max-w-xl mx-auto">
        <p className="text-zinc-500">No provider selected.</p>
        <Link href="/" className="text-sm text-zinc-600 mt-4 inline-block">← Back</Link>
      </main>
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const defaultTime = "19:00";

  if (submitted) {
    return (
      <main className="min-h-screen p-6 max-w-xl mx-auto">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6">
          <h2 className="text-lg font-medium text-emerald-800 dark:text-emerald-200">Request sent</h2>
          <p className="mt-2 text-emerald-700 dark:text-emerald-300">
            Your booking request has been sent. We&apos;ll confirm availability and coordinate through the platform. No contact details are shared until confirmation.
          </p>
        </div>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 mt-6">
          <ChevronLeft className="w-4 h-4" /> Back to search
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto">
      <Link href={`/providers/${providerId}`} className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 mb-8">
        <ChevronLeft className="w-4 h-4" /> Back to profile
      </Link>

      <h1 className="text-xl font-light text-zinc-900 dark:text-zinc-100 mb-6">Request booking</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={defaultDate}
            required
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Time</label>
          <input
            type="time"
            name="time"
            defaultValue={defaultTime}
            required
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Duration (minutes, optional)</label>
          <input
            type="number"
            name="duration"
            min={30}
            step={30}
            placeholder="60"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes (optional)</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Any preferences or requests…"
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send request"}
        </button>
      </form>
    </main>
  );
}
