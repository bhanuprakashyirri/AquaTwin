import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { VoiceAgent } from "@/components/agent/VoiceAgent";
import { ToastProvider } from "@/components/ui/toast";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { RecentActionsProvider } from "@/lib/recent-actions";

/**
 * Typography foundation — identical to QuizCore's font stack.
 * QuizCore: font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
 * QuizCore: weights 400 / 500 / 600 / 700 / 800 via variable axis.
 * We load the same family using next/font for optimal performance.
 */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  // Cover all weights QuizCore uses: regular (400), medium (500), semibold (600), bold (700), extrabold (800)
  weight: ["400", "500", "600", "700", "800"],
  // font-display: swap — consistent with QuizCore's rendering priority
  display: "swap",
  // Preconnect is handled by next/font automatically
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AquaTwin — AI Irrigation Intelligence",
  description:
    "Field digital twin for AI irrigation intelligence: what-if simulation, water budget optimization and weather uncertainty analysis. Simulate the future before using a single drop.",
  keywords: ["irrigation AI", "digital twin", "precision agriculture", "water optimization", "AgriTech"],
  openGraph: {
    title: "AquaTwin — AI Irrigation Intelligence",
    description: "Simulate the future of your field before using a single drop.",
    type: "website",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

import { FarmProvider } from "@/context/farm-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          <FarmProvider>
            <ToastProvider>
              <RecentActionsProvider>
                <LoadingScreen />
                {children}
                <VoiceAgent />
              </RecentActionsProvider>
            </ToastProvider>
          </FarmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
