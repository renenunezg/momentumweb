"use client";

import { Fragment, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { OutlookYear, PlayerDetail, PlayerTrait, PlayerValueIndex } from "@/lib/mlb-players";
import {
  GRADE_TIP,
  IMPACT_TIP,
  MARKET_VALUE_TIP,
  MLB_POSITION_ORDER,
  OUTLOOK_TIP,
  PANEL_LABELS,
  PITCHER_GROUPS,
  PLAYING_TIME_TIP,
  PRICE_TIP,
  TRADE_VALUE_TIP,
  formatMillions,
  traitLabel,
} from "@/lib/player-values";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { EMPTY, cn, formatNumber, formatSigned } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import { PlayerRowDisclosure, PlayerRowHeader } from "@/components/player-row-disclosure";
import { PlayerCell } from "@/components/player-cell";
import { PlayerComparisonPicker } from "@/components/player-comparison-picker";
import { ComparisonGrades, ComparisonMetrics, type ComparisonMetric } from "@/components/player-comparison";
import { ToggleGroup } from "@/components/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BaseballSeasonStats } from "@/components/baseball-season-stats";
import { seasonStats } from "@/lib/season-stats";

const PAGE_ROWS = 40;
const ALL = "all";
const PRESETS = [
  { key: "best", label: "Best" },
  { key: "bargain", label: "Bargain" },
] as const;
type Preset = (typeof PRESETS)[number]["key"];

type SortKey =
  | "grade"
  | "value"
  | "age"
  | "projected_war"
  | "per_war"
  | "control_years"
  | "salary"
  | "impact"
  | "bat"
  | "fld";

// Diagonal stripes mark a physical measurement (sprint speed, bat speed,
// velocity, arm strength) rather than a rate counted from his plays.
const PHYSICAL_FILL = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent 0 3px, color-mix(in oklch, var(--background) 45%, transparent) 3px 6px)",
};

// A player with no control years is shopped at his market value for one season.
function headlineValue(row: PlayerValueIndex): { label: string; value: number | null; tip: string } {
  if (row.control_years === 0 || row.contract_status === "free_agent") {
    return { label: "Market value", value: row.market_value_musd, tip: MARKET_VALUE_TIP };
  }
  return { label: "Trade value", value: row.trade_value_musd, tip: TRADE_VALUE_TIP };
}

function perWar(row: PlayerValueIndex): number | null {
  if (row.salary_current_musd == null || row.projected_war == null || row.projected_war <= 0.05) return null;
  return row.salary_current_musd / row.projected_war;
}

// The panel grade shown in the table: the mean grade of the panel's weighted
// traits, so a hitter's Batting and a pitcher's Stuff read at a glance.
function panelGrade(detail: PlayerDetail | undefined, panel: string, trait?: string): number | null {
  if (!detail) return null;
  if (trait) return detail.traits.find((t) => t.trait === trait)?.grade ?? null;
  const graded = detail.traits.filter((t) => t.panel === panel && t.in_grade && t.grade != null);
  if (graded.length === 0) return null;
  return graded.reduce((sum, t) => sum + (t.grade ?? 0), 0) / graded.length;
}

function sortValue(row: PlayerValueIndex, detail: PlayerDetail | undefined, key: SortKey): number | null {
  const pitcher = PITCHER_GROUPS.has(row.position_group);
  switch (key) {
    case "grade":
      return row.grade;
    case "value":
      return headlineValue(row).value;
    case "age":
      return row.age;
    case "projected_war":
      return row.projected_war;
    case "per_war":
      return perWar(row);
    case "control_years":
      return row.control_years;
    case "salary":
      return row.salary_current_musd;
    case "impact":
      return row.impact_war;
    case "bat":
      return pitcher ? panelGrade(detail, "arsenal", "stuff") : panelGrade(detail, "batting");
    case "fld":
      return pitcher ? panelGrade(detail, "arsenal", "command") : panelGrade(detail, "fielding");
  }
}

function GradeBar({ grade }: { grade: number | null }) {
  const width = grade == null ? 0 : ((grade - 20) / 60) * 100;
  return (
    <span className="inline-block h-1.5 w-14 overflow-hidden rounded-[1px] bg-grid align-middle">
      <span className="block h-full bg-primary" style={{ width: `${width}%` }} />
    </span>
  );
}

function TraitRow({ trait }: { trait: PlayerTrait }) {
  const { label, tip } = traitLabel(trait.trait);
  const physical = trait.kind === "physical";
  const detail = trait.grade == null
    ? `${tip} Not enough data for this player.`
    : trait.in_grade
      ? tip
      : `${tip} Not used in the grade.`;
  const text = `${detail}${trait.grade != null ? ` Grade range: ${formatNumber(trait.grade_low, 0)} to ${formatNumber(trait.grade_high, 0)}.` : ""}`;
  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-2 text-xs sm:gap-2.5", !trait.in_grade && "text-muted-foreground")}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate">{label}</span>
        <InfoTip text={text} label={`What is ${label}?`} />
      </span>
      <span className="h-1.5 overflow-hidden rounded-[1px] bg-grid">
        <span
          className={cn("block h-full", physical ? "bg-accent-blue" : "bg-primary", !trait.in_grade && "opacity-40")}
          style={{ width: `${trait.percentile ?? 0}%`, ...(physical ? PHYSICAL_FILL : {}) }}
        />
      </span>
      <span className="text-right font-mono tabular-nums">{trait.grade == null ? EMPTY : Math.round(trait.grade)}</span>
    </div>
  );
}

function OutlookTile({ year, graded }: { year: OutlookYear; graded: boolean }) {
  const faded = !year.in_control && year.salary_kind !== "buyout";
  return (
    <div className={cn("min-w-0 rounded-sm border border-border px-2 py-1.5 text-center font-mono text-[11px]", faded && "opacity-45")}>
      <div className="text-muted-foreground">{year.season} · {year.age}</div>
      <div className="font-bold text-primary">{graded && year.war != null ? `${formatNumber(year.war, 1)} WAR` : EMPTY}</div>
      <div className="text-muted-foreground">
        {faded ? "free agent" : `${formatMillions(year.salary_musd)} ${year.salary_kind === "pre_arb" ? "min" : year.salary_kind === "arbitration" ? "arb" : year.salary_kind === "option" ? "opt" : year.salary_kind === "buyout" ? "buyout" : ""}`}
      </div>
      <div className={cn("font-bold", (year.surplus_musd ?? 0) >= 0 ? "text-positive" : "text-destructive")}>
        {faded || !graded || year.surplus_musd == null ? EMPTY : `${formatSigned(year.surplus_musd, 1).replace(/^([+-])/, "$1$")}M`}
      </div>
    </div>
  );
}

function DetailStatus({ failed, onRetry, loadingText = "Loading traits…" }: { failed: boolean; onRetry: () => void; loadingText?: string }) {
  return failed ? (
    <div role="status" className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <p>Could not load traits and outlook. Please try again.</p>
      <button type="button" onClick={onRetry} className="min-h-10 rounded-md border border-border px-3 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Retry</button>
    </div>
  ) : (
    <p role="status" className="text-xs text-muted-foreground">{loadingText}</p>
  );
}

function PlayerCard({ row, detail, failed, onRetry }: {
  row: PlayerValueIndex;
  detail: PlayerDetail | undefined;
  failed: boolean;
  onRetry: () => void;
}) {
  const graded = row.grade != null;
  const head = headlineValue(row);
  const pitcher = PITCHER_GROUPS.has(row.position_group);
  const stats = seasonStats(detail?.seasonStats, pitcher, false);
  const panels = pitcher ? ["arsenal", "results", "durability"] : ["batting", "fielding"];
  return (
    <div className="min-w-0 space-y-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>{row.bats ?? "?"}/{row.throws ?? "?"}</span>
        {row.age != null && <span>Age {row.age}</span>}
        {row.secondary_positions.length > 0 && <span>also {row.secondary_positions.join(", ")}</span>}
        {row.service_time != null && <span>service {formatNumber(row.service_time, 3)}</span>}
        {row.fa_year != null && <span>free agent {row.fa_year}</span>}
        {row.contract_status === "estimated" && <span>contract estimated from debut date</span>}
        {row.contract_status === "unknown" && <span>contract not found</span>}
        {row.owed_through_control_musd != null && row.control_years > 0 && (
          <span>owed {formatMillions(row.owed_through_control_musd)} over {row.control_years} control year{row.control_years === 1 ? "" : "s"}</span>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-y border-border py-3 text-center md:hidden [&>div]:min-w-0 [&>div]:px-1.5 sm:[&>div]:px-3">
        <div>
          <div className="type-eyebrow flex min-h-8 items-center justify-center gap-1 text-muted-foreground">
            {head.label} <InfoTip text={`${head.tip} ${PRICE_TIP}`} label={`What is ${head.label}?`} />
          </div>
          <div className={cn("font-mono text-lg font-bold tabular-nums sm:text-2xl", (head.value ?? 0) >= 0 ? "text-positive" : "text-destructive")}>
            {graded ? formatMillions(head.value) : EMPTY}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {!graded
              ? "Not enough data"
              : head.label === "Trade value" && row.trade_value_low != null
                ? `${formatMillions(row.trade_value_low)} to ${formatMillions(row.trade_value_high)} · ${row.control_years} yrs`
                : `${formatNumber(row.projected_war, 1)} projected WAR`}
          </div>
        </div>
        <div>
          <div className="type-eyebrow flex min-h-8 items-center justify-center gap-1 text-muted-foreground">
            Impact <InfoTip text={IMPACT_TIP} label="What is Impact?" />
          </div>
          <div className="font-mono text-lg font-bold tabular-nums sm:text-2xl">{row.impact_war == null ? EMPTY : formatSigned(row.impact_war, 1)}</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {row.impact_runs == null ? "no plate appearances" : `${formatSigned(row.impact_runs, 1)} runs · ${row.season - 1} season`}
          </div>
        </div>
      </div>
      {detail == null ? (
        <DetailStatus failed={failed} onRetry={onRetry} />
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          {panels.map((panel) => {
            const traits = detail.traits.filter((t) => t.panel === panel).sort((a, b) => Number(b.in_grade) - Number(a.in_grade) || a.trait.localeCompare(b.trait));
            if (traits.length === 0) return null;
            return (
              <div key={panel} className="space-y-1.5">
                <div className="type-eyebrow flex items-center justify-between text-muted-foreground">
                  <span>{PANEL_LABELS[panel] ?? panel}</span>
                  <span className="font-mono">{formatNumber(panelGrade(detail, panel), 0)}</span>
                </div>
                {traits.map((t) => (
                  <TraitRow key={t.trait} trait={t} />
                ))}
              </div>
            );
          })}
        </div>
      )}
      {stats && <BaseballSeasonStats stats={stats} />}
      {detail != null && detail.outlook.length > 0 && (
        <div className="space-y-1.5">
          <div className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
            Control-year outlook <InfoTip text={`${OUTLOOK_TIP} ${PLAYING_TIME_TIP}`} label="What is the outlook?" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {detail.outlook.map((year) => (
              <OutlookTile key={year.season} year={year} graded={graded} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function gradeOf(detail: PlayerDetail | undefined, trait: string): number | null | undefined {
  return detail?.traits.find((t) => t.trait === trait)?.grade;
}

function MlbComparison({
  rows,
  loaded,
  failed,
  onRetry,
}: {
  rows: [PlayerValueIndex, PlayerValueIndex];
  loaded: Record<string, PlayerDetail>;
  failed: boolean;
  onRetry: () => void;
}) {
  const details = rows.map((row) => loaded[String(row.player_id)]);
  const traits = [
    ...new Set(
      details.flatMap(
        (detail) =>
          detail?.traits
            .filter((trait) => trait.grade != null)
            .map((trait) => trait.trait) ?? [],
      ),
    ),
  ];
  const pair = <T,>(value: (row: PlayerValueIndex) => T): [T, T] => [value(rows[0]), value(rows[1])];
  const metrics: ComparisonMetric[] = [
    { label: "Grade", values: pair((row) => formatNumber(row.grade, 0)) },
    {
      label: "Projected WAR",
      values: pair((row) => formatNumber(row.projected_war, 1)),
    },
    {
      label: "Trade value",
      values: pair((row) =>
        row.grade != null && headlineValue(row).label === "Trade value"
          ? formatMillions(row.trade_value_musd)
          : EMPTY,
      ),
    },
    {
      label: "Market value",
      values: pair((row) =>
        row.grade != null && headlineValue(row).label === "Market value"
          ? formatMillions(row.market_value_musd)
          : EMPTY,
      ),
    },
    {
      label: "Salary",
      values: pair((row) => formatMillions(row.salary_current_musd)),
    },
    {
      label: "Control years",
      values: pair((row) => String(row.control_years)),
    },
    {
      label: "Impact WAR",
      values: pair((row) => formatNumber(row.impact_war, 1)),
    },
  ].filter((metric) => metric.values.some((value) => value !== EMPTY));
  return (
    <section
      aria-label="Player comparison"
      className="space-y-4 rounded-lg border border-rule-strong p-4"
    >
      <div className="grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.player_id} className="min-w-0">
            <PlayerCell
              athleteId={String(row.player_id)}
              headshotUrl={row.headshot_url}
              name={row.player_name ?? String(row.player_id)}
              team={row.team || "FA"}
              position={row.position_group}
              logo={mlbTeamIdentity(row.team)}
            />
          </div>
        ))}
      </div>
      <ComparisonMetrics metrics={metrics} />
      <p className="text-xs text-muted-foreground">
        Grades are relative to each player&apos;s position. Projected WAR uses a
        common wins scale across positions.
      </p>
      {details.every(Boolean) ? (
        <div className="space-y-3">
          <h3 className="text-sm">Trait grades</h3>
          <ComparisonGrades
            grades={traits.map((name) => ({
              label: traitLabel(name).label,
              values: [gradeOf(details[0], name), gradeOf(details[1], name)],
            }))}
          />
        </div>
      ) : (
        <DetailStatus failed={failed} onRetry={onRetry} loadingText="Loading comparison traits…" />
      )}
    </section>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  tip,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  tip?: string;
  className?: string;
}) {
  return (
    <TableHead className={cn("whitespace-nowrap", className)} aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn("type-eyebrow inline-flex items-center gap-1", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        {label}
        {active && <span aria-hidden="true">{dir === "desc" ? "▼" : "▲"}</span>}
      </button>
      {tip && <InfoTip text={tip} label={`What is ${label}?`} className="ml-1" />}
    </TableHead>
  );
}

export default function MlbPlayerValues({ index }: { index: PlayerValueIndex[] }) {
  const positions = MLB_POSITION_ORDER.filter((key) => index.some((row) => row.position_group === key)).map((key) => ({ key, label: key }));
  const [position, setPosition] = useState<string>(positions[0]?.key ?? "C");
  const [preset, setPreset] = useState<Preset>("best");
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [team, setTeam] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim().toLowerCase());
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const comparisonPlayers = useMemo(() => index.map((row) => ({ id: String(row.player_id), label: `${row.player_name ?? row.player_id} · ${row.team || "FA"} · ${row.position_group}`, group: PITCHER_GROUPS.has(row.position_group) ? row.position_group : "batter" })), [index]);
  const comparedRows = compare.map((id) => index.find((row) => String(row.player_id) === id)).filter((row): row is PlayerValueIndex => row != null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Record<string, PlayerDetail>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const teams = useMemo(() => {
    const names = new Set<string>();
    for (const row of index) if (row.team) names.add(row.team);
    return [{ key: ALL, label: "All teams" }, ...[...names].sort().map((name) => ({ key: name, label: name }))];
  }, [index]);

  const choosePreset = (key: Preset) => {
    setPreset(key);
    setSortKey(key === "best" ? "grade" : "value");
    setSortDir("desc");
  };
  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir(key === "age" || key === "per_war" ? "asc" : "desc");
    }
  };

  const pitcherList = PITCHER_GROUPS.has(position);
  const matches = useMemo(() => {
    const rows = index.filter(
      (row) =>
        (search ? (row.player_name ?? "").toLowerCase().includes(search) || (row.team ?? "").toLowerCase().includes(search) : row.position_group === position) &&
        (team === ALL || row.team === team)
    );
    const sign = sortDir === "desc" ? -1 : 1;
    return rows.sort((a, b) => {
      const va = sortValue(a, loaded[String(a.player_id)], sortKey);
      const vb = sortValue(b, loaded[String(b.player_id)], sortKey);
      if (va == null && vb == null) return (b.grade ?? -1) - (a.grade ?? -1);
      if (va == null) return 1;
      if (vb == null) return -1;
      return sign * (va - vb) || (b.grade ?? -1) - (a.grade ?? -1);
    });
  }, [index, search, position, team, sortKey, sortDir, loaded]);
  const visible = matches.slice(0, PAGE_ROWS);

  // A stable key keeps opening a card from cancelling its pending request.
  const requestIds = [...new Set([...compare.map(Number), ...visible.map((row) => row.player_id)])]
    .filter((id) => !loaded[String(id)] && !failed[String(id)])
    .slice(0, PAGE_ROWS)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!requestIds) return;
    const ids = requestIds.split(",");
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    fetch(`/mlb/api/player-details?ids=${requestIds}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Player details unavailable");
        return res.json() as Promise<{ players?: Record<string, PlayerDetail> }>;
      })
      .then((body) => {
        if (!active) return;
        const received: Record<string, PlayerDetail> = {};
        const missing: Record<string, boolean> = {};
        for (const id of ids) {
          const detail = body?.players?.[id];
          if (detail && Array.isArray(detail.traits) && Array.isArray(detail.outlook)) received[id] = detail;
          else missing[id] = true;
        }
        setLoaded((prev) => ({ ...prev, ...received }));
        setFailed((prev) => ({ ...prev, ...missing }));
      })
      .catch(() => {
        if (active) setFailed((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, true])) }));
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [requestIds]);

  const retryDetails = (ids: number[]) => {
    setFailed((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[String(id)];
      return next;
    });
  };

  const graded = matches.filter((row) => row.grade != null).length;

  return (
    <div className="min-w-0 space-y-section">
      <PlayerComparisonPicker players={comparisonPlayers} selected={compare} onChange={setCompare} description="Compare two batters, starters, or relievers." disclosure={{ open: compareOpen, onOpenChange: setCompareOpen }} />
      {comparedRows.length === 2 && <MlbComparison rows={[comparedRows[0], comparedRows[1]]} loaded={loaded} failed={comparedRows.some((row) => failed[String(row.player_id)])} onRetry={() => retryDetails(comparedRows.map((row) => row.player_id))} />}
      <div className="flex flex-wrap items-center gap-3">
        {/* Eleven positions overflow a phone, so small screens get one select beside the team select. */}
        <div className="hidden md:block">
          <ToggleGroup label="Position" options={positions} value={position} onChange={(key) => { setPosition(key); setExpanded(null); }} />
        </div>
        <select
          aria-label="Position"
          value={position}
          onChange={(e) => { setPosition(e.target.value); setExpanded(null); }}
          className="h-8 border border-input bg-transparent px-2 font-mono text-xs md:hidden"
        >
          {[...positions].sort((a, b) => a.label.localeCompare(b.label)).map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <ToggleGroup label="Sort" options={PRESETS} value={preset} onChange={choosePreset} variant="pill" />
        <select aria-label="Team" value={team} onChange={(e) => setTeam(e.target.value)} className="h-8 border border-input bg-transparent px-2 font-mono text-xs">
          {teams.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player or team"
          aria-label="Search player or team"
          className="h-8 w-full border border-input bg-transparent px-2 text-sm sm:w-56"
        />
      </div>
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {search
          ? `${matches.length} player${matches.length === 1 ? "" : "s"} match “${query.trim()}”.`
          : `Top ${visible.length} of ${matches.length} ${position}, ${graded} graded.`}{" "}
        Best ranks talent; Bargain ranks trade value. Open a player for details.
      </p>
      <div className="md:hidden">
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="mobile-player-sort" className="text-xs text-muted-foreground">Sort by</label>
          <select
            id="mobile-player-sort"
            value={sortKey}
            onChange={(event) => onSort(event.target.value as SortKey)}
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            {[
              { key: "grade", label: "Grade" },
              { key: "value", label: "Value" },
              { key: "age", label: "Age" },
              { key: "impact", label: "Impact" },
              { key: "projected_war", label: "Projected WAR" },
              { key: "salary", label: "Salary" },
              { key: "control_years", label: "Control years" },
              { key: "per_war", label: "Cost per WAR" },
              { key: "bat", label: pitcherList ? "Stuff" : "Batting" },
              { key: "fld", label: pitcherList ? "Command" : "Fielding" },
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
          const name = row.player_name ?? String(row.player_id);
          return (
            <article key={row.player_id} aria-label={name} className="min-w-0 border-b border-border">
              <PlayerRowDisclosure
                name={name}
                rank={i + 1}
                identity={<PlayerCell
                  athleteId={String(row.player_id)}
                  headshotUrl={row.headshot_url}
                  name={name}
                  team={row.team || "FA"}
                  position={row.position_group}
                  logo={mlbTeamIdentity(row.team)}
                />}
                grade={row.grade == null ? EMPTY : formatNumber(row.grade, 0)}
                open={open}
                panelId={`mlb-mobile-player-${row.player_id}`}
                onToggle={() => setExpanded(open ? null : row.player_id)}
              />
              <div id={`mlb-mobile-player-${row.player_id}`} hidden={!open} className="border-t border-border px-3">
                {open && <PlayerCard row={row} detail={loaded[String(row.player_id)]} failed={!!failed[String(row.player_id)]} onRetry={() => retryDetails([row.player_id])} />}
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
            <SortHeader label="Grade" sortKey="grade" active={sortKey === "grade"} dir={sortDir} onSort={onSort} tip={GRADE_TIP} />
            <SortHeader label={pitcherList ? "Stuff" : "Bat"} sortKey="bat" active={sortKey === "bat"} dir={sortDir} onSort={onSort} className="hidden md:table-cell" />
            <SortHeader label={pitcherList ? "Cmd" : "Fld"} sortKey="fld" active={sortKey === "fld"} dir={sortDir} onSort={onSort} className="hidden md:table-cell" />
            <SortHeader label="Value" sortKey="value" active={sortKey === "value"} dir={sortDir} onSort={onSort} tip={`${TRADE_VALUE_TIP} ${MARKET_VALUE_TIP}`} className="text-right" />
            <SortHeader label="Proj WAR" sortKey="projected_war" active={sortKey === "projected_war"} dir={sortDir} onSort={onSort} className="hidden text-right lg:table-cell" />
            <SortHeader label="$/WAR" sortKey="per_war" active={sortKey === "per_war"} dir={sortDir} onSort={onSort} tip="Next season's salary divided by projected WAR. Lower is cheaper." className="hidden text-right lg:table-cell" />
            <SortHeader label="Ctrl" sortKey="control_years" active={sortKey === "control_years"} dir={sortDir} onSort={onSort} tip="Seasons of team control left, including options the team would exercise." className="hidden text-right sm:table-cell" />
            <SortHeader label="Salary" sortKey="salary" active={sortKey === "salary"} dir={sortDir} onSort={onSort} tip="Next season's salary: the contract figure, or the estimated arbitration award or league minimum." className="hidden text-right sm:table-cell" />
            <SortHeader label="Impact" sortKey="impact" active={sortKey === "impact"} dir={sortDir} onSort={onSort} tip={IMPACT_TIP} className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-sm text-muted-foreground">No players match.</TableCell>
            </TableRow>
          ) : (
            visible.map((row, i) => {
              const detail = loaded[String(row.player_id)];
              const head = headlineValue(row);
              const open = expanded === row.player_id;
              const pitcher = PITCHER_GROUPS.has(row.position_group);
              const bat = pitcher ? panelGrade(detail, "arsenal", "stuff") : panelGrade(detail, "batting");
              const fld = pitcher ? panelGrade(detail, "arsenal", "command") : panelGrade(detail, "fielding");
              const ratio = perWar(row);
              return (
                <Fragment key={row.player_id}>
                  <TableRow
                    onClick={() => setExpanded(open ? null : row.player_id)}
                    aria-expanded={open}
                    className={cn("cursor-pointer", open && "bg-muted/40")}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="min-w-48">
                      <PlayerCell
                        athleteId={String(row.player_id)}
                        headshotUrl={row.headshot_url}
                        name={row.player_name ?? String(row.player_id)}
                        team={row.team || "FA"}
                        position={row.position_group}
                        logo={mlbTeamIdentity(row.team)}
                      />
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{row.age ?? EMPTY}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono tabular-nums">
                      {row.grade == null ? (
                        <span className="text-xs text-muted-foreground">Not enough data</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-bold text-primary">{formatNumber(row.grade, 0)}</span>
                          <GradeBar grade={row.grade} />
                          <span className="text-[11px] text-muted-foreground">{formatNumber(row.grade_low, 0)}–{formatNumber(row.grade_high, 0)}</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden font-mono tabular-nums md:table-cell">{bat == null ? EMPTY : Math.round(bat)}</TableCell>
                    <TableCell className="hidden font-mono tabular-nums md:table-cell">{fld == null ? EMPTY : Math.round(fld)}</TableCell>
                    <TableCell className={cn("whitespace-nowrap text-right font-mono font-bold tabular-nums", row.grade == null ? "text-muted-foreground" : (head.value ?? 0) >= 0 ? "text-positive" : "text-destructive")}>
                      {row.grade == null ? EMPTY : formatMillions(head.value)}
                      {row.grade != null && head.label === "Market value" && <span className="type-eyebrow ml-1 text-muted-foreground"> mkt</span>}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">{formatNumber(row.projected_war, 1)}</TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">{ratio == null ? EMPTY : formatMillions(ratio)}</TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">{row.control_years}</TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">{formatMillions(row.salary_current_musd)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.impact_war == null ? EMPTY : formatSigned(row.impact_war, 1)}</TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={12} className="whitespace-normal bg-muted/20">
                        <PlayerCard row={row} detail={detail} failed={!!failed[String(row.player_id)]} onRetry={() => retryDetails([row.player_id])} />
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
    </div>
  );
}
