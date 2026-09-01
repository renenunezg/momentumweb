"use client";

import { useMemo, useState } from "react";
import { ToggleGroup } from "@/components/toggle-group";

const WINDOWS = [
  { key: "7", label: "Last 7" },
  { key: "30", label: "Last 30" },
  { key: "season", label: "Season" },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

const PAGE_SIZE = 25;

// A trailing window over date-keyed rows: the short windows are a fixed
// number of most recent days, and only the full season pages.
export function usePagedWindow<T extends { date: string }>(rows: T[]) {
  const [windowKey, setWindowKey] = useState<WindowKey>("7");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1));
    return windowKey === "season" ? sorted : sorted.slice(0, Number(windowKey));
  }, [rows, windowKey]);

  const totalPages =
    windowKey === "season" ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const visible =
    windowKey === "season"
      ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      : filtered;

  return {
    windowKey,
    setWindow(next: WindowKey) {
      setWindowKey(next);
      setPage(0);
    },
    page,
    setPage,
    totalPages,
    visible,
  };
}

export function WindowPager({
  label,
  windowKey,
  onWindow,
  page,
  totalPages,
  onPage,
}: {
  label: string;
  windowKey: WindowKey;
  onWindow: (next: WindowKey) => void;
  page: number;
  totalPages: number;
  onPage: (next: number) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <ToggleGroup
        variant="pill"
        label={label}
        options={WINDOWS}
        value={windowKey}
        onChange={onWindow}
      />
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => onPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-2 py-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            {"<"}
          </button>
          <span className="text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
          >
            {">"}
          </button>
        </nav>
      )}
    </div>
  );
}
