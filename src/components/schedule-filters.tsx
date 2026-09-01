"use client";

import { useRef, useState, type ReactNode } from "react";
import { ToggleGroup } from "@/components/toggle-group";

export interface ScheduleView<K extends string> {
  key: K;
  label: string;
  empty: string;
  // A view that shows every row rather than matching a data attribute.
  all?: boolean;
}

// Filters the schedule without shipping it to the browser twice.
//
// The table arrives as server-rendered children, so the rows stay in the HTML
// and out of the client payload; passing the games as props would serialize
// the whole slate again. Each row carries the facts to match on as data
// attributes, so filtering is one pass over the DOM and never re-renders the
// table.
export function ScheduleFilters<K extends string>({
  views,
  defaultView,
  total,
  initialShown,
  children,
}: {
  views: readonly ScheduleView<K>[];
  defaultView: K;
  total: number;
  initialShown: number;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<K>(defaultView);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(initialShown);

  function apply(nextView: K, nextQuery: string) {
    setView(nextView);
    setQuery(nextQuery);
    const needle = nextQuery.trim().toLowerCase();
    const showAll = views.find((v) => v.key === nextView)?.all === true;
    const rows =
      container.current?.querySelectorAll<HTMLTableRowElement>("tbody tr") ?? [];
    let visible = 0;
    for (const row of rows) {
      const match =
        (!needle || (row.dataset.search ?? "").includes(needle)) &&
        (showAll || row.dataset[nextView] === "true");
      row.hidden = !match;
      if (match) visible += 1;
    }
    setShown(visible);
  }

  const narrowed = shown !== total || query.trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          label="Schedule view"
          options={views}
          value={view}
          onChange={(next) => apply(next, query)}
        />

        <input
          type="search"
          value={query}
          onChange={(e) => apply(view, e.target.value)}
          placeholder="Find a team"
          aria-label="Find a team"
          className="w-56 rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        {narrowed && (
          <span
            className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
            aria-live="polite"
          >
            {shown} of {total} games
          </span>
        )}
      </div>

      <div ref={container}>{children}</div>

      {shown === 0 && (
        <p className="text-sm text-muted-foreground">
          {query.trim()
            ? `No team matches "${query.trim()}" in this view.`
            : views.find((v) => v.key === view)?.empty}
        </p>
      )}
    </div>
  );
}
