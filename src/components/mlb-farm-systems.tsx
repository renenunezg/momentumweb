"use client";

import type { FarmSystemRow } from "@/lib/mlb-prospects";
import { FARM_BEST_TIP, FARM_GRADE_50_TIP, FARM_REGULARS_TIP, FARM_TOP30_TIP, FARM_TOTAL_TIP } from "@/lib/prospect-values";
import { formatMillions } from "@/lib/player-values";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { EMPTY, formatNumber } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import { surname } from "@/components/position-leader-tabs";
import { TeamLogo } from "@/components/team-logo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function ValueBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className="hidden h-1.5 w-20 overflow-hidden rounded-[1px] bg-grid align-middle sm:inline-block">
      <span className="block h-full bg-primary" style={{ width: `${width}%` }} />
    </span>
  );
}

// Farm systems ranked by their top 30; choosing one opens its prospect list.
export default function MlbFarmSystems({ rows, onSelectOrg }: { rows: FarmSystemRow[]; onSelectOrg: (org: string) => void }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No farm systems have been ranked yet.</p>;
  const max = Math.max(...rows.map((row) => row.top30_value_musd ?? 0));
  return (
    <Table>
      <TableHeader>
        <TableRow className="type-eyebrow [&>th]:text-muted-foreground">
          <TableHead className="w-8">#</TableHead>
          <TableHead>Org</TableHead>
          <TableHead aria-sort="descending">
            Top 30 <InfoTip text={FARM_TOP30_TIP} label="What is Top 30?" className="ml-1" />
          </TableHead>
          <TableHead className="whitespace-normal leading-tight">
            Best prospect <InfoTip text={FARM_BEST_TIP} label="What is Best prospect?" className="ml-1" />
          </TableHead>
          <TableHead className="text-right">
            <span className="normal-case">xR</span> <InfoTip text={FARM_REGULARS_TIP} label="What is xR?" className="ml-1" />
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            50+ <InfoTip text={FARM_GRADE_50_TIP} label="What is 50+?" className="ml-1" />
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            All prospects <InfoTip text={FARM_TOTAL_TIP} label="What is All prospects?" className="ml-1" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const org = row.org ?? "";
          return (
            <TableRow key={org} onClick={() => onSelectOrg(org)} className="cursor-pointer">
              <TableCell className="font-mono text-xs text-muted-foreground">{row.farm_rank ?? EMPTY}</TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOrg(org);
                  }}
                  aria-label={`See ${org} prospects`}
                  className="inline-flex min-h-10 items-center gap-2 font-mono text-sm font-bold focus-visible:outline-2 focus-visible:outline-ring md:min-h-0"
                >
                  <TeamLogo team={mlbTeamIdentity(org)} name={org} className="h-6 w-6" />
                  {org}
                </button>
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono tabular-nums">
                <span className="inline-flex items-center gap-2">
                  <span className="font-bold text-positive">{formatMillions(row.top30_value_musd, 0)}</span>
                  <ValueBar value={row.top30_value_musd ?? 0} max={max} />
                </span>
              </TableCell>
              <TableCell className="w-full max-w-0 sm:w-auto sm:max-w-56">
                {row.best_player_name ? (
                  // A phone takes the surname over a second line; wider screens keep the full name on one.
                  <span className="block truncate">
                    <span className="sm:hidden">{surname(row.best_player_name)}</span>
                    <span className="max-sm:hidden">{row.best_player_name}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground sm:ml-2 sm:inline">
                      {[
                        row.best_position_group,
                        row.best_peak_grade == null ? null : formatNumber(row.best_peak_grade, 0),
                        formatMillions(row.best_value_musd),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                ) : (
                  EMPTY
                )}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {row.top30_expected_regulars == null ? EMPTY : formatNumber(row.top30_expected_regulars, 1)}
              </TableCell>
              <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">{row.grade_50_plus ?? EMPTY}</TableCell>
              <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground md:table-cell">
                {formatMillions(row.total_value_musd, 0)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
