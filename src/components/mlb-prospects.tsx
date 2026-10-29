"use client";

import { Fragment, useEffect, useEffectEvent, useMemo, useState } from "react";
import type { ProspectPage, ProspectRow } from "@/lib/mlb-prospects";
import {
  CONTROL_TIP,
  DEFAULT_PROSPECT_FILTERS,
  ETA_TIP,
  INPUTS_TIP,
  PEAK_GRADE_TIP,
  PROSPECT_LEVELS,
  PROSPECT_ORGS,
  PROSPECT_PAGE,
  PROSPECT_SORTS,
  PROSPECT_TRADE_VALUE_TIP,
  P_MLB_TIP,
  P_REGULAR_TIP,
  RISK_TIP,
  SAMPLE_TIP,
  TRAITS_TIP,
  inputLabel,
  isPitcherGroup,
  levelLabel,
  prospectQuery,
  prospectSearch,
  prospectTraits,
  ungradedReason,
  type ProspectFilters,
  type ProspectSort,
} from "@/lib/prospect-values";
import { MLB_POSITION_ORDER, formatMillions } from "@/lib/player-values";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { EMPTY, cn, formatNumber, formatSigned } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import { Notice } from "@/components/notice";
import { PlayerCell } from "@/components/player-cell";
import { ComparisonGrades, ComparisonMetrics, type ComparisonMetric } from "@/components/player-comparison";
import { PlayerComparisonPicker, type ComparisonPlayer } from "@/components/player-comparison-picker";
import { PlayerRowDisclosure, PlayerRowHeader } from "@/components/player-row-disclosure";
import { BaseballSeasonStats } from "@/components/baseball-season-stats";
import { seasonStats } from "@/lib/season-stats";
import { TeamLogo } from "@/components/team-logo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CONTROL_YEARS = 6;
const RISK_LABEL: Record<string, string> = { safe: "Safe", medium: "Medium", high: "High", extreme: "Extreme" };
const SELECT = "h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm md:h-8 md:rounded-none md:bg-transparent md:font-mono md:text-xs";

function percent(value: number | null): string {
  return value == null ? EMPTY : `${Math.round(value * 100)}%`;
}

function GradeBar({ grade }: { grade: number | null }) {
  const width = grade == null ? 0 : Math.max(0, Math.min(100, ((grade - 20) / 60) * 100));
  return (
    <span className="inline-block h-1.5 w-14 overflow-hidden rounded-[1px] bg-grid align-middle">
      <span className="block h-full bg-primary" style={{ width: `${width}%` }} />
    </span>
  );
}

function identity(row: ProspectRow) {
  const name = row.player_name ?? String(row.player_id);
  return (
    <PlayerCell
      athleteId={String(row.player_id)}
      headshotUrl={row.headshot_url}
      name={name}
      team={[row.org, row.team].filter(Boolean).join(" · ") || "Unassigned"}
      position={row.position_group}
      logo={mlbTeamIdentity(row.org)}
      headshotFallback={<TeamLogo team={mlbTeamIdentity(row.org)} name={row.org ?? name} className="h-6 w-6" />}
    />
  );
}

function acquisition(row: ProspectRow): string | null {
  const bonus = row.signing_bonus_musd != null && row.signing_bonus_musd > 0 ? `, ${formatMillions(row.signing_bonus_musd)} bonus` : "";
  if (row.acquired === "draft" && row.draft_year != null) {
    const round = row.draft_round ? `, round ${row.draft_round}` : "";
    const pick = row.draft_pick != null ? `, pick ${row.draft_pick}` : "";
    return `${row.draft_year} draft${round}${pick}${bonus}`;
  }
  if (row.acquired === "international") return `International signing${bonus}`;
  if (row.acquired === "undrafted") return `Undrafted free agent${bonus}`;
  return null;
}

function mlbTime(row: ProspectRow): string {
  const unit = isPitcherGroup(row.position_group) ? "IP" : "AB";
  const amount = row.mlb_ab_or_ip ?? 0;
  const days = row.service_days ?? 0;
  if (amount <= 0 && days <= 0) return "No MLB time";
  return `${formatNumber(amount, 0)} MLB ${unit}, ${days} service day${days === 1 ? "" : "s"}`;
}

function Headline({ label, tip, value, sub, tone }: { label: string; tip: string; value: string; sub: string; tone?: string }) {
  return (
    <div>
      <div className="type-eyebrow flex min-h-8 items-center justify-center gap-1 text-muted-foreground">
        {label} <InfoTip text={tip} label={`What is ${label}?`} />
      </div>
      <div className={cn("font-mono text-lg font-bold tabular-nums sm:text-2xl", tone)}>{value}</div>
      <div className="font-mono text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function ProspectCard({ row }: { row: ProspectRow }) {
  const pitcher = isPitcherGroup(row.position_group);
  const stats = seasonStats(row.season_stats, pitcher, true);
  const graded = row.peak_grade != null;
  const traits = prospectTraits(row.position_group);
  const acquired = acquisition(row);
  const level = levelLabel(row.level);
  const sampleUnit = pitcher ? "BF" : "PA";
  const perYear = row.expected_control_war == null ? null : row.expected_control_war / CONTROL_YEARS;
  return (
    <div className="min-w-0 space-y-4 py-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>{row.bats ?? "?"}/{row.throws ?? "?"}</span>
        {row.age != null && <span>Age {formatNumber(row.age, 1)}</span>}
        {(row.team || level) && <span>{[row.team, level].filter(Boolean).join(", ")}</span>}
        {acquired && <span>{acquired}</span>}
        <span>{row.on_40_man ? "On 40-man roster" : "Not on 40-man roster"}</span>
        <span>{mlbTime(row)}</span>
        {row.sample != null && (
          <span className="inline-flex items-center gap-1">
            {formatNumber(row.sample, 0)} {sampleUnit} in window
            {row.season_sample != null && `, ${formatNumber(row.season_sample, 0)} in ${row.season}`}
            {row.tracked_share != null && `, ${Math.round(row.tracked_share * 100)}% tracked`}
            <InfoTip text={SAMPLE_TIP} label="What is the sample?" />
          </span>
        )}
      </div>
      {!graded ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Not yet graded.</span> {ungradedReason(row.grade_reason, row.position_group)}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-y-3 border-y border-border py-3 text-center sm:grid-cols-4 [&>div]:min-w-0 [&>div]:px-1.5 sm:[&>div]:px-3">
            <Headline
              label="Peak grade"
              tip={PEAK_GRADE_TIP}
              value={formatNumber(row.peak_grade, 0)}
              sub={`${formatNumber(row.peak_grade_low, 0)} to ${formatNumber(row.peak_grade_high, 0)} · ${formatNumber(row.peak_war, 1)} WAR peak`}
              tone="text-primary"
            />
            <Headline
              label="Trade value"
              tip={PROSPECT_TRADE_VALUE_TIP}
              value={formatMillions(row.trade_value_musd)}
              sub={`${formatMillions(row.trade_value_low)} to ${formatMillions(row.trade_value_high)}`}
              tone={(row.trade_value_musd ?? 0) >= 0 ? "text-positive" : "text-destructive"}
            />
            <Headline label="Regular" tip={P_REGULAR_TIP} value={percent(row.p_regular)} sub={`${percent(row.p_mlb)} reach MLB`} />
            <Headline
              label="Risk"
              tip={`${RISK_TIP} ${P_MLB_TIP}`}
              value={row.risk ? (RISK_LABEL[row.risk] ?? row.risk) : EMPTY}
              sub={row.eta_season != null ? `ETA ${row.eta_season}` : "no ETA"}
            />
          </div>
          {row.eta_season != null && perYear != null && (
            <p className="inline-flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              Control years {row.eta_season} to {row.eta_season + CONTROL_YEARS - 1}: about {formatNumber(perYear, 1)} WAR a season,{" "}
              {formatNumber(row.expected_control_war, 1)} in all.
              <InfoTip text={CONTROL_TIP} label="What are the control years?" />
            </p>
          )}
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <div className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
                Traits <InfoTip text={TRAITS_TIP} label="What are the traits?" />
              </div>
              {row.trait_grades.length === 0 ? (
                <p className="text-xs text-muted-foreground">Traits are unavailable for this player.</p>
              ) : (
                traits.map((trait, i) => {
                  const grade = row.trait_grades[i];
                  const pct = row.trait_pcts[i];
                  return (
                    <div key={trait.key} className={cn("grid min-w-0 grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-2 text-xs sm:gap-2.5", grade == null && "text-muted-foreground")}>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">{trait.label}</span>
                        <InfoTip
                          text={`${trait.tip}${grade == null ? " No data for this player." : pct != null ? ` ${pct}th percentile among prospects.` : ""}`}
                          label={`What is ${trait.label}?`}
                        />
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-[1px] bg-grid">
                        <span className="block h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, pct ?? 0))}%` }} />
                      </span>
                      <span className="text-right font-mono tabular-nums">{grade ?? EMPTY}</span>
                    </div>
                  );
                })
              )}
            </div>
            {row.tip.length > 0 && (
              <div className="space-y-1.5">
                <div className="type-eyebrow inline-flex items-center gap-1 text-muted-foreground">
                  What moved the grade <InfoTip text={INPUTS_TIP} label="What moved the grade?" />
                </div>
                {row.tip.map(([input, contribution]) => (
                  <div key={input} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate">{inputLabel(input)}</span>
                    <span className={cn("font-mono tabular-nums", contribution >= 0 ? "text-positive" : "text-destructive")}>
                      {formatSigned(contribution, 2)} WAR
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {stats && <BaseballSeasonStats stats={stats} />}
    </div>
  );
}

// Each search is a server read, so typed text settles into a search only after
// a pause in typing, and only once it is a valid search.
function useSettledSearch(text: string, current: string | null, onSettle: (search: string | null) => void) {
  const settle = useEffectEvent(onSettle);
  useEffect(() => {
    const next = prospectSearch(text);
    if (next === current) return;
    const timer = window.setTimeout(() => settle(next), 300);
    return () => window.clearTimeout(timer);
  }, [text, current]);
}

// One page from the prospects route; a failed or malformed response throws.
async function requestProspects(query: string, signal: AbortSignal): Promise<{ rows: ProspectRow[]; total: number | null }> {
  const res = await fetch(`/mlb/api/prospects${query ? `?${query}` : ""}`, { signal });
  if (!res.ok) throw new Error("Prospects unavailable");
  const body = (await res.json()) as Partial<ProspectPage>;
  if (!Array.isArray(body.rows)) throw new Error("Malformed prospect page");
  return { rows: body.rows, total: typeof body.total === "number" ? body.total : null };
}

// Hitter and pitcher traits are different sets, so only like is compared with like.
function comparisonPlayer(row: ProspectRow): ComparisonPlayer {
  return {
    id: String(row.player_id),
    label: `${row.player_name ?? row.player_id} · ${row.org ?? "Unassigned"} · ${row.position_group}`,
    group: isPitcherGroup(row.position_group) ? "pitcher" : "hitter",
  };
}

function ProspectHeadToHead({ rows }: { rows: [ProspectRow, ProspectRow] }) {
  const pair = <T,>(value: (row: ProspectRow) => T): [T, T] => [value(rows[0]), value(rows[1])];
  const graded = (row: ProspectRow) => row.peak_grade != null;
  const metrics: ComparisonMetric[] = [
    {
      label: "Peak grade",
      values: pair((row) => (graded(row) ? `${formatNumber(row.peak_grade, 0)} (${formatNumber(row.peak_grade_low, 0)}–${formatNumber(row.peak_grade_high, 0)})` : "Not graded")),
    },
    { label: "Trade value", values: pair((row) => (graded(row) ? formatMillions(row.trade_value_musd) : EMPTY)) },
    { label: "Chance of a regular", values: pair((row) => percent(row.p_regular)) },
    { label: "Chance to reach MLB", values: pair((row) => percent(row.p_mlb)) },
    { label: "ETA", values: pair((row) => (row.eta_season == null ? EMPTY : String(row.eta_season))) },
    { label: "Risk", values: pair((row) => (row.risk ? (RISK_LABEL[row.risk] ?? row.risk) : EMPTY)) },
    { label: "Peak WAR", values: pair((row) => formatNumber(row.peak_war, 1)) },
    { label: "Control-year WAR", values: pair((row) => formatNumber(row.expected_control_war, 1)) },
    { label: "Level", values: pair((row) => levelLabel(row.level) ?? EMPTY) },
    { label: "Age", values: pair((row) => formatNumber(row.age, 1)) },
    { label: "40-man roster", values: pair((row) => (row.on_40_man ? "Yes" : "No")) },
    {
      label: "Sample in window",
      values: pair((row) => (row.sample == null ? EMPTY : `${formatNumber(row.sample, 0)} ${isPitcherGroup(row.position_group) ? "BF" : "PA"}`)),
    },
  ].filter((metric) => metric.values.some((value) => value !== EMPTY));
  const traits = prospectTraits(rows[0].position_group);
  const bothTraits = rows.every((row) => row.trait_grades.length > 0);
  return (
    <section aria-label="Prospect comparison" className="space-y-4 rounded-lg border border-rule-strong p-4">
      <div className="grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.player_id} className="min-w-0">
            {identity(row)}
          </div>
        ))}
      </div>
      <ComparisonMetrics metrics={metrics} />
      {bothTraits ? (
        <div className="space-y-3">
          <h3 className="inline-flex items-center gap-1 text-sm">
            Traits <InfoTip text={TRAITS_TIP} label="What are the traits?" />
          </h3>
          <ComparisonGrades grades={traits.map((trait, i) => ({ label: trait.label, values: [rows[0].trait_grades[i], rows[1].trait_grades[i]] }))} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Traits are compared once both players are graded.</p>
      )}
    </section>
  );
}

// The picker searches the whole table by name; with nothing typed it offers
// the prospects the list is showing.
function ProspectComparison({ suggestions }: { suggestions: ProspectRow[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<ProspectRow[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const [found, setFound] = useState<Record<string, ProspectRow[]>>({});
  const [failedSearch, setFailedSearch] = useState<string | null>(null);

  useSettledSearch(query, search, setSearch);

  useEffect(() => {
    if (search == null || found[search] || failedSearch === search) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    let active = true;
    requestProspects(prospectQuery({ ...DEFAULT_PROSPECT_FILTERS, search }), controller.signal)
      .then((page) => {
        if (active) setFound((prev) => ({ ...prev, [search]: page.rows }));
      })
      .catch(() => {
        if (active) setFailedSearch(search);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, found, failedSearch]);

  const pool = useMemo(() => {
    const candidates = search == null ? suggestions : (found[search] ?? []);
    return new Map([...picked, ...candidates].map((row) => [String(row.player_id), row]));
  }, [picked, suggestions, search, found]);
  const players = useMemo(() => [...pool.values()].map(comparisonPlayer), [pool]);
  const status = search == null || found[search] ? null : failedSearch === search ? "failed" : "searching";

  return (
    <>
      <PlayerComparisonPicker
        players={players}
        selected={picked.map((row) => String(row.player_id))}
        onChange={(ids) => setPicked(ids.flatMap((id) => pool.get(id) ?? []))}
        description="Compare two hitters or two pitchers. Search any prospect by name."
        disclosure={{ open, onOpenChange: setOpen }}
        noun="prospect"
        search={{
          onQueryChange: (text) => {
            setQuery(text);
            setFailedSearch(null);
          },
          status,
          placeholder: "Search name",
        }}
      />
      {picked.length === 2 && <ProspectHeadToHead rows={[picked[0], picked[1]]} />}
    </>
  );
}

type LoadState = "loading" | "failed";

export default function MlbProspects({ initial }: { initial: ProspectPage }) {
  const [filters, setFilters] = useState<ProspectFilters>(DEFAULT_PROSPECT_FILTERS);
  // Every filter set already fetched, so going back to one costs no request.
  const [results, setResults] = useState<Record<string, { rows: ProspectRow[]; total: number }>>({
    [prospectQuery(DEFAULT_PROSPECT_FILTERS)]: { rows: initial.rows, total: initial.total ?? initial.rows.length },
  });
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const key = prospectQuery(filters);
  const current = results[key];
  const offset = current == null ? 0 : moreFor === key && current.rows.length < current.total ? current.rows.length : null;
  const requestKey = offset == null ? null : `${key}@${offset}`;
  const state: LoadState | null = requestKey == null ? null : failed[requestKey] ? "failed" : "loading";

  useEffect(() => {
    if (requestKey == null || offset == null || failed[requestKey]) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    let active = true;
    const query = [key, offset > 0 ? `offset=${offset}` : ""].filter(Boolean).join("&");
    requestProspects(query, controller.signal)
      .then((page) => {
        if (!active) return;
        setResults((prev) => {
          const existing = prev[key];
          if (offset === 0) return { ...prev, [key]: { rows: page.rows, total: page.total ?? page.rows.length } };
          // A response for a stale offset must not duplicate rows.
          if (!existing || existing.rows.length !== offset) return prev;
          const total = page.rows.length < PROSPECT_PAGE ? offset + page.rows.length : existing.total;
          return { ...prev, [key]: { rows: [...existing.rows, ...page.rows], total } };
        });
        setMoreFor(null);
      })
      .catch(() => {
        if (active) setFailed((prev) => ({ ...prev, [requestKey]: true }));
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [requestKey, key, offset, failed]);

  const update = (patch: Partial<ProspectFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setExpanded(null);
    setMoreFor(null);
  };

  useSettledSearch(query, filters.search, (search) => update({ search }));
  const retry = () => {
    if (!requestKey) return;
    setFailed((prev) => {
      const next = { ...prev };
      delete next[requestKey];
      return next;
    });
  };

  const rows = current?.rows ?? [];
  const total = current?.total ?? 0;
  const pitcherFilter = filters.position != null && isPitcherGroup(filters.position);
  // Ungraded rows sort last under every order, so an ungraded first row means none are graded.
  const noneGraded = rows.length > 0 && rows[0].peak_grade == null;

  const status =
    state === "failed" ? (
      <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <p>Could not load prospects. Please try again.</p>
        <button type="button" onClick={retry} className="min-h-10 rounded-md border border-border px-3 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
          Retry
        </button>
      </div>
    ) : state === "loading" ? (
      <p role="status" className="text-sm text-muted-foreground">Loading prospects…</p>
    ) : null;

  return (
    <div className="min-w-0 space-y-section">
      <ProspectComparison suggestions={rows} />
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <select aria-label="Organization" value={filters.org ?? ""} onChange={(e) => update({ org: e.target.value || null })} className={SELECT}>
          <option value="">All organizations</option>
          {PROSPECT_ORGS.map((org) => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <select aria-label="Level" value={filters.level ?? ""} onChange={(e) => update({ level: e.target.value || null })} className={SELECT}>
          <option value="">All levels</option>
          {PROSPECT_LEVELS.map((level) => (
            <option key={level.key} value={level.key}>{level.label}</option>
          ))}
        </select>
        <select aria-label="Position" value={filters.position ?? ""} onChange={(e) => update({ position: e.target.value || null })} className={SELECT}>
          <option value="">All positions</option>
          {MLB_POSITION_ORDER.map((position) => (
            <option key={position} value={position}>{position}</option>
          ))}
        </select>
        <select aria-label="Sort by" value={filters.sort} onChange={(e) => update({ sort: e.target.value as ProspectSort })} className={SELECT}>
          {PROSPECT_SORTS.map((sort) => (
            <option key={sort.key} value={sort.key}>{sort.label}</option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player"
          aria-label="Search player"
          className={cn(SELECT, "col-span-2 w-full sm:w-56")}
        />
        <label className="col-span-2 inline-flex min-h-10 items-center gap-2 text-sm md:min-h-8 md:text-xs">
          <input type="checkbox" checked={filters.gradedOnly} onChange={(e) => update({ gradedOnly: e.target.checked })} className="size-4" />
          Graded only
        </label>
      </div>

      {current != null && (
        <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
          {total === 0
            ? "No prospects match."
            : filters.search
              ? `${formatNumber(total, 0)} prospect${total === 1 ? "" : "s"} match “${query.trim()}”${rows.length < total ? `, showing ${rows.length}` : ""}.`
              : `Showing ${rows.length} of ${formatNumber(total, 0)} prospects.`}{" "}
          Open a player for traits and what moved his grade.
        </p>
      )}

      {current != null && (noneGraded || (total === 0 && filters.gradedOnly && pitcherFilter)) && (
        <Notice>
          <p className="text-sm text-muted-foreground">
            {pitcherFilter
              ? "None of these pitchers has a grade yet. They are listed with their level, age, and playing time."
              : "None of these prospects has a grade yet. They are listed with their level, age, and playing time."}
          </p>
        </Notice>
      )}

      {current == null ? (
        status
      ) : (
        <>
          <div className="md:hidden">
            <PlayerRowHeader />
            {rows.map((row, i) => {
              const open = expanded === row.player_id;
              const name = row.player_name ?? String(row.player_id);
              return (
                <article key={row.player_id} aria-label={name} className="min-w-0 border-b border-border">
                  <PlayerRowDisclosure
                    name={name}
                    rank={i + 1}
                    identity={identity(row)}
                    grade={row.peak_grade == null ? EMPTY : formatNumber(row.peak_grade, 0)}
                    open={open}
                    panelId={`mlb-mobile-prospect-${row.player_id}`}
                    onToggle={() => setExpanded(open ? null : row.player_id)}
                  />
                  <div id={`mlb-mobile-prospect-${row.player_id}`} hidden={!open} className="border-t border-border px-3">
                    {open && <ProspectCard row={row} />}
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
                  <TableHead>Level</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead aria-sort={filters.sort === "grade" ? "descending" : undefined}>
                    Peak grade <InfoTip text={PEAK_GRADE_TIP} label="What is Peak grade?" className="ml-1" />
                  </TableHead>
                  <TableHead className="text-right" aria-sort={filters.sort === "regular" ? "descending" : undefined}>
                    Regular <InfoTip text={P_REGULAR_TIP} label="What is Regular?" className="ml-1" />
                  </TableHead>
                  <TableHead className="text-right" aria-sort={filters.sort === "eta" ? "ascending" : undefined}>
                    ETA <InfoTip text={ETA_TIP} label="What is ETA?" className="ml-1" />
                  </TableHead>
                  <TableHead className="text-right" aria-sort={filters.sort === "value" ? "descending" : undefined}>
                    Value <InfoTip text={PROSPECT_TRADE_VALUE_TIP} label="What is Value?" className="ml-1" />
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Risk <InfoTip text={RISK_TIP} label="What is Risk?" className="ml-1" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-sm text-muted-foreground">No prospects match.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, i) => {
                    const open = expanded === row.player_id;
                    const graded = row.peak_grade != null;
                    return (
                      <Fragment key={row.player_id}>
                        <TableRow
                          onClick={() => setExpanded(open ? null : row.player_id)}
                          aria-expanded={open}
                          className={cn("cursor-pointer", open && "bg-muted/40")}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="min-w-56 max-w-72">{identity(row)}</TableCell>
                          <TableCell className="font-mono text-xs">{levelLabel(row.level) ?? EMPTY}</TableCell>
                          <TableCell className="font-mono tabular-nums">{row.age == null ? EMPTY : formatNumber(row.age, 1)}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono tabular-nums">
                            {graded ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="font-bold text-primary">{formatNumber(row.peak_grade, 0)}</span>
                                <GradeBar grade={row.peak_grade} />
                                <span className="text-[11px] text-muted-foreground">{formatNumber(row.peak_grade_low, 0)}–{formatNumber(row.peak_grade_high, 0)}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not yet graded</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{percent(row.p_regular)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{row.eta_season ?? EMPTY}</TableCell>
                          <TableCell className={cn("whitespace-nowrap text-right font-mono font-bold tabular-nums", !graded ? "text-muted-foreground" : (row.trade_value_musd ?? 0) >= 0 ? "text-positive" : "text-destructive")}>
                            {graded ? formatMillions(row.trade_value_musd) : EMPTY}
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs lg:table-cell">{row.risk ? (RISK_LABEL[row.risk] ?? row.risk) : EMPTY}</TableCell>
                        </TableRow>
                        {open && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={9} className="whitespace-normal bg-muted/20">
                              <ProspectCard row={row} />
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
          {status}
          {state == null && rows.length < total && (
            <button
              type="button"
              onClick={() => setMoreFor(key)}
              className="min-h-10 self-start rounded-md border border-border px-4 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              Show {Math.min(PROSPECT_PAGE, total - rows.length)} more
            </button>
          )}
        </>
      )}
    </div>
  );
}
