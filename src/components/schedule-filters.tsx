"use client";

import { useRef, useState, type ReactNode } from "react";
import { ToggleGroup } from "@/components/toggle-group";
import { useVisitorKickoffs } from "@/components/use-visitor-timezone";
import { useLiveScoreRows } from "@/components/use-football-live-scores";
import type { FootballLeague } from "@/lib/football-slates";

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
// table. Each slate is its own <tbody>; one that the filter has emptied is
// hidden so its rule does not stack on the next slate's. Live scores are
// written into the rows the same way, from one poll loop per page.
export function ScheduleFilters<K extends string>({
  league,
  views,
  defaultView,
  total,
  initialShown,
  children,
}: {
  league: FootballLeague;
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
  const clock = useVisitorKickoffs(container, children);
  useLiveScoreRows(container, league, children);

  function apply(nextView: K, nextQuery: string) {
    setView(nextView);
    setQuery(nextQuery);
    const needle = nextQuery.trim().toLowerCase();
    const showAll = views.find((v) => v.key === nextView)?.all === true;
    const bodies =
      container.current?.querySelectorAll<HTMLTableSectionElement>("tbody") ??
      [];
    let visible = 0;
    for (const body of bodies) {
      let inBody = 0;
      for (const row of body.querySelectorAll<HTMLTableRowElement>("tr")) {
        const match =
          (!needle || (row.dataset.search ?? "").includes(needle)) &&
          (showAll || row.dataset[nextView] === "true");
        row.hidden = !match;
        if (match) inBody += 1;
      }
      body.hidden = inBody === 0;
      visible += inBody;
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

      <p className="text-xs text-muted-foreground">
        Times shown in {clock.zone()}.
      </p>

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
