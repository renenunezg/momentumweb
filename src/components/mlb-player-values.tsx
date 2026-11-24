"use client";

import { Fragment, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  panelMean,
  traitLabel,
} from "@/lib/player-values";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { EMPTY, cn, formatNumber, formatSigned } from "@/lib/utils";
import { GradeBar } from "@/components/grade-bar";
import { InfoTip } from "@/components/info-tip";
import { NavigationLink as Link } from "@/components/navigation-link";
import { Pager } from "@/components/pager";
import { PlayerRowDisclosure, PlayerRowHeader } from "@/components/player-row-disclosure";
import { PlayerCell } from "@/components/player-cell";
import { DownloadCardLink } from "@/components/download-card-link";
import { PlayerComparisonPicker } from "@/components/player-comparison-picker";
import { ComparisonGrades, ComparisonMetrics, type ComparisonMetric } from "@/components/player-comparison";
import { ToggleGroup } from "@/components/toggle-group";
import { PositionLeaderTabs, surname, type PositionLeader } from "@/components/position-leader-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeasonStatsPanel } from "@/components/season-stats-panel";
import { SortHeader } from "@/components/sort-header";
import { seasonStats } from "@/lib/season-stats";
import { useLinkedPlayerId } from "@/components/use-linked-player";

const PAGE_ROWS = 40;
const GRADED_TIP = "Graded players have a season-equivalent sample of 100 plate appearances or batters faced across the last three seasons.";
const ALL = "all";
const FREE_AGENTS = "free-agents";
const PRESETS = [
  { key: "best", label: "Best" },
  { key: "bargain", label: "Bargain" },
] as const;
type Preset = (typeof PRESETS)[number]["key"];

// The players each run value page lists, and the season it covers.
export interface RunValueListing {
  season: number | null;
  ids: number[];
}

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

function onTeam(row: PlayerValueIndex, team: string): boolean {
  return team === ALL || (team === FREE_AGENTS ? !row.team : row.team === team);
}

function marketPriced(row: PlayerValueIndex): boolean {
  return row.control_years === 0 || row.contract_status === "free_agent";
}

// A player with no control years is shopped at his market value for one season.
function headlineValue(row: PlayerValueIndex): { label: string; value: number | null; tip: string } {
  if (marketPriced(row)) {
    return { label: "Market value", value: row.market_value_musd, tip: MARKET_VALUE_TIP };
  }
  return { label: "Trade value", value: row.trade_value_musd, tip: TRADE_VALUE_TIP };
}

// What sorting by value ranks: surplus over the contract. A market salary is a
// price with no surplus in it, so market-priced players sort after everyone.
function surplusValue(row: PlayerValueIndex): number | null {
  return row.grade == null || marketPriced(row) ? null : row.trade_value_musd;
}

function valueTone(row: PlayerValueIndex): string {
  if (row.grade == null) return "text-muted-foreground";
  if (marketPriced(row)) return "text-foreground";
  return (row.trade_value_musd ?? 0) >= 0 ? "text-positive" : "text-destructive";
}

// Service time is MLB's years.days, with 172 days to a year.
function serviceText(value: number | null): string | null {
  if (value == null) return null;
  const years = Math.floor(value);
  const days = Math.round((value - years) * 1000);
  if (days > 171) return null;
  return `${years} yr ${days} days service`;
}

function perWar(row: PlayerValueIndex): number | null {
  if (row.salary_current_musd == null || row.projected_war == null || row.projected_war <= 0.05) return null;
  return row.salary_current_musd / row.projected_war;
}

function sortValue(row: PlayerValueIndex, key: SortKey): number | null {
  switch (key) {
    case "grade":
      return row.grade;
    case "value":
      return surplusValue(row);
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
      return row.bat;
    case "fld":
      return row.fld;
  }
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

function PlayerCard({ row, detail, failed, onRetry, links }: {
  row: PlayerValueIndex;
  detail: PlayerDetail | undefined;
  failed: boolean;
  onRetry: () => void;
  links: { href: string; label: string }[];
}) {
  const graded = row.grade != null;
  const head = headlineValue(row);
  const pitcher = PITCHER_GROUPS.has(row.position_group);
  const service = serviceText(row.service_time);
  const lines = seasonStats(detail?.seasonStats, pitcher, false);
  // Impact above already shows last season's fWAR, from the valuation's own
  // source, so the season line leaves out its copy of the figure.
  const stats = lines && {
    ...lines,
    tiers: lines.tiers.map((tier) => ({ ...tier, stats: tier.stats.filter((stat) => stat.label !== "fWAR") })),
  };
  const panels = pitcher ? ["arsenal", "results", "durability"] : ["batting", "fielding"];
  return (
    <div className="min-w-0 space-y-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>{row.bats ?? "?"}/{row.throws ?? "?"}</span>
        {row.age != null && <span>Age {row.age}</span>}
        {row.secondary_positions.length > 0 && <span>also {row.secondary_positions.join(", ")}</span>}
        {service && <span>{service}</span>}
        {row.fa_year != null && <span>free agent {row.fa_year}</span>}
        {row.contract_status === "estimated" && <span>contract estimated from debut date</span>}
        {row.contract_status === "unknown" && <span>contract not found</span>}
        {row.owed_through_control_musd != null && row.control_years > 0 && (
          <span>owed {formatMillions(row.owed_through_control_musd)} over {row.control_years} control year{row.control_years === 1 ? "" : "s"}</span>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="grid grid-cols-2 divide-x divide-border border-y border-border text-center lg:grid-cols-1 lg:divide-x-0 lg:divide-y [&>div]:min-w-0 [&>div]:px-1.5 [&>div]:py-3 sm:[&>div]:px-3">
          <div>
            <div className="type-eyebrow flex min-h-8 items-center justify-center gap-1 text-muted-foreground">
              {head.label} <InfoTip text={`${head.tip} ${PRICE_TIP}`} label={`What is ${head.label}?`} />
            </div>
            <div className={cn("font-mono text-lg font-bold tabular-nums sm:text-2xl", valueTone(row))}>
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
              {row.impact_runs == null
                ? pitcher ? `no batters faced in ${row.season - 1}` : `no plate appearances in ${row.season - 1}`
                : `${formatSigned(row.impact_runs, 1)} runs · ${row.season - 1} season`}
            </div>
          </div>
        </div>
        {detail == null ? (
          <DetailStatus failed={failed} onRetry={onRetry} />
        ) : (
          <div className={cn("grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2", panels.length > 2 && "2xl:grid-cols-3")}>
            {panels.map((panel) => {
              // A trait with no grade that would not count toward the grade says nothing, so it is left out.
              const traits = detail.traits
                .filter((t) => t.panel === panel && (t.grade != null || t.in_grade))
                .sort((a, b) => Number(b.in_grade) - Number(a.in_grade) || a.trait.localeCompare(b.trait));
              if (traits.length === 0) return null;
              return (
                <div key={panel} className="space-y-1.5">
                  <div className="type-eyebrow flex items-center justify-between text-muted-foreground">
                    <span>{PANEL_LABELS[panel] ?? panel}</span>
                    {/* A panel whose traits are all outside the grade (a pitcher's durability) has no grade of its own. */}
                    {panelMean(detail.traits, panel) != null && <span className="font-mono">{formatNumber(panelMean(detail.traits, panel), 0)}</span>}
                  </div>
                  {traits.map((t) => (
                    <TraitRow key={t.trait} trait={t} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {stats && <SeasonStatsPanel stats={stats} />}
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
      {links.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-primary underline underline-offset-4">
              {link.label}
            </Link>
          ))}
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
              headshotUrl={mlbPlayerHeadshotUrl(row.player_id)}
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

export default function MlbPlayerValues({
  index,
  runValues,
}: {
  index: PlayerValueIndex[];
  runValues: { batting: RunValueListing; pitching: RunValueListing };
}) {
  const positions = useMemo(() => MLB_POSITION_ORDER.filter((key) => index.some((row) => row.position_group === key)), [index]);
  const [position, setPosition] = useState<string>(positions[0] ?? "C");
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [team, setTeam] = useState<string>(ALL);
  const [typed, setTyped] = useState("");
  // A link from a run value page names a player: he is shown through the
  // search with his card open until the visitor searches or browses on.
  const linkedId = useLinkedPlayerId();
  const [linkDone, setLinkDone] = useState(false);
  const linkActive = linkedId != null && !linkDone;
  const linkedRow = linkActive ? index.find((row) => row.player_id === linkedId) ?? null : null;
  const query = linkedRow ? (linkedRow.player_name ?? String(linkedRow.player_id)) : typed;
  const setQuery = (value: string) => {
    setLinkDone(true);
    setTyped(value);
  };
  const search = useDeferredValue(query.trim().toLowerCase());
  const [page, setPage] = useState(0);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const comparisonPlayers = useMemo(() => index.map((row) => ({ id: String(row.player_id), label: `${row.player_name ?? row.player_id} · ${row.team || "FA"} · ${row.position_group}`, group: PITCHER_GROUPS.has(row.position_group) ? row.position_group : "batter" })), [index]);
  const comparedRows = compare.map((id) => index.find((row) => String(row.player_id) === id)).filter((row): row is PlayerValueIndex => row != null);
  const [chosen, setExpanded] = useState<number | null | undefined>(undefined);
  const expanded = chosen === undefined ? (linkedRow?.player_id ?? null) : chosen;
  const [loaded, setLoaded] = useState<Record<string, PlayerDetail>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  // The two presets are shortcuts to a sort, so they light up only while that sort holds.
  const preset: Preset | null = sortDir !== "desc" ? null : sortKey === "grade" ? "best" : sortKey === "value" ? "bargain" : null;

  const teams = useMemo(() => {
    const names = new Set<string>();
    for (const row of index) if (row.team) names.add(row.team);
    const freeAgents = index.some((row) => !row.team) ? [{ key: FREE_AGENTS, label: "Free agents" }] : [];
    return [{ key: ALL, label: "All teams" }, ...freeAgents, ...[...names].sort().map((name) => ({ key: name, label: name }))];
  }, [index]);
  const notice = linkActive && linkedRow == null ? "That player has no grade. Grades cover players on 40-man rosters." : null;

  const listed = useMemo(
    () => ({ batting: new Set(runValues.batting.ids), pitching: new Set(runValues.pitching.ids) }),
    [runValues],
  );
  const linksFor = (row: PlayerValueIndex) => [
    ...(listed.batting.has(row.player_id)
      ? [{ href: `/mlb/batting-value?player=${row.player_id}`, label: `${runValues.batting.season} batting run value` }]
      : []),
    ...(listed.pitching.has(row.player_id)
      ? [{ href: `/mlb/pitching-value?player=${row.player_id}`, label: `${runValues.pitching.season} pitching run value` }]
      : []),
  ];

  const sortBy = (key: SortKey, dir: "asc" | "desc") => {
    setSortKey(key);
    setSortDir(dir);
    setPage(0);
  };
  const choosePreset = (key: Preset) => sortBy(key === "best" ? "grade" : "value", "desc");
  const onSort = (key: SortKey) => {
    if (key === sortKey) sortBy(key, sortDir === "desc" ? "asc" : "desc");
    else sortBy(key, key === "age" || key === "per_war" ? "asc" : "desc");
  };

  // Each position's first row under the current team, by grade, or by surplus
  // while the table is sorted by value. Market-priced players carry no surplus.
  const byValue = sortKey === "value";
  const leaderOptions = useMemo(() => {
    const score = (row: PlayerValueIndex) => (byValue ? surplusValue(row) : row.grade);
    return positions.map((key) => {
      let best: PlayerValueIndex | null = null;
      for (const row of index) {
        if (row.position_group !== key || row.grade == null || !onTeam(row, team)) continue;
        const value = score(row);
        if (value != null && (best == null || value > (score(best) ?? -Infinity))) best = row;
      }
      if (best == null) return { key, leader: null };
      const value = best.trade_value_musd ?? 0;
      const leader: PositionLeader = {
        name: best.player_name ?? String(best.player_id),
        short: surname(best.player_name ?? String(best.player_id)),
        headshotUrl: mlbPlayerHeadshotUrl(best.player_id),
        ...(byValue
          ? { stat: formatMillions(value, 0), tone: value >= 0 ? "positive" : "destructive" }
          : { stat: formatNumber(best.grade, 0) }),
      };
      return { key, leader };
    });
  }, [positions, index, byValue, team]);

  const pitcherList = PITCHER_GROUPS.has(position);
  const matches = useMemo(() => {
    const rows = index.filter(
      (row) =>
        (search ? (row.player_name ?? "").toLowerCase().includes(search) || (row.team ?? "").toLowerCase().includes(search) : row.position_group === position) &&
        onTeam(row, team)
    );
    const sign = sortDir === "desc" ? -1 : 1;
    return rows.sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va == null && vb == null) return (b.grade ?? -1) - (a.grade ?? -1);
      if (va == null) return 1;
      if (vb == null) return -1;
      return sign * (va - vb) || (b.grade ?? -1) - (a.grade ?? -1);
    });
  }, [index, search, position, team, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_ROWS));
  const current = Math.min(page, totalPages - 1);
  const offset = current * PAGE_ROWS;
  const visible = matches.slice(offset, offset + PAGE_ROWS);

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
  const shown = visible.length === 0 ? "0" : `${offset + 1}–${offset + visible.length}`;
  const pager = <Pager page={current} totalPages={totalPages} onPage={(next) => { setPage(next); setExpanded(null); }} />;

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
          <DownloadCardLink
            href={`/mlb/players/card/${position.toLowerCase()}`}
            filename={`mlb-${position.toLowerCase()}-grades.png`}
            label={`${position} top 10 PNG`}
            className="h-10 border border-input bg-background px-3 text-foreground"
          />
        </div>
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      </div>
      <PlayerComparisonPicker players={comparisonPlayers} selected={compare} onChange={setCompare} description="Compare two batters, starters, or relievers." disclosure={{ open: compareOpen, onOpenChange: setCompareOpen }} />
      {comparedRows.length === 2 && <MlbComparison rows={[comparedRows[0], comparedRows[1]]} loaded={loaded} failed={comparedRows.some((row) => failed[String(row.player_id)])} onRetry={() => retryDetails(comparedRows.map((row) => row.player_id))} />}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
          {search
            ? `${matches.length} player${matches.length === 1 ? "" : "s"} match “${query.trim()}”${totalPages > 1 ? `, showing ${shown}` : ""}.`
            : `${shown} of ${matches.length} ${position}, ${graded} graded.`}{" "}
          {byValue && "Free agents are priced at a market salary with no surplus, so they come last. "}
          <InfoTip text={GRADED_TIP} label="Who is graded?" />
        </p>
        {pager}
      </div>
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
              { key: "value", label: "$ Value" },
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
                rank={offset + i + 1}
                identity={<PlayerCell
                  athleteId={String(row.player_id)}
                  headshotUrl={mlbPlayerHeadshotUrl(row.player_id)}
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
                {open && <PlayerCard row={row} detail={loaded[String(row.player_id)]} failed={!!failed[String(row.player_id)]} onRetry={() => retryDetails([row.player_id])} links={linksFor(row)} />}
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
            <SortHeader label={pitcherList ? "Stuff" : "Bat"} sortKey="bat" active={sortKey === "bat"} dir={sortDir} onSort={onSort} />
            <SortHeader label={pitcherList ? "Cmd" : "Fld"} sortKey="fld" active={sortKey === "fld"} dir={sortDir} onSort={onSort} />
            <SortHeader label="$ Value" sortKey="value" active={sortKey === "value"} dir={sortDir} onSort={onSort} tip={`${TRADE_VALUE_TIP} ${MARKET_VALUE_TIP}`} className="text-right" />
            <SortHeader label="Proj WAR" sortKey="projected_war" active={sortKey === "projected_war"} dir={sortDir} onSort={onSort} className="hidden text-right lg:table-cell" />
            <SortHeader label="$/WAR" sortKey="per_war" active={sortKey === "per_war"} dir={sortDir} onSort={onSort} tip="Next season's salary divided by projected WAR. Lower is cheaper." className="hidden text-right lg:table-cell" />
            <SortHeader label="Ctrl" sortKey="control_years" active={sortKey === "control_years"} dir={sortDir} onSort={onSort} tip="Seasons of team control left, including options the team would exercise." className="text-right" />
            <SortHeader label="Salary" sortKey="salary" active={sortKey === "salary"} dir={sortDir} onSort={onSort} tip="Next season's salary: the contract figure, or the estimated arbitration award or league minimum." className="text-right" />
            <SortHeader label="Impact" sortKey="impact" active={sortKey === "impact"} dir={sortDir} onSort={onSort} tip={IMPACT_TIP} className="text-right" />
            <TableHead className="w-6"><span className="sr-only">Details</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-sm text-muted-foreground">No players match.</TableCell>
            </TableRow>
          ) : (
            visible.map((row, i) => {
              const detail = loaded[String(row.player_id)];
              const head = headlineValue(row);
              const open = expanded === row.player_id;
              const name = row.player_name ?? String(row.player_id);
              const panelId = `mlb-player-${row.player_id}`;
              const ratio = perWar(row);
              const toggle = () => setExpanded(open ? null : row.player_id);
              return (
                <Fragment key={row.player_id}>
                  <TableRow onClick={toggle} className={cn("cursor-pointer", open && "bg-muted/40")}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{offset + i + 1}</TableCell>
                    <TableCell className="min-w-48">
                      <PlayerCell
                        athleteId={String(row.player_id)}
                        headshotUrl={mlbPlayerHeadshotUrl(row.player_id)}
                        name={name}
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
                    <TableCell className="font-mono tabular-nums">{row.bat == null ? EMPTY : Math.round(row.bat)}</TableCell>
                    <TableCell className="font-mono tabular-nums">{row.fld == null ? EMPTY : Math.round(row.fld)}</TableCell>
                    <TableCell className={cn("whitespace-nowrap text-right font-mono font-bold tabular-nums", valueTone(row))}>
                      {row.grade == null ? EMPTY : formatMillions(head.value)}
                      {row.grade != null && head.label === "Market value" && <span className="type-eyebrow ml-1 text-muted-foreground"> mkt</span>}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">{formatNumber(row.projected_war, 1)}</TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums lg:table-cell">{ratio == null ? EMPTY : formatMillions(ratio)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.control_years}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatMillions(row.salary_current_musd)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{row.impact_war == null ? EMPTY : formatSigned(row.impact_war, 1)}</TableCell>
                    <TableCell className="pl-0 text-right">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        aria-label={`${open ? "Hide" : "Show"} full player card for ${name}`}
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
                      <TableCell id={panelId} colSpan={13} className="whitespace-normal bg-muted/20">
                        <PlayerCard row={row} detail={detail} failed={!!failed[String(row.player_id)]} onRetry={() => retryDetails([row.player_id])} links={linksFor(row)} />
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
