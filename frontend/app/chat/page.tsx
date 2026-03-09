"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MOCK_PROVIDERS } from "@/lib/mockProviders";

function uuid4Fallback(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import { useState, useEffect, Suspense } from "react";

function ChatStartContent() {
  const searchParams = useSearchParams();
  const providerId = searchParams?.get("provider");
  const [creating, setCreating] = useState(false);
  const [conversations, setConversations] = useState<{ id: string; provider_id: string; created_at: string }[]>([]);

  useEffect(() => {
    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("chat_user_id") : null;
    if (uid && !providerId) {
      fetch(`/api/v1/messages/conversations?user_id=${encodeURIComponent(uid)}`)
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setConversations(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [providerId]);

  useEffect(() => {
    if (!providerId || creating) return;
    const createAndRedirect = async () => {
      setCreating(true);
      let userId = typeof localStorage !== "undefined" ? localStorage.getItem("chat_user_id") : null;
      if (!userId) {
        userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : uuid4Fallback();
        if (typeof localStorage !== "undefined") localStorage.setItem("chat_user_id", userId);
      }
      const res = await fetch("/api/v1/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, provider_id: providerId }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = `/chat/${data.id}`;
      } else {
        setCreating(false);
      }
    };
    createAndRedirect();
  }, [providerId]);

  if (!providerId) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto bg-white dark:bg-zinc-950">
        <h1 className="text-xl font-light text-zinc-900 dark:text-zinc-100 mb-6">Messages</h1>
        {conversations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Your conversations</p>
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="block rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.provider_id
                    ? `Conversation with ${MOCK_PROVIDERS.find((p) => p.id.toLowerCase() === c.provider_id.toLowerCase())?.display_name ?? `Provider ${c.provider_id}`}`
                    : "Conversation"}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">
            No conversations yet. Message a provider from their profile to start.
          </p>
        )}
        <Link href="/discover" className="inline-block text-sm text-zinc-600 dark:text-zinc-400 mt-6 hover:underline">
          ← Discover providers
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-2 text-zinc-500">
        <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin" />
        Starting conversation…
      </div>
    </main>
  );
}

export default function ChatStartPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">Loading…</div>
      </main>
    }>
      <ChatStartContent />
    </Suspense>
  );
}
