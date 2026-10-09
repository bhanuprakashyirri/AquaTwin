"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type InitState = "initializing" | "ready" | "error";

const INIT_TIMEOUT_MS = 8000;
const MIN_DISPLAY_MS = 250;
const SESSION_STORAGE_KEY = "aquatwin_ready";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8000";

export function LoadingScreen() {
  const [state, setState] = useState<InitState>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const isMountedRef = useRef(true);
  const abortCtrlRef = useRef<AbortController | null>(null);

  const startInitialization = useCallback(async () => {
    // If already booted in this browser session, skip immediately
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(SESSION_STORAGE_KEY) === "true") {
          setState("ready");
          setVisible(false);
          return;
        }
      } catch {
        /* ignore storage access issues */
      }
    }

    setState("initializing");
    setErrorMessage(null);

    // Cancel any in-flight startup probe
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    const startTime = Date.now();

    // 8-second safety timeout
    const timeoutTimer = setTimeout(() => {
      ctrl.abort();
    }, INIT_TIMEOUT_MS);

    try {
      // Controlled simulation hook for Test D (Essential initialization failure)
      const searchParams =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      if (
        typeof window !== "undefined" &&
        ((window as any).__AQUATWIN_SIMULATE_INIT_ERROR === true ||
          searchParams?.get("simulate_init_fail") === "1")
      ) {
        throw new Error("Essential service connection failed (simulated service disruption).");
      }

      // Essential core service check — non-blocking to all domain sub-services
      let healthy = false;
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        healthy = res.ok;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          throw new Error("Startup timed out waiting for field services (8s limit).");
        }
        // Try fallback root /health if /api/health failed
        try {
          const resFallback = await fetch(`${API_BASE_URL}/health`, {
            signal: ctrl.signal,
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          healthy = resFallback.ok;
        } catch (innerErr: any) {
          if (innerErr?.name === "AbortError") {
            throw new Error("Startup timed out waiting for field services (8s limit).");
          }
          // If backend is unreachable in dev, we report a clear actionable error
          throw new Error(
            `Unable to reach field services at ${API_BASE_URL}. Ensure the backend service is running.`
          );
        }
      }

      clearTimeout(timeoutTimer);

      if (!healthy) {
        throw new Error("Core field services responded with an unhealthy status.");
      }

      // Respect minimum display duration to avoid 1-frame visual flicker
      const elapsed = Date.now() - startTime;
      const remainingMinTime = Math.max(0, MIN_DISPLAY_MS - elapsed);
      if (remainingMinTime > 0) {
        await new Promise((r) => setTimeout(r, remainingMinTime));
      }

      if (!isMountedRef.current) return;

      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      } catch {}

      setState("ready");
      // Smooth fade-out before unmounting
      setTimeout(() => {
        if (isMountedRef.current) {
          setVisible(false);
        }
      }, 240);
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      if (!isMountedRef.current) return;

      const isAborted = ctrl.signal.aborted;
      const message =
        err instanceof Error
          ? err.message
          : isAborted
          ? "Startup timed out waiting for field services (8s limit)."
          : "Unexpected error during workspace startup.";

      if (process.env.NODE_ENV !== "production") {
        console.warn("[AquaTwin Startup]", message);
      }

      setErrorMessage(message);
      setState("error");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    startInitialization();

    return () => {
      isMountedRef.current = false;
      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
    };
  }, [startInitialization]);

  // Once ready and faded out, remove from DOM completely
  if (!visible && state === "ready") {
    return null;
  }

  const bypassToWorkspace = () => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    } catch {}
    setState("ready");
    setVisible(false);
  };

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      (window as any).__AQUATWIN_SIMULATE_INIT_ERROR = false;
      if (window.location.search.includes("simulate_init_fail")) {
        const url = new URL(window.location.href);
        url.searchParams.delete("simulate_init_fail");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? "?" + url.searchParams.toString() : "")
        );
      }
    }
    startInitialization();
  };

  const isExiting = state === "ready" && visible;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        state === "error"
          ? "Initialization error"
          : state === "ready"
          ? "Workspace ready"
          : "Preparing your workspace"
      }
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#F5F7F4] select-none transition-opacity duration-200 ease-out ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center text-center px-6 max-w-sm w-full">
        {/* AquaTwin Logo Asset */}
        <div className="relative flex h-12 w-12 items-center justify-center">
          <Image
            src="/logo.png"
            alt="AquaTwin"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
        </div>

        {/* Brand Name & Subtitle */}
        <h1 className="mt-3 text-xl font-bold tracking-tight text-[#163A31] font-sans">
          AquaTwin
        </h1>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#60746C] font-sans">
          Irrigation Intelligence
        </p>

        {/* State 1: Initializing */}
        {state === "initializing" && (
          <div className="mt-6 flex items-center gap-2.5">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#DDE6E1] border-t-[#28745F]"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-[#3F564E] font-sans">
              Preparing your workspace…
            </span>
          </div>
        )}

        {/* State 2: Error with Recovery Actions */}
        {state === "error" && (
          <div className="mt-6 flex flex-col items-center w-full transition-opacity duration-200">
            <div className="w-full rounded-xl border border-[#E7C9C9] bg-[#FDF7F7] p-3.5 text-center">
              <div className="text-xs font-semibold text-[#8C3535] font-sans">
                Initialization Incomplete
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6E4242] font-sans">
                {errorMessage ||
                  "Unable to connect to field services. Please check your network connection or backend service status."}
              </p>
            </div>

            <div className="mt-4 flex flex-col w-full gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full rounded-full bg-[#28745F] hover:bg-[#1C5143] text-white py-2 px-4 text-xs font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28745F]/40 cursor-pointer"
              >
                Retry
              </button>

              <button
                type="button"
                onClick={bypassToWorkspace}
                className="w-full rounded-full border border-[#DDE6E1] bg-white hover:bg-[#F0F4F1] text-[#3F564E] py-2 px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28745F]/40 cursor-pointer"
              >
                Continue to workspace (offline mode)
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-1 text-[11px] font-medium text-[#60746C] hover:text-[#163A31] underline underline-offset-2 transition-colors cursor-pointer"
              >
                Reload application
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;
