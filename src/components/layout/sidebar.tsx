"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoPill } from "@/components/ui/panel";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/twin", label: "Field Twin", icon: MapIcon },
  { href: "/simulator", label: "What-If Simulator", icon: SlidersHorizontal },
  { href: "/water-budget", label: "Water Budget", icon: Droplets },
  { href: "/field-health", label: "Field Health", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/history", label: "Irrigation History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-surface">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light">
          <Droplets size={18} className="text-brand" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-ink">AquaTwin</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Irrigation Intelligence
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main navigation">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                active
                  ? "bg-brand-light text-brand-dark"
                  : "text-ink-soft hover:bg-subtle hover:text-ink",
              )}
            >
              {active ? <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand" /> : null}
              <Icon size={16} className={active ? "text-brand" : "text-ink-faint"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Farm card */}
      <div className="border-t border-line p-3">
        <div className="rounded-lg border border-line bg-subtle p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Sprout size={13} className="text-brand" />
            Kisan Bhimavaram Demo Farm
          </div>
          <div className="mt-1 pl-5 text-micro text-ink-muted">Bhimavaram, AP</div>
          <div className="pl-5 text-micro text-ink-faint">10 ha · Rice</div>
        </div>
        <div className="mt-2 flex items-center justify-between px-1">
          <DemoPill />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-micro font-semibold text-brand-dark">
              RK
            </div>
            <span className="text-tiny font-medium text-ink-soft">Ravi K.</span>
          </div>
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
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div className="absolute left-0 top-0 h-full shadow-pop">
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute -right-10 top-3 rounded-lg bg-surface p-2 shadow-card"
        >
          <X size={16} className="text-ink-soft" />
        </button>
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
