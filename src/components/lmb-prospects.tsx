"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { PlayerCell } from "@/components/player-cell";
import { PlayerRowDisclosure, PlayerRowHeader } from "@/components/player-row-disclosure";
import { SeasonStatsPanel } from "@/components/season-stats-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";
import {
  lmbLevelLabel,
  lmbProspectSeasonStats,
  milbLevelName,
  parseProspectDetails,
  statsApiTeamLogo,
  type LmbProspectDetails,
} from "@/lib/lmb";
import type { LmbProspectRow } from "@/lib/lmb-types";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { PROSPECT_PAGE, PROSPECT_ROLES, type ProspectRole } from "@/lib/prospect-values";
import { EMPTY, cn, formatNumber, formatSigned } from "@/lib/utils";

const ROLE_CODE: Record<ProspectRole, LmbProspectRow["role"]> = { hitter: "H", pitcher: "P" };

const DRIVER_LABELS: Record<string, string> = {
  age: "Age & age vs level",
  milb_level: "Highest MiLB level",
  playing_time: "Playing time & leagues",
  woba_rel: "Level-relative batting",
  kbb_rel: "Level-relative K−BB%",
};

const PEERS_TIP = "Percentile among currently ranked LMB prospects in the same role (higher is better).";
const DRIVERS_TIP =
  "Standardized log-odds shift relative to the average current prospect in this role. Positive moves the player up the board.";
const SAMPLE_TIP = "Total playing time in the three-season model window and in the current snapshot season.";

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function peerMetrics(role: string): { key: string; label: string; tip: string }[] {
  if (role === "P") {
    return [
      {
        key: "age_rel",
        label: "Age vs level",
        tip: "How young the pitcher is compared with the average player in his leagues. Higher percentile means younger.",
      },
      {
        key: "kbb_rel",
        label: "K−BB% vs level",
        tip: "Strikeout rate minus walk rate compared with his league-season averages, regressed over 250 BF.",
      },
    ];
  }
  return [
    {
      key: "age_rel",
      label: "Age vs level",
      tip: "How young the batter is compared with the average player in his leagues. Higher percentile means younger.",
    },
    {
      key: "woba_rel",
      label: "Batting vs level",
      tip: "Linear-weight batting production compared with his league-season averages, regressed over 250 PA.",
    },
    {
      key: "kbb_rel",
      label: "Discipline vs level",
      tip: "Low strikeouts relative to walks compared with his league-season averages, regressed over 250 PA.",
    },
  ];
}

function LmbProspectCard({ row, details }: { row: LmbProspectRow; details: LmbProspectDetails | null }) {
  const unit = row.role === "P" ? "BF" : "PA";
  const milbPeak = details ? milbLevelName(details.milbLevel) : null;
  const stats = details ? lmbProspectSeasonStats(details, row.snapshot_season, row.level, row.role) : null;
  const metrics = peerMetrics(row.role);
  const ageVsLevel =
    details?.ageRel == null
      ? null
      : `${formatSigned(details.ageRel, 1)} yrs vs level`;

  return (
    <div className="min-w-0 space-y-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
        {details?.position && <span>{details.position}</span>}
        {details?.throws && <span>Throws {details.throws}</span>}
        <span>
          Age {formatNumber(row.age, 1)}
          {ageVsLevel ? ` (${ageVsLevel})` : ""}
        </span>
        {milbPeak && <span>Peak MiLB: {milbPeak}</span>}
        <span>{lmbLevelLabel(row.level)}</span>
        <span>{row.mexican_born ? "Born in Mexico" : "Foreign-born"}</span>
        {details && details.windowOpp > 0 && (
          <span className="inline-flex items-center gap-1">
            {formatNumber(details.windowOpp, 0)} {unit} in 3-yr window
            {details.seasonOpp > 0 && `, ${formatNumber(details.seasonOpp, 0)} in ${row.snapshot_season}`}
            <InfoTip text={SAMPLE_TIP} label="What is the sample?" />
          </span>
        )}
      </div>

      {details && (Object.keys(details.percentiles).length > 0 || details.drivers.length > 0) && (
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-border pt-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <div className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
              Profile vs peers <InfoTip text={PEERS_TIP} label="What is Profile vs peers?" />
            </div>
            {metrics.map((metric) => {
              const pct = details.percentiles[metric.key];
              return (
                <div
                  key={metric.key}
                  className={cn(
                    "grid min-w-0 grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs sm:gap-2.5",
                    pct == null && "text-muted-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{metric.label}</span>
                    <InfoTip
                      text={`${metric.tip}${pct != null ? ` ${ordinal(pct)} percentile among current ${row.role === "P" ? "pitcher" : "batter"} prospects.` : ""}`}
                      label={`What is ${metric.label}?`}
                    />
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-[1px] bg-grid">
                    <span
                      className="block h-full bg-primary"
                      style={{ width: `${Math.max(0, Math.min(100, pct ?? 0))}%` }}
                    />
                  </span>
                  <span className="text-right font-mono tabular-nums">{pct == null ? EMPTY : ordinal(pct)}</span>
                </div>
              );
            })}
          </div>

          {details.drivers.length > 0 && (
            <div className="space-y-1.5">
              <div className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
                What moved the rank <InfoTip text={DRIVERS_TIP} label="What moved the rank?" />
              </div>
              {details.drivers.map(([input, shift]) => (
                <div key={input} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate">{DRIVER_LABELS[input] ?? input}</span>
                  <span className={cn("font-mono tabular-nums", shift >= 0 ? "text-positive" : "text-destructive")}>
                    {formatSigned(shift, 2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {stats ? (
        <SeasonStatsPanel stats={stats} />
      ) : (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          No {row.snapshot_season} {row.role === "P" ? "pitching" : "batting"} line recorded in this role.
        </p>
      )}
    </div>
  );
}

function ProspectIdentity({ row, position }: { row: LmbProspectRow; position: string | null }) {
  return (
    <PlayerCell
      athleteId={String(row.player_id)}
      headshotUrl={lmbPlayerHeadshotUrl(row.player_id)}
      name={row.name}
      team={[row.team, lmbLevelLabel(row.level)].filter(Boolean).join(" · ")}
      position={position}
      logo={statsApiTeamLogo(row.team_id)}
    />
  );
}

// One role's prospects in rank order, PROSPECT_PAGE at a time like the MLB list.
function ProspectRanks({ rows, noun }: { rows: LmbProspectRow[]; noun: string }) {
  const [shown, setShown] = useState(PROSPECT_PAGE);
  const [expanded, setExpanded] = useState<number | null>(null);
  const visible = rows.slice(0, shown);

  return (
    <>
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {rows.length === 0 ? `No ${noun} are ranked.` : `Showing ${visible.length} of ${formatNumber(rows.length, 0)} ${noun}.`}
      </p>

      <div className="md:hidden">
        <PlayerRowHeader metricLabel="Age" />
        {visible.map((row) => {
          const open = expanded === row.player_id;
          const details = parseProspectDetails(row.details);
          const panelId = `lmb-mobile-prospect-${row.player_id}`;
          return (
            <article key={row.player_id} aria-label={row.name} className="min-w-0 border-b border-border">
              <PlayerRowDisclosure
                name={row.name}
                rank={row.role_rank}
                identity={<ProspectIdentity row={row} position={details?.position ?? null} />}
                grade={formatNumber(row.age, 1)}
                open={open}
                panelId={panelId}
                onToggle={() => setExpanded(open ? null : row.player_id)}
              />
              <div id={panelId} hidden={!open} className="border-t border-border px-3">
                {open && <LmbProspectCard row={row} details={details} />}
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="type-eyebrow [&>th]:text-muted-foreground">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Age</TableHead>
              <TableHead className="hidden sm:table-cell">Born in Mexico</TableHead>
              <TableHead className="w-6">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => {
              const open = expanded === row.player_id;
              const details = parseProspectDetails(row.details);
              const panelId = `lmb-prospect-${row.player_id}`;
              const toggle = () => setExpanded(open ? null : row.player_id);
              return (
                <Fragment key={row.player_id}>
                  <TableRow onClick={toggle} className={cn("cursor-pointer", open && "bg-muted/40")}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.role_rank}</TableCell>
                    <TableCell className="min-w-56 max-w-72">
                      <ProspectIdentity row={row} position={details?.position ?? null} />
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{formatNumber(row.age, 1)}</TableCell>
                    <TableCell className="hidden font-mono text-xs sm:table-cell">
                      {row.mexican_born ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="pl-0 text-right">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        aria-label={`${open ? "Hide" : "Show"} full player card for ${row.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle();
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("size-4 transition-transform", open && "rotate-180")}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell id={panelId} colSpan={5} className="whitespace-normal bg-muted/20">
                        <LmbProspectCard row={row} details={details} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {shown < rows.length && (
        <button
          type="button"
          onClick={() => setShown(shown + PROSPECT_PAGE)}
          className="min-h-10 self-start rounded-md border border-border px-4 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          Show {Math.min(PROSPECT_PAGE, rows.length - shown)} more
        </button>
      )}
    </>
  );
}

export default function LmbProspects({ rows }: { rows: LmbProspectRow[] }) {
  const [role, setRole] = useState<ProspectRole>("hitter");
  return (
    <ViewTabs label="Prospect role" options={PROSPECT_ROLES} value={role} onValueChange={setRole}>
      {PROSPECT_ROLES.map(({ key, label }) => (
        <ViewTabPanel key={key} value={key} className="space-y-section">
          <ProspectRanks rows={rows.filter((row) => row.role === ROLE_CODE[key])} noun={label.toLowerCase()} />
        </ViewTabPanel>
      ))}
    </ViewTabs>
  );
}
