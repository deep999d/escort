"use client";

import { useState, useEffect, useCallback } from "react";
import { userApi } from "@/lib/api";
import {
  getLocalFavorites,
  addLocalFavorite,
  removeLocalFavorite,
  isMockProviderId,
} from "@/lib/favoritesLocal";

export function useFavorites(): {
  favoriteIds: Set<string>;
  isFavorite: (providerId: string) => boolean;
  toggleFavorite: (providerId: string, displayName?: string, city?: string) => void;
  isLoading: boolean;
} {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    userApi.favorites
      .list()
      .then((list) => {
        const ids = new Set<string>();
        list.forEach((f) => ids.add(f.provider_id));
        getLocalFavorites().forEach((f) => ids.add(f.provider_id));
        setFavoriteIds(ids);
      })
      .catch(() => {
        const ids = new Set<string>();
        getLocalFavorites().forEach((f) => ids.add(f.provider_id));
        setFavoriteIds(ids);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isFavorite = useCallback(
    (providerId: string) => favoriteIds.has(providerId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    (providerId: string, displayName?: string, city?: string) => {
      if (isMockProviderId(providerId)) {
        if (favoriteIds.has(providerId)) {
          removeLocalFavorite(providerId);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(providerId);
            return next;
          });
        } else {
          addLocalFavorite({
            provider_id: providerId,
            display_name: displayName ?? "Provider",
            city: city ?? "",
          });
          setFavoriteIds((prev) => new Set(prev).add(providerId));
        }
        return;
      }
      if (favoriteIds.has(providerId)) {
        userApi.favorites.remove(providerId).then(() => {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(providerId);
            return next;
          });
        }).catch(() => {});
      } else {
        userApi.favorites.add(providerId).then(() => {
          setFavoriteIds((prev) => new Set(prev).add(providerId));
        }).catch(() => {});
      }
    },
    [favoriteIds]
  );

  return { favoriteIds, isFavorite, toggleFavorite, isLoading };
}
