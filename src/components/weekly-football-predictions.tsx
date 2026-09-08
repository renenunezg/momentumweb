"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { TeamLogo } from "@/components/team-logo";
import { teamColor } from "@/lib/team-colors";
import type { NflTeamIdentity } from "@/lib/types";
import { ToggleGroup } from "@/components/toggle-group";
import { footballSlateClock, groupFootballSlates } from "@/lib/football-slates";
import {
  MARKET_LABELS,
  pickLabel,
  type FootballPick,
  type PickMarket,
} from "@/lib/football-picks";
import { cn, formatOdds, formatSigned, formatPct } from "@/lib/utils";

type WeeklyPick = Pick<
  FootballPick,
  | "game_id"
  | "market"
  | "start_date"
  | "home_team"
  | "away_team"
  | "status"
  | "selection"
  | "point"
  | "price"
  | "provider"
  | "outcome"
  | "profit_units"
  | "win_probability"
  | "push_probability"
>;

const MARKETS = [
  { key: "all", label: "All" },
  { key: "spreads", label: "Spreads" },
  { key: "totals", label: "Totals" },
  { key: "h2h", label: "Moneylines" },
] as const;
const ORDER = { spreads: 0, totals: 1, h2h: 2 };

type SlateGame = Pick<
  WeeklyPick,
  "game_id" | "start_date" | "home_team" | "away_team"
> & { rows: WeeklyPick[] };

function subscribeTimezone(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}
function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
function serverTimezone() {
  return "UTC";
}

export function WeeklyFootballPredictions({
  decisions,
  teams,
}: {
  decisions: WeeklyPick[];
  teams: Record<string, NflTeamIdentity>;
}) {
  const [market, setMarket] = useState<PickMarket>("all");
  const timeZone = useSyncExternalStore(
    subscribeTimezone,
    browserTimezone,
    serverTimezone,
  );
  const clock = useMemo(() => footballSlateClock(timeZone), [timeZone]);
  const slates = useMemo(() => {
    const games = new Map<string | number, SlateGame>();
    for (const row of decisions) {
      let game = games.get(row.game_id);
      if (!game) {
        game = {
          game_id: row.game_id,
          start_date: row.start_date,
          home_team: row.home_team,
          away_team: row.away_team,
          rows: [],
        };
        games.set(row.game_id, game);
      }
      game.rows.push(row);
    }
    return groupFootballSlates([...games.values()]);
  }, [decisions]);
  const matches = (pick: WeeklyPick) =>
    pick.status === "recommended" &&
    (market === "all" || pick.market === market);
  const predictions = decisions.filter(matches);
  const gameCount = new Set(predictions.map((row) => row.game_id)).size;

  return (
    <div className="space-y-6">
      <div className="space-y-3 border-y border-rule-strong py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            label="Prediction market"
            options={MARKETS}
            value={market}
            onChange={setMarket}
          />
          <p role="status" className="font-mono text-xs text-muted-foreground">
            {predictions.length}{" "}
            {predictions.length === 1 ? "prediction" : "predictions"} across{" "}
            {gameCount} {gameCount === 1 ? "game" : "games"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Times shown in {timeZone.replaceAll("_", " ")}.
        </p>
      </div>
      <nav aria-label="Jump to slate" className="flex flex-wrap gap-2">
        {slates.map((slate) => (
          <a
            key={slate.id}
            href={`#${slate.id}`}
            className="rounded-md border border-border px-3 py-2 font-mono text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {clock.title(slate)}
          </a>
        ))}
      </nav>
      {slates.map((slate) => {
        const games = slate.games.map((game) => ({
          ...game,
          rows: game.rows.filter(matches),
        }));
        const qualified = games.filter((game) => game.rows.length);
        const shown = qualified.length ? qualified : games;
        const count = games.reduce(
          (total, game) => total + game.rows.length,
          0,
        );
        return (
          <section
            key={slate.id}
            id={slate.id}
            aria-labelledby={`${slate.id}-heading`}
            className="scroll-mt-6 space-y-3"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-rule-strong pb-3 pt-2">
              <div>
                <h2
                  id={`${slate.id}-heading`}
                  className="font-heading text-xl tracking-tight"
                >
                  {clock.title(slate)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clock.kickoff(slate.start)}
                </p>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {slate.games.length}{" "}
                {slate.games.length === 1 ? "game" : "games"} · {count}{" "}
                {count === 1 ? "prediction" : "predictions"}
              </p>
            </div>
            <div className="space-y-4">
              {shown.map((game) => (
                <GamePredictions
                  key={game.game_id}
                  game={game}
                  teams={teams}
                  clock={clock}
                  market={market}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function GamePredictions({
  game,
  teams,
  clock,
  market,
}: {
  game: SlateGame;
  teams: Record<string, NflTeamIdentity>;
  clock: ReturnType<typeof footballSlateClock>;
  market: PickMarket;
}) {
  const rows = game.rows;
  const ordered = [...rows].sort(
    (a, b) =>
      ORDER[a.market as keyof typeof ORDER] -
      ORDER[b.market as keyof typeof ORDER],
  );
  return (
    <article
      key={game.game_id}
      aria-label={`${game.away_team} at ${game.home_team}`}
      className="overflow-hidden rounded-lg border border-border"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2 bg-muted/35 px-4 py-3 sm:px-5">
        <h3 className="flex min-w-0 flex-col gap-2 font-heading text-lg leading-snug tracking-tight sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {[game.away_team, game.home_team].map((name, index) => (
            <span key={name} className="flex min-w-0 items-center gap-3">
              {index === 1 && (
                <span className="w-4 shrink-0 font-sans text-xs text-muted-foreground">
                  at
                </span>
              )}
              <span
                className="flex min-w-0 items-center gap-2 border-l-[3px] pl-2"
                style={{
                  borderColor: teamColor(teams[name]) ?? "var(--border)",
                }}
              >
                <TeamLogo team={teams[name]} name={name} className="h-8 w-8" />
                <span>{name}</span>
              </span>
            </span>
          ))}
        </h3>
        <p className="shrink-0 font-mono text-xs text-muted-foreground">
          {clock.kickoff(game.start_date)}
        </p>
      </div>
      {rows.length === 0 && (
        <p className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
          No qualifying{" "}
          {market === "all"
            ? "prediction"
            : MARKET_LABELS[market].toLowerCase() + " prediction"}{" "}
          for this game.
        </p>
      )}
      <div
        className={cn(
          "grid gap-px bg-border",
          rows.length === 3
            ? "sm:grid-cols-3"
            : rows.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-1",
        )}
      >
        {ordered.map((pick) => (
          <div
            key={pick.market}
            className="flex min-w-0 flex-col gap-2 bg-background px-4 py-4 sm:px-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {MARKET_LABELS[pick.market as keyof typeof MARKET_LABELS]}
              </p>
              {pick.outcome !== "pending" && (
                <span
                  className={cn(
                    "font-mono text-xs uppercase",
                    pick.outcome === "win" && "text-positive",
                    pick.outcome === "loss" && "text-negative",
                  )}
                >
                  {pick.outcome}
                  {pick.profit_units != null
                    ? ` · ${formatSigned(pick.profit_units, 2)}u`
                    : ""}
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-base font-semibold leading-snug">
                {pickLabel(pick)}
              </p>
              <p className="shrink-0 font-mono text-lg tabular-nums">
                {formatOdds(pick.price)}
              </p>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <p>{pick.provider}</p>
              <p
                className="font-mono tabular-nums"
                title="Model probability that this selection wins; pushes are separate."
              >
                Model probability{" "}
                <span className="font-semibold text-foreground">
                  {formatPct(pick.win_probability)}
                </span>
                {(pick.push_probability ?? 0) > 0 && (
                  <span> · Push {formatPct(pick.push_probability)}</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
