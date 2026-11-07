"use client";

import { formatSiteTimestamp } from "@/lib/site-time";

import { useMemo, useState, type ReactNode } from "react";
import { ratingHeatmap, sharedExtent } from "@/lib/rating-heatmap";
import { RatingsHeatmapLegend } from "@/components/ratings-heatmap-legend";
import { EVEN_COLUMN_HEAD, HeatValue, evenColumns } from "@/components/heat-value";
import { HeaderTip } from "@/components/info-tip";
import { SignedBar } from "@/components/signed-bar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RatingsSearch, useRatingsSearch } from "@/components/ratings-search";
import { cn, formatNumber } from "@/lib/utils";
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

// A signed points gap against the market, in the table's last column.
export interface RatingGap<T> {
  label: string;
  title: string;
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

export function LimitedDataBadge({ note, className }: { note: string; className?: string }) {
  return (
    <span
      className={cn("type-eyebrow ml-2 text-accent-amber", className)}
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
  shortName,
  ratingTip,
  caption,
  group,
  overallRank,
  market,
  gap,
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
  shortName?: (row: T) => string;
  // What the rating column means in this sport, shown when its header is tapped.
  ratingTip: string;
  caption: string;
  group?: { label: string; value: (row: T) => string | null };
  overallRank?: { label: string; value: (row: T) => number | undefined };
  market?: (row: T) => MarketStrength;
  gap?: RatingGap<T>;
  tag?: (row: T) => ReactNode;
  limited: LimitedDataRule;
  searchRows?: T[];
  searchScope?: string;
  change?: RatingChange<T>;
}) {
  const [detail, setDetail] = useState<T | null>(null);
  const { query, setQuery, matches, total } = useRatingsSearch(rows, searchRows);
  const gapColumn = useMemo<RatingGap<T> | undefined>(
    () => gap ?? (market && {
      label: "Model − market",
      title: "Model rating minus market-implied strength, in points. A disagreement, not a game edge.",
      value: (row) => {
        const strength = market(row).rating;
        return strength == null ? null : row.power_rating - strength;
      },
    }),
    [gap, market],
  );
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
      gap: gapColumn ? sharedExtent([heatmapRows.map(gapColumn.value)], 0.95) : 0,
    };
  }, [heatmapRows, market, gapColumn, change]);
  // A badge on every row singles out nobody: whole tiers (all of FCS today)
  // run on reduced inputs, so say it once above the table instead.
  const allLimited = rows.length > 0 && rows.every(limited.isLimited);
  const value = cn("text-center", EVEN_COLUMN_HEAD);
  const dataColumns = 3 + (market ? 1 : 0) + (change ? 1 : 0) + (gapColumn ? 1 : 0);

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
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Phones: the data columns split the width evenly. Abbreviated team names
            leave the team column only what it needs; full school names keep about
            38%, enough for most to stay on one line on a large phone. */}
        <Table
          density="compact"
          className="type-label max-sm:[--table-cell-x:0.125rem] max-sm:[&_td]:text-xs"
          style={evenColumns(dataColumns, shortName ? 100 : 62)}
        >
          <TableCaption className="sr-only">
            {query.trim() && searchRows ? "Team search power ratings" : caption}
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 bg-card pl-2 sm:pl-3">
                <span className="inline-block w-5 text-right sm:w-6">Rk</span>
                <span className="ml-1.5 sm:ml-3">Team</span>
              </TableHead>
              {overallRank && (
                <TableHead className="hidden text-right sm:table-cell">
                  {overallRank.label}
                </TableHead>
              )}
              <TableHead className={value}>
                {market ? (
                  <HeaderTip full="Model" short="Mdl" tip={`${ratingTip} Tap a rating for its uncertainty and source.`} />
                ) : (
                  <HeaderTip full="Rating" short="Rtg" tip={ratingTip} />
                )}
              </TableHead>
              {market && (
                <TableHead className={value}>
                  <HeaderTip full="Market" short="Mkt" tip={MARKET_TIP} />
                </TableHead>
              )}
              <TableHead className={value}><HeaderTip full="Offense" short="Off" tip={OFFENSE_TIP} /></TableHead>
              <TableHead className={value}><HeaderTip full="Defense" short="Def" tip={DEFENSE_TIP} /></TableHead>
              {change && (
                <TableHead className={cn("text-right", EVEN_COLUMN_HEAD)}>
                  <HeaderTip full={change.short} short="Chg" tip={`${change.label}.`} />
                </TableHead>
              )}
              {gapColumn && (
                <TableHead className={cn("pr-2 text-right sm:pr-3", EVEN_COLUMN_HEAD)}>
                  <HeaderTip full={gapColumn.label} short="Gap" tip={gapColumn.title} />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map(({ row, rank }) => (
              <TableRow key={rowKey(row)} className="group/row border-t border-border first:border-t-0">
                <TableCell className="sticky left-0 z-10 bg-card py-2 pl-2 whitespace-normal sm:pl-3">
                  <span className="flex items-center gap-1.5 sm:min-w-[9.5rem] sm:gap-3">
                    <span className="w-6 shrink-0 text-right type-meta tabular-nums text-muted-foreground max-sm:w-5">{rank}</span>
                    <TeamLogo team={logo(row)} name={row.team} className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight max-sm:hyphens-auto">
                        {shortName ? (
                          <>
                            <span className="sm:hidden">{shortName(row)}</span>
                            <span className="max-sm:hidden">{row.team}</span>
                          </>
                        ) : row.team}
                        {tag?.(row)}
                        {!allLimited && limited.isLimited(row) && (
                          <LimitedDataBadge
                            note={limited.rowNote}
                            // Uppercase "LIMITED" alone would hold the phone column open.
                            className="max-sm:ml-0 max-sm:block max-sm:text-[0.625rem] max-sm:tracking-normal max-sm:normal-case"
                          />
                        )}
                      </span>
                      {group && (
                        <span className="block type-meta text-muted-foreground max-sm:hidden">{group.value(row) ?? "–"}</span>
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
                  <HeatValue compact style={scales.model(row.power_rating)} className="font-semibold">
                    {market ? (
                      <RatingButton team={row.team} label="Model" value={row.power_rating} onClick={() => setDetail(row)} />
                    ) : formatNumber(row.power_rating)}
                  </HeatValue>
                </TableCell>
                {market && (
                  <TableCell className={value}>
                    <HeatValue compact style={scales.market(market(row).rating)}>
                      <RatingButton team={row.team} label="Market" value={market(row).rating} onClick={() => setDetail(row)} />
                    </HeatValue>
                  </TableCell>
                )}
                <TableCell className={value}>
                  <HeatValue compact style={scales.offense(row.offense_points)}>{formatNumber(row.offense_points)}</HeatValue>
                </TableCell>
                <TableCell className={value}>
                  <HeatValue compact style={scales.defense(row.defense_points)}>{formatNumber(row.defense_points)}</HeatValue>
                </TableCell>
                {change && (
                  <TableCell className="text-right">
                    <SignedBar value={change.value(row)} extent={scales.change} tone="semantic" compact />
                  </TableCell>
                )}
                {gapColumn && (
                  <TableCell className="pr-2 text-right sm:pr-3">
                    <SignedBar value={gapColumn.value(row)} extent={scales.gap} tone="neutral" compact />
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

const MARKET_TIP =
  "Market-implied strength, fitted to earlier closing spreads with a prior-season market baseline. Season win totals are not included. Tap a rating for its uncertainty and source.";
const OFFENSE_TIP =
  "The offense's part of the rating, in points per game above average. Off plus Def is the rating.";
const DEFENSE_TIP =
  "The defense's part of the rating, in points per game above average; higher is better. Off plus Def is the rating.";


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
