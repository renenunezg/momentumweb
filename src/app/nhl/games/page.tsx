import type { Metadata } from "next";
import { LastUpdated } from "@/components/last-updated";
import { NhlGamesLive } from "@/components/nhl-games-live";
import type { NhlMatchup } from "@/components/nhl-games-table";
import { Notice } from "@/components/notice";
import { SITE_TIME_ZONE, siteDate, zonedDayRange } from "@/lib/daily-picks";
import {
  bestMoneyline,
  fetchLatestSnapshots,
  fetchProjections,
  fetchTeams,
} from "@/lib/nhl";
import { NHL_SCORE_URL, parseScoreFeed, type NhlLiveGame } from "@/lib/nhl-live";
import { fetchNhlDecisions } from "@/lib/nhl-picks";

// Rendered per request: the decision shown for a started game must be the
// frozen one that gets graded, never a cached earlier render.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "NHL Predictions Today",
  description:
    "Today's NHL win probabilities, expected goals, fair prices against the partner sportsbooks, and model picks, with live scores.",
};

async function fetchLiveScores(date: string): Promise<Map<string, NhlLiveGame>> {
  try {
    const res = await fetch(`${NHL_SCORE_URL}/${date}`, {
      next: { revalidate: 30 },
      headers: { "User-Agent": "Mozilla/5.0 (momentumweb; renenunez.dev)" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return new Map();
    return new Map(parseScoreFeed(await res.json()).map((g) => [g.id, g]));
  } catch {
    return new Map();
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  // Development only: /nhl/games?date=YYYY-MM-DD renders another slate so
  // the table can be checked when nothing is being played.
  const requested = (await searchParams).date;
  const today =
    process.env.NODE_ENV !== "production" && /^\d{4}-\d{2}-\d{2}$/.test(requested ?? "")
      ? (requested as string)
      : siteDate();
  const range = zonedDayRange(today, SITE_TIME_ZONE);
  const [{ games, unavailable }, decisionsRes, teams, live] = await Promise.all([
    fetchProjections(range.from, range.to),
    fetchNhlDecisions(range.from, range.to),
    fetchTeams(),
    fetchLiveScores(today),
  ]);
  const snapshots = await fetchLatestSnapshots(games.map((g) => g.game_id));
  const displayDate = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: SITE_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (games.length === 0) {
    return (
      <main id="main" className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">Today&apos;s NHL Predictions</h1>
        <p className="mt-1 text-sm text-muted-foreground">{displayDate}</p>
        <Notice className="mt-6">
          {unavailable
            ? "Predictions are temporarily unavailable."
            : "No NHL games today. Projections for the next week are on the schedule page."}
        </Notice>
      </main>
    );
  }

  const matchups: NhlMatchup[] = games.map((projection) => {
    const rows = snapshots.get(projection.game_id);
    const withTotal = rows?.find((r) => r.total_line != null);
    const decisions = decisionsRes.decisions.filter(
      (d) => d.game_id === projection.game_id,
    );
    return {
      projection,
      home: teams.get(projection.home_team_abbr),
      away: teams.get(projection.away_team_abbr),
      homeBook: bestMoneyline(rows, "home"),
      awayBook: bestMoneyline(rows, "away"),
      bookTotal: withTotal
        ? {
            line: withTotal.total_line as number,
            over: withTotal.over_price,
            under: withTotal.under_price,
            provider: withTotal.provider_key,
          }
        : null,
      moneyline: decisions.find((d) => d.market === "h2h") ?? null,
      total: decisions.find((d) => d.market === "totals") ?? null,
      live: live.get(projection.game_id) ?? null,
    };
  });
  const hasPlay = (m: NhlMatchup) =>
    m.moneyline?.status === "recommended" || m.total?.status === "recommended";
  matchups.sort((a, b) => {
    const playDiff = Number(hasPlay(b)) - Number(hasPlay(a));
    if (playDiff !== 0) return playDiff;
    return a.projection.start_date.localeCompare(b.projection.start_date);
  });
  const lastUpdated = decisionsRes.decisions.reduce<string | null>(
    (latest, row) => (!latest || row.decision_at > latest ? row.decision_at : latest),
    games[0]?.as_of ?? null,
  );

  return (
    <main id="main" className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Today&apos;s NHL Predictions</h1>
          <p className="mt-1 text-sm text-muted-foreground">{displayDate}</p>
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Predictions ~7 AM PT • Scores live"
        />
      </div>
      <p className="mb-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">
        Expected goals and win probabilities from the Poisson model, the fair
        price and the minimum acceptable price beneath it, the better partner
        sportsbook price, and the edge over that price&apos;s implied
        probability. A moneyline play needs 13 points of edge; a total play
        needs a full goal between the model total and the posted line.
        Decisions are frozen when first published.
      </p>
      {decisionsRes.decisions.length === 0 && (
        <Notice className="mb-4">
          Decisions for today have not been published yet; prices and plays
          appear after the morning run.
        </Notice>
      )}
      <NhlGamesLive initial={matchups} date={today} />
    </main>
  );
}
