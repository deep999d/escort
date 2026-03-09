const STORAGE_KEY = "concierge_saved_searches_local";

export interface LocalSavedSearch {
  id: string;
  name: string;
  query: string;
  parsed_intent?: Record<string, unknown>;
}

function generateId(): string {
  return "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function getLocalSavedSearches(): LocalSavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalSavedSearch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLocalSavedSearch(item: { name: string; query: string; parsed_intent?: Record<string, unknown> }): LocalSavedSearch {
  const list = getLocalSavedSearches();
  const entry: LocalSavedSearch = {
    id: generateId(),
    name: item.name.trim() || item.query.slice(0, 80),
    query: item.query,
    parsed_intent: item.parsed_intent,
  };
  list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return entry;
}

export function removeLocalSavedSearch(id: string): void {
  const list = getLocalSavedSearches().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
