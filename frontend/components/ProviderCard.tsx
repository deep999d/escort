"use client";

import { Check, Clock, Shield, Heart } from "lucide-react";
import Link from "next/link";

export interface ProviderPreview {
  id: string;
  display_name: string;
  city: string;
  price_indication: string | null;
  availability_status: string;
  response_time_sec: number | null;
  is_verified: boolean;
}

export function ProviderCard({
  provider,
  isFavorite,
  onToggleFavorite,
}: {
  provider: ProviderPreview;
  isFavorite?: boolean;
  onToggleFavorite?: (providerId: string) => void;
}) {
  const statusConfig = {
    available: { label: "Available", color: "text-emerald-600 dark:text-emerald-400", icon: Check },
    pending: { label: "Confirming…", color: "text-amber-600 dark:text-amber-400", icon: Clock },
    unavailable: { label: "Unavailable", color: "text-zinc-500", icon: Clock },
  };
  const status = statusConfig[provider.availability_status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = status.icon;

  const handleHeartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(provider.id);
  };

  return (
    <div className="relative">
      {onToggleFavorite && (
        <button
          type="button"
          onClick={handleHeartClick}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 dark:bg-zinc-800/90 shadow hover:bg-white dark:hover:bg-zinc-700 transition-colors"
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-5 h-5 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-400 hover:text-rose-400"}`}
          />
        </button>
      )}
      <Link
        href={`/providers/${provider.id}`}
        className="block rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-5 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
      >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {provider.display_name}
            </span>
            {provider.is_verified && (
              <Shield className="w-4 h-4 text-zinc-500 shrink-0" title="Verified" />
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{provider.city}</p>
          {provider.price_indication && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
              {provider.price_indication}
            </p>
          )}
        </div>
        <div className={`flex items-center gap-1.5 shrink-0 ${status.color}`}>
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">{status.label}</span>
        </div>
      </div>
      {provider.response_time_sec && provider.response_time_sec < 600 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
          Typically responds within {Math.round(provider.response_time_sec / 60)} min
        </p>
      )}
      </Link>
    </div>
  );
}
