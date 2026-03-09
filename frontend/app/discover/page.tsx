"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, LayoutGrid, List, Shield, Heart } from "lucide-react";
import { MOCK_PROVIDERS, type MockProvider } from "@/lib/mockProviders";
import { usePrivacy } from "@/components/PrivacyProvider";
import { useFavorites } from "@/hooks/useFavorites";

type SortBy = "relevance" | "rating" | "price_low" | "price_high" | "favorites";
type ViewMode = "gallery" | "details";

function ProviderCard({
  p,
  view,
  blur,
  isFavorite,
  onToggleFavorite,
}: {
  p: MockProvider;
  view: ViewMode;
  blur: boolean;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const priceRange = `${p.price_min}-${p.price_max} ${p.price_currency}`;
  const stars = "★".repeat(Math.round(p.rating)) + (p.rating % 1 >= 0.5 ? "½" : "");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggleFavorite}
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`w-5 h-5 ${isFavorite ? "fill-rose-400 text-rose-400" : "text-white/80"}`} />
      </button>
      <Link
        href={`/providers/${p.id}`}
        className="block rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
      >
      <div className="relative aspect-[4/5] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <img
          src={p.image_url}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-300 ${blur ? "blur-2xl scale-105" : ""}`}
        />
        <div className="absolute top-2 left-2 flex gap-1">
          {p.is_verified && (
            <span className="px-2 py-0.5 rounded text-xs bg-amber-500/90 text-white flex items-center gap-0.5">
              <Shield className="w-3 h-3" /> Verified
            </span>
          )}
          {p.is_premium && (
            <span className="px-2 py-0.5 rounded text-xs bg-amber-600/90 text-white">Premium</span>
          )}
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          {p.available_now && (
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-emerald-500/90 text-white mb-2">
              Available Now
            </span>
          )}
          <p className="font-medium text-white drop-shadow">{p.display_name}, {p.age}</p>
          <p className="text-xs text-zinc-200">{p.neighborhood}</p>
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{p.tagline}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-amber-600 dark:text-amber-400">
          {stars} ({p.review_count})
        </div>
        <p className="text-xs text-zinc-500 mt-1">{p.languages.slice(0, 2).join(", ")}</p>
        <p className="text-xs text-zinc-500">Responds ~{p.response_min} min · {p.reliability_percent}% reliable</p>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-2">{priceRange}</p>
      </div>
    </Link>
    </div>
  );
}

function ProviderRow({
  p,
  blur,
  isFavorite,
  onToggleFavorite,
}: {
  p: MockProvider;
  blur: boolean;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}) {
  const priceRange = `${p.price_min}-${p.price_max} ${p.price_currency}`;
  return (
    <div className="relative flex gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
      <button
        type="button"
        onClick={onToggleFavorite}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`w-5 h-5 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-400"}`} />
      </button>
      <Link href={`/providers/${p.id}`} className="flex flex-1 min-w-0 gap-4">
      <div className={`w-20 h-20 rounded-lg shrink-0 overflow-hidden bg-zinc-200 dark:bg-zinc-700`}>
        <img
          src={p.image_url}
          alt=""
          className={`w-full h-full object-cover transition-[filter] duration-300 ${blur ? "blur-xl" : ""}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{p.display_name}, {p.age}</span>
          {p.is_verified && <Shield className="w-4 h-4 text-amber-500" />}
          {p.is_premium && <span className="text-xs text-amber-600">Premium</span>}
          {p.available_now && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Available now</span>
          )}
        </div>
        <p className="text-sm text-zinc-500">{p.neighborhood} · {p.tagline}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
          <span className="text-amber-600">★{p.rating} ({p.review_count})</span>
          <span>{p.languages.join(", ")}</span>
          <span>~{p.response_min} min</span>
          <span>{p.reliability_percent}% reliable</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-medium">{priceRange}</p>
      </div>
      </Link>
    </div>
  );
}

export default function DiscoverPage() {
  const { blurImages } = usePrivacy();
  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites();
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [location, setLocation] = useState("All Barcelona");
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(1000);
  const [availability, setAvailability] = useState("Any Time");
  const [language, setLanguage] = useState("Any Language");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let list = [...MOCK_PROVIDERS];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.neighborhood.toLowerCase().includes(q) ||
          p.languages.some((l) => l.toLowerCase().includes(q)) ||
          p.services.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (location !== "All Barcelona") {
      const loc = location.toLowerCase();
      list = list.filter((p) => p.neighborhood.toLowerCase().includes(loc));
    }
    if (budgetMax < 1000) list = list.filter((p) => p.price_max <= budgetMax);
    if (budgetMin > 0) list = list.filter((p) => p.price_min >= budgetMin);
    if (availability === "Available Now") list = list.filter((p) => p.available_now);
    if (language !== "Any Language") {
      const lang = language.toLowerCase();
      list = list.filter((p) => p.languages.some((l) => l.toLowerCase().includes(lang)));
    }
    if (sortBy === "favorites") {
      list = list.filter((p) => favoriteIds.has(p.id));
    }
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "price_low") list.sort((a, b) => a.price_min - b.price_min);
    else if (sortBy === "price_high") list.sort((a, b) => b.price_max - a.price_max);
    else list.sort((a, b) => b.rating - a.rating); // relevance = by rating
    return list;
  }, [sortBy, budgetMin, budgetMax, availability, language, searchQuery, location, favoriteIds]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-4 space-y-6">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Filters</h2>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="favorites">Favorites only</option>
            <option value="rating">Highest Rated</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option>All Barcelona</option>
            <option>Gracia</option>
            <option>Eixample</option>
            <option>Gothic Quarter</option>
            <option>El Born</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Budget (EUR)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(Number(e.target.value) || 0)}
              className="w-20 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
              placeholder="Min"
            />
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value) || 1000)}
              className="w-20 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
              placeholder="Max"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Availability</label>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option>Any Time</option>
            <option>Available Now</option>
            <option>Tonight</option>
            <option>This Weekend</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option>Any Language</option>
            <option>Spanish</option>
            <option>English</option>
            <option>Catalan</option>
          </select>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Describe who you're looking for..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <button className="px-4 py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors">
              Search →
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 mb-6">
            <p className="text-sm text-zinc-500">{filtered.length} companions</p>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="favorites">Favorites only</option>
                <option value="rating">Highest Rated</option>
                <option value="price_low">Price ↑</option>
                <option value="price_high">Price ↓</option>
              </select>
              <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <button
                  onClick={() => setViewMode("gallery")}
                  className={`p-2 ${viewMode === "gallery" ? "bg-zinc-200 dark:bg-zinc-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                  title="Gallery"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("details")}
                  className={`p-2 ${viewMode === "details" ? "bg-zinc-200 dark:bg-zinc-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                  title="Details"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "gallery" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProviderCard
                  key={p.id}
                  p={p}
                  view={viewMode}
                  blur={blurImages}
                  isFavorite={isFavorite(p.id)}
                  onToggleFavorite={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(p.id, p.display_name, p.city);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <ProviderRow
                  key={p.id}
                  p={p}
                  blur={blurImages}
                  isFavorite={isFavorite(p.id)}
                  onToggleFavorite={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(p.id, p.display_name, p.city);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
