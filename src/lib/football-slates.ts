export type ScheduledFootballGame = { start_date: string | null };

export type FootballSlate<T> = {
  id: string;
  start: number | null;
  end: number | null;
  broadcast: "TNF" | "SNF" | "MNF" | null;
  games: T[];
};

const leagueClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

export function groupFootballSlates<T extends ScheduledFootballGame>(
  games: T[],
): FootballSlate<T>[] {
  const timed = games.map((game) => ({
    game,
    start: game.start_date ? Date.parse(game.start_date) : NaN,
  }));
  const slates: FootballSlate<T>[] = [];
  let previousDay = "";
  for (const { game, start } of timed
    .filter((row) => Number.isFinite(row.start))
    .sort((a, b) => a.start - b.start)) {
    const parts = Object.fromEntries(
      leagueClock.formatToParts(start).map((part) => [part.type, part.value]),
    );
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    const current = slates.at(-1);
    // Anchor each window to its first kickoff, so a chain of reschedules
    // cannot merge the early, late, and night slates. :05/:25 starts stay together.
    if (
      current?.start != null &&
      day === previousDay &&
      start - current.start <= 90 * 60_000
    ) {
      current.games.push(game);
      current.end = start;
    } else {
      const broadcast =
        Number(parts.hour) >= 18
          ? (({ Thu: "TNF", Sun: "SNF", Mon: "MNF" } as const)[
              parts.weekday as "Thu" | "Sun" | "Mon"
            ] ?? null)
          : null;
      slates.push({
        id: `slate-${start}`,
        start,
        end: start,
        broadcast,
        games: [game],
      });
    }
    previousDay = day;
  }
  const undated = timed
    .filter((row) => !Number.isFinite(row.start))
    .map((row) => row.game);
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
