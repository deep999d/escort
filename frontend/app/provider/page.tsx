"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Ping {
  id: string;
  search_session_id: string;
  intent_summary: string;
  requested_slot_start: string | null;
  status: string;
  created_at: string;
}

export default function ProviderDashboard() {
  const [pings, setPings] = useState<Ping[]>([]);
  const [stats, setStats] = useState({ pending_pings: 0, total_bookings: 0, response_rate: 0 });
  const [providerId, setProviderId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("provider_live_available");
      if (saved !== null) return saved === "true";
    }
    return true;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPings = async () => {
    if (!providerId) return;
    setError(null);
    const res = await fetch(`/api/v1/provider-dashboard/pings?status=pending`, {
      headers: { "X-Provider-ID": providerId },
    });
    if (res.ok) {
      const data = await res.json();
      setPings(data);
    } else {
      const err = await res.json().catch(() => ({}));
      setError((err as { detail?: string }).detail || "Failed to load requests");
    }
  };

  const fetchStats = async () => {
    if (!providerId) return;
    const res = await fetch(`/api/v1/provider-dashboard/stats`, {
      headers: { "X-Provider-ID": providerId },
    });
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  const respond = async (pingId: string, status: "available" | "unavailable") => {
    const res = await fetch(`/api/v1/provider-dashboard/pings/${pingId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Provider-ID": providerId },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchPings();
      fetchStats();
    } else {
      setError("Failed to send response");
    }
  };

  const toggleAvailability = async () => {
    const next = !liveAvailable;
    const res = await fetch(`/api/v1/provider-dashboard/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Provider-ID": providerId },
      body: JSON.stringify({ live_available: next }),
    });
    if (res.ok) {
      setLiveAvailable(next);
      if (typeof localStorage !== "undefined") localStorage.setItem("provider_live_available", String(next));
    } else {
      setError("Failed to update availability");
    }
  };

  useEffect(() => {
    const pid = localStorage.getItem("provider_id");
    if (pid) {
      setProviderId(pid);
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (loggedIn && providerId) {
      setLoading(true);
      setError(null);
      Promise.all([fetchPings(), fetchStats()])
        .finally(() => setLoading(false));
    }
  }, [loggedIn, providerId]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const res = await fetch("/api/v1/auth/provider/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("provider_token", data.access_token);
      localStorage.setItem("provider_id", data.provider_id);
      setProviderId(data.provider_id);
      setLoggedIn(true);
    } else {
      alert("Login failed");
    }
  };

  if (!loggedIn) {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <h1 className="text-xl font-light mb-6">Provider Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Demo: sign in with a seeded provider, or paste a provider ID from any provider profile URL.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input name="email" type="email" placeholder="Email" required className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" />
          <input name="password" type="password" placeholder="Password" required className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" />
          <button type="submit" className="w-full py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">Login</button>
        </form>
        <p className="mt-4 text-sm text-zinc-500">Seeded demo: provider1@demo.local / demo123</p>
        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Or use provider ID (no login)</p>
          <form onSubmit={(e) => { e.preventDefault(); const id = (e.currentTarget.elements.namedItem("demo_provider_id") as HTMLInputElement)?.value?.trim(); if (id) { localStorage.setItem("provider_id", id); setProviderId(id); setLoggedIn(true); } }} className="flex gap-2">
            <input name="demo_provider_id" type="text" placeholder="e.g. m1 or UUID from profile URL" className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm" />
            <button type="submit" className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm whitespace-nowrap">View dashboard</button>
          </form>
        </div>
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400 mt-6 inline-block">← Back</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-light">Provider Dashboard</h1>
        <button onClick={() => { localStorage.removeItem("provider_id"); localStorage.removeItem("provider_token"); localStorage.removeItem("provider_live_available"); setLoggedIn(false); }} className="text-sm text-zinc-500">Logout</button>
      </div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-amber-600 hover:text-amber-800">×</button>
        </div>
      )}
      <div className="mb-6 flex items-center gap-4">
        <span className="text-sm">Live availability:</span>
        <button
          onClick={toggleAvailability}
          disabled={loading}
          className={`px-3 py-1 rounded-lg text-sm disabled:opacity-50 ${liveAvailable ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
        >
          {liveAvailable ? "On" : "Off"}
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Loading…</p>
      ) : null}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-2xl font-medium">{stats.pending_pings}</p>
          <p className="text-sm text-zinc-500">Pending requests</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-2xl font-medium">{stats.total_bookings}</p>
          <p className="text-sm text-zinc-500">Total bookings</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-2xl font-medium">{stats.response_rate}%</p>
          <p className="text-sm text-zinc-500">Response rate</p>
        </div>
      </div>
      <h2 className="text-lg font-medium mb-4">Availability requests</h2>
      <div className="space-y-4">
        {pings.length === 0 ? <p className="text-zinc-500">No pending requests.</p> : pings.map((p) => (
          <div key={p.id} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 flex justify-between items-start gap-4">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.intent_summary}</p>
              <p className="text-xs text-zinc-500 mt-1">{new Date(p.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => respond(p.id, "available")} className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm">Available</button>
              <button onClick={() => respond(p.id, "unavailable")} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm">Unavailable</button>
            </div>
          </div>
        ))}
      </div>
      <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400 mt-8 inline-block">← Back to home</Link>
    </main>
  );
}
