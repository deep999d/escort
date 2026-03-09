"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { ProviderCard } from "@/components/ProviderCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSearchStore } from "@/stores/searchStore";
import { MOCK_PROVIDERS } from "@/lib/mockProviders";
import { useFavorites } from "@/hooks/useFavorites";

function getMockPreviewsForQuery(query: string): Array<{ id: string; display_name: string; city: string; price_indication: string | null; availability_status: string; response_time_sec: number | null; is_verified: boolean }> {
  let q = query.trim().toLowerCase();
  const misspellings: Record<string, string> = { barcellona: "barcelona" };
  Object.entries(misspellings).forEach(([wrong, right]) => { q = q.replace(new RegExp(wrong, "gi"), right); });
  if (!q) return [];
  const words = q.split(/\s*[,.]\s*|\s+/).filter(Boolean);
  const locationStopwords = ["near", "in", "at", "around", "close", "to"];
  const meaningfulWords = words.filter((w) => !locationStopwords.includes(w));
  const searchWords = meaningfulWords.length > 0 ? meaningfulWords : words;
  const availabilityWords = ["available", "now", "tonight", "today", "this weekend"];
  const onlyAvailability = searchWords.length > 0 && searchWords.every((w) => availabilityWords.some((a) => a.includes(w) || w.includes(a)));
  return MOCK_PROVIDERS.filter((p) => {
    const text = [p.display_name, p.tagline, p.city, p.neighborhood, ...p.languages, ...p.services].join(" ").toLowerCase();
    const wantAvailable = searchWords.some((w) => w === "available" || w === "now" || w === "tonight" || w === "today");
    const languageOrServiceMatch = searchWords.some((w) => p.languages.some((l) => l.toLowerCase().includes(w))) || searchWords.some((w) => p.services.some((s) => s.toLowerCase().includes(w))) || searchWords.some((w) => text.includes(w));
    if (onlyAvailability) return p.available_now;
    if (wantAvailable) return languageOrServiceMatch && p.available_now;
    return languageOrServiceMatch;
  }).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    city: p.city,
    price_indication: `${p.price_min}-${p.price_max} ${p.price_currency}`,
    availability_status: p.available_now ? "available" : "pending",
    response_time_sec: p.response_min * 60,
    is_verified: p.is_verified,
  }));
}

export default function Home() {
  const { results, parsedIntent, isSearching, pendingCount, sessionId, fallbackSuggestions, lastQuery, pollStatus, search, saveSearchWithName } = useSearchStore();
  const [countdown, setCountdown] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [saveSearchFeedback, setSaveSearchFeedback] = useState<{ saved: boolean; local: boolean } | null>(null);
  const searchParams = useSearchParams();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mockPreviews = useMemo(() => getMockPreviewsForQuery(lastQuery || parsedIntent?.raw_query || ""), [lastQuery, parsedIntent?.raw_query]);
  const showMockResults = !isSearching && results.length === 0 && mockPreviews.length > 0 && !!parsedIntent?.raw_query;
  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites();
  const [filterBy, setFilterBy] = useState<"all" | "favorites">("all");
  const displayedMockPreviews = useMemo(
    () => (filterBy === "favorites" ? mockPreviews.filter((p) => favoriteIds.has(p.id)) : mockPreviews),
    [mockPreviews, filterBy, favoriteIds]
  );

  const urlQuery = searchParams?.get("q")?.trim();
  useEffect(() => {
    if (urlQuery) search(urlQuery);
  }, [urlQuery]); // Run when URL ?q= changes (e.g. from saved search link)

  useEffect(() => {
    const sid = localStorage.getItem("anon_session_id");
    if (!sid) {
      fetch("/api/v1/auth/anonymous", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (d.session_id) localStorage.setItem("anon_session_id", d.session_id);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (pendingCount > 0) setCountdown(30);
  }, [pendingCount]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (pendingCount > 0 && sessionId) {
      pollRef.current = setInterval(() => pollStatus(sessionId), 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pendingCount, sessionId, pollStatus]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start pt-16 px-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <a href="/login" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          Sign in
        </a>
        <a href="/account" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          Account
        </a>
        <a href="/provider" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          Provider
        </a>
        <ThemeToggle />
      </div>
      <header className="text-center mb-12">
        <h1 className="text-2xl md:text-3xl font-light tracking-tight text-zinc-800 dark:text-zinc-200 mb-2">
          Concierge
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Describe what you want. We handle the rest.
        </p>
        <a
          href="/discover"
          className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors"
        >
          Browse Now →
        </a>
      </header>

      <div className="w-full max-w-2xl mb-8">
        <SearchBar />
      </div>

      {parsedIntent?.raw_query && (
        <div className="w-full max-w-2xl mb-6 flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Understanding: &ldquo;{parsedIntent.intent_summary || parsedIntent.raw_query}&rdquo;
          </span>
          <button
            onClick={() => { setSaveSearchName(parsedIntent.raw_query.slice(0, 80)); setSaveSearchFeedback(null); setShowSaveModal(true); }}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 whitespace-nowrap"
          >
            Save search
          </button>
        </div>
      )}

      {showSaveModal && parsedIntent?.raw_query && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Save search</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Give this search a name (e.g. &ldquo;Barcelona dinner&rdquo;). It will appear in Account → Saved searches.</p>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="e.g. Barcelona dinner, Spanish tonight"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 mb-4"
              autoFocus
            />
            {saveSearchFeedback && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
                Saved{saveSearchFeedback.local ? " (stored locally — database not connected)" : ""}.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const result = await saveSearchWithName(parsedIntent.raw_query, saveSearchName.trim() || parsedIntent.raw_query.slice(0, 80), parsedIntent as Record<string, unknown>);
                  setSaveSearchFeedback(result);
                  setTimeout(() => { setShowSaveModal(false); setSaveSearchFeedback(null); }, 1200);
                }}
                className="flex-1 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium"
              >
                Save
              </button>
              <button onClick={() => { setShowSaveModal(false); setSaveSearchFeedback(null); }} className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl">
        {isSearching && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 py-8">
            <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
            Searching and confirming availability…
          </div>
        )}
        {!isSearching && pendingCount > 0 && countdown > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 py-4">
            {pendingCount} provider{pendingCount !== 1 ? "s" : ""} confirming… check back in ~{countdown}s
          </p>
        )}
        {!isSearching && results.length > 0 && <SearchResults />}
        {showMockResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Demo matches for your search (no backend confirmation yet):
              </p>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as "all" | "favorites")}
                className="rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <option value="all">Relevance</option>
                <option value="favorites">Favorites only</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedMockPreviews.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  isFavorite={isFavorite(p.id)}
                  onToggleFavorite={() => toggleFavorite(p.id, p.display_name, p.city)}
                />
              ))}
            </div>
            <p className="text-center">
              <Link href="/discover" className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                Browse all in Discover →
              </Link>
            </p>
          </div>
        )}
        {!isSearching && results.length === 0 && parsedIntent?.raw_query && !showMockResults && (
          <div className="py-12 space-y-4">
            <p className="text-center text-zinc-500 dark:text-zinc-400">
              No confirmed matches yet.
            </p>
            {fallbackSuggestions.length > 0 ? (
              <ul className="text-center text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
                {fallbackSuggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                Try adjusting your criteria or check back shortly for availability updates.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
