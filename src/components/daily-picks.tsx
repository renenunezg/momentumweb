import Link from "next/link";
import { Kickoff } from "@/components/kickoff-cells";
import { LocalKickoffs } from "@/components/local-kickoffs";
import { MARKET_LABELS } from "@/lib/football-picks";
import type { DailySport } from "@/lib/daily-picks";
import { formatOdds, formatPct } from "@/lib/utils";

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function emptyMessage(sport: DailySport) {
  if (sport.unavailable) return "Predictions are temporarily unavailable.";
  if (sport.gameCount === 0) return "No games today.";
  if (!sport.published)
    return `${plural(sport.gameCount, "game")}, predictions not published yet.`;
  return `${plural(sport.gameCount, "game")}, no qualifying predictions.`;
}

// Every model's recommended predictions for the site's day. Kickoffs are rendered
// in Eastern and rewritten into the visitor's zone by LocalKickoffs.
export function DailyPicks({
  sports,
  dateLabel,
}: {
  sports: DailySport[];
  dateLabel: string;
}) {
  return (
    <section className="mt-10" aria-labelledby="today-heading">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2
          id="today-heading"
          className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
        >
          Today&apos;s predictions
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {dateLabel}
        </span>
      </div>
      <LocalKickoffs>
        <div className="divide-y divide-border border-y border-rule-strong">
          {sports.map((sport) => {
            const pickCount = sport.games.reduce(
              (total, game) => total + game.picks.length,
              0,
            );
            return (
              <div key={sport.sport} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-3">
                    <Link
                      href={sport.href}
                      className="font-heading text-base tracking-tight hover:underline underline-offset-4"
                    >
                      {sport.name}
                    </Link>
                    {sport.games.length > 0 && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {plural(pickCount, "prediction")} across{" "}
                        {sport.games.length} of {plural(sport.gameCount, "game")}
                      </span>
                    )}
                  </div>
                  <Link
                    href={sport.href}
                    className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    All &rarr;
                  </Link>
                </div>
                {sport.games.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {emptyMessage(sport)}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {sport.games.map((game) => (
                      <li key={game.key} className="flex gap-4">
                        <span className="w-16 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                          <Kickoff start={game.start} part="time" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {game.away_team}{" "}
                            <span className="font-normal text-muted-foreground">
                              at
                            </span>{" "}
                            {game.home_team}
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {game.picks.map((pick) => (
                              <li
                                key={pick.market}
                                className="flex items-baseline justify-between gap-3 text-xs"
                              >
                                <span className="flex min-w-0 items-baseline gap-2">
                                  <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {MARKET_LABELS[pick.market]}
                                  </span>
                                  <span className="truncate font-medium">
                                    {pick.label}
                                  </span>
                                </span>
                                <span className="shrink-0 font-mono tabular-nums">
                                  {formatOdds(pick.price)}
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {formatPct(pick.probability)}
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </LocalKickoffs>
    </section>
  );
}
