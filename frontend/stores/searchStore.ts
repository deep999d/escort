import { create } from "zustand";

export interface ParsedIntent {
  raw_query: string;
  intent_summary?: string | null;
  city?: string | null;
  country?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  preferences?: Record<string, unknown>;
}

export interface ProviderPreview {
  id: string;
  display_name: string;
  city: string;
  price_indication: string | null;
  availability_status: string;
  response_time_sec: number | null;
  is_verified: boolean;
}

interface SearchState {
  results: ProviderPreview[];
  parsedIntent: ParsedIntent | null;
  isSearching: boolean;
  pendingCount: number;
  sessionId: string | null;
  fallbackSuggestions: string[];
  lastQuery: string | null;
  search: (query: string, sessionId?: string, confirmedOnly?: boolean) => Promise<void>;
  pollStatus: (sessionId: string) => Promise<void>;
  saveSearch: (query: string, parsedIntent?: Record<string, unknown>) => Promise<void>;
  saveSearchWithName: (query: string, name: string, parsedIntent?: Record<string, unknown>) => Promise<{ saved: boolean; local: boolean }>;
}

const API_BASE = "/api/v1";

async function saveSearchWithName(
  query: string,
  name: string,
  parsedIntent?: Record<string, unknown>,
): Promise<{ saved: boolean; local: boolean }> {
  const sid = typeof localStorage !== "undefined" ? localStorage.getItem("anon_session_id") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sid) headers["X-Session-ID"] = sid;
  try {
    const res = await fetch(`${API_BASE}/user/saved-searches`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, name: name || null, parsed_intent: parsedIntent, session_id: sid }),
    });
    if (res.ok) return { saved: true, local: false };
  } catch {
    // fall through to local
  }
  const { addLocalSavedSearch } = await import("@/lib/savedSearchesLocal");
  addLocalSavedSearch({ name: name || query.slice(0, 80), query, parsed_intent: parsedIntent });
  return { saved: true, local: true };
}

export const useSearchStore = create<SearchState>((set, get) => ({
  results: [],
  parsedIntent: null,
  isSearching: false,
  pendingCount: 0,
  sessionId: null,
  fallbackSuggestions: [],
  lastQuery: null,

  saveSearch: async (query: string, parsedIntent?: Record<string, unknown>) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("access_token");
      const sid = localStorage.getItem("anon_session_id");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (sid) headers["X-Session-ID"] = sid;
      const res = await fetch(`${API_BASE}/user/saved-searches`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, name: null, parsed_intent: parsedIntent, session_id: sid }),
      });
      if (res.ok) return;
    } catch {
      // ignore
    }
    try {
      const { addLocalSavedSearch } = await import("@/lib/savedSearchesLocal");
      addLocalSavedSearch({ name: query.slice(0, 80), query, parsed_intent: parsedIntent });
    } catch {
      // ignore
    }
  },
  saveSearchWithName,
  search: async (query: string, sessionId?: string, confirmedOnly?: boolean) => {
    const q = query.trim();
    set({ isSearching: true, lastQuery: q || null });
    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          session_id: sessionId || localStorage.getItem("anon_session_id") || undefined,
          confirmed_only: confirmedOnly !== false,
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      set({
        results: data.results || [],
        parsedIntent: data.parsed_intent || { raw_query: q, intent_summary: q },
        pendingCount: data.pending_count || 0,
        sessionId: data.session_id || null,
        fallbackSuggestions: data.fallback_suggestions || [],
        lastQuery: q || null,
        isSearching: false,
      });
    } catch (e) {
      console.error(e);
      set({
        isSearching: false,
        parsedIntent: q ? { raw_query: q, intent_summary: q } : null,
        lastQuery: q || null,
        results: [],
        fallbackSuggestions: [
          "Try “Barcelona, tonight” or “Spanish, available now”",
          "Browse Discover for instant demo results without the backend.",
        ],
      });
    }
  },

  pollStatus: async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/search/status/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      set({
        results: data.results || get().results,
        pendingCount: data.pending_count ?? get().pendingCount,
        fallbackSuggestions: data.fallback_suggestions || get().fallbackSuggestions,
      });
    } catch {
      // ignore
    }
  },
}));
