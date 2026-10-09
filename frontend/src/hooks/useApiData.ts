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

/** Fetch hook with retry and honest error surfacing. */
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
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        if (res.source) setSource(res.source);
        if (res.error) setError(res.error);
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

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data, loading, error, source, retry };
}
