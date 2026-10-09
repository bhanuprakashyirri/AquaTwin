"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const toggle = () => setMobileOpen((v) => !v);
    document.addEventListener("aquatwin:toggle-sidebar", toggle);
    return () => document.removeEventListener("aquatwin:toggle-sidebar", toggle);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen overflow-hidden bg-page">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-24 md:px-6 lg:pb-6">
            {children}
          </main>
        </div>
        <MobileNav onMore={() => setMobileOpen(true)} />
      </div>
    </MotionConfig>
  );
}

