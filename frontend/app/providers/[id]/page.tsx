"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Clock, MapPin, ChevronLeft, Heart, MoreVertical, Flag, Ban, Star, Eye } from "lucide-react";
import Link from "next/link";
import { userApi, providersApi } from "@/lib/api";
import { MOCK_PROVIDERS } from "@/lib/mockProviders";
import { usePrivacy } from "@/components/PrivacyProvider";
import { isMockProviderId, isLocalFavorite, addLocalFavorite, removeLocalFavorite } from "@/lib/favoritesLocal";

function ReviewForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full space-y-4">
      <h3 className="font-medium">Write a review</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            onClick={() => setRating(r)}
            className="p-1"
          >
            <Star className={`w-8 h-8 ${r <= rating ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-600"}`} />
          </button>
        ))}
      </div>
      <textarea
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent min-h-[80px]"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(rating, comment || undefined)}
          disabled={rating < 1}
          className="flex-1 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50"
        >
          Submit
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
      </div>
    </div>
  );
}

interface ProviderDetail {
  id: string;
  display_name: string;
  city: string;
  region?: string | null;
  country: string;
  price_min?: number | null;
  price_max?: number | null;
  price_currency: string;
  languages: string[];
  bio?: string | null;
  services: string[];
  is_verified: boolean;
  response_time_avg_sec?: number | null;
  availability_trust_score: number;
  availability_preview: { start: string; end: string }[];
}

function getDefaultMockAvailability(): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 5; i++) {
    const start = new Date(now);
    start.setDate(start.getDate() + i);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(22, 0, 0, 0);
    slots.push({ start: start.toISOString(), end: end.toISOString() });
  }
  return slots;
}

function mockToDetail(m: typeof MOCK_PROVIDERS[0], availabilityPreview?: { start: string; end: string }[]): ProviderDetail {
  return {
    id: m.id,
    display_name: m.display_name,
    city: m.city,
    region: m.neighborhood,
    country: "Spain",
    price_min: m.price_min,
    price_max: m.price_max,
    price_currency: m.price_currency,
    languages: m.languages,
    bio: m.tagline,
    services: m.services,
    is_verified: m.is_verified,
    response_time_avg_sec: m.response_min * 60,
    availability_trust_score: m.reliability_percent / 100,
    availability_preview: availabilityPreview ?? getDefaultMockAvailability(),
  };
}

export default function ProviderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { blurImages, setBlurImages } = usePrivacy();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null }[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const mock = MOCK_PROVIDERS.find((p) => p.id === id);
    if (mock) {
      setProvider(mockToDetail(mock));
      setLoading(false);
      // Fetch availability from mock store (provider may have set custom slots)
      fetch(`/api/v1/mocks/availability/${id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.slots?.length) {
            setProvider((p) => p ? { ...p, availability_preview: data.slots } : p);
          }
        })
        .catch(() => {});
      return;
    }
    const sessionId = localStorage.getItem("anon_session_id");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionId) headers["X-Session-ID"] = sessionId;
    const token = localStorage.getItem("access_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`/api/v1/providers/${id}?expand=true`, { headers })
      .then((r) => r.json())
      .then(setProvider)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const mock = MOCK_PROVIDERS.find((p) => p.id === id);
    if (mock) {
      setReviews([]);
      setIsFavorite(isLocalFavorite(id));
      return;
    }
    providersApi.getReviews(id).then(setReviews).catch(() => {});
    userApi.favorites.list().then((list) => {
      setIsFavorite(list.some((f) => f.provider_id === id));
    }).catch(() => {});
  }, [id]);

  const toggleFavorite = async () => {
    if (!id) return;
    setFavoriteLoading(true);
    setMsg(null);
    if (isMockProviderId(id)) {
      if (isFavorite) {
        removeLocalFavorite(id);
        setIsFavorite(false);
      } else {
        const mock = MOCK_PROVIDERS.find((p) => p.id === id);
        if (mock) {
          addLocalFavorite({ provider_id: id, display_name: mock.display_name, city: mock.city });
          setIsFavorite(true);
        }
      }
      setFavoriteLoading(false);
      return;
    }
    try {
      if (isFavorite) {
        await userApi.favorites.remove(id);
        setIsFavorite(false);
      } else {
        await userApi.favorites.add(id);
        setIsFavorite(true);
      }
    } catch (e) {
      if ((e as Error).message === "Authentication required") {
        redirectToSignIn();
        return;
      }
      setMsg((e as Error).message);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const redirectToSignIn = () => {
    router.push(`/login?returnTo=${encodeURIComponent(`/providers/${id}`)}`);
  };

  const handleReport = async (reason: string) => {
    try {
      await userApi.reports.create(id, reason);
      setReportModal(false);
      setMsg("Report submitted. Thank you.");
    } catch (e) {
      if ((e as Error).message === "Authentication required") {
        redirectToSignIn();
        return;
      }
      setMsg((e as Error).message);
    }
  };

  const handleBlock = async () => {
    try {
      await userApi.blocks.add(id);
      setBlockConfirm(false);
      setMsg("Provider blocked.");
    } catch (e) {
      if ((e as Error).message === "Authentication required") {
        redirectToSignIn();
        return;
      }
      setMsg((e as Error).message);
    }
  };

  const handleReview = async (rating: number, comment?: string) => {
    try {
      await userApi.reviews.create(id, rating, comment);
      setReviewModal(false);
      setMsg("Review submitted.");
      providersApi.getReviews(id).then(setReviews).catch(() => {});
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </main>
    );
  }

  if (!provider) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <p className="text-zinc-500">Provider not found.</p>
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400 mt-4 inline-block">
          ← Back to search
        </Link>
      </main>
    );
  }

  const priceRange =
    provider.price_min && provider.price_max
      ? `${provider.price_min}–${provider.price_max} ${provider.price_currency}`
      : provider.price_min
        ? `From ${provider.price_min} ${provider.price_currency}`
        : null;

  const mockProvider = MOCK_PROVIDERS.find((m) => m.id === id);
  const imageUrl = mockProvider?.image_url ?? null;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8"
      >
        <ChevronLeft className="w-4 h-4" /> Back to results
      </Link>

      {msg && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 flex justify-between items-center">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-zinc-500 hover:text-zinc-700">×</button>
        </div>
      )}

      <div className="space-y-6">
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-300 ${blurImages ? "blur-2xl scale-105" : ""}`}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-zinc-700/50" />
          )}
          <div className="absolute top-2 left-2 flex gap-2">
            {provider.is_verified && (
              <span className="px-2 py-1 rounded text-xs bg-amber-500/90 text-white flex items-center gap-1">
                <Shield className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          {blurImages && imageUrl && (
            <button
              type="button"
              onClick={() => setBlurImages(false)}
              className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 text-white font-medium"
            >
              <Eye className="w-6 h-6" /> Reveal
            </button>
          )}
        </div>

        <header>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-light text-zinc-900 dark:text-zinc-100">
                {provider.display_name}
              </h1>
              {provider.is_verified && (
                <Shield className="w-5 h-5 text-zinc-500" title="Verified" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={`p-2 rounded-lg transition-colors ${isFavorite ? "text-rose-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 py-1 w-44 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg z-20">
                      <button
                        onClick={() => { setShowMenu(false); setReportModal(true); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Flag className="w-4 h-4" /> Report
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); setBlockConfirm(true); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <Ban className="w-4 h-4" /> Block
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-zinc-500 dark:text-zinc-400">
            <MapPin className="w-4 h-4" />
            <span>{[provider.city, provider.region, provider.country].filter(Boolean).join(", ")}</span>
          </div>
          {provider.response_time_avg_sec && (
            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
              <Clock className="w-4 h-4" />
              Typically responds within {Math.round(provider.response_time_avg_sec / 60)} min
            </div>
          )}
        </header>

        {priceRange && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Price indication</p>
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{priceRange}</p>
          </div>
        )}

        {provider.bio && (
          <div>
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">About</h2>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{provider.bio}</p>
          </div>
        )}

        {provider.languages?.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Languages</h2>
            <p className="text-zinc-700 dark:text-zinc-300">{provider.languages.join(", ")}</p>
          </div>
        )}

        {provider.services?.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Services</h2>
            <div className="flex flex-wrap gap-2">
              {provider.services.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Reviews</h2>
            <div className="space-y-2">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="flex gap-2 items-start">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`w-4 h-4 ${i <= r.rating ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-600"}`} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-zinc-600 dark:text-zinc-400">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setReviewModal(true)}
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {reviews.length > 0 ? "Write a review" : "Be the first to review"}
        </button>

        {provider.availability_preview?.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Availability preview</h2>
            <div className="flex flex-wrap gap-2">
              {provider.availability_preview.slice(0, 5).map((slot, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg text-sm bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                >
                  {new Date(slot.start).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ))}
            </div>
          </div>
        )}

        {reportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full space-y-3">
              <h3 className="font-medium">Report this provider</h3>
              <input
                type="text"
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent"
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).value && handleReport((e.target as HTMLInputElement).value)}
                id="report-reason"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReport((document.getElementById("report-reason") as HTMLInputElement)?.value || "")}
                  className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-medium"
                >
                  Submit
                </button>
                <button onClick={() => setReportModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {blockConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full space-y-3">
              <h3 className="font-medium">Block this provider?</h3>
              <p className="text-sm text-zinc-500">They won&apos;t appear in your search results.</p>
              <div className="flex gap-2">
                <button onClick={handleBlock} className="flex-1 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium">Block</button>
                <button onClick={() => setBlockConfirm(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <ReviewForm onClose={() => setReviewModal(false)} onSubmit={handleReview} />
          </div>
        )}

        <div className="pt-6 space-y-3">
          <Link
            href={`/book?provider=${provider.id}`}
            className="block w-full text-center py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:opacity-90 transition-opacity"
          >
            Request booking
          </Link>
          <Link
            href={`/chat?provider=${provider.id}`}
            className="block w-full text-center py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Message
          </Link>
        </div>
      </div>
    </main>
  );
}
