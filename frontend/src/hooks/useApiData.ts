"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DataSource = "live" | "api" | "database" | "offline" | "fallback" | string;

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  source?: DataSource | null;
  retry: () => void;
}

interface CacheEntry<T> {
  value: { data: T | null; source?: DataSource; error?: string | null };
  ts: number;
}

/**
 * Short-lived query cache (stale-while-revalidate).
 *
 * Pages share queries (zones, field state, system status appear
 * on nearly every route). Without a cache, every navigation
 * refires them all and each page paints empty until the slowest
 * request resolves. With the cache, repeat queries paint
 * instantly from memory and only hit the network when the entry
 * is older than CACHE_TTL_MS. `retry()` always bypasses the
 * cache so manual refreshes reach the backend.
 */
const CACHE_TTL_MS = 5000;
const cache = new Map<string, CacheEntry<unknown>>();

export function useApiData<T>(
  fetcher: () => Promise<{ data: T | null; source?: DataSource; error?: string | null }>,
  deps: unknown[] = [],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    // All call sites pass literal fetchers (e.g. () => fetchZones("field-a")),
    // so the function source is a stable, collision-free cache key.
    const key = fetcherRef.current.toString();
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    const fresh = cached !== undefined && Date.now() - cached.ts < CACHE_TTL_MS;

    if (cached) {
      // Instant paint from cache — no loading flash on navigation.
      setData(cached.value.data);
      if (cached.value.source) setSource(cached.value.source);
      setError(cached.value.error ?? null);
      setLoading(false);
    } else {
      setLoading(true);
      setError(null);
    }

    // Fresh cache entry — skip the network entirely.
    if (fresh) return;

    fetcherRef
      .current()
      .then((res) => {
        if (cancelled) return;
        cache.set(key, { value: res, ts: Date.now() });
        setData(res.data);
        if (res.source) setSource(res.source);
        setError(res.error ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Request failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => {
    // Bypass the cache so retry always reaches the backend.
    cache.delete(fetcherRef.current.toString());
    setAttempt((a) => a + 1);
  }, []);

  return { data, loading, error, source, retry };
}
