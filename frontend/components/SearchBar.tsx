"use client";

import { useState, useRef } from "react";
import { Search } from "lucide-react";
import { useSearchStore } from "@/stores/searchStore";
import { VoiceInput } from "./VoiceInput";
import { clsx } from "clsx";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { search, isSearching } = useSearchStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q && !isSearching) {
      search(q);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={clsx(
          "flex items-center gap-2 rounded-xl border bg-white dark:bg-zinc-900/50 px-4 py-3 transition-all",
          "border-zinc-200 dark:border-zinc-700",
          "focus-within:ring-2 focus-within:ring-zinc-400/30 focus-within:border-zinc-400"
        )}
      >
        <Search className="w-5 h-5 text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Barcelona, Thursday evening, English, fine dining preferences"
          className="flex-1 bg-transparent outline-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 text-base"
          disabled={isSearching}
          autoFocus
        />
        <VoiceInput onTranscript={setQuery} disabled={isSearching} />
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
        Natural language. No filters. No forms.
      </p>
    </form>
  );
}
