"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/context/auth-context";
import { useFarm } from "@/context/farm-context";
import { FarmSetupWizard } from "@/components/farm/farm-setup-wizard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { hasConfiguredFarm, loading: farmLoading, setupModalOpen, closeFarmSetup } = useFarm();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const toggle = () => setMobileOpen((v) => !v);
    document.addEventListener("aquatwin:toggle-sidebar", toggle);
    return () => document.removeEventListener("aquatwin:toggle-sidebar", toggle);
  }, []);

  // Protected route enforcement
  useEffect(() => {
    if (!loading && !user) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      router.replace(redirectUrl);
    }
  }, [loading, user, pathname, router]);

  // While restoring session, avoid flashing Sign In page or unprotected UI
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-3.5">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          <p className="text-xs font-medium text-ink-muted">Verifying field session…</p>
        </div>
      </div>
    );
  }

  // If not authenticated, prevent rendering protected workspace content while redirecting
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-3.5">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          <p className="text-xs font-medium text-ink-muted">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen overflow-hidden bg-page">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 md:py-7 lg:px-8 lg:pb-8">
            {children}
          </main>
        </div>
        <MobileNav onMore={() => setMobileOpen(true)} />
        <FarmSetupWizard
          isOpen={setupModalOpen || (!farmLoading && !hasConfiguredFarm)}
          onClose={closeFarmSetup}
          canClose={hasConfiguredFarm}
        />
      </div>
    </MotionConfig>
  );
}
