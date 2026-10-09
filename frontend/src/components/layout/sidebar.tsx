"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Map as MapIcon,
  SlidersHorizontal,
  Droplets,
  Activity,
  BarChart3,
  History,
  Settings,
  Sprout,
  X,
  Wifi,
  Leaf,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_INTELLIGENCE = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, desc: "Farm KPIs & alerts" },
  { href: "/twin", label: "Field Twin", icon: MapIcon, desc: "Digital twin map" },
  { href: "/simulator", label: "What-If Simulator", icon: SlidersHorizontal, desc: "Scenario planning" },
  { href: "/water-budget", label: "Water Budget", icon: Droplets, desc: "Optimize allocation" },
  { href: "/field-health", label: "Field Health", icon: Activity, desc: "Zone health index" },
];

const NAV_OPERATIONS = [
  { href: "/analytics", label: "Analytics", icon: BarChart3, desc: "Trend charts" },
  { href: "/history", label: "Irrigation History", icon: History, desc: "Past schedules" },
  { href: "/settings", label: "Settings", icon: Settings, desc: "Preferences" },
];

import { useAuth } from "@/context/auth-context";
import { useFarm } from "@/context/farm-context";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { currentFarm, currentField, hasConfiguredFarm, openFarmSetup } = useFarm();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "AquaTwin Operator";

  const initials =
    fullName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AT";

  const farmLocation = currentFarm?.location || currentFarm?.stateRegion || "Saved Location";
  const areaStr = currentFarm?.totalArea
    ? `${currentFarm.totalArea} ${currentFarm.preferredUnit || "ha"}`
    : "Land area not provided";
  const cropStr = currentField?.crop?.name || "Crop not configured";

  // Clear pending optimistic state when route officially lands
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Aggressively prefetch all internal routes immediately in background
  useEffect(() => {
    [...NAV_INTELLIGENCE, ...NAV_OPERATIONS].forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const renderNavGroup = (items: typeof NAV_INTELLIGENCE) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isCurrent = pathname === item.href;
        const isPending = pendingHref === item.href;
        const active = isPending || (pendingHref === null && isCurrent);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onPointerDown={() => {
              // 0ms instant tactile trigger before click fires
              if (pathname !== item.href) {
                setPendingHref(item.href);
              }
            }}
            onClick={() => {
              if (pathname !== item.href) {
                setPendingHref(item.href);
              }
              onNavigate?.();
            }}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "group relative flex h-11 items-center gap-3 rounded-full px-4 text-[13px] font-medium tracking-tight transition-colors duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              active
                ? "bg-gradient-to-r from-brand-light via-[#E4F1EA] to-brand-light/40 text-brand-dark font-semibold border border-[#BFDCCB] shadow-[0_2px_8px_rgba(40,116,95,0.12)]"
                : "text-[#4A6058] hover:bg-[#F0F4F2] hover:text-ink"
            )}
          >
            {/* Active left bar */}
            {active && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-brand" />
            )}

            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-75",
                active
                  ? "bg-brand text-white shadow-sm"
                  : "bg-[#EBF0ED] text-[#5A7066] group-hover:bg-brand-light group-hover:text-brand"
              )}
            >
              <Icon size={14} />
            </span>

            <span className="flex-1 leading-tight">{item.label}</span>

            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col overflow-hidden bg-[#F7FAF8]">
      {/* Subtle top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-[#34A87A] to-brand opacity-80" />

      {/* Brand Header */}
      <div className="relative overflow-hidden px-5 pb-5 pt-6">
        {/* Background glow */}
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/8 blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-[#1C5143] p-1.5 shadow-[0_4px_14px_rgba(28,81,67,0.35)]">
            <Image src="/logo-white.png" alt="AquaTwin Logo" width={28} height={28} className="object-contain" />
            {/* Shimmer ring */}
            <span className="absolute -inset-px rounded-2xl border border-white/20" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-extrabold tracking-tight text-[#163A31]">AquaTwin</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand to-[#1C5143] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                <Zap size={8} />
                AI
              </span>
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8AAAA0]">
              Irrigation Intelligence
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-[#D5E4DF] to-transparent" />
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scrollbar-none" aria-label="Main navigation">
        <div>
          <div className="mb-2 flex items-center gap-2 px-4">
            <Leaf size={11} className="text-brand" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8AAAA0]">
              Field Intelligence
            </span>
          </div>
          {renderNavGroup(NAV_INTELLIGENCE)}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 px-4">
            <BarChart3 size={11} className="text-[#8AAAA0]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8AAAA0]">
              System &amp; History
            </span>
          </div>
          {renderNavGroup(NAV_OPERATIONS)}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#D5E4DF] to-transparent" />

      {/* Farm & User Card */}
      <div className="p-3.5 space-y-2.5">
        {hasConfiguredFarm && currentFarm ? (
          /* Actual configured farm card */
          <div className="rounded-2xl border border-[#D4E6DD] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(40,116,95,0.07)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light">
                  <Sprout size={13} className="text-brand-dark" />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-ink leading-tight truncate">
                    {currentFarm.name}
                  </div>
                  <div className="text-[10px] text-ink-muted truncate">
                    {farmLocation}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0 pl-1">
                <span className="text-[9px] font-medium text-ink-muted">Enrolled</span>
                <span className="text-[9px] text-ink-faint">Manual / Twin</span>
              </div>
            </div>

            {/* Configured Area and Crop */}
            <div className="mt-2 text-[10px] text-ink-soft flex items-center gap-1.5 truncate">
              <span className="font-semibold text-ink">{areaStr}</span>
              <span>·</span>
              <span className="truncate">{cropStr}</span>
            </div>

            {/* Sensor / Zone Configuration status */}
            <div className="mt-2 flex items-center gap-2 border-t border-line/60 pt-2">
              <Wifi size={10} className="text-ink-faint shrink-0" />
              <span className="text-[9px] text-ink-muted truncate">
                No irrigation zones configured
              </span>
            </div>
          </div>
        ) : (
          /* Honest unconfigured setup prompt */
          <div className="rounded-2xl border border-dashed border-[#BFDCCB] bg-[#F2F8F5] p-3.5 text-center">
            <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand mb-1.5">
              <Sprout size={14} />
            </div>
            <div className="text-[12px] font-semibold text-ink">Set up your farm</div>
            <p className="mt-0.5 text-[10px] text-ink-muted leading-tight">
              Add your farm details to personalize irrigation intelligence.
            </p>
            <button
              onClick={openFarmSetup}
              className="mt-2.5 inline-flex w-full items-center justify-center rounded-full bg-brand px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors cursor-pointer"
            >
              Configure Farm
            </button>
          </div>
        )}

        {/* User row */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#1C5143] text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-ink leading-tight truncate">
              {fullName}
            </div>
            <div className="text-[10px] text-ink-faint truncate">
              {user?.email || "Authenticated Operator"}
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#E8F5EE] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-dark">
            Active
          </span>
        </div>
      </div>
    </aside>
  );
}

/** Mobile slide-in sidebar */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="absolute left-0 top-0 h-full shadow-pop"
        style={{ animation: "aqua-slide-in-left 0.28s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute -right-10 top-3 rounded-full bg-surface p-2 shadow-card"
        >
          <X size={16} className="text-ink-soft" />
        </button>
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
