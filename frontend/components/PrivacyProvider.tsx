"use client";

import { createContext, useContext, useState, useEffect } from "react";

const PrivacyContext = createContext<{
  blurImages: boolean;
  setBlurImages: (v: boolean) => void;
} | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [blurImages, setBlurImagesState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("privacy_blur");
    if (stored !== null) setBlurImagesState(stored === "true");
    setMounted(true);
  }, []);

  const setBlurImages = (v: boolean) => {
    setBlurImagesState(v);
    if (mounted) localStorage.setItem("privacy_blur", String(v));
  };

  return (
    <PrivacyContext.Provider value={{ blurImages, setBlurImages }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) return { blurImages: false, setBlurImages: () => {} };
  return ctx;
}
