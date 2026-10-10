import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { FarmProvider } from "@/context/farm-context";
import { VoiceAgent } from "@/components/agent/VoiceAgent";
import { ToastProvider } from "@/components/ui/toast";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { RecentActionsProvider } from "@/lib/recent-actions";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
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
