"use client";

import { useRef, useState, type ReactNode } from "react";

// Filters the schedule by team without ever shipping the schedule to the
// browser twice.
//
// The table arrives as server-rendered `children`, so the 172 rows stay in the
// HTML and out of the client payload; passing the games in as props would
// serialize the whole slate a second time. Matching happens against a
// data-search attribute the server already wrote onto each row, so filtering
// is a single pass over the DOM with no React re-render of the table.
export function CfbScheduleSearch({
  total,
  children,
}: {
  total: number;
  children: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(total);

  function apply(value: string) {
    setQuery(value);
    const needle = value.trim().toLowerCase();
    const rows =
      container.current?.querySelectorAll<HTMLTableRowElement>("tbody tr") ?? [];
    let visible = 0;
    for (const row of rows) {
      const match = !needle || (row.dataset.search ?? "").includes(needle);
      row.hidden = !match;
      if (match) visible += 1;
    }
    setShown(visible);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => apply(e.target.value)}
          placeholder="Find a team"
          aria-label="Find a team"
          className="w-56 rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        />
        {query.trim() && (
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {shown} of {total} games
          </span>
        )}
      </div>

      <div ref={container}>{children}</div>

      {query.trim() && shown === 0 && (
        <p className="text-sm text-muted-foreground">
          No team matches &ldquo;{query.trim()}&rdquo; this week.
        </p>
      )}
    </div>
  );
}
