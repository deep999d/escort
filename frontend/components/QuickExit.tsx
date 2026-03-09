"use client";

import { useEffect, useCallback } from "react";

const QUICK_EXIT_KEY = "Escape";
const QUICK_EXIT_URL = "https://www.google.com";

export function QuickExit() {
  const handleQuickExit = useCallback(() => {
    window.location.href = QUICK_EXIT_URL;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === QUICK_EXIT_KEY) {
        handleQuickExit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleQuickExit]);

  return (
    <button
      type="button"
      onClick={handleQuickExit}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-zinc-800 dark:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 opacity-60 hover:opacity-100 transition-opacity"
      title="Quick exit (Esc)"
    >
      Exit
    </button>
  );
}
