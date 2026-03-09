"use client";

import { useSearchStore } from "@/stores/searchStore";
import { ProviderCard } from "./ProviderCard";
import { useFavorites } from "@/hooks/useFavorites";

export function SearchResults() {
  const { results, pendingCount } = useSearchStore();
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {pendingCount} provider{pendingCount !== 1 ? "s" : ""} pending confirmation
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {results.map((p) => (
          <ProviderCard
            key={p.id}
            provider={p}
            isFavorite={isFavorite(p.id)}
            onToggleFavorite={() => toggleFavorite(p.id, p.display_name, p.city)}
          />
        ))}
      </div>
    </div>
  );
}
