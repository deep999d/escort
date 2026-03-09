"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") || "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.detail as string) || "Something went wrong");
        setLoading(false);
        return;
      }
      localStorage.setItem("access_token", data.access_token);
      window.location.href = returnTo;
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-light text-zinc-900 dark:text-zinc-100 text-center">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
          Sign in to block providers, report, and save favorites across devices.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); }}
                className="text-zinc-900 dark:text-zinc-100 font-medium hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className="text-zinc-900 dark:text-zinc-100 font-medium hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
        <Link href="/" className="block text-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
          ← Back to home
        </Link>
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-6">
          Demo: user@example.com / demo123
        </p>
      </div>
    </main>
  );
}
