import "server-only";
import Link from "next/link";
import { PageSection } from "@/components/page-layout";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayerHeadshot } from "@/components/player-headshot";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { fetchPlayoffForecast } from "@/lib/mlb-playoffs.server";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { supabaseCfb } from "@/lib/supabase";
import { SITE_TIME_ZONE } from "@/lib/daily-picks";
import { formatPct } from "@/lib/utils";

type FeatureRow = {
  id: string;
  name: string;
  detail: string;
  share: number;
  headshot?: string;
  team?: TeamLogoSource;
};

type Feature = {
  title: string;
  sport: string;
  href: string;
  linkLabel: string;
  metric: string;
  period?: string;
  note?: string;
  rows: FeatureRow[];
};

async function heismanFeature(): Promise<Feature> {
  const feature: Feature = {
    title: "Heisman watch",
    sport: "CFB / Awards",
    href: "/cfb/heisman",
    linkLabel: "Full Heisman tracker",
    metric: "Predicted vote share",
    note: "Ballot model forecast",
    rows: [],
  };
  try {
    const { data, error } = await supabaseCfb
      .from("heisman_board")
      .select("season, week, athlete_id, athlete_name, team, position, predicted_share")
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .order("predicted_rank", { ascending: true })
      .limit(10);
    const latest = data?.[0];
    if (error || !latest) return feature;
    feature.period = `${latest.season} · Through week ${latest.week}`;
    // A short board must never borrow candidates from an older snapshot.
    feature.rows = data
      .filter((row) => row.season === latest.season && row.week === latest.week)
      .map((row) => ({
        id: row.athlete_id,
        name: row.athlete_name,
        detail: [row.team, row.position].filter(Boolean).join(" · "),
        share: row.predicted_share,
        headshot: cfbPlayerHeadshotUrl(row.athlete_id),
      }));
    return feature;
  } catch {
    return feature;
  }
}

async function worldSeriesFeature(): Promise<Feature> {
  const feature: Feature = {
    title: "World Series chances",
    sport: "MLB / Postseason",
    href: "/mlb/playoffs",
    linkLabel: "Explore the bracket",
    metric: "Model title probability",
    rows: [],
  };
  const forecast = await fetchPlayoffForecast();
  if (!forecast) return feature;
  const updated = new Date(forecast.generated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: SITE_TIME_ZONE,
  });
  feature.period = `${forecast.season} · Updated ${updated}`;
  feature.note = Date.now() - Date.parse(forecast.generated_at) > 86400000
    ? "Snapshot is more than a day old."
    : "Pure model forecast";
  const teams = new Map(forecast.teams.map((team) => [team.code, team]));
  feature.rows = [...forecast.odds]
    .sort((a, b) => b.champion - a.champion)
    .map((row) => {
      const team = teams.get(row.team)!;
      return {
        id: row.team,
        name: team.name,
        detail: `${team.league} · No. ${team.seed} seed`,
        share: row.champion,
        team: mlbTeamIdentity(row.team),
      };
    });
  return feature;
}

// These two editorial slots can change independently of the main home content.
export function fetchHomeFeatures() {
  return Promise.all([heismanFeature(), worldSeriesFeature()]);
}

export function HomeFeature({ feature }: { feature: Feature }) {
  return (
    <PageSection>
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {feature.sport}
        </p>
        <h2 className="mt-heading font-heading text-base">
          <Link href={feature.href} className="underline-offset-4 hover:underline">
            {feature.title}
          </Link>
        </h2>
        {feature.period && (
          <p className="mt-heading text-xs text-muted-foreground">{feature.period}</p>
        )}
      </header>
      <Table density="compact">
        <TableCaption className="sr-only">{feature.title}: {feature.metric}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-0">{feature.metric}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feature.rows.length > 0 ? feature.rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="px-0 text-xs whitespace-normal">
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-heading">
                  {row.headshot ? (
                    <PlayerHeadshot src={row.headshot} name={row.name} className="row-span-2 h-6 w-6" />
                  ) : row.team ? (
                    <TeamLogo team={row.team} name={row.name} className="row-span-2 h-6 w-6" />
                  ) : (
                    <span className="row-span-2 flex h-6 w-6 items-center justify-center text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                  <p>{row.name}</p>
                  <div className="flex items-baseline justify-between gap-heading">
                    <p className="text-muted-foreground">{row.detail}</p>
                    <span className="shrink-0 tabular-nums">{formatPct(row.share)}</span>
                  </div>
                  <div aria-hidden="true" className="col-start-2 mt-1 h-0.5 bg-muted">
                    <div className="h-full bg-positive" style={{ width: `${row.share * 100}%` }} />
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell className="px-0 text-xs whitespace-normal text-muted-foreground">
                Forecast temporarily unavailable.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <footer className="space-y-heading text-xs">
        {feature.note && <p className="text-muted-foreground">{feature.note}</p>}
        <Link href={feature.href} className="flex items-center justify-between gap-heading font-mono uppercase tracking-wider underline-offset-4 hover:underline">
          {feature.linkLabel} <span aria-hidden="true">&rarr;</span>
        </Link>
      </footer>
    </PageSection>
  );
}
