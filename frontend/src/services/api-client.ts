/**
 * Centralized API client for AquaTwin.
 * Handles timeouts, network errors, base URL configuration, and fallback execution.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8000";

export const TIMEOUT_MS = 3000;

export type DataSource = "backend" | "demo";

export interface ApiResponse<T> {
  data: T;
  source: DataSource;
  error?: string;
}

export async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Execute a backend call; if unreachable, gracefully fall back to local deterministic engine.
 */
export async function withFallback<T>(
  remote: () => Promise<T | null>,
  local: () => T
): Promise<{ data: T; source: DataSource }> {
  const remoteData = await remote();
  if (remoteData !== null) {
    return { data: remoteData, source: "backend" };
  }
  return { data: local(), source: "demo" };
}
