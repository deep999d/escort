import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PrivacyProvider } from "@/components/PrivacyProvider";
import { AppNav } from "@/components/AppNav";
import { QuickExit } from "@/components/QuickExit";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Concierge — Discreet, Intelligent Booking",
  description: "Describe what you want. We handle the rest.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-surface text-zinc-900 dark:bg-surface dark:text-zinc-100 min-h-screen`}>
        <ThemeProvider>
          <PrivacyProvider>
            <AppNav />
            {children}
            <QuickExit />
          </PrivacyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
