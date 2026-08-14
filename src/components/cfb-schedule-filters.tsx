"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "all", label: "All", empty: "No games this week." },
  {
    key: "top25",
    label: "Top 25",
    // Early-season weeks legitimately have none of these, so the empty state
    // says why rather than reading as a broken filter.
    empty: "No game this week is between two top 25 teams.",
  },
  {
    key: "conference",
    label: "Conference",
    empty: "No conference games this week.",
  },
] as const;

type View = (typeof VIEWS)[number]["key"];

// Filters the schedule without shipping it to the browser twice.
//
// The table arrives as server-rendered children, so the rows stay in the HTML
// and out of the client payload; passing the games as props would serialize
// the whole slate again. Each row carries the facts to match on as data
// attributes, so filtering is one pass over the DOM and never re-renders the
// table.
export function CfbScheduleFilters({
  total,
  children,
}: {
  total: number;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(total);

  function apply(nextView: View, nextQuery: string) {
    setView(nextView);
    setQuery(nextQuery);
    const needle = nextQuery.trim().toLowerCase();
    const rows =
      container.current?.querySelectorAll<HTMLTableRowElement>("tbody tr") ?? [];
    let visible = 0;
    for (const row of rows) {
      const match =
        (!needle || (row.dataset.search ?? "").includes(needle)) &&
        (nextView === "all" || row.dataset[nextView] === "true");
      row.hidden = !match;
      if (match) visible += 1;
    }
    setShown(visible);
  }

  const filtered = view !== "all" || query.trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center font-mono text-xs uppercase tracking-wider">
          {VIEWS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => apply(tab.key, query)}
              className={cn(
                // Preflight resets text-transform on <button>, so the
                // uppercase has to be set here rather than inherited.
                "border-b-2 px-3 py-2 uppercase transition-colors",
                tab.key === view
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => apply(view, e.target.value)}
          placeholder="Find a team"
          aria-label="Find a team"
          className="w-56 rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        />

        {filtered && (
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {shown} of {total} games
          </span>
        )}
      </div>

      <div ref={container}>{children}</div>

      {filtered && shown === 0 && (
        <p className="text-sm text-muted-foreground">
          {query.trim()
            ? `No team matches "${query.trim()}" in this view.`
            : VIEWS.find((v) => v.key === view)?.empty}
        </p>
      )}
    </div>
  );
}
