"use client";

import { useMemo, useState } from "react";
import { PlayerHeadshot } from "@/components/player-headshot";
import type { AwardBoard, AwardKey } from "@/lib/nfl-awards-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LABELS: Record<string, string> = {
  passing_yards: "passing yards", passing_tds: "passing TDs", passing_interceptions: "interceptions",
  rushing_yards: "rushing yards", rushing_tds: "rushing TDs", receiving_yards: "receiving yards",
  receiving_tds: "receiving TDs", def_sacks: "sacks", def_qb_hits: "QB hits",
  def_interceptions: "defensive interceptions", def_pass_defended: "passes defended",
  def_tackles_for_loss: "tackles for loss", def_fumbles_forced: "forced fumbles",
  def_tackles_solo: "solo tackles", def_tds: "defensive TDs", win_pct: "team win rate",
  team_wins: "team wins", projected_team_wins: "projected team wins", win_improvement: "record improvement",
  point_margin: "scoring margin", games: "games played", remaining_games: "games remaining",
  epa_per_opportunity: "offensive efficiency", prior_missed_games: "prior missed games",
};
function label(key: string) {
  if (key.startsWith("is_")) return `${key.slice(3)} position`;
  return LABELS[key] ?? LABELS[key.replace("projected_", "")] ?? key.replaceAll("_", " ");
}
function projections(row: AwardBoard) {
  const keys = row.position === "HC" ? ["projected_team_wins"]
    : row.position === "QB" ? ["projected_passing_yards", "projected_passing_tds"]
    : ["RB", "FB"].includes(row.position) ? ["projected_rushing_yards", "projected_rushing_tds"]
    : ["WR", "TE"].includes(row.position) ? ["projected_receiving_yards", "projected_receiving_tds"]
    : ["projected_def_sacks", "projected_def_interceptions"];
  return keys.filter((key) => row.projected_stats[key] != null).map((key) =>
    `${row.projected_stats[key].toLocaleString("en-US", { maximumFractionDigits: 1 })} ${label(key)}`
  ).join(" · ");
}

export function NflAwardsBoard({ rows, award }: { rows: AwardBoard[]; award: AwardKey }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"award" | "performance">("award");
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = rows.filter((row) => `${row.candidate_name} ${row.team} ${row.position}`.toLocaleLowerCase().includes(query));
    filtered.sort((a, b) => sort === "performance"
      ? (a.performance_rank ?? Infinity) - (b.performance_rank ?? Infinity)
      : (a.predicted_rank ?? Infinity) - (b.predicted_rank ?? Infinity));
    return query ? filtered : filtered.slice(0, 25);
  }, [rows, search, sort]);
  const metric = award === "COY" ? "Team record improvement"
    : ["DPOY", "DROY"].includes(award) ? "Defensive production index" : "Shrunk competitive EPA above a positional baseline";
  return <section className="space-y-4" aria-label="Award candidates">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="w-full sm:w-72"><label htmlFor="award-search" className="mb-1 block text-xs text-muted-foreground">Search every candidate</label>
        <input className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-offset-2 focus-visible:outline-2" id="award-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Player, coach, team, or position" />
      </div>
      <label className="text-xs text-muted-foreground">Sort by
        <select aria-label="Sort award candidates" className="ml-2 rounded-md border bg-background px-3 py-2 text-foreground" value={sort}
          onChange={(e) => setSort(e.target.value as "award" | "performance")}>
          <option value="award">Award forecast</option><option value="performance">Performance</option>
        </select>
      </label>
    </div>
    <p className="text-xs text-muted-foreground" aria-live="polite">{search.trim() ? `${visible.length} search result${visible.length === 1 ? "" : "s"}` : `Top ${visible.length}`} · {rows.length.toLocaleString()} candidates</p>
    <Table><TableHeader><TableRow>
      <TableHead>Rank</TableHead><TableHead>Candidate</TableHead><TableHead className="text-right">Weekly move</TableHead>
      <TableHead className="text-right">Performance rank</TableHead><TableHead className="text-right">Win probability</TableHead>
    </TableRow></TableHeader><TableBody>
      {visible.map((row) => <TableRow key={row.candidate_id}>
        <TableCell className="align-top font-mono tabular-nums">{row.predicted_rank}</TableCell>
        <TableCell className="min-w-56 whitespace-normal"><details>
          <summary className="cursor-pointer font-medium"><span className="ml-1 inline-flex items-center gap-3 align-middle"><PlayerHeadshot name={row.candidate_name} src={row.headshot_url} /><span>{row.candidate_name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{row.team} · {row.position}</span></span></span></summary>
          <div className="mt-3 max-w-md space-y-2 text-xs text-muted-foreground">
            <p>{row.games} games played. Projected finish: {projections(row)}.</p>
            <p>{metric}: {row.performance_score == null ? "unavailable" : row.performance_score.toFixed(2)}.</p>
            <p className="font-medium text-foreground">Main forecast factors</p>
            <ul className="space-y-1">{row.drivers.map((driver) => <li key={driver.feature}>{label(driver.feature)}: {driver.contribution >= 0 ? "raises" : "lowers"} the model score</li>)}</ul>
            <p>Factors describe the fitted model, not a causal explanation of voters.</p>
          </div>
        </details></TableCell>
        <TableCell className="text-right align-top font-mono tabular-nums">{row.rank_change == null ? "Unavailable" : row.rank_change === 0 ? "0" : `${row.rank_change > 0 ? "+" : ""}${row.rank_change}`}</TableCell>
        <TableCell className="text-right align-top font-mono tabular-nums">{row.performance_rank == null ? "Unavailable" : `#${row.performance_rank}`}</TableCell>
        <TableCell className="text-right align-top font-mono tabular-nums">{row.win_probability == null ? <span className="font-sans text-xs text-muted-foreground">Experimental</span> : `${(row.win_probability * 100).toFixed(1)}%`}</TableCell>
      </TableRow>)}
      {!visible.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No candidates match your search.</TableCell></TableRow>}
    </TableBody></Table>
    <p className="text-xs leading-relaxed text-muted-foreground">Performance ranks use {metric.toLowerCase()}. Offensive credit splits passing EPA between passer and receiver and excludes noncompetitive drives. It subtracts a positional 25th-percentile baseline and uses a 150-opportunity prior to reduce small-sample outliers. Defensive ranks use a descriptive box-stat index. These are separate measures and do not imply equal value across positions.</p>
  </section>;
}
