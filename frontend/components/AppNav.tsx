"use client";

import Link from "next/link";
import { Search, MessageCircle, Calendar, User, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { usePrivacy } from "./PrivacyProvider";

export function AppNav() {
  const { blurImages, setBlurImages } = usePrivacy();

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
        <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-100">
          Concierge
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/discover"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            <Search className="w-4 h-4" /> Discover
          </Link>
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            <MessageCircle className="w-4 h-4" /> Messages
          </Link>
          <Link
            href="/bookings"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            <Calendar className="w-4 h-4" /> Bookings
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            <User className="w-4 h-4" /> Account
          </Link>
          <Link
            href="/provider"
            className="px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Provider
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBlurImages(!blurImages)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title={blurImages ? "Show images" : "Blur images"}
          >
            {blurImages ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">Privacy</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
