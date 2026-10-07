"use client";

import { useState, type ReactNode } from "react";
import { ComparisonGaps } from "@/components/comparison-gaps";
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
      className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
      title={note}
    >
      Limited data<span className="sr-only">: {note}</span>
    </span>
  );
}

const numCell = "text-right font-mono tabular-nums";

// One table for every power-rating view across sports. Rows arrive sorted by
// power rating, so the index is the rank within the slice shown.
export function PowerRatingsTable<T extends PowerRatingRow>({
  rows,
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
}: {
  rows: T[];
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
}) {
  const [detail, setDetail] = useState<T | null>(null);
  const { query, setQuery, matches, total } = useRatingsSearch(rows, searchRows);
  // A badge on every row singles out nobody: whole tiers (all of FCS today)
  // run on reduced inputs, so say it once above the table instead.
  const allLimited = rows.length > 0 && rows.every(limited.isLimited);

  return (
    <div className="space-y-2">
      <RatingsSearch
        query={query}
        onChange={setQuery}
        shown={matches.length}
        total={total}
        scope={searchScope}
      />
      {allLimited && <p className="text-xs text-accent-amber">{limited.allNote}</p>}
      {market && (
        <ComparisonGaps
          title="Where model and market disagree"
          description="Model rating minus market-implied strength from earlier closing spreads, in points on a neutral field. Follows the selected group and team search; this is a strength comparison, not a current game edge."
          negativeLabel="Market rates higher"
          positiveLabel="Model rates higher"
          unit="points"
          rows={matches.map(({ row }) => {
            const strength = market(row).rating;
            return {
              id: rowKey(row),
              label: row.team,
              detail: `Model ${formatNumber(row.power_rating)} · Market ${formatNumber(strength)}`,
              difference: strength == null ? null : row.power_rating - strength,
            };
          })}
        />
      )}
      <div className="overflow-x-auto">
        <Table density={market ? "compact" : "default"}>
          <TableCaption className="sr-only">
            {query.trim() && searchRows ? "Team search power ratings" : caption}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className={market ? "w-8 text-right sm:w-12" : "w-12 text-right"}>Rk</TableHead>
              <TableHead>Team</TableHead>
              {group && (
                <TableHead className="hidden sm:table-cell">{group.label}</TableHead>
              )}
              {overallRank && (
                <TableHead className="hidden text-right sm:table-cell">
                  {overallRank.label}
                </TableHead>
              )}
              <TableHead className="text-right">{market ? "Model" : "Rating"}</TableHead>
              {market && <TableHead className="text-right">Market</TableHead>}
              <TableHead className="text-right">Off</TableHead>
              <TableHead className="text-right">Def</TableHead>
              {showSd && !market && (
                <TableHead className="hidden text-right sm:table-cell">SD</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map(({ row, rank }) => (
              <TableRow key={rowKey(row)}>
                <TableCell className={`${numCell} text-muted-foreground`}>
                  {rank}
                </TableCell>
                <TableCell className={market ? "whitespace-normal sm:whitespace-nowrap" : undefined}>
                  <span className="inline-flex items-center gap-2 align-middle">
                    <TeamLogo team={logo(row)} name={row.team} />
                    <span className="font-medium">{row.team}</span>
                  </span>
                  {tag?.(row)}
                  {!allLimited && limited.isLimited(row) && (
                    <LimitedDataBadge note={limited.rowNote} />
                  )}
                </TableCell>
                {group && (
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {group.value(row) ?? "–"}
                  </TableCell>
                )}
                {overallRank && (
                  <TableCell className={`hidden ${numCell} text-muted-foreground sm:table-cell`}>
                    {overallRank.value(row)}
                  </TableCell>
                )}
                <TableCell className={`${numCell} font-semibold`}>
                  {market ? (
                    <RatingButton team={row.team} label="Model" value={row.power_rating} onClick={() => setDetail(row)} />
                  ) : formatNumber(row.power_rating)}
                </TableCell>
                {market && (
                  <TableCell className={`${numCell} text-muted-foreground`}>
                    <RatingButton team={row.team} label="Market" value={market(row).rating} onClick={() => setDetail(row)} />
                  </TableCell>
                )}
                <TableCell className={numCell}>{formatNumber(row.offense_points)}</TableCell>
                <TableCell className={numCell}>{formatNumber(row.defense_points)}</TableCell>
                {showSd && !market && (
                  <TableCell className={`hidden ${numCell} text-muted-foreground sm:table-cell`}>
                    {formatNumber(row.power_rating_sd)}
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
      className="-my-1.5 min-h-9 min-w-11 cursor-pointer rounded-sm underline decoration-dotted decoration-muted-foreground/40 underline-offset-4 hover:text-foreground hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      {formatNumber(value)}
    </button>
  );
}

function RatingDetails({ row, market }: { row: PowerRatingRow; market: MarketStrength }) {
  return (
    <DialogContent>
      <DialogTitle className="pr-8 font-heading text-xl">{row.team}</DialogTitle>
      <DialogDescription className="mt-1 text-sm text-muted-foreground">
        Points above an average FBS team on a neutral field.
      </DialogDescription>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Model</h3>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">{formatNumber(row.power_rating)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Rating SD {formatNumber(row.power_rating_sd)}</p>
        </div>
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Market</h3>
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
            {market.asOf && <p className="text-xs">Forecast as of {new Date(market.asOf).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC.</p>}
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
