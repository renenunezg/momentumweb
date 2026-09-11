"use client";

import { useMemo, useState } from "react";
import { TeamLogo } from "@/components/team-logo";
import { RatingsSearch } from "@/components/ratings-search";
import { Notice } from "@/components/notice";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { teamColor } from "@/lib/team-colors";
import { ToggleGroup } from "@/components/toggle-group";
import { useVisitorTimeZone } from "@/components/use-visitor-timezone";
import {
  footballSlateClock,
  groupFootballSlates,
  type FootballLeague,
} from "@/lib/football-slates";
import {
  MARKET_LABELS,
  pickLabel,
  type PickMarket,
  type WeeklyGame,
  type WeeklyPick,
} from "@/lib/football-picks";
import { cn, formatOdds, formatSigned, formatPct } from "@/lib/utils";
import { fieldSvg, liveKey, liveLines, type LiveGame } from "@/lib/football-live";
import { useFootballLiveScores } from "@/components/use-football-live-scores";

const MARKETS = [
  { key: "all", label: "All" },
  { key: "spreads", label: "Spreads" },
  { key: "totals", label: "Totals" },
  { key: "h2h", label: "Moneylines" },
] as const;
const ORDER = { spreads: 0, totals: 1, h2h: 2 };
// With every market showing, a slate with nothing qualifying still lists its
// matchups when it is a handful of games; a 40 game CFB window collapses to
// one summary instead of 40 empty cards. A single-market filter shows only
// games that carry a pick in that market.
const EMPTY_CARDS = 4;

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function marketNoun(market: PickMarket) {
  return market === "all"
    ? "prediction"
    : `${MARKET_LABELS[market].toLowerCase()} prediction`;
}

export function WeeklyFootballPredictions({
  league,
  games,
}: {
  league: FootballLeague;
  games: WeeklyGame[];
}) {
  const [market, setMarket] = useState<PickMarket>("all");
  const [slateId, setSlateId] = useState("all");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const timeZone = useVisitorTimeZone("UTC");
  const clock = useMemo(() => footballSlateClock(timeZone), [timeZone]);
  const slates = useMemo(
    () => groupFootballSlates(games, league),
    [games, league],
  );
  const liveRefs = useMemo(
    () =>
      games.map((game) => {
        const start = game.start_date ? Date.parse(game.start_date) : NaN;
        return {
          key: liveKey(league, game.game_id),
          start: Number.isFinite(start) ? start : null,
        };
      }),
    [games, league],
  );
  const live = useFootballLiveScores(league, liveRefs);
  const matches = (pick: WeeklyPick) =>
    pick.status === "recommended" &&
    (market === "all" || pick.market === market);
  const searched = (game: WeeklyGame) =>
    !needle ||
    game.home_team.toLowerCase().includes(needle) ||
    game.away_team.toLowerCase().includes(needle);
  const searchable = needle
    ? slates.filter((slate) => slate.games.some(searched))
    : slates;
  // A slate the search has emptied falls back to every matching slate rather
  // than an empty page, and the chips only offer slates the search still hits.
  const chosen = searchable.filter((slate) => slate.id === slateId);
  const visible = chosen.length ? chosen : searchable;
  const found = visible.flatMap((slate) => slate.games.filter(searched));
  const predictions = found.flatMap((game) => game.rows.filter(matches));
  const gameCount = new Set(predictions.map((row) => row.game_id)).size;
  const slateOptions = [
    { key: "all", label: "All slates" },
    ...searchable.map((slate) => ({
      key: slate.id,
      label: clock.title(slate),
    })),
  ];

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
            {plural(predictions.length, "prediction")} across {gameCount} of{" "}
            {plural(found.length, "game")}
          </p>
        </div>
        <RatingsSearch
          query={query}
          onChange={setQuery}
          shown={found.length}
          total={games.length}
          noun="games"
        />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Times shown in {clock.zone()}.</p>
          <p>
            Model probability is the model&apos;s chance that the selected side
            wins, with pushes listed separately. It is not a confidence score or
            a guarantee.
          </p>
        </div>
      </div>
      <ToggleGroup
        label="Kickoff slate"
        variant="chip"
        options={slateOptions}
        value={chosen.length ? slateId : "all"}
        onChange={setSlateId}
      />
      {visible.map((slate) => {
        const filtered = slate.games.filter(searched).map((game) => ({
          ...game,
          evaluated: game.rows.length > 0,
          rows: game.rows.filter(matches),
        }));
        const qualified = filtered.filter((game) => game.rows.length);
        const count = qualified.reduce(
          (total, game) => total + game.rows.length,
          0,
        );
        const unpublished = filtered.filter((game) => !game.evaluated).length;
        // A searched team always shows its game, prediction or not.
        const shown = needle
          ? filtered
          : qualified.length || market !== "all"
            ? qualified
            : filtered.length <= EMPTY_CARDS
              ? filtered
              : [];
        return (
          <section
            key={slate.id}
            aria-labelledby={`${slate.id}-heading`}
            className="space-y-3"
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
                {plural(filtered.length, "game")} ·{" "}
                {plural(count, "prediction")}
              </p>
            </div>
            {shown.length === 0 && (
              <Notice role="status" className="text-muted-foreground">
                No qualifying {marketNoun(market)} in this window.{" "}
                {plural(filtered.length - unpublished, "game")} evaluated as No
                Play
                {unpublished
                  ? `, ${plural(unpublished, "game")} without a published decision`
                  : ""}
                .
              </Notice>
            )}
            <div className="space-y-4">
              {shown.map((game) => (
                <GamePredictions
                  key={game.game_id}
                  game={game}
                  clock={clock}
                  market={market}
                  live={live.get(liveKey(league, game.game_id))}
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
  clock,
  market,
  live,
}: {
  game: WeeklyGame & { evaluated: boolean };
  clock: ReturnType<typeof footballSlateClock>;
  market: PickMarket;
  live: LiveGame | undefined;
}) {
  const rows = game.rows;
  const lines = live ? liveLines(live) : null;
  const field = live ? fieldSvg(live) : null;
  const ordered = [...rows].sort(
    (a, b) =>
      ORDER[a.market as keyof typeof ORDER] -
      ORDER[b.market as keyof typeof ORDER],
  );
  const teams = [
    { name: game.away_team, team: game.away },
    { name: game.home_team, team: game.home },
  ];
  return (
    <Card
      role="article"
      aria-label={`${game.away_team} at ${game.home_team}`}
      size="sm"
      className="data-[size=sm]:gap-0 data-[size=sm]:py-0"
    >
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 bg-muted/35 py-2">
        <h3 className="flex min-w-0 flex-col gap-1 font-heading text-base leading-snug tracking-tight sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          {teams.map(({ name, team }, index) => (
            <span key={index} className="flex min-w-0 items-center gap-3">
              {index === 1 && (
                <span className="w-4 shrink-0 font-sans text-xs text-muted-foreground">
                  at
                </span>
              )}
              <span
                className="flex min-w-0 items-center gap-1.5 border-l-[3px] pl-1.5"
                style={{
                  borderColor: teamColor(team ?? undefined) ?? "var(--border)",
                }}
              >
                <TeamLogo
                  team={team ?? undefined}
                  name={name}
                  className="h-6 w-6"
                />
                <span>{name}</span>
              </span>
            </span>
          ))}
        </h3>
        {lines ? (
          <p
            aria-live="polite"
            className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground"
          >
            <span className="font-mono text-lg font-bold leading-tight tabular-nums text-foreground">
              {lines.score}
            </span>
            {lines.detail && (
              <span
                className={cn(
                  "font-mono text-[11px] uppercase tracking-wider",
                  live?.state === "in" && "text-positive",
                )}
              >
                {lines.detail}
              </span>
            )}
            {lines.situation && (
              <span className="text-[11px]">{lines.situation}</span>
            )}
            {field && (
              <span
                className="mt-0.5 h-2 w-24 text-muted-foreground"
                // Our own SVG built from numbers only; see fieldSvg.
                dangerouslySetInnerHTML={{ __html: field }}
              />
            )}
          </p>
        ) : (
          <p className="shrink-0 font-mono text-xs text-muted-foreground">
            {clock.kickoff(game.start_date)}
          </p>
        )}
      </CardHeader>
      {rows.length === 0 && (
        <CardContent className="py-2.5 text-muted-foreground">
          {game.evaluated
            ? `No qualifying ${marketNoun(market)} for this game.`
            : "No published decision for this game yet."}
        </CardContent>
      )}
      <CardContent
        className={cn(
          "grid gap-px bg-border px-0",
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
            className="flex min-w-0 flex-col gap-0.5 bg-background px-3 py-2"
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
              <p className="text-sm font-semibold leading-snug">
                {pickLabel(pick)}
              </p>
              <p className="shrink-0 font-mono text-sm tabular-nums">
                {formatOdds(pick.price)}
              </p>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              <p>{pick.provider}</p>
              <p
                className="font-mono tabular-nums"
                title="Model probability that this selection wins; pushes are separate."
              >
                Model probability{" "}
                <span className="font-semibold text-foreground">
                  {formatPct(pick.win_probability)}
                </span>
                {(pick.push_probability ?? 0) >= 0.0005 && (
                  <span> · Push {formatPct(pick.push_probability)}</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
