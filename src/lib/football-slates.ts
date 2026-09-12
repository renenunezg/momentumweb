export type ScheduledFootballGame = { start_date: string | null };

export type FootballLeague = "nfl" | "cfb";

// The kickoff formats a <time data-kickoff> element can carry.
export type KickoffPart = "day" | "time" | "hour";

export type FootballSlate<T> = {
  id: string;
  start: number | null;
  broadcast: "TNF" | "SNF" | "MNF" | null;
  games: T[];
};

// A slate is one clock hour: every game that kicks off within it, so a 12:30
// or 12:45 straggler sits with the noon games. Hours are cut on the league's
// own clock (Eastern) so a visitor's timezone changes labels but never
// membership; a slate's start is its first kickoff. NFL evening slates carry
// their broadcast name.
const BROADCAST: Record<FootballLeague, boolean> = { nfl: true, cfb: false };

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
  league: FootballLeague = "nfl",
): FootballSlate<T>[] {
  const undated: T[] = [];
  const hours = new Map<
    string,
    { start: number; weekday: string; hour: number; games: T[] }
  >();
  const dated = games
    .map((game) => ({ game, start: Date.parse(game.start_date ?? "") }))
    .sort((a, b) => a.start - b.start);
  for (const { game, start } of dated) {
    if (!Number.isFinite(start)) {
      undated.push(game);
      continue;
    }
    const parts = Object.fromEntries(
      leagueClock.formatToParts(start).map((part) => [part.type, part.value]),
    );
    const key = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
    const slot = hours.get(key);
    if (slot) slot.games.push(game);
    else
      hours.set(key, {
        start,
        weekday: parts.weekday,
        hour: Number(parts.hour),
        games: [game],
      });
  }
  const slates: FootballSlate<T>[] = [...hours.values()].map(
    ({ start, weekday, hour, games }) => ({
      id: `slate-${start}`,
      start,
      broadcast:
        BROADCAST[league] && hour >= 18
          ? (({ Thu: "TNF", Sun: "SNF", Mon: "MNF" } as const)[
              weekday as "Thu" | "Sun" | "Mon"
            ] ?? null)
          : null,
      games,
    }),
  );
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
  const clockHour = new Intl.DateTimeFormat("en-US", {
    ...options,
    hour: "numeric",
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
      return `${weekday.format(slate.start)} · ${clockHour.format(slate.start)}`;
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
    hour: (value: string | number | null) => {
      const start = parse(value);
      return start == null ? "TBD" : clockHour.format(start);
    },
  };
}
