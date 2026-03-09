const API_BASE = "/api/v1";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("access_token");
  const sessionId = localStorage.getItem("anon_session_id");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sessionId) headers["X-Session-ID"] = sessionId;
  return headers;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || res.statusText || "Request failed");
  }
  return res.json();
}

export const userApi = {
  savedSearches: {
    list: () => api<{ id: string; query: string; name?: string | null; parsed_intent?: Record<string, unknown> }[]>("/user/saved-searches", { method: "GET" }),
    create: (query: string, name?: string | null, parsedIntent?: Record<string, unknown>) =>
      api("/user/saved-searches", { method: "POST", body: JSON.stringify({ query, name: name || null, parsed_intent: parsedIntent }) }),
  },
  favorites: {
    list: () => api<{ id: string; provider_id: string; display_name: string; city: string }[]>("/user/favorites", { method: "GET" }),
    add: (providerId: string) => api(`/user/favorites/${providerId}`, { method: "POST" }),
    remove: (providerId: string) => api(`/user/favorites/${providerId}`, { method: "DELETE" }),
  },
  reports: {
    create: (providerId: string, reason?: string) =>
      api("/user/reports", { method: "POST", body: JSON.stringify({ provider_id: providerId, reason }) }),
  },
  blocks: {
    add: (providerId: string) => api(`/user/blocks/${providerId}`, { method: "POST" }),
    remove: (providerId: string) => api(`/user/blocks/${providerId}`, { method: "DELETE" }),
  },
  reviews: {
    create: (providerId: string, rating: number, comment?: string) =>
      api("/user/reviews", { method: "POST", body: JSON.stringify({ provider_id: providerId, rating, comment }) }),
  },
};

export const providersApi = {
  getReviews: (providerId: string) =>
    api<{ id: string; rating: number; comment: string | null; created_at: string | null }[]>(
      `/providers/${providerId}/reviews`,
      { method: "GET" }
    ),
};

export const bookingsApi = {
  list: () => api<{ id: string; status: string; provider_id: string; requested_at: string; confirmed_at?: string }[]>("/bookings", { method: "GET" }),
};
