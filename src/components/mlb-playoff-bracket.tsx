"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Shuffle, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TeamLogo } from "@/components/team-logo";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { teamColor } from "@/lib/team-colors";
import {
  chooseBracket,
  winnerProbability,
  type BracketSeries,
  type PlayoffForecast,
  type PlayoffTeam,
} from "@/lib/mlb-playoffs";
import { cn } from "@/lib/utils";

const ROUNDS = [
  { id: "WC", name: "Wild Card", format: "Best of 3" },
  { id: "DS", name: "Division Series", format: "Best of 5" },
  { id: "CS", name: "Championship Series", format: "Best of 7" },
  { id: "WS", name: "World Series", format: "Best of 7" },
] as const;
const pct = (p: number) =>
  p > 0 && p < 0.001 ? "<0.1%" : `${(p * 100).toFixed(1)}%`;
const control =
  "inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function SeriesCard({
  series,
  teams,
  onSelect,
  sampled,
}: {
  series: BracketSeries;
  teams: Map<string, PlayoffTeam>;
  onSelect: () => void;
  sampled: boolean;
}) {
  const { node, matchup, outcome, winner } = series;
  const finished =
    Math.max(...matchup.current_wins) === Math.floor(node.best_of / 2) + 1;
  return (
    <button
      onClick={onSelect}
      aria-label={`${node.id}: ${matchup.teams.join(" versus ")}, ${finished ? "final" : sampled ? "simulated" : "projected"} ${outcome.wins.join(" to ")}. View series probabilities`}
      className="relative w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="mb-3 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>{node.id}</span>
        <span>
          {finished
            ? "Final"
            : matchup.current_wins.some(Boolean)
              ? `Current ${matchup.current_wins.join(" - ")}`
              : sampled
                ? "Simulated wins"
                : "Projected wins"}
        </span>
      </div>
      {matchup.teams.map((code, i) => {
        const team = teams.get(code)!;
        return (
          <div
            key={code}
            className={cn(
              "flex items-center gap-2 rounded px-1 py-2",
              code === winner
                ? "bg-muted/70 text-foreground"
                : "text-muted-foreground",
            )}
          >
            <span className="w-3 font-mono text-[10px]">{team.seed}</span>
            <TeamLogo
              team={mlbTeamIdentity(code)}
              name={team.name}
              className="size-6"
            />
            <span className="flex-1 text-sm font-semibold">{code}</span>
            <span className="font-mono text-[10px] tabular-nums">
              {pct(winnerProbability(matchup, i))}
            </span>
            <span className="ml-2 w-4 text-right font-mono text-xl font-semibold tabular-nums">
              {outcome.wins[i]}
            </span>
          </div>
        );
      })}
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{matchup.home_field} home field</span>
        <ArrowRight className="size-3" aria-hidden="true" />
      </div>
    </button>
  );
}

function BracketView({
  bracket,
  teams,
  sampled = false,
}: {
  bracket: BracketSeries[];
  teams: Map<string, PlayoffTeam>;
  sampled?: boolean;
}) {
  const [round, setRound] = useState<string>("WC");
  const [selected, setSelected] = useState<BracketSeries | null>(null);
  const champion = teams.get(bracket.find((s) => s.node.id === "WS")!.winner)!;
  const championColor = teamColor(mlbTeamIdentity(champion.code)) ?? "var(--foreground)";
  return (
    <>
      <div
        className="mb-4 grid grid-cols-4 gap-1 lg:hidden"
        aria-label="Bracket round"
      >
        {ROUNDS.map((r) => (
          <button
            key={r.id}
            aria-pressed={round === r.id}
            onClick={() => setRound(r.id)}
            className={cn(
              control,
              "px-1 text-[10px]",
              round === r.id && "bg-muted font-bold",
            )}
          >
            {r.name}
          </button>
        ))}
      </div>
      <section
        aria-label={sampled ? "Random scenario bracket" : "Postseason bracket"}
        className="rounded-xl border border-border bg-muted/20 p-3 sm:p-5"
      >
        <div className="hidden grid-cols-4 gap-7 border-b border-border pb-4 lg:grid">
          {ROUNDS.map((r) => (
            <div key={r.id}>
              <h3 className="text-sm font-semibold">{r.name}</h3>
              <p className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
                {r.format}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-4 lg:gap-7">
          {ROUNDS.map((r) => (
            <div
              key={r.id}
              className={cn("min-w-0", round !== r.id && "hidden lg:block")}
            >
              {r.id !== "WS" ? (
                ["AL", "NL"].map((league, li) => (
                  <div
                    key={league}
                    className={cn(
                      "relative",
                      li > 0 && "mt-7 border-t border-border pt-5",
                    )}
                  >
                    <p className="my-3 font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                      {league === "AL" ? "American League" : "National League"}
                    </p>
                    <div
                      className={cn(
                        "flex flex-col justify-around gap-4 lg:h-[360px]",
                        r.id === "CS" &&
                          "lg:relative lg:before:absolute lg:before:-left-[15px] lg:before:top-1/4 lg:before:h-1/2 lg:before:w-[15px] lg:before:rounded-r-lg lg:before:border-y lg:before:border-r lg:before:border-border",
                      )}
                    >
                      {bracket
                        .filter(
                          (s) =>
                            s.node.round === r.id && s.node.league === league,
                        )
                        .map((s) => (
                          <div
                            key={s.node.id}
                            className={cn(
                              "relative",
                              r.id !== "WC" &&
                                "lg:before:absolute lg:before:-left-7 lg:before:top-1/2 lg:before:w-7 lg:before:border-t lg:before:border-border",
                            )}
                          >
                            <SeriesCard
                              series={s}
                              teams={teams}
                              sampled={sampled}
                              onSelect={() => setSelected(s)}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col justify-center gap-6 lg:relative lg:before:absolute lg:before:-left-[15px] lg:before:top-1/4 lg:before:h-1/2 lg:before:w-[15px] lg:before:rounded-r-lg lg:before:border-y lg:before:border-r lg:before:border-border">
                  <p className="text-center font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                    One champion
                  </p>
                  {bracket
                    .filter((s) => s.node.id === "WS")
                    .map((s) => (
                      <div
                        className="relative lg:before:absolute lg:before:-left-7 lg:before:top-1/2 lg:before:w-7 lg:before:border-t lg:before:border-border"
                        key={s.node.id}
                      >
                        <SeriesCard
                          series={s}
                          teams={teams}
                          sampled={sampled}
                          onSelect={() => setSelected(s)}
                        />
                      </div>
                    ))}
                  <div className="flex flex-col items-center gap-2 py-4">
                    <span
                      className="flex size-12 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: championColor }}
                    >
                      <Trophy className="size-7" aria-hidden="true" />
                    </span>
                    <span className="font-heading text-2xl">
                      {champion.code}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {sampled ? "Scenario" : "Projected"} World Series
                      winner
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] space-y-4 overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <div className="space-y-2 pr-7">
                <DialogTitle className="font-heading text-xl">
                  {selected.matchup.teams.join(" vs ")} · {selected.node.id}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  Series win probabilities conditional on this matchup.{" "}
                  {selected.matchup.home_field} has home field.
                </DialogDescription>
              </div>
              <div className="mt-3 flex gap-3">
                {selected.matchup.teams.map((code, i) => (
                  <div className="flex-1 rounded-lg bg-muted p-4" key={code}>
                    <div className="flex items-center gap-2">
                      <TeamLogo team={mlbTeamIdentity(code)} name={code} />
                      <strong>{code}</strong>
                    </div>
                    <p className="mt-2 font-mono text-2xl">
                      {pct(winnerProbability(selected.matchup, i))}
                    </p>
                  </div>
                ))}
              </div>
              <h3 className="mt-3 text-sm font-semibold">
                Final series score distribution
              </h3>
              <div className="space-y-2">
                {selected.matchup.outcomes.map((o) => (
                  <div
                    key={o.wins.join(":")}
                    className="flex items-center gap-3 text-xs"
                  >
                    <span className="w-24 shrink-0 font-mono">
                      {selected.matchup.teams[o.wins[0] > o.wins[1] ? 0 : 1]}{" "}
                      {Math.max(...o.wins)} - {Math.min(...o.wins)}
                    </span>
                    <div className="h-2 flex-1 rounded bg-muted">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${o.probability * 100}%`,
                          backgroundColor: teamColor(mlbTeamIdentity(
                            selected.matchup.teams[o.wins[0] > o.wins[1] ? 0 : 1],
                          )) ?? "var(--foreground)",
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono">
                      {pct(o.probability)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Current score: {selected.matchup.teams[0]}{" "}
                {selected.matchup.current_wins[0]} -{" "}
                {selected.matchup.current_wins[1]} {selected.matchup.teams[1]}.
                Future games use the projected pitching and lineup assumptions
                below the bracket.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RandomScenarioExplorer({
  forecast,
  teams,
}: {
  forecast: PlayoffForecast;
  teams: Map<string, PlayoffTeam>;
}) {
  const [scenario, setScenario] = useState<BracketSeries[] | null>(null);
  const generateScenario = () => setScenario(chooseBracket(forecast, Math.random));
  return (
    <Dialog>
      <DialogTrigger className={control} onClick={generateScenario}>
        <Shuffle className="size-3.5" aria-hidden="true" />
        Explore a random scenario
      </DialogTrigger>
      <DialogContent className="space-y-5 sm:max-w-[85rem]">
        <div className="space-y-2 pr-8">
          <DialogTitle className="font-heading text-2xl">
            One random postseason scenario
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A possible outcome drawn from the model’s probabilities. Underdogs can
            win here. Your projected bracket and championship chances stay unchanged.
          </DialogDescription>
        </div>
        <button className={control} onClick={generateScenario}>
          <Shuffle className="size-3.5" aria-hidden="true" />
          Generate another scenario
        </button>
        {scenario && <BracketView bracket={scenario} teams={teams} sampled />}
      </DialogContent>
    </Dialog>
  );
}

export function MlbPlayoffBracket({
  forecast,
  stale,
}: {
  forecast: PlayoffForecast;
  stale: boolean;
}) {
  const teams = useMemo(
    () => new Map(forecast.teams.map((t) => [t.code, t])),
    [forecast],
  );
  const bracket = useMemo(() => chooseBracket(forecast), [forecast]);
  const champion = teams.get(bracket.find((s) => s.node.id === "WS")!.winner)!;
  const championColor = teamColor(mlbTeamIdentity(champion.code)) ?? "var(--foreground)";
  const championshipChance = forecast.odds.find(
    (o) => o.team === champion.code,
  )!.champion;
  const stamp = new Date(forecast.generated_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  return (
    <>
      {stale && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed"
        >
          <strong>Outdated forecast</strong>
          <p>
            This snapshot is more than a day old. Results and pitching plans
            may have changed.
          </p>
        </div>
      )}
      <section
        className="mb-7 grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
        aria-label="Bracket outcome"
      >
        <div className="flex items-center gap-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full border"
            style={{
              borderColor: `color-mix(in srgb, ${championColor} 35%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${championColor} 10%, transparent)`,
            }}
          >
            <TeamLogo
              team={mlbTeamIdentity(champion.code)}
              name={champion.name}
              className="size-11"
            />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Projected champion
            </p>
            <h2 className="mt-1 font-heading text-2xl sm:text-3xl">
              {champion.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <strong className="text-foreground">
                {pct(championshipChance)}
              </strong>{" "}
              overall title chance
            </p>
          </div>
        </div>
        <RandomScenarioExplorer forecast={forecast} teams={teams} />
      </section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-xl">
          The model’s projected path
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Series favorite + its most likely winning score.{" "}
          Tap a series for details.
        </p>
      </div>
      <BracketView bracket={bracket} teams={teams} />
      <section className="mt-10" aria-labelledby="odds-title">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="odds-title" className="font-heading text-2xl">
            Championship chances
          </h2>
          <p className="text-xs text-muted-foreground">
            All possible opponents and paths, combined.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-2 py-3 text-left sm:px-4">
                  Team
                </th>
                {[["DS", "Reach DS"], ["LCS", "Reach LCS"], ["WS", "Reach WS"], ["Title", "Champion"]].map(([short, label]) => (
                  <th scope="col" className="px-2 py-3 text-right sm:px-3" key={label}>
                    <span className="sm:hidden" aria-hidden="true">{short}</span>
                    <span className="sr-only sm:not-sr-only">{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecast.odds.map((o) => {
                const t = teams.get(o.team)!;
                return (
                  <tr
                    key={o.team}
                    className="border-b border-border/60 last:border-0"
                  >
                    <th scope="row" className="px-2 py-3 text-left font-medium sm:px-4">
                      <div className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm">
                        <TeamLogo
                          team={mlbTeamIdentity(o.team)}
                          name={t.name}
                          className="size-5 sm:size-6"
                        />
                        <span>{o.team}</span>
                        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                          {t.league} {t.seed}
                        </span>
                      </div>
                    </th>
                    {(["DS", "CS", "WS"] as const).map((k) => (
                      <td
                        key={k}
                        className="px-2 py-3 text-right font-mono text-[10px] tabular-nums text-muted-foreground sm:px-3 sm:text-xs"
                      >
                        {pct(o[k])}
                      </td>
                    ))}
                    <td className="px-2 py-3 sm:w-[28%] sm:px-3">
                      <div className="flex flex-col-reverse items-end justify-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <div
                          className="h-1 w-full max-w-10 overflow-hidden rounded-full bg-muted sm:h-1.5 sm:max-w-28"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: teamColor(mlbTeamIdentity(o.team)) ?? "var(--foreground)",
                              width: `${(o.champion / forecast.odds[0].champion) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-right font-mono text-[10px] font-semibold tabular-nums sm:w-14 sm:text-xs">
                          {pct(o.champion)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <details className="mt-8 rounded-lg border border-border p-4 text-xs leading-relaxed text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          How the model builds this bracket
        </summary>
        <p className="mt-4">
          Snapshot: {stamp} ET. Model: {forecast.model_version}. Training
          through {forecast.training_max_date}.{" "}
          {forecast.n_sims.toLocaleString()} simulations per game scenario.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-4">
          {forecast.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="mt-3">
          The displayed bracket is one path, not a guarantee or the most
          probable complete bracket. A team can lead the title odds without
          winning every conditional matchup. These postseason forecasts have not
          been validated as calibrated championship probabilities.
        </p>
        <a
          className="mt-3 inline-block underline underline-offset-4"
          href="https://www.mlb.com/news/mlb-playoff-format-faq"
          target="_blank"
          rel="noreferrer"
        >
          MLB postseason format
        </a>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forecast.teams.map((t) => (
            <div key={t.code} className="rounded border border-border p-3">
              <strong className="text-foreground">
                {t.code}: projected roster
              </strong>
              <p className="mt-1">Rotation: {t.rotation.join(", ")}</p>
              <p className="mt-2">Batting order: {t.lineup.join(", ")}</p>
              {t.unmodeled_players.length > 0 && (
                <p className="mt-2 text-amber-700 dark:text-amber-400">
                  League-average fallback: {t.unmodeled_players.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
