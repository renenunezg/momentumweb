"use client";

import type { ReactNode } from "react";
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
  tag?: (row: T) => ReactNode;
  limited: LimitedDataRule;
  searchRows?: T[];
  searchScope?: string;
}) {
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
      <div className="overflow-x-auto">
        <Table>
          <TableCaption className="sr-only">
            {query.trim() && searchRows ? "Team search power ratings" : caption}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-right">Rk</TableHead>
              <TableHead>Team</TableHead>
              {group && (
                <TableHead className="hidden sm:table-cell">{group.label}</TableHead>
              )}
              {overallRank && (
                <TableHead className="hidden text-right sm:table-cell">
                  {overallRank.label}
                </TableHead>
              )}
              <TableHead className="text-right">Rating</TableHead>
              <TableHead className="text-right">Off</TableHead>
              <TableHead className="text-right">Def</TableHead>
              {showSd && (
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
                <TableCell>
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
                  {formatNumber(row.power_rating)}
                </TableCell>
                <TableCell className={numCell}>{formatNumber(row.offense_points)}</TableCell>
                <TableCell className={numCell}>{formatNumber(row.defense_points)}</TableCell>
                {showSd && (
                  <TableCell className={`hidden ${numCell} text-muted-foreground sm:table-cell`}>
                    {formatNumber(row.power_rating_sd)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
