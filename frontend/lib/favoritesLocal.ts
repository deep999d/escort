const STORAGE_KEY = "concierge_favorites_local";

export interface LocalFavorite {
  provider_id: string;
  display_name: string;
  city: string;
}

export function getLocalFavorites(): LocalFavorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalFavorite[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isLocalFavorite(providerId: string): boolean {
  return getLocalFavorites().some((f) => f.provider_id === providerId);
}

export function addLocalFavorite(item: LocalFavorite): void {
  const list = getLocalFavorites().filter((f) => f.provider_id !== item.provider_id);
  list.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function removeLocalFavorite(providerId: string): void {
  const list = getLocalFavorites().filter((f) => f.provider_id !== providerId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Mock provider IDs (m1, m2, ...) cannot be sent to the API; use local storage. */
export function isMockProviderId(providerId: string): boolean {
  return /^m\d+$/.test(providerId);
}
