export type ScheduledFootballGame = { start_date: string | null };

export type FootballLeague = "nfl" | "cfb";

export type FootballSlate<T> = {
  id: string;
  start: number | null;
  end: number | null;
  broadcast: "TNF" | "SNF" | "MNF" | null;
  games: T[];
};

// Slates are cut on the league's own schedule clock (Eastern) so that a
// visitor's timezone changes labels but never membership. `dayStart` is the
// hour at which the league's schedule day rolls over: NFL never kicks off
// after midnight Eastern, while CFB's Hawaii games do and belong with the
// preceding Saturday's late window. `maxSpan` caps a slate: NFL slates are
// broadcast windows that fit in 90 minutes, and CFB's noon, afternoon, and
// evening windows spread staggered starts over about two hours.
const POLICIES = {
  nfl: { maxSpan: 90, dayStart: 0, broadcast: true },
  cfb: { maxSpan: 120, dayStart: 6, broadcast: false },
} as const;

const leagueClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

const MINUTE = 60_000;

// Games on one schedule day are split at their widest kickoff gaps until every
// slate fits the league's span, so a dense cluster (CFB's 3:30 window, the NFL
// late-afternoon doubleheader) stays whole and successive staggered starts can
// never chain a whole day together. Ties go to the gap nearest the middle of
// the span, and then to the later gap.
function split(starts: number[], maxSpan: number): number[][] {
  const span = starts[starts.length - 1] - starts[0];
  if (span <= maxSpan * MINUTE) return [starts];
  const middle = starts[0] + span / 2;
  let at = 1;
  let widest = -1;
  let nearest = Infinity;
  for (let i = 1; i < starts.length; i++) {
    const gap = starts[i] - starts[i - 1];
    const distance = Math.abs((starts[i] + starts[i - 1]) / 2 - middle);
    if (gap > widest || (gap === widest && distance <= nearest)) {
      at = i;
      widest = gap;
      nearest = distance;
    }
  }
  return [
    ...split(starts.slice(0, at), maxSpan),
    ...split(starts.slice(at), maxSpan),
  ];
}

export function groupFootballSlates<T extends ScheduledFootballGame>(
  games: T[],
  league: FootballLeague = "nfl",
): FootballSlate<T>[] {
  const policy = POLICIES[league];
  const byStart = new Map<number, T[]>();
  const undated: T[] = [];
  for (const game of games) {
    const start = game.start_date ? Date.parse(game.start_date) : NaN;
    if (!Number.isFinite(start)) undated.push(game);
    else byStart.set(start, [...(byStart.get(start) ?? []), game]);
  }
  const days = new Map<string, number[]>();
  for (const start of [...byStart.keys()].sort((a, b) => a - b)) {
    const parts = Object.fromEntries(
      leagueClock
        .formatToParts(start - policy.dayStart * 60 * MINUTE)
        .map((part) => [part.type, part.value]),
    );
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    days.set(day, [...(days.get(day) ?? []), start]);
  }
  const slates: FootballSlate<T>[] = [];
  for (const starts of days.values()) {
    for (const window of split(starts, policy.maxSpan)) {
      const start = window[0];
      const parts = Object.fromEntries(
        leagueClock
          .formatToParts(start)
          .map((part) => [part.type, part.value]),
      );
      const broadcast =
        policy.broadcast && Number(parts.hour) >= 18
          ? (({ Thu: "TNF", Sun: "SNF", Mon: "MNF" } as const)[
              parts.weekday as "Thu" | "Sun" | "Mon"
            ] ?? null)
          : null;
      slates.push({
        id: `slate-${start}`,
        start,
        end: window[window.length - 1],
        broadcast,
        games: window.flatMap((at) => byStart.get(at) ?? []),
      });
    }
  }
  if (undated.length)
    slates.push({
      id: "slate-tbd",
      start: null,
      end: null,
      broadcast: null,
      games: undated,
    });
  return slates;
}

export function footballSlateClock(timeZone: string) {
  const options = { timeZone };
  const day = new Intl.DateTimeFormat("en-US", {
    ...options,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const weekday = new Intl.DateTimeFormat("en-US", {
    ...options,
    weekday: "long",
  });
  const hour = new Intl.DateTimeFormat("en-US", {
    ...options,
    hour: "numeric",
    minute: "2-digit",
  });
  const kickoff = new Intl.DateTimeFormat("en-US", {
    ...options,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return {
    title: (
      slate: Pick<FootballSlate<unknown>, "start" | "end" | "broadcast">,
    ) => {
      if (slate.start == null) return "Kickoff TBD";
      if (slate.broadcast) return slate.broadcast;
      const range =
        slate.end != null && slate.end !== slate.start
          ? `${hour.format(slate.start)} - ${hour.format(slate.end)}`
          : hour.format(slate.start);
      return `${weekday.format(slate.start)} · ${range}`;
    },
    kickoff: (value: string | number | null) => {
      const start = typeof value === "string" ? Date.parse(value) : value;
      return start == null || !Number.isFinite(start)
        ? "Kickoff TBD"
        : `${day.format(start)} · ${kickoff.format(start)}`;
    },
  };
}
