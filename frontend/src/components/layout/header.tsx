"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CloudRain, LogOut, Menu, Settings as SettingsIcon, Sparkles, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhyDrawer } from "@/components/ui/assistant";
import { fetchWeather } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/context/auth-context";
import { useFarm } from "@/context/farm-context";

export function Header() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { currentFarm, currentField, hasConfiguredFarm, openFarmSetup } = useFarm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const wxQ = useApiData(() => fetchWeather("field-a"));

  const forecast = wxQ.data?.forecast ?? [];
  const rain = forecast.find((f) => f.rainProbabilityPct >= 50 && f.rainfallMm > 0.5);
  const rainIndex = rain ? forecast.indexOf(rain) : -1;
  const currentTemp = forecast.length ? Math.round(forecast[0].temperatureC) : null;
  const farmName = hasConfiguredFarm && currentFarm ? currentFarm.name : "Set Up Your Farm";
  const plotName = currentField?.name || (hasConfiguredFarm ? "Field Plot 1" : "No Field Configured");

  // Derive user info
  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "AquaTwin Operator";

  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "AT";

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.push("/login");
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-6">
      {/* Subtle gradient accent line at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/15 to-transparent" />
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile menu */}
        <button
          className="rounded-full p-2 text-ink-soft hover:bg-subtle lg:hidden cursor-pointer"
          aria-label="Open navigation"
          data-mobile-menu
          onClick={() => document.dispatchEvent(new CustomEvent("aquatwin:toggle-sidebar"))}
        >
          <Menu size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-2.5 text-sm">
          {hasConfiguredFarm ? (
            <span className="truncate font-semibold text-ink">{farmName}</span>
          ) : (
            <button
              onClick={openFarmSetup}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-dark hover:bg-brand/20 transition-colors cursor-pointer"
            >
              + Configure Farm
            </button>
          )}
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="hidden truncate text-ink-muted sm:inline">{plotName}</span>
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="hidden text-ink-muted md:inline">Precision Irrigation Console</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-1.5 rounded-full border border-line bg-subtle px-3 py-1.5 text-tiny text-ink-soft sm:flex">
          <CloudRain size={13} className="text-info" />
          {rain && rainIndex >= 0 ? (
            <>
              <span className="font-semibold text-ink">{rain.rainProbabilityPct}%</span>
              rain in {rainIndex}h
            </>
          ) : (
            <span className="text-ink-soft">Low rain risk (48h)</span>
          )}
          {currentTemp !== null && <span className="text-ink-faint">· {currentTemp}°C</span>}
        </div>

        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative rounded-full border border-line bg-surface p-2 text-ink-soft transition-colors hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 cursor-pointer"
          >
            <Bell size={16} />
            {rain ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warning" /> : null}
          </button>
          {notifOpen ? (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-line bg-surface p-3 shadow-pop">
              <div className="mb-2 text-tiny font-semibold text-ink">System Alerts</div>
              <div className="space-y-2 text-tiny text-ink-soft">
                {rain ? (
                  <div className="rounded-xl border border-line bg-subtle p-2.5">
                    <span className="font-medium text-ink">Rain forecast detected</span> — {rain.rainProbabilityPct}% probability in ~{rainIndex}h. Irrigation recommendation adjusted.
                  </div>
                ) : (
                  <div className="rounded-xl border border-line bg-subtle p-2.5 text-ink-faint">
                    No urgent weather or soil stress alerts.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
          <Sparkles size={14} className="text-brand" />
          <span className="hidden sm:inline">Explain AI</span>
        </Button>

        {/* User profile dropdown with Supabase sign out */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
            aria-label="User menu"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-light to-[#DCEBE2] text-tiny font-bold text-brand-dark transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 shadow-sm cursor-pointer"
          >
            {initials}
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-pop">
              {/* User Identity info */}
              <div className="border-b border-line px-3 py-2.5">
                <div className="text-xs font-semibold text-ink truncate">{fullName}</div>
                {user?.email && (
                  <div className="text-micro text-ink-muted truncate mt-0.5">{user.email}</div>
                )}
              </div>

              <div className="pt-1">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-tiny font-medium text-ink-soft hover:bg-subtle hover:text-ink transition-colors"
                >
                  <SettingsIcon size={14} className="text-ink-faint" /> Settings & Profile
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-tiny font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <WhyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
