import type { Metadata } from "next";
import Link from "next/link";
import { HowGraded } from "@/components/how-graded";
import { LastUpdated } from "@/components/last-updated";
import { LmbGamesLive } from "@/components/lmb-games-live";
import { Notice } from "@/components/notice";
import { PageDescription, PageHeader, PageMeta, PageShell, PageTitle } from "@/components/page-layout";
import { SlateSummary } from "@/components/summary-stats";
import { SITE_TIME_ZONE, siteDate } from "@/lib/daily-picks";
import {
  LMB_SCHEDULE_SCOPE,
  lmbTeamCode,
  lmbTeamName,
  slateMatchups,
  type LmbScheduleGame,
} from "@/lib/lmb";
import { fetchLmbSlate } from "@/lib/lmb-data";
import { fetchMlbSchedule } from "@/lib/mlb-live-scores";

// Rendered per request: a started game must show the forecast frozen at first
// pitch, which is the one graded, never a cached earlier render.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LMB Forecasts Today",
  description:
    "Today's Liga Mexicana de Béisbol win probabilities and expected runs from a lineup simulation, beside the Kalshi market, with live scores.",
};

// An empty day this close to the next game is an off day, not the off-season.
const OFF_DAY_LIMIT_DAYS = 7;

async function fetchSchedule(date: string): Promise<LmbScheduleGame[] | null> {
  try {
    const schedule = await fetchMlbSchedule(date, AbortSignal.timeout(2000), LMB_SCHEDULE_SCOPE);
    return schedule.ok ? schedule.games : null;
  } catch {
    return null;
  }
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

// The next date with an LMB game within about eight months, null when none is
// scheduled yet, undefined when the Stats API cannot say.
async function fetchNextGameDate(today: string): Promise<string | null | undefined> {
  const url =
    `https://statsapi.mlb.com/api/v1/schedule?${LMB_SCHEDULE_SCOPE}` +
    `&startDate=${addDays(today, 1)}&endDate=${addDays(today, 240)}&fields=dates,date`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { "User-Agent": "mlb-model-dashboard" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { dates?: { date?: string }[] };
    return data.dates?.[0]?.date ?? null;
  } catch {
    return undefined;
  }
}

const longDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const recapLink = "underline underline-offset-4 hover:text-foreground";

function EmptyDay({ today, next }: { today: string; next: string | null | undefined }) {
  const daysAway = next ? (Date.parse(next) - Date.parse(today)) / 86_400_000 : null;
  if (next && daysAway != null && daysAway <= OFF_DAY_LIMIT_DAYS) {
    return <Notice>No LMB games today. The next games are on {longDate(next)}.</Notice>;
  }
  if (next === undefined) return <Notice>No LMB games today.</Notice>;
  return (
    <Notice>
      <p className="type-eyebrow text-primary">Off-season</p>
      <p className="mt-1">
        The LMB season runs from April to September.{" "}
        {next
          ? `Forecasts return with the next game on ${longDate(next)}.`
          : "Forecasts return when the next season's schedule is published."}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Past forecasts are on the <Link href="/lmb/history" className={recapLink}>History</Link> page, and their
        accuracy on the <Link href="/lmb/performance" className={recapLink}>Performance</Link> page.
      </p>
    </Notice>
  );
}

const clock = (iso: string | undefined) =>
  iso
    ? `${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: SITE_TIME_ZONE })} PT`
    : "";

function teamLabel(id: number | undefined, fallback: string | undefined): string {
  const code = lmbTeamCode(id);
  return code ? lmbTeamName(code) : (fallback ?? "TBD");
}

// Scheduled games the model has not forecast, listed so the slate is complete.
function UnforecastGames({ games }: { games: LmbScheduleGame[] }) {
  return (
    <section aria-labelledby="unforecast-heading" className="space-y-2">
      <h2 id="unforecast-heading" className="type-eyebrow text-muted-foreground">
        Scheduled without a forecast
      </h2>
      <ul className="divide-y divide-border border-y border-border text-sm">
        {games.map((game) => {
          const away = game.teams?.away;
          const home = game.teams?.home;
          const state = game.status?.abstractGameState;
          return (
            <li key={game.gamePk} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
              <span>
                {teamLabel(away?.team?.id, away?.team?.name)} <span className="text-muted-foreground">at</span>{" "}
                {teamLabel(home?.team?.id, home?.team?.name)}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {state === "Live" || state === "Final"
                  ? `${away?.score ?? 0}–${home?.score ?? 0} ${game.status?.detailedState ?? ""}`
                  : clock(game.gameDate) || game.status?.detailedState}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  // Development only: /lmb/games?date=YYYY-MM-DD renders another slate so the
  // table can be checked outside the season.
  const requested = (await searchParams).date;
  const today =
    process.env.NODE_ENV !== "production" && /^\d{4}-\d{2}-\d{2}$/.test(requested ?? "")
      ? (requested as string)
      : siteDate();
  const [scheduled, slate] = await Promise.all([fetchSchedule(today), fetchLmbSlate(today)]);
  const schedule = new Map((scheduled ?? []).map((game) => [game.gamePk, game]));
  const matchups = slateMatchups(slate.today, slate.frozen, schedule);
  const forecast = new Set(matchups.map((m) => m.game_pk));
  const unforecast = (scheduled ?? []).filter((game) => !forecast.has(game.gamePk));
  const displayDate = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (matchups.length === 0 && unforecast.length === 0) {
    return (
      <PageShell>
        <PageHeader>
          <div>
            <PageTitle>Today&apos;s LMB Forecasts</PageTitle>
            <PageDescription>{displayDate}</PageDescription>
          </div>
        </PageHeader>
        {scheduled ? (
          <EmptyDay today={today} next={await fetchNextGameDate(today)} />
        ) : (
          <Notice>
            {slate.unavailable ? "Forecasts are temporarily unavailable." : "No LMB forecasts today."}
          </Notice>
        )}
      </PageShell>
    );
  }

  const lastUpdated = [...slate.today, ...slate.frozen].reduce<string | null>(
    (latest, row) => (!latest || row.prediction_updated_at > latest ? row.prediction_updated_at : latest),
    null,
  );

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Today&apos;s LMB Forecasts</PageTitle>
          <PageMeta>
            <PageDescription>{displayDate}</PageDescription>
            {lastUpdated && <LastUpdated timestamp={lastUpdated} schedule="Forecasts until first pitch • Scores live" />}
          </PageMeta>
          <div className="mt-2">
            <HowGraded
              label="How this works"
              lead={<>A Monte Carlo simulation plays each game from its lineups, then meets the Kalshi market.</>}
            >
              <p>
                Win is the published probability: the simulation&apos;s, blended half and half on the log-odds scale
                with the Kalshi midpoint. Sim is the simulation alone, and Kalshi is the midpoint with the price of a
                yes contract (its ask) in cents. xR is expected runs with the 10th to 90th percentile of simulated runs.
              </p>
              <p>
                A pick names at most one team per game, priced at the Kalshi ask plus its fee, and is graded at one
                unit. A forecast can change until first pitch; the one frozen then is the one shown and graded.
              </p>
            </HowGraded>
          </div>
        </div>
      </PageHeader>
      {matchups.length > 0 && (
        <SlateSummary
          stats={[
            { label: "Games", value: matchups.length + unforecast.length },
            { label: "Picks", value: matchups.filter((m) => m.pick != null).length },
          ]}
        />
      )}
      {matchups.length === 0 && (
        <Notice>
          {slate.unavailable
            ? "Forecasts are temporarily unavailable. Scores remain available."
            : "Today's forecasts have not been published yet."}
        </Notice>
      )}
      {matchups.length > 0 && <LmbGamesLive initial={matchups} date={today} />}
      {unforecast.length > 0 && <UnforecastGames games={unforecast} />}
    </PageShell>
  );
}
