"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function ChatStartContent() {
  const searchParams = useSearchParams();
  const providerId = searchParams?.get("provider");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!providerId || creating) return;
    const createAndRedirect = async () => {
      setCreating(true);
      const userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "anon-" + Date.now();
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
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <p className="text-zinc-500">No provider selected.</p>
        <a href="/" className="text-sm text-zinc-600 mt-4 inline-block">← Back</a>
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
