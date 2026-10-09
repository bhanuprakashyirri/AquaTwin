"use client";

/**
 * Mobile bottom tab bar — the phone equivalent of the sidebar.
 * Five primary destinations; the overflow button opens the full
 * navigation drawer. Active tab carries a brand indicator.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Droplets,
  LayoutDashboard,
  Map as MapIcon,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/twin", label: "Field Twin", icon: MapIcon },
  { href: "/simulator", label: "What-If", icon: SlidersHorizontal },
  { href: "/water-budget", label: "Budget", icon: Droplets },
];

export function MobileNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const moreActive = ["/field-health", "/analytics", "/history", "/settings"].some((p) =>
    pathname.startsWith(p),
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href !== "/dashboard" && pathname.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors duration-150",
                active ? "text-brand-dark" : "text-ink-faint hover:text-ink",
              )}
            >
              {active && (
                <span className="absolute -top-px h-0.5 w-8 rounded-full bg-brand" />
              )}
              <t.icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="More options"
          className={cn(
            "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors duration-150",
            moreActive ? "text-brand-dark" : "text-ink-faint hover:text-ink",
          )}
        >
          {moreActive && <span className="absolute -top-px h-0.5 w-8 rounded-full bg-brand" />}
          <MoreHorizontal size={19} strokeWidth={1.8} />
          More
        </button>
      </div>
    </nav>
  );
}
