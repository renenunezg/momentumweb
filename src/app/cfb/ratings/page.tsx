import Link from "next/link";
import { fetchLatestRatings } from "@/lib/cfb";
import { cn } from "@/lib/utils";
import { LastUpdated } from "@/components/last-updated";
import CfbConferenceRatings from "@/components/cfb-conference-ratings";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export const revalidate = 300;

function fmt(value: number | null, decimals = 1): string {
  if (value == null) return "–";
  return value.toFixed(decimals);
}

export default async function RatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; conf?: string }>;
}) {
  const params = await searchParams;
  const view = (["fbs", "fcs", "conference"] as const).find(
    (v) => v === params.class
  );
  const byConference = view === "conference";

  const { ratings, season, week } = await fetchLatestRatings();

  if (ratings.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">Power Ratings</h1>
        <p className="mt-4 text-muted-foreground">
          No ratings published yet. Run the publish pipeline to load them.
        </p>
      </main>
    );
  }

  // Top 25 ranks across all of D1; today that is every FBS team, but an FCS
  // team good enough to crack it should show up rather than be filtered out.
  const visible =
    view === "fbs" || view === "fcs"
      ? ratings.filter((r) => r.classification === view)
      : ratings.slice(0, 25);
  // Whole tiers (all of FCS today) run on reduced inputs, and a badge on every
  // row says nothing; call it out once instead and keep the per-row badge for
  // tables where it actually singles a team out.
  const allLimited = visible.every((r) => (r.missing_input_count ?? 0) >= 4);
  const lastUpdated = ratings[0]?.as_of ?? null;
  const weekLabel =
    season != null && week != null ? `${season} · Week ${week}` : "";

  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">
            Power Ratings
          </h1>
          {weekLabel && (
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {weekLabel}
            </p>
          )}
        </div>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates when a new forecast is published"
        />
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
        A team&apos;s power rating is its expected scoring margin against an
        average opponent on a neutral field, split into offense and defense
        points per game. Ratings are model output, not a poll.
      </p>

      <div className="flex items-center gap-0 font-mono text-xs uppercase tracking-wider">
        {[
          { href: "/cfb/ratings", label: "Top 25", active: view == null },
          { href: "/cfb/ratings?class=fbs", label: "FBS", active: view === "fbs" },
          { href: "/cfb/ratings?class=fcs", label: "FCS", active: view === "fcs" },
          {
            href: "/cfb/ratings?class=conference",
            label: "Conference",
            active: byConference,
          },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 transition-colors",
              tab.active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {byConference ? (
        <CfbConferenceRatings ratings={ratings} initialConference={params.conf} />
      ) : (
      <div className="space-y-2">
      {allLimited && (
        <p className="text-xs text-accent-amber">
          Several rating inputs are unavailable for every team here; treat these
          ratings as degraded.
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-right">Rk</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="hidden sm:table-cell">Conference</TableHead>
              <TableHead className="text-right">Rating</TableHead>
              <TableHead className="text-right">Off</TableHead>
              <TableHead className="text-right">Def</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                SD
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r, index) => {
              const limitedInputs = (r.missing_input_count ?? 0) >= 4;
              return (
                <TableRow key={r.team_id}>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{r.team}</span>
                    {view == null && r.classification !== "fbs" && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {r.classification ?? "?"}
                      </span>
                    )}
                    {limitedInputs && !allLimited && (
                      <span
                        className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
                        title="Several rating inputs are unavailable for this team; treat the rating as degraded."
                      >
                        Limited data
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {r.conference ?? "–"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {fmt(r.power_rating)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmt(r.offense_points)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmt(r.defense_points)}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                    {fmt(r.power_rating_sd)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      </div>
      )}

      <p className="text-xs text-muted-foreground">
        Off and Def are points per game above an average opponent; Rating is
        their sum. SD is the model&apos;s uncertainty about the rating.
      </p>
    </main>
  );
}
