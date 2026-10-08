"use client";

import { useState } from "react";
import { Bell, CloudRain, Menu, UserRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhyDrawer } from "@/components/ui/assistant";
import { FORECAST_48H } from "@/lib/demo-data";

export function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rain = FORECAST_48H.find((f) => f.rainProbabilityPct >= 50 && f.rainfallMm > 0.5);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile menu */}
        <button
          className="rounded-full p-2 text-ink-soft hover:bg-subtle lg:hidden"
          aria-label="Open navigation"
          data-mobile-menu
          onClick={() => document.dispatchEvent(new CustomEvent("aquatwin:toggle-sidebar"))}
        >
          <Menu size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-2.5 text-sm">
          <span className="truncate font-semibold text-ink">Bhimavaram Demo Farm</span>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="hidden truncate text-ink-muted sm:inline">North Plot</span>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="hidden text-ink-muted md:inline">Rice · MTU-7029</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-1.5 rounded-full border border-line bg-subtle px-3 py-1.5 text-tiny text-ink-soft sm:flex">
          <CloudRain size={13} className="text-info" />
          <span className="font-semibold text-ink">{rain ? `${rain.rainProbabilityPct}%` : "10%"}</span>
          rain in {rain ? FORECAST_48H.indexOf(rain) : 7}h
          <span className="text-ink-faint">· {Math.round(FORECAST_48H[0].temperatureC)}°C</span>
        </div>

        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative rounded-full border border-line bg-surface p-2 text-ink-soft transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning" />
          </button>
          {notifOpen ? (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-line bg-surface p-3 shadow-pop">
              <div className="mb-2 text-tiny font-semibold text-ink">Notifications</div>
              <div className="space-y-2 text-tiny text-ink-soft">
                <div className="rounded-xl border border-line bg-subtle p-2.5">
                  <span className="font-medium text-ink">Rain expected in 7h</span> — 70% probability. The recommendation re-evaluates automatically.
                </div>
                <div className="rounded-xl border border-line bg-subtle p-2.5">
                  <span className="font-medium text-ink">Zone B stress risk 22%</span> — highest priority in the water budget.
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
          <Sparkles size={14} className="text-brand" />
          <span className="hidden sm:inline">Explain AI</span>
        </Button>

        <div className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
            aria-label="User menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-light to-[#DCEBE2] text-tiny font-bold text-brand-dark transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 shadow-sm"
          >
            RK
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-50 w-44 rounded-xl2 border border-line bg-surface p-1.5 shadow-pop">
              {["Profile", "Farm settings", "Sign out"].map((m) => (
                <div key={m} className="cursor-default rounded-lg px-3 py-2 text-tiny text-ink-soft hover:bg-subtle">
                  {m}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <WhyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
