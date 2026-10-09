"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataSource } from "@/services/api";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  source: DataSource | null;
  retry: () => void;
}

/** Fetch hook with retry. Errors are surfaced but pages render demo fallbacks. */
export function useApiData<T>(
  fetcher: () => Promise<{ data: T; source: DataSource }>,
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
      .then(({ data, source }) => {
        if (cancelled) return;
        setData(data);
        setSource(source);
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
