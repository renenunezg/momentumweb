export type ScheduledFootballGame = { start_date: string | null };

export type FootballLeague = "nfl" | "cfb";

export type FootballSlate<T> = {
  id: string;
  start: number | null;
  broadcast: "TNF" | "SNF" | "MNF" | null;
  games: T[];
};

// A slate is one kickoff time: every game that starts at that instant. NFL
// evening slates carry their broadcast name, read on the league's own clock
// (Eastern) so a visitor's timezone changes labels but never membership.
const BROADCAST: Record<FootballLeague, boolean> = { nfl: true, cfb: false };

const leagueClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

export function groupFootballSlates<T extends ScheduledFootballGame>(
  games: T[],
  league: FootballLeague = "nfl",
): FootballSlate<T>[] {
  const byStart = new Map<number, T[]>();
  const undated: T[] = [];
  for (const game of games) {
    const start = game.start_date ? Date.parse(game.start_date) : NaN;
    if (!Number.isFinite(start)) undated.push(game);
    else byStart.set(start, [...(byStart.get(start) ?? []), game]);
  }
  const slates: FootballSlate<T>[] = [...byStart.keys()]
    .sort((a, b) => a - b)
    .map((start) => {
      const parts = Object.fromEntries(
        leagueClock.formatToParts(start).map((part) => [part.type, part.value]),
      );
      const broadcast =
        BROADCAST[league] && Number(parts.hour) >= 18
          ? (({ Thu: "TNF", Sun: "SNF", Mon: "MNF" } as const)[
              parts.weekday as "Thu" | "Sun" | "Mon"
            ] ?? null)
          : null;
      return {
        id: `slate-${start}`,
        start,
        broadcast,
        games: byStart.get(start)!,
      };
    });
  if (undated.length)
    slates.push({
      id: "slate-tbd",
      start: null,
      broadcast: null,
      games: undated,
    });
  return slates;
}

function parse(value: string | number | null) {
  const start = typeof value === "string" ? Date.parse(value) : value;
  return start == null || !Number.isFinite(start) ? null : start;
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
  const zoneName = (style: "long" | "short", at: number) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZoneName: style })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value;
  return {
    // "Pacific Daylight Time (PDT)" rather than the raw IANA id. Zones whose
    // short form is only a GMT offset, most of Europe in en-US, keep it since
    // the offset is still the clearest disambiguator for a reader there.
    zone: (at: number = Date.now()) => {
      const long = zoneName("long", at) ?? timeZone.replaceAll("_", " ");
      const short = zoneName("short", at);
      return short && short !== long ? `${long} (${short})` : long;
    },
    title: (slate: Pick<FootballSlate<unknown>, "start" | "broadcast">) => {
      if (slate.start == null) return "Kickoff TBD";
      if (slate.broadcast) return slate.broadcast;
      return `${weekday.format(slate.start)} · ${hour.format(slate.start)}`;
    },
    kickoff: (value: string | number | null) => {
      const start = parse(value);
      return start == null
        ? "Kickoff TBD"
        : `${day.format(start)} · ${kickoff.format(start)}`;
    },
    day: (value: string | number | null) => {
      const start = parse(value);
      return start == null ? "TBD" : day.format(start);
    },
    time: (value: string | number | null) => {
      const start = parse(value);
      return start == null ? "TBD" : hour.format(start);
    },
  };
}
