"use client";

import { formatSiteTimestamp } from "@/lib/site-time";

import { useMemo, useState, type ReactNode } from "react";
import { ratingHeatmap, sharedExtent } from "@/lib/rating-heatmap";
import { RatingsHeatmapLegend } from "@/components/ratings-heatmap-legend";
import { HeatValue } from "@/components/heat-value";
import { SignedBar } from "@/components/signed-bar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RatingsSearch, useRatingsSearch } from "@/components/ratings-search";
import { formatNumber } from "@/lib/utils";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface PowerRatingRow {
  team: string;
  power_rating: number;
  offense_points: number | null;
  defense_points: number | null;
  power_rating_sd: number | null;
  missing_input_count: number | null;
}

// Change in model rating against an earlier published snapshot.
export interface RatingChange<T> {
  label: string;
  short: string;
  value: (row: T) => number | null | undefined;
}

export interface MarketStrength {
  rating: number | null | undefined;
  sd: number | null | undefined;
  games: number | null | undefined;
  asOf: string | null;
}

// How a sport flags a team whose rating inputs are incomplete. CFB counts
// several missing inputs before a rating is degraded; the NFL preseason
// rating leans on so few that one missing input already is.
export interface LimitedDataRule {
  isLimited: (row: PowerRatingRow) => boolean;
  rowNote: string;
  allNote: string;
}

export function LimitedDataBadge({ note }: { note: string }) {
  return (
    <span
      className="type-eyebrow ml-2 text-accent-amber"
      title={note}
    >
      Limited data<span className="sr-only">: {note}</span>
    </span>
  );
}

// One table for every power-rating view across sports. Rows arrive sorted by
// power rating, so the index is the rank within the slice shown.
export function PowerRatingsTable<T extends PowerRatingRow>({
  rows,
  heatmapRows,
  rowKey,
  logo,
  caption,
  group,
  overallRank,
  showSd = false,
  market,
  tag,
  limited,
  searchRows,
  searchScope,
  change,
}: {
  rows: T[];
  heatmapRows: T[];
  rowKey: (row: T) => string | number;
  logo: (row: T) => TeamLogoSource | undefined;
  caption: string;
  group?: { label: string; value: (row: T) => string | null };
  overallRank?: { label: string; value: (row: T) => number | undefined };
  showSd?: boolean;
  market?: (row: T) => MarketStrength;
  tag?: (row: T) => ReactNode;
  limited: LimitedDataRule;
  searchRows?: T[];
  searchScope?: string;
  change?: RatingChange<T>;
}) {
  const [detail, setDetail] = useState<T | null>(null);
  const { query, setQuery, matches, total } = useRatingsSearch(rows, searchRows);
  const gapOf = (row: T) => {
    const strength = market?.(row).rating;
    return strength == null ? null : row.power_rating - strength;
  };
  const scales = useMemo(() => {
    const model = heatmapRows.map((r) => r.power_rating);
    const marketValues = heatmapRows.map((r) => market?.(r).rating);
    // Model, market, offense and defense are all points on a neutral field, so
    // they share one scale: a 13-point offense reads lighter than a 28-point team.
    const extent = sharedExtent([model, marketValues], 0.85);
    const heat = (values: (number | null | undefined)[]) => ratingHeatmap(values, { center: 0, extent });
    return {
      model: heat(model),
      market: heat(marketValues),
      offense: heat(heatmapRows.map((r) => r.offense_points)),
      defense: heat(heatmapRows.map((r) => r.defense_points)),
      change: change ? sharedExtent([heatmapRows.map(change.value)], 0.95) : 0,
      gap: market
        ? sharedExtent([heatmapRows.map((r) => {
            const strength = market(r).rating;
            return strength == null ? null : r.power_rating - strength;
          })], 0.95)
        : 0,
    };
  }, [heatmapRows, market, change]);
  // A badge on every row singles out nobody: whole tiers (all of FCS today)
  // run on reduced inputs, so say it once above the table instead.
  const allLimited = rows.length > 0 && rows.every(limited.isLimited);
  const value = "text-center";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <RatingsSearch
          query={query}
          onChange={setQuery}
          shown={matches.length}
          total={total}
          scope={searchScope}
        />
        <RatingsHeatmapLegend centered />
      </div>
      {allLimited && <p className="type-meta text-accent-amber">{limited.allNote}</p>}
      <p className="type-meta text-muted-foreground sm:hidden">Swipe the table for every column; the team stays in view.</p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table className="type-label">
          <TableCaption className="sr-only">
            {query.trim() && searchRows ? "Team search power ratings" : caption}
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card pl-3 max-sm:border-r max-sm:border-border">
                <span className="inline-block w-6 text-right">Rk</span>
                <span className="ml-2 sm:ml-3">Team</span>
              </TableHead>
              {overallRank && (
                <TableHead className="hidden text-right sm:table-cell">
                  {overallRank.label}
                </TableHead>
              )}
              <TableHead className={value}>{market ? "Model" : "Rating"}</TableHead>
              {market && <TableHead className={value}>Market</TableHead>}
              <TableHead className={value}>Offense</TableHead>
              <TableHead className={value}>Defense</TableHead>
              {showSd && !market && (
                <TableHead className="hidden text-right sm:table-cell">SD</TableHead>
              )}
              {change && (
                <TableHead className="text-right">
                  <abbr title={change.label} className="no-underline">{change.short}</abbr>
                </TableHead>
              )}
              {market && (
                <TableHead className="pr-3 text-right">
                  <abbr title="Model rating minus market-implied strength, in points. A disagreement, not a game edge." className="no-underline">
                    Model − market
                  </abbr>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map(({ row, rank }) => (
              <TableRow key={rowKey(row)} className="group/row border-t border-border first:border-t-0">
                <TableCell className="sticky left-0 z-10 bg-card py-2 pl-3 whitespace-normal max-sm:border-r max-sm:border-border">
                  <span className="flex min-w-[9.5rem] items-center gap-2 sm:gap-3">
                    <span className="w-6 shrink-0 text-right type-meta tabular-nums text-muted-foreground">{rank}</span>
                    <TeamLogo team={logo(row)} name={row.team} className="h-6 w-6" />
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">
                        {row.team}
                        {tag?.(row)}
                        {!allLimited && limited.isLimited(row) && (
                          <LimitedDataBadge note={limited.rowNote} />
                        )}
                      </span>
                      {group && (
                        <span className="block type-meta text-muted-foreground">{group.value(row) ?? "–"}</span>
                      )}
                    </span>
                  </span>
                </TableCell>
                {overallRank && (
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {overallRank.value(row)}
                  </TableCell>
                )}
                <TableCell className={value}>
                  <HeatValue style={scales.model(row.power_rating)} className="font-semibold">
                    {market ? (
                      <RatingButton team={row.team} label="Model" value={row.power_rating} onClick={() => setDetail(row)} />
                    ) : formatNumber(row.power_rating)}
                  </HeatValue>
                </TableCell>
                {market && (
                  <TableCell className={value}>
                    <HeatValue style={scales.market(market(row).rating)}>
                      <RatingButton team={row.team} label="Market" value={market(row).rating} onClick={() => setDetail(row)} />
                    </HeatValue>
                  </TableCell>
                )}
                <TableCell className={value}>
                  <HeatValue style={scales.offense(row.offense_points)}>{formatNumber(row.offense_points)}</HeatValue>
                </TableCell>
                <TableCell className={value}>
                  <HeatValue style={scales.defense(row.defense_points)}>{formatNumber(row.defense_points)}</HeatValue>
                </TableCell>
                {showSd && !market && (
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatNumber(row.power_rating_sd)}
                  </TableCell>
                )}
                {change && (
                  <TableCell className="text-right">
                    <SignedBar value={change.value(row)} extent={scales.change} tone="semantic" />
                  </TableCell>
                )}
                {market && (
                  <TableCell className="pr-3 text-right">
                    <SignedBar value={gapOf(row)} extent={scales.gap} tone="neutral" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {market && (
        <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
          {detail && <RatingDetails row={detail} market={market(detail)} />}
        </Dialog>
      )}
    </div>
  );
}

function RatingButton({ team, label, value, onClick }: {
  team: string;
  label: string;
  value: number | null | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${team}: ${label} ${formatNumber(value)}. Rating details`}
      aria-haspopup="dialog"
      onClick={onClick}
      className="cursor-pointer rounded-sm underline decoration-dotted decoration-current/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring"
    >
      {formatNumber(value)}
    </button>
  );
}

function RatingDetails({ row, market }: { row: PowerRatingRow; market: MarketStrength }) {
  return (
    <DialogContent>
      <DialogTitle className="type-section pr-8">{row.team}</DialogTitle>
      <DialogDescription className="mt-1 text-sm text-muted-foreground">
        Points above an average FBS team on a neutral field.
      </DialogDescription>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <h3 className="type-eyebrow text-muted-foreground">Model</h3>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">{formatNumber(row.power_rating)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Rating SD {formatNumber(row.power_rating_sd)}</p>
        </div>
        <div>
          <h3 className="type-eyebrow text-muted-foreground">Market</h3>
          <p className="mt-1 font-mono text-3xl tabular-nums">{formatNumber(market.rating)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Rating SD {formatNumber(market.sd)}</p>
        </div>
      </div>
      <p className="mt-5 text-sm">
        <span className="font-medium">Model sets the ranking.</span>{" "}
        Offense {formatNumber(row.offense_points)} · Defense {formatNumber(row.defense_points)}.
      </p>
      <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
        {market.rating == null ? (
          <p>No market strength published for this team in this forecast.</p>
        ) : (
          <>
            <p>
              <span className="font-medium text-foreground">Market-implied strength</span>{" "}
              fits earlier games&apos; median closing spreads, adjusting for opponents and home field.
              Recent games count more, with prior-season market strength carried forward.
            </p>
            <p>
              {market.games === 0
                ? "No current-season lines for this team; this estimate relies on its prior."
                : `${market.games ?? "Unknown"} earlier games with closing lines this season.`}{" "}
              Season win totals and moneylines are not included.
            </p>
            {market.asOf && <p className="text-xs">Forecast as of {formatSiteTimestamp(market.asOf)}.</p>}
          </>
        )}
        <p className="text-xs">
          SD measures uncertainty in team strength, not the range of a game&apos;s score.
          Market SD is conditional on the fitted model and its prior assumptions.
        </p>
      </div>
    </DialogContent>
  );
}
