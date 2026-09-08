"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CfbHeismanBoardRow,
  CfbHeismanHistory,
  CfbPlayerModelMeta,
  CfbPlayerValue,
  CfbTeamIdentity,
} from "@/lib/types";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import { EMPTY, formatNumber, formatPct, formatSigned } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { ToggleGroup } from "@/components/toggle-group";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const VIEWS = [
  { key: "board", label: "Heisman board" },
  { key: "value", label: "Value board" },
  { key: "trajectory", label: "Trajectory" },
  { key: "history", label: "History" },
  { key: "method", label: "Method" },
] as const;
type View = (typeof VIEWS)[number]["key"];

const POSITIONS = [
  { key: "all", label: "All" },
  { key: "QB", label: "QB" },
  { key: "RB", label: "RB" },
  { key: "WR", label: "WR" },
  { key: "TE", label: "TE" },
  { key: "DL", label: "DL" },
  { key: "LB", label: "LB" },
  { key: "DB", label: "DB" },
] as const;
type Position = (typeof POSITIONS)[number]["key"];

const METRICS = [
  { key: "epa", label: "Points" },
  { key: "wpa", label: "Wins" },
] as const;
type Metric = (typeof METRICS)[number]["key"];

const VALUE_ROWS = 50;
const FCS_HEAVY_SHARE = 0.3;
const LINE_TOKENS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const;

const numCell = "text-right font-mono tabular-nums";
const mutedNumCell = `${numCell} text-muted-foreground`;

interface CreditShare {
  role: string;
  share: number;
}

interface CreditShares {
  offense: Record<string, CreditShare>;
  defense: Record<string, string>;
}

interface Reliability {
  position_group: string;
  players: number;
  split_half_correlation: number;
}

function parseJson<T>(text: string | null | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function PlayerCell({
  name,
  team,
  position,
  logo,
}: {
  name: string;
  team: string;
  position: string | null;
  logo: CfbTeamIdentity | undefined;
}) {
  return (
    <div className="flex items-center gap-2">
      <TeamLogo team={logo} name={team} />
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {team}
          {position ? ` · ${position}` : ""}
        </div>
      </div>
    </div>
  );
}

function statLine(row: CfbHeismanBoardRow): string {
  const parts: string[] = [];
  if ((row.pass_yards ?? 0) > 0) {
    parts.push(
      `${formatNumber(row.pass_yards, 0)} pass yds, ${formatNumber(row.pass_touchdowns, 0)} TD, ${formatNumber(row.interceptions, 0)} INT`
    );
  }
  if ((row.rush_yards ?? 0) > 0) {
    parts.push(
      `${formatNumber(row.rush_yards, 0)} rush yds, ${formatNumber(row.rush_touchdowns, 0)} TD`
    );
  }
  if ((row.receiving_yards ?? 0) > 0) {
    parts.push(
      `${formatNumber(row.receiving_yards, 0)} rec yds, ${formatNumber(row.receiving_touchdowns, 0)} TD`
    );
  }
  // A quarterback's tackle after an interception is not a season line.
  if (parts.length === 0 && (row.tackles ?? 0) > 0) {
    parts.push(
      `${formatNumber(row.tackles, 0)} tkl, ${formatNumber(row.sacks, 1)} sacks, ${formatNumber(row.defensive_interceptions, 0)} INT`
    );
  }
  return parts.join(" · ") || EMPTY;
}

function HeismanBoard({
  rows,
  week,
  logoFor,
}: {
  rows: CfbHeismanBoardRow[];
  week: number | null;
  logoFor: (team: string) => CfbTeamIdentity | undefined;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The ballot forecast is built after the first week with a value
        snapshot. Nothing to show yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Predicted vote share through week {week}. The gap column is the
        player&apos;s value rank minus his predicted finish: negative means
        the plays say he is better than the voters will, positive means the
        narrative is carrying him.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableCaption className="sr-only">Predicted Heisman vote shares</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Share</TableHead>
              <TableHead className="text-right">Value rank</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Record</TableHead>
              <TableHead className="text-right">AP</TableHead>
              <TableHead>Season line</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.athlete_id}>
                <TableCell className={mutedNumCell}>{row.predicted_rank}</TableCell>
                <TableCell>
                  <PlayerCell
                    name={row.athlete_name}
                    team={row.team}
                    position={row.position}
                    logo={logoFor(row.team)}
                  />
                </TableCell>
                <TableCell className={numCell}>{formatPct(row.predicted_share, 1)}</TableCell>
                <TableCell className={numCell}>
                  {row.value_rank != null ? `#${row.value_rank}` : EMPTY}
                </TableCell>
                <TableCell className={numCell}>
                  {row.rank_gap != null ? formatSigned(row.rank_gap, 0) : EMPTY}
                </TableCell>
                <TableCell className={numCell}>{formatPct(row.win_pct, 0)}</TableCell>
                <TableCell className={mutedNumCell}>
                  {row.ap_rank != null ? row.ap_rank : EMPTY}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{statLine(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ValueBoard({
  values,
  logoFor,
}: {
  values: CfbPlayerValue[];
  logoFor: (team: string) => CfbTeamIdentity | undefined;
}) {
  const [position, setPosition] = useState<Position>("all");
  const [metric, setMetric] = useState<Metric>("epa");
  const rows = useMemo(() => {
    const filtered =
      position === "all"
        ? values
        : values.filter((v) => v.position_group === position);
    const sorted =
      metric === "wpa"
        ? [...filtered].sort((a, b) => b.wpa - a.wpa)
        : filtered;
    return sorted.slice(0, VALUE_ROWS);
  }, [values, position, metric]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          label="Position group"
          options={POSITIONS}
          value={position}
          onChange={setPosition}
          variant="chip"
        />
        <ToggleGroup
          label="Value currency"
          options={METRICS}
          value={metric}
          onChange={setMetric}
          variant="pill"
        />
      </div>
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {metric === "epa"
          ? "Points above replacement: opponent-adjusted EPA on competitive plays, per game shrunk toward the position mean, minus what a freely available player at the position produces per game, times games played."
          : "Win probability added: the same play credit measured in the in-game model's win probability, which rewards leverage and ignores garbage time by construction. Unadjusted for opponent."}
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableCaption className="sr-only">Player value leaderboard</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">G</TableHead>
              <TableHead className="text-right">Plays</TableHead>
              <TableHead className="text-right">Adj EPA</TableHead>
              <TableHead className="text-right">Per play</TableHead>
              <TableHead className="text-right">Per game</TableHead>
              <TableHead className="text-right">Above repl.</TableHead>
              <TableHead className="text-right">WPA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.athlete_id}>
                <TableCell className={mutedNumCell}>
                  {metric === "wpa" || position !== "all" ? index + 1 : row.overall_rank}
                </TableCell>
                <TableCell>
                  <PlayerCell
                    name={row.athlete_name}
                    team={row.team}
                    position={row.position}
                    logo={logoFor(row.team)}
                  />
                  {row.fcs_play_share > FCS_HEAVY_SHARE && (
                    <span
                      className="ml-7 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
                      title="More than 30 percent of this player's credited plays came against FCS opponents, which count half."
                    >
                      FCS-heavy
                    </span>
                  )}
                </TableCell>
                <TableCell className={mutedNumCell}>{row.games}</TableCell>
                <TableCell className={mutedNumCell}>{formatNumber(row.plays, 0)}</TableCell>
                <TableCell className={numCell}>{formatSigned(row.adjusted_epa, 1)}</TableCell>
                <TableCell className={numCell}>{formatSigned(row.adjusted_rate, 3)}</TableCell>
                <TableCell className={numCell}>{formatSigned(row.shrunk_per_game, 2)}</TableCell>
                <TableCell className={numCell}>
                  {formatSigned(row.value_above_replacement, 1)}
                </TableCell>
                <TableCell className={numCell}>{formatSigned(row.wpa, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Trajectory({ rows }: { rows: CfbPlayerValue[] }) {
  const theme = useChartTheme();
  const axis = chartAxisProps(theme);
  const { data, players } = useMemo(() => {
    const byWeek = new Map<number, Record<string, number>>();
    const names = new Map<string, string>();
    for (const row of rows) {
      names.set(row.athlete_id, row.athlete_name);
      const week = byWeek.get(row.week) ?? { week: row.week };
      week[row.athlete_id] = row.value_above_replacement;
      byWeek.set(row.week, week);
    }
    const latestWeek = Math.max(...byWeek.keys());
    const latest = byWeek.get(latestWeek) ?? {};
    const ordered = [...names.keys()].sort(
      (a, b) => (latest[b] ?? 0) - (latest[a] ?? 0)
    );
    return {
      data: [...byWeek.values()].sort((a, b) => a.week - b.week),
      players: ordered.map((id) => ({ id, name: names.get(id) ?? id })),
    };
  }, [rows]);

  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        The trajectory needs at least two weekly snapshots.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        Cumulative points above replacement by week for the current top eight.
        Each point is the snapshot published after that week, so the line is
        what the board said at the time, not a recomputation.
      </p>
      <div role="img" aria-label="Points above replacement by week for the value leaders">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
            <XAxis dataKey="week" tickFormatter={(w: number) => `W${w}`} {...axis} />
            <YAxis tickFormatter={(v: number) => v.toFixed(0)} {...axis} />
            <Tooltip
              formatter={(value) => formatNumber(Number(value), 1)}
              labelFormatter={(label) => `Week ${label}`}
              cursor={{ stroke: theme.border, strokeWidth: 1 }}
              contentStyle={chartTooltipStyle(theme)}
            />
            <Legend
              wrapperStyle={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: 11,
              }}
            />
            {players.map((player, index) => (
              <Line
                key={player.id}
                type="monotone"
                dataKey={player.id}
                name={player.name}
                stroke={theme[LINE_TOKENS[index % LINE_TOKENS.length]]}
                strokeWidth={index < LINE_TOKENS.length ? 1.75 : 1}
                strokeDasharray={index < LINE_TOKENS.length ? undefined : "4 2"}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function History({ rows, meta, week }: { rows: CfbHeismanHistory[]; meta: CfbPlayerModelMeta | null; week: number | null }) {
  const weeklyEvaluation = meta?.heisman_model_version === "cfb_heisman_share_v2";
  return (
    <div className="space-y-3">
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {weeklyEvaluation ? (
          <>Each season is evaluated through {week != null ? `Week ${week}` : "the available weekly cutoff"}, using a model trained
          only on earlier seasons and candidates selected from that week&apos;s
          statistics. Winners outside the candidate pool count as misses.
          Value ranks use the same weekly cutoff, where available.</>
        ) : (
          <>Each season is scored using full-season statistics by a ballot model
          fit on every other season. This does not measure early-season forecast
          accuracy. Value ranks show the final season board where available.</>
        )}
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableCaption className="sr-only">Heisman winners against the model</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead>Winner</TableHead>
              <TableHead className="text-right">Vote share</TableHead>
              <TableHead>Model pick</TableHead>
              <TableHead className="text-right">Winner&apos;s predicted rank</TableHead>
              <TableHead className="text-right">Winner&apos;s value rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.season}>
                <TableCell className="font-mono tabular-nums">{row.season}</TableCell>
                <TableCell>
                  <span className="font-medium">{row.actual_winner}</span>
                  <span className="text-muted-foreground"> · {row.actual_winner_team}</span>
                </TableCell>
                <TableCell className={numCell}>{formatPct(row.actual_share, 0)}</TableCell>
                <TableCell>
                  <span className={row.winner_hit ? "font-medium" : "text-muted-foreground"}>
                    {row.predicted_winner}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatPct(row.predicted_winner_share, 0)}
                  </span>
                </TableCell>
                <TableCell className={numCell}>
                  {row.actual_winner_predicted_rank != null
                    ? `#${row.actual_winner_predicted_rank}` : "Outside pool"}
                </TableCell>
                <TableCell className={numCell}>
                  {row.winner_value_rank != null ? `#${row.winner_value_rank}` : EMPTY}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Method({ meta }: { meta: CfbPlayerModelMeta | null }) {
  const shares = parseJson<CreditShares>(meta?.credit_shares);
  const reliability = parseJson<Reliability[]>(meta?.reliability) ?? [];
  const offenseShares = shares
    ? Object.entries(shares.offense).map(([key, value]) => {
        const [kind, stat] = key.split(":");
        return { kind, stat, ...value };
      })
    : [];
  return (
    <div className="max-w-4xl space-y-6 text-sm leading-relaxed">
      <section className="space-y-2">
        <h3 className="font-heading text-base">Play credit</h3>
        <p className="text-muted-foreground">
          Every play&apos;s expected points added is split among the players
          the stat feed credits on it with fixed shares; the remainder belongs
          to the unit. The shares are documented assumptions, not fitted
          values: nothing in the data says who was responsible for a play, so
          they can only ever be tuned against how stable the resulting rates
          are from one half of a season to the other.
        </p>
        {offenseShares.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">Offensive credit shares</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Play</TableHead>
                  <TableHead>Stat row</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offenseShares.map((row) => (
                  <TableRow key={`${row.kind}-${row.stat}`}>
                    <TableCell className="capitalize">{row.kind}</TableCell>
                    <TableCell>{row.stat}</TableCell>
                    <TableCell>{row.role.replace("_", " ")}</TableCell>
                    <TableCell className={numCell}>{formatPct(row.share, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-muted-foreground">
          Defenders are credited with the whole defensive EPA of the plays the
          feed tags them on: sacks, interceptions, pass breakups, forced and
          recovered fumbles. The feed never tags tacklers, so non-sack tackles
          for loss and untagged passes defended come from the box score at
          that season&apos;s average EPA for the event, and plain tackles earn
          nothing. Defensive value is disruption value, not full
          accountability.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-heading text-base">Opponent adjustment and replacement</h3>
        <p className="text-muted-foreground">
          Each credited play is measured against what an average player
          produces on that channel against the unit he faced, using the unit
          rating fit strictly before that week, so a player&apos;s own game
          never feeds the rating that adjusts it. Early-season ratings are
          shrunk toward an average opponent by games played
          {meta ? ` (prior of ${formatNumber(meta.opponent_effect_prior_games, 0)} games)` : ""}.
          Plays against FCS opponents count
          {meta ? ` ${formatPct(meta.fcs_opponent_weight, 0)}` : " half"}.
          Garbage time, by the same score-and-period rule as the team
          ratings, is excluded from points value and kept in win probability
          added, which discounts it on its own.
        </p>
        <p className="text-muted-foreground">
          Games are the opportunity unit, because a defender&apos;s credited
          plays are disruption events rather than snaps. Per-game production
          shrinks toward the position-group mean with a prior of
          {meta ? ` ${formatNumber(meta.prior_games, 0)} games` : " 4 games"}, then
          the {meta ? `${formatNumber(meta.replacement_percentile * 100, 0)}th` : "30th"} percentile
          among players with at least
          {meta ? ` ${meta.qualifying_games}` : " 6"} games (half the weeks played
          so far, early in the season) is the replacement level for that
          group. Value is games times the shrunk per-game production above
          replacement, which is what puts a linebacker and a quarterback on
          one scale.
        </p>
        {reliability.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">Split-half reliability by position group</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Players</TableHead>
                  <TableHead className="text-right">Split-half r</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reliability.map((row) => (
                  <TableRow key={row.position_group}>
                    <TableCell>{row.position_group}</TableCell>
                    <TableCell className={mutedNumCell}>{row.players}</TableCell>
                    <TableCell className={numCell}>
                      {formatNumber(row.split_half_correlation, 2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-heading text-base">Ballot model</h3>
        <p className="text-muted-foreground">
          Predicted vote share is a conditional logit: within a season, a
          softmax over the candidate pool, so shares sum to one like a ballot.
          Features are per-game passing, rushing, and receiving rates, team
          win percentage, the latest AP rank, a power-conference flag,
          position, and a defender flag (defensive box stats only exist from
          2014, so a defender&apos;s rates cannot be a feature). It is trained
          on the top-ten finishers from
          {meta ? ` ${JSON.parse(meta.heisman_training_seasons).length}` : ""} past
          seasons with every other candidate at zero.
          {meta?.heisman_model_version === "cfb_heisman_share_v2"
            ? " Evaluation uses historical snapshots at the current board week, training only on earlier seasons and counting winners outside the candidate pool as misses"
            : " Historical evaluation holds out one season at a time using full-season statistics, which does not establish early-season forecasting accuracy"}
          {meta
            ? ` (winner called ${formatPct(meta.heisman_winner_hit_rate, 0)} of the time, top three ${formatPct(meta.heisman_top_three_rate, 0)})`
            : ""}.
          The current season is never in the training set. Shares are conditional
          on the selected candidate pool and are not probabilities of winning.
        </p>
        <p className="text-muted-foreground">
          What the tracker does not do: infer injuries or availability, read
          play text for anything the feed does not tag, or tune shares on the
          season being reported.
        </p>
      </section>
    </div>
  );
}

export default function HeismanTracker({
  values,
  trajectories,
  board,
  boardWeek,
  history,
  meta,
  teams,
}: {
  season: number;
  week: number;
  boardWeek: number | null;
  values: CfbPlayerValue[];
  trajectories: CfbPlayerValue[];
  board: CfbHeismanBoardRow[];
  history: CfbHeismanHistory[];
  meta: CfbPlayerModelMeta | null;
  teams: CfbTeamIdentity[];
}) {
  const [view, setView] = useState<View>("board");
  const teamByName = useMemo(() => new Map(teams.map((t) => [t.team, t])), [teams]);
  const logoFor = (team: string) => teamByName.get(team);

  return (
    <ViewTabs label="Tracker views" options={VIEWS} value={view} onValueChange={setView}>
      <ViewTabPanel value="board">
        <HeismanBoard rows={board} week={boardWeek} logoFor={logoFor} />
      </ViewTabPanel>
      <ViewTabPanel value="value">
        <ValueBoard values={values} logoFor={logoFor} />
      </ViewTabPanel>
      <ViewTabPanel value="trajectory">
        <Trajectory rows={trajectories} />
      </ViewTabPanel>
      <ViewTabPanel value="history">
        <History rows={history} meta={meta} week={boardWeek} />
      </ViewTabPanel>
      <ViewTabPanel value="method">
        <Method meta={meta} />
      </ViewTabPanel>
    </ViewTabs>
  );
}
