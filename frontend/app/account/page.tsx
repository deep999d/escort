"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Heart, Search, Calendar, Trash2 } from "lucide-react";
import { userApi, bookingsApi } from "@/lib/api";
import { getLocalSavedSearches, removeLocalSavedSearch } from "@/lib/savedSearchesLocal";
import { getLocalFavorites, removeLocalFavorite, isMockProviderId } from "@/lib/favoritesLocal";

interface SavedSearch {
  id: string;
  query: string;
  name?: string | null;
  parsed_intent?: Record<string, unknown>;
  local?: boolean;
}

interface Favorite {
  id: string;
  provider_id: string;
  display_name: string;
  city: string;
  local?: boolean;
}

interface Booking {
  id: string;
  status: string;
  provider_id: string;
  requested_at: string;
  confirmed_at?: string;
}

export default function AccountPage() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      userApi.savedSearches.list().catch(() => []),
      userApi.favorites.list().catch(() => []),
      bookingsApi.list().catch(() => []),
    ])
      .then(([searches, favs, books]) => {
        const apiSearches: SavedSearch[] = Array.isArray(searches) ? searches.map((s) => ({ ...s, local: false })) : [];
        const localSearches: SavedSearch[] = getLocalSavedSearches().map((s) => ({ id: s.id, query: s.query, name: s.name, parsed_intent: s.parsed_intent, local: true }));
        setSavedSearches([...apiSearches, ...localSearches]);
        const apiFavs: Favorite[] = Array.isArray(favs) ? favs : [];
        const localFavs: Favorite[] = getLocalFavorites().map((f) => ({ id: "local-" + f.provider_id, provider_id: f.provider_id, display_name: f.display_name, city: f.city, local: true }));
        setFavorites([...apiFavs, ...localFavs]);
        setBookings(Array.isArray(books) ? books : []);
      })
      .catch(() => setError("Could not load account data"))
      .finally(() => setLoading(false));
  }, []);

  const removeFavorite = async (providerId: string, isLocal?: boolean) => {
    if (isLocal || isMockProviderId(providerId)) {
      removeLocalFavorite(providerId);
      setFavorites((prev) => prev.filter((f) => f.provider_id !== providerId));
      return;
    }
    try {
      await userApi.favorites.remove(providerId);
      setFavorites((prev) => prev.filter((f) => f.provider_id !== providerId));
    } catch {
      // ignore
    }
  };

  const removeSavedSearch = (id: string, local: boolean) => {
    if (local) {
      removeLocalSavedSearch(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      <h1 className="text-2xl font-light text-zinc-900 dark:text-zinc-100 mb-4">Account</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Demo: your saved searches, favorites, and bookings are stored for this browser session. No login required.
      </p>

      {error && (
        <p className="text-amber-600 dark:text-amber-400 mb-4">{error}</p>
      )}

      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
          <Search className="w-4 h-4" /> Saved searches
        </h2>
        {savedSearches.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No saved searches yet. Use &ldquo;Save search&rdquo; on the home page after a search.</p>
        ) : (
          <ul className="space-y-2">
            {savedSearches.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group">
                <Link href={`/?q=${encodeURIComponent(s.query)}`} className="flex-1 min-w-0">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 block truncate">{s.name || s.query}</span>
                  {s.name && s.query !== s.name && <span className="text-xs text-zinc-500 truncate block">&ldquo;{s.query}&rdquo;</span>}
                </Link>
                {s.local && (
                  <button
                    onClick={() => removeSavedSearch(s.id, true)}
                    className="p-2 text-zinc-400 hover:text-red-500 shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
          <Heart className="w-4 h-4" /> Favorites
        </h2>
        {favorites.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No favorites yet. Open a provider and tap the heart to add.</p>
        ) : (
          <ul className="space-y-2">
            {favorites.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <Link href={`/providers/${f.provider_id}`} className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{f.display_name}</span>
                  <span className="text-sm text-zinc-500">{f.city}</span>
                </Link>
                <button
                  onClick={() => removeFavorite(f.provider_id, f.local)}
                  className="ml-2 p-2 text-zinc-400 hover:text-rose-500"
                  title="Remove"
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
          <Calendar className="w-4 h-4" /> Booking history
        </h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No bookings yet. Request a booking from a provider&apos;s profile.</p>
        ) : (
          <ul className="space-y-2">
            {bookings.map((b) => (
              <li key={b.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <Link href={`/providers/${b.provider_id}`} className="block">
                  <span className="text-sm font-medium">Booking · {b.status}</span>
                  <span className="block text-sm text-zinc-500">
                    {new Date(b.requested_at).toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
