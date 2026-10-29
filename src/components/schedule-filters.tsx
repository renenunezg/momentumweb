"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import {
  FootballLiveProbabilityPanel,
  type LiveProbabilityGame,
} from "@/components/football-live-probability-dialog";
import { ToggleGroup } from "@/components/toggle-group";
import { SITE_TIME_LABEL } from "@/lib/site-time";
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
// table. Each slate is its own [data-slate] group (a <tbody>, or a section of
// phone cards) headed by a row without those attributes; a slate the filter
// has emptied is hidden, heading and all, so its rule does not stack on the
// next slate's. The table and the cards are both in the DOM, so a game is
// counted once by id. Live scores are written into the rows the same way,
// from one poll loop per page, and a started game's status opens its win
// probability in one shared dialog.
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
  useLiveScoreRows(container, league, children);
  // The game outlives `open` so the dialog keeps its title while it closes.
  const [probability, setProbability] = useState<LiveProbabilityGame | null>(null);
  const [open, setOpen] = useState(false);

  function openProbability(event: MouseEvent<HTMLDivElement>) {
    const row = (event.target as HTMLElement)
      .closest("[data-live-block], [data-live-probability]")
      ?.closest<HTMLElement>("[data-game]");
    const { game, away, home } = row?.dataset ?? {};
    if (!game || !away || !home) return;
    setProbability({ gameId: game, away, home });
    setOpen(true);
  }

  function apply(nextView: K, nextQuery: string) {
    setView(nextView);
    setQuery(nextQuery);
    const needle = nextQuery.trim().toLowerCase();
    const showAll = views.find((v) => v.key === nextView)?.all === true;
    const groups =
      container.current?.querySelectorAll<HTMLElement>("[data-slate]") ?? [];
    const visible = new Set<string>();
    for (const group of groups) {
      let inGroup = 0;
      for (const row of group.querySelectorAll<HTMLElement>("[data-search]")) {
        const match =
          (!needle || (row.dataset.search ?? "").includes(needle)) &&
          (showAll || row.dataset[nextView] === "true");
        row.hidden = !match;
        if (match) {
          inGroup += 1;
          visible.add(row.dataset.game ?? "");
        }
      }
      group.hidden = inGroup === 0;
    }
    setShown(visible.size);
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
            className="type-eyebrow text-muted-foreground"
            aria-live="polite"
          >
            {shown} of {total} games
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Times shown in {SITE_TIME_LABEL}.
      </p>

      <div ref={container} onClick={openProbability}>{children}</div>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && probability && (
          <FootballLiveProbabilityPanel league={league} {...probability} />
        )}
      </Dialog>

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
