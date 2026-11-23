"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GradeBar } from "@/components/grade-bar";
import { InfoTip } from "@/components/info-tip";
import { Pager } from "@/components/pager";
import { PlayerCell } from "@/components/player-cell";
import { ComparisonMetrics, type ComparisonMetric } from "@/components/player-comparison";
import { PlayerComparisonPicker } from "@/components/player-comparison-picker";
import { PlayerRowDisclosure, PlayerRowHeader } from "@/components/player-row-disclosure";
import { PositionLeaderTabs, surname, type PositionLeader } from "@/components/position-leader-tabs";
import { SeasonStatsPanel } from "@/components/season-stats-panel";
import { SortHeader } from "@/components/sort-header";
import { ToggleGroup } from "@/components/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lmbTeamCode, lmbTeamLogo, lmbTeamName, type LmbRatingModel } from "@/lib/lmb";
import type { LmbPlayerRatingRow } from "@/lib/lmb-types";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { MLB_POSITION_ORDER, PITCHER_GROUPS } from "@/lib/player-values";
import type { SeasonStat } from "@/lib/season-stats";
import { EMPTY, cn, foldSearch, formatNumber, formatSigned } from "@/lib/utils";

// The MLB player grades table, read from lmb.player_ratings: the same
// position leaders, filters, columns and card, with the WAR ledger in place of
// the trade value and trait grades the LMB model does not produce.

const PAGE_ROWS = 40;
const ALL = "all";
const PRESETS = [
  { key: "best", label: "Best" },
  { key: "war", label: "Most WAR" },
] as const;
type Preset = (typeof PRESETS)[number]["key"];
type SortKey = "grade" | "age" | "war" | "proj_war" | "playing" | "primary" | "secondary" | "fld";

const GRADED_TIP = "Players with too little LMB playing time to judge have no grade.";
const runs = (value: number) => formatSigned(value, 0);

function isPitcher(row: LmbPlayerRatingRow): boolean {
  return PITCHER_GROUPS.has(row.pos);
}

function teamCode(row: LmbPlayerRatingRow): string | undefined {
  return lmbTeamCode(row.team_id ?? undefined);
}

// Batting and fielding for a position player; pitching and leverage for a pitcher.
function sortValue(row: LmbPlayerRatingRow, key: SortKey): number | null {
  const pitcher = isPitcher(row);
  switch (key) {
    case "grade":
      return row.grade;
    case "age":
      return row.age;
    case "war":
      return row.war;
    case "proj_war":
      return row.proj_war;
    case "playing":
      return pitcher ? row.bf : row.pa;
    case "primary":
      return pitcher ? row.pitching : row.batting;
    case "secondary":
      return pitcher ? row.leverage : row.baserunning;
    case "fld":
      return row.fielding;
  }
}

function totalRuns(row: LmbPlayerRatingRow): number {
  return row.batting + row.baserunning + row.fielding + row.positional + row.pitching + row.leverage + row.replacement;
}

function playingTime(row: LmbPlayerRatingRow): string {
  const parts = [row.pa > 0 && `${row.pa} PA`, row.bf > 0 && `${row.bf} BF`].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : EMPTY;
}

// The ledger lines a player has: the plate side if he batted or plays the
// field, the mound side if he pitched, fielding for everyone.
function ledger(row: LmbPlayerRatingRow, model: LmbRatingModel): SeasonStat[] {
  const batter = !isPitcher(row) || row.pa > 0;
  const pitcher = isPitcher(row) || row.bf > 0;
  const positional = MLB_POSITION_ORDER.filter((pos) => model.positional[pos] != null)
    .map((pos) => `${pos} ${formatSigned(model.positional[pos], 1)}`)
    .join(", ");
  const replacement =
    model.replacementWinPct == null
      ? ""
      : ` A team of replacement-level players would win ${formatNumber(model.replacementWinPct * 100, 1)}% of its games.`;
  const line = (label: string, value: number, tip: string): SeasonStat => ({ label, value: runs(value), tip });
  return [
    ...(batter
      ? [
          line("Batting", row.batting, "Runs above average at the plate, from play-by-play, adjusted for park and month."),
          line("Baserunning", row.baserunning, "Runs above average on the bases, from play-by-play."),
        ]
      : []),
    line("Fielding", row.fielding, "Runs above average in the field, from zone-based fielding."),
    ...(batter
      ? [
          line(
            "Positional",
            row.positional,
            `The adjustment for the difficulty of the positions he played.${positional ? ` Runs per 162 games: ${positional}.` : ""}`,
          ),
        ]
      : []),
    ...(pitcher
      ? [
          line("Pitching", row.pitching, "Runs saved against an average pitcher, from play-by-play, adjusted for park and month."),
          line("Leverage", row.leverage, "The adjustment for how much a reliever's innings mattered."),
        ]
      : []),
    line("Replacement", row.replacement, `What an average player is worth over a replacement-level one in his playing time.${replacement}`),
    line("Total", totalRuns(row), "Runs above replacement. Divided by the season's runs per win, they are his WAR."),
  ];
}

function LmbPlayerCard({ row, model }: { row: LmbPlayerRatingRow; model: LmbRatingModel }) {
  const code = teamCode(row);
  const graded = row.grade != null;
  return (
    <div className="min-w-0 space-y-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
        {code && <span>{lmbTeamName(code)}</span>}
        {row.age != null && <span>Age {row.age}</span>}
        <span>{playingTime(row)} in {row.season}</span>
        {graded && (
          <span>
            {row.grade_season} grade range {formatNumber(row.grade_lo, 0)} to {formatNumber(row.grade_hi, 0)}
          </span>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="grid grid-cols-2 divide-x divide-border border-y border-border text-center lg:grid-cols-1 lg:divide-x-0 lg:divide-y [&>div]:min-w-0 [&>div]:px-1.5 [&>div]:py-3 sm:[&>div]:px-3">
          <div>
            <div className="type-eyebrow flex min-h-8 items-center justify-center gap-1 text-muted-foreground">
              {row.season} WAR <InfoTip text={`Wins above replacement in the ${row.season} LMB season.`} label="What is WAR?" />
            </div>
            <div className="font-mono text-lg font-bold tabular-nums sm:text-2xl">{formatSigned(row.war, 1)}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{runs(totalRuns(row))} runs · {row.season} season</div>
          </div>
          <div>
            <div className="type-eyebrow flex min-h-8 items-center justify-center gap-1 text-muted-foreground">
              Projected WAR <InfoTip text={`Projected wins above replacement for the ${row.grade_season} season.`} label="What is projected WAR?" />
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-primary sm:text-2xl">{formatNumber(row.proj_war, 1)}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{row.proj_war == null ? "Not enough data" : `${row.grade_season} season`}</div>
          </div>
        </div>
        {/* Stacked under the tiles on phones, the tiles' bottom rule already separates the ledger. */}
        <div className="min-w-0 max-lg:[&>section]:border-t-0 max-lg:[&>section]:pt-0">
        <SeasonStatsPanel
          title={`${row.season} WAR ledger`}
          stats={{
            season: row.season,
            context: model.runsPerWin == null ? "" : `${formatNumber(model.runsPerWin, 2)} runs per win`,
            tiers: [{ label: "Runs", stats: ledger(row, model) }],
            note: "Runs are rounded to the nearest run; the total divided by the season's runs per win is his WAR.",
          }}
        />
        </div>
      </div>
    </div>
  );
}

function LmbComparison({ rows }: { rows: [LmbPlayerRatingRow, LmbPlayerRatingRow] }) {
  const pair = (value: (row: LmbPlayerRatingRow) => string): [string, string] => [value(rows[0]), value(rows[1])];
  const metrics: ComparisonMetric[] = [
    { label: "Grade", values: pair((row) => formatNumber(row.grade, 0)) },
    { label: "Projected WAR", values: pair((row) => formatNumber(row.proj_war, 1)) },
    { label: `${rows[0].season} WAR`, values: pair((row) => formatSigned(row.war, 1)) },
    { label: "Playing time", values: pair(playingTime) },
    ...(
      [
        ["Batting runs", "batting"],
        ["Baserunning runs", "baserunning"],
        ["Fielding runs", "fielding"],
        ["Positional runs", "positional"],
        ["Pitching runs", "pitching"],
        ["Leverage runs", "leverage"],
        ["Replacement runs", "replacement"],
      ] as const
    )
      .filter(([, key]) => rows.some((row) => row[key] !== 0))
      .map(([label, key]) => ({ label, values: pair((row) => runs(row[key])) })),
  ];
  return (
    <section aria-label="Player comparison" className="space-y-4 rounded-lg border border-rule-strong p-4">
      <div className="grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.player_id} className="min-w-0">
            <Identity row={row} />
          </div>
        ))}
      </div>
      <ComparisonMetrics metrics={metrics} />
    </section>
  );
}

function Identity({ row }: { row: LmbPlayerRatingRow }) {
  const code = teamCode(row);
  return (
    <PlayerCell
      athleteId={String(row.player_id)}
      headshotUrl={lmbPlayerHeadshotUrl(row.player_id)}
      name={row.name}
      team={code ?? EMPTY}
      position={row.pos}
      logo={code ? lmbTeamLogo(code) : undefined}
    />
  );
}

export default function LmbPlayerRatings({ rows, model }: { rows: LmbPlayerRatingRow[]; model: LmbRatingModel }) {
  const positions = useMemo(() => MLB_POSITION_ORDER.filter((key) => rows.some((row) => row.pos === key)), [rows]);
  const [position, setPosition] = useState<string>(positions[0] ?? "C");
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [team, setTeam] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const search = useDeferredValue(foldSearch(query.trim()));
  const [page, setPage] = useState(0);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const preset: Preset | null = sortDir !== "desc" ? null : sortKey === "grade" ? "best" : sortKey === "war" ? "war" : null;

  const teams = useMemo(() => {
    const codes = new Set<string>();
    for (const row of rows) {
      const code = teamCode(row);
      if (code) codes.add(code);
    }
    const clubs = [...codes].map((code) => ({ key: code, label: lmbTeamName(code) })).sort((a, b) => a.label.localeCompare(b.label));
    return [{ key: ALL, label: "All teams" }, ...clubs];
  }, [rows]);

  const comparisonPlayers = useMemo(
    () =>
      rows.map((row) => ({
        id: String(row.player_id),
        label: `${row.name} · ${teamCode(row) ?? EMPTY} · ${row.pos}`,
        group: isPitcher(row) ? row.pos : "batter",
      })),
    [rows],
  );
  const comparedRows = compare
    .map((id) => rows.find((row) => String(row.player_id) === id))
    .filter((row): row is LmbPlayerRatingRow => row != null);

  const sortBy = (key: SortKey, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(0);
  };
  const choosePreset = (key: Preset) => sortBy(key === "best" ? "grade" : "war", "desc");
  const onSort = (key: SortKey) => {
    if (key === sortKey) sortBy(key, sortDir === "desc" ? "asc" : "desc");
    else sortBy(key, key === "age" ? "asc" : "desc");
  };

  // Each position's first row under the current team, by grade, or by WAR
  // while the table is sorted by it.
  const byWar = sortKey === "war";
  const leaderOptions = useMemo(() => {
    const score = (row: LmbPlayerRatingRow) => (byWar ? row.war : row.grade);
    return positions.map((key) => {
      let best: LmbPlayerRatingRow | null = null;
      for (const row of rows) {
        if (row.pos !== key || (team !== ALL && teamCode(row) !== team)) continue;
        const value = score(row);
        if (value != null && (best == null || value > (score(best) ?? -Infinity))) best = row;
      }
      if (best == null) return { key, leader: null };
      const leader: PositionLeader = {
        name: best.name,
        short: surname(best.name),
        headshotUrl: lmbPlayerHeadshotUrl(best.player_id),
        ...(byWar
          ? { stat: formatSigned(best.war, 1), tone: best.war >= 0 ? "positive" : "destructive" }
          : { stat: formatNumber(best.grade, 0) }),
      };
      return { key, leader };
    });
  }, [positions, rows, byWar, team]);

  const pitcherList = PITCHER_GROUPS.has(position);
  const matches = useMemo(() => {
    const listed = rows.filter((row) => {
      const code = teamCode(row);
      const inSearch = search
        ? foldSearch(row.name).includes(search) ||
          (code != null && (code.toLowerCase().includes(search) || foldSearch(lmbTeamName(code)).includes(search)))
        : row.pos === position;
      return inSearch && (team === ALL || code === team);
    });
    const sign = sortDir === "desc" ? -1 : 1;
    return listed.sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va == null && vb == null) return (b.grade ?? -1) - (a.grade ?? -1);
      if (va == null) return 1;
      if (vb == null) return -1;
      return sign * (va - vb) || (b.grade ?? -1) - (a.grade ?? -1);
    });
  }, [rows, search, position, team, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_ROWS));
  const current = Math.min(page, totalPages - 1);
  const offset = current * PAGE_ROWS;
  const visible = matches.slice(offset, offset + PAGE_ROWS);

  const graded = matches.filter((row) => row.grade != null).length;
  const shown = visible.length === 0 ? "0" : `${offset + 1}–${offset + visible.length}`;
  const pager = <Pager page={current} totalPages={totalPages} onPage={(next) => { setPage(next); setExpanded(null); }} />;
  const season = rows[0]?.season;
  const gradeSeason = rows[0]?.grade_season;
  const gradeTip = `Projected talent for the ${gradeSeason} season on a 20 to 80 scale. 50 is average; the range is an 80% band.`;
  const warTip = `Wins above replacement in the ${season} LMB season.`;
  const labels = {
    playing: pitcherList ? "BF" : "PA",
    primary: pitcherList ? "Pitch" : "Bat",
    secondary: pitcherList ? "Lev" : "BsR",
  };

  return (
    <div className="min-w-0 space-y-section">
      <div className="space-y-3">
        <PositionLeaderTabs
          label="Position"
          options={leaderOptions}
          value={search ? null : position}
          onChange={(key) => { setPosition(key); setQuery(""); setExpanded(null); setPage(0); }}
        />
        <div className="flex flex-wrap items-center gap-3">
          {/* Phones sort from the menu above the list, which covers both presets. */}
          <ToggleGroup label="Sort" options={PRESETS} value={preset} onChange={choosePreset} variant="pill" className="hidden md:inline-flex" />
          <select aria-label="Team" value={team} onChange={(e) => { setTeam(e.target.value); setPage(0); }} className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm">
            {teams.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search player or team"
            aria-label="Search player or team"
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm sm:w-56"
          />
        </div>
      </div>
      <PlayerComparisonPicker players={comparisonPlayers} selected={compare} onChange={setCompare} description="Compare two batters, starters, or relievers." disclosure={{ open: compareOpen, onOpenChange: setCompareOpen }} />
      {comparedRows.length === 2 && <LmbComparison rows={[comparedRows[0], comparedRows[1]]} />}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
          {search
            ? `${matches.length} player${matches.length === 1 ? "" : "s"} match “${query.trim()}”${totalPages > 1 ? `, showing ${shown}` : ""}.`
            : `${shown} of ${matches.length} ${position}, ${graded} graded.`}{" "}
          <InfoTip text={GRADED_TIP} label="Who is graded?" />
        </p>
        {pager}
      </div>
      <div className="md:hidden">
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="lmb-mobile-player-sort" className="text-xs text-muted-foreground">Sort by</label>
          <select
            id="lmb-mobile-player-sort"
            value={sortKey}
            onChange={(event) => onSort(event.target.value as SortKey)}
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            {[
              { key: "grade", label: "Grade" },
              { key: "age", label: "Age" },
              { key: "war", label: `${season} WAR` },
              { key: "proj_war", label: "Projected WAR" },
              { key: "playing", label: pitcherList ? "Batters faced" : "Plate appearances" },
              { key: "primary", label: pitcherList ? "Pitching runs" : "Batting runs" },
              { key: "secondary", label: pitcherList ? "Leverage runs" : "Baserunning runs" },
              { key: "fld", label: "Fielding runs" },
            ].sort((a, b) => a.label.localeCompare(b.label)).map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <button type="button" onClick={() => onSort(sortKey)} aria-label={`Sort ${sortDir === "desc" ? "ascending" : "descending"}`} className="min-h-10 rounded-md border px-3 text-xs">
            {sortDir === "desc" ? "High to low" : "Low to high"}
          </button>
        </div>
        <PlayerRowHeader />
        {visible.length === 0 && <p className="text-sm text-muted-foreground">No players match.</p>}
        {visible.map((row, i) => {
          const open = expanded === row.player_id;
          return (
            <article key={row.player_id} aria-label={row.name} className="min-w-0 border-b border-border">
              <PlayerRowDisclosure
                name={row.name}
                rank={offset + i + 1}
                identity={<Identity row={row} />}
                grade={row.grade == null ? EMPTY : formatNumber(row.grade, 0)}
                open={open}
                panelId={`lmb-mobile-player-${row.player_id}`}
                onToggle={() => setExpanded(open ? null : row.player_id)}
              />
              <div id={`lmb-mobile-player-${row.player_id}`} hidden={!open} className="border-t border-border px-3">
                {open && <LmbPlayerCard row={row} model={model} />}
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="type-eyebrow w-8 text-muted-foreground">#</TableHead>
            <TableHead className="type-eyebrow text-muted-foreground">Player</TableHead>
            <SortHeader label="Age" sortKey="age" active={sortKey === "age"} dir={sortDir} onSort={onSort} />
            <SortHeader label="Grade" sortKey="grade" active={sortKey === "grade"} dir={sortDir} onSort={onSort} tip={gradeTip} />
            <SortHeader label={labels.playing} sortKey="playing" active={sortKey === "playing"} dir={sortDir} onSort={onSort} tip={pitcherList ? `Batters faced in ${season}.` : `Plate appearances in ${season}.`} className="hidden text-right lg:table-cell" />
            <SortHeader label={labels.primary} sortKey="primary" active={sortKey === "primary"} dir={sortDir} onSort={onSort} tip={pitcherList ? "Pitching runs saved against average, adjusted for park and month." : "Batting runs above average, adjusted for park and month."} className="text-right" />
            <SortHeader label={labels.secondary} sortKey="secondary" active={sortKey === "secondary"} dir={sortDir} onSort={onSort} tip={pitcherList ? "Runs for the leverage of a reliever's innings." : "Baserunning runs above average."} className="hidden text-right lg:table-cell" />
            <SortHeader label="Fld" sortKey="fld" active={sortKey === "fld"} dir={sortDir} onSort={onSort} tip="Fielding runs above average, from zone-based fielding." className="text-right" />
            <SortHeader label="WAR" sortKey="war" active={sortKey === "war"} dir={sortDir} onSort={onSort} tip={warTip} className="text-right" />
            <SortHeader label="Proj WAR" sortKey="proj_war" active={sortKey === "proj_war"} dir={sortDir} onSort={onSort} tip={`Projected wins above replacement for ${gradeSeason}.`} className="text-right" />
            <TableHead className="w-6"><span className="sr-only">Details</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-sm text-muted-foreground">No players match.</TableCell>
            </TableRow>
          ) : (
            visible.map((row, i) => {
              const open = expanded === row.player_id;
              const panelId = `lmb-player-${row.player_id}`;
              const toggle = () => setExpanded(open ? null : row.player_id);
              const value = (key: SortKey) => sortValue(row, key) ?? 0;
              return (
                <Fragment key={row.player_id}>
                  <TableRow onClick={toggle} className={cn("cursor-pointer", open && "bg-muted/40")}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{offset + i + 1}</TableCell>
                    <TableCell className="min-w-48">
                      <Identity row={row} />
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{row.age ?? EMPTY}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono tabular-nums">
                      {row.grade == null ? (
                        <span className="text-xs text-muted-foreground">Not enough data</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-bold text-primary">{formatNumber(row.grade, 0)}</span>
                          <GradeBar grade={row.grade} />
                          <span className="text-[11px] text-muted-foreground">{formatNumber(row.grade_lo, 0)}–{formatNumber(row.grade_hi, 0)}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">{value("playing")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{runs(value("primary"))}</TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">{runs(value("secondary"))}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{runs(row.fielding)}</TableCell>
                    <TableCell className="text-right font-mono font-bold tabular-nums">{formatSigned(row.war, 1)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatNumber(row.proj_war, 1)}</TableCell>
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
                        <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", open && "rotate-180")} />
                      </button>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell id={panelId} colSpan={11} className="whitespace-normal bg-muted/20">
                        <LmbPlayerCard row={row} model={model} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
      <div className="flex justify-end">{pager}</div>
    </div>
  );
}
