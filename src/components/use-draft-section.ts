"use client";
import { useEffect, useState } from "react";

export function useDraftSection<T>(
  url: string,
  enabled: boolean,
  initial?: { url: string; data: T },
) {
  const [cache, setCache] = useState<Record<string, T>>(() =>
    initial ? { [initial.url]: initial.data } : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const data = cache[url];
  useEffect(() => {
    if (!enabled || data) return;
    const controller = new AbortController();
    // Debounce typing while keeping the current result cached for instant returns.
    const timer = setTimeout(
      () => {
        fetch(url, { signal: controller.signal })
          .then(async (response) => {
            if (!response.ok) throw new Error("Draft data unavailable");
            return response.json() as Promise<T>;
          })
          .then((value) => {
            setCache((previous) => ({ ...previous, [url]: value }));
            setError(null);
          })
          .catch((reason: Error) => {
            if (reason.name !== "AbortError") setError(url);
          });
      },
      url.includes("query=") ? 180 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, enabled, data, retry]);
  return {
    data,
    error: error === url,
    retry: () => {
      setError(null);
      setRetry((n) => n + 1);
    },
  };
}
