import { ChartNoAxesCombined } from "lucide-react";
import { Kickoff, SlateLabel } from "@/components/kickoff-cells";
import {
  TeamLabel,
  type MatchupSide,
} from "@/components/schedule-matchup-cell";
import { formatHomeLine } from "@/lib/football";
import type { FootballSlate } from "@/lib/football-slates";
import { teamColor } from "@/lib/team-colors";
import { formatNumber } from "@/lib/utils";

export interface ScheduleCardGame {
  gameId: number | string;
  liveKey: string;
  start: string | null;
  away: MatchupSide;
  home: MatchupSide;
  awayPoints: number | null;
  homePoints: number | null;
  homeLine: number | null;
  marketLine: number | null;
  modelTotal: number | null;
  marketTotal: number | null;
  // Recommended picks only, already worded; a phone has no room for No Play.
  picks: string[];
  // The facts the filters match on, as data attributes, plus whether the
  // default view shows the game.
  data: Record<`data-${string}`, string>;
  hidden: boolean;
}

// The pages keep the raw row beside each card, so the table can render
// what the card does not show.
export interface ScheduleCardSlate {
  slate: Pick<FootballSlate<unknown>, "id" | "start" | "broadcast">;
  hidden: boolean;
  games: { card: ScheduleCardGame }[];
}

// The phone rendering of a football schedule: one scoreboard card per game
// under the same slate headings as the table, which stays hidden below md.
// Cards carry the same data attributes as table rows, so the filters and the
// live score writer treat both the same way.
//
// Every row of a card is its own grid on one template; the score track is
// 0 until the writer appends a score, when the card's `--score-col` opens it
// on every row at once. The writer puts the live block after the kickoff
// time, which the header grid pins to its first row, full width, and drops
// the column labels to a second row underneath.
export function ScheduleCards({ slates }: { slates: ScheduleCardSlate[] }) {
  return (
    <div className="space-y-5 md:hidden">
      {slates.map(({ slate, hidden, games }) => (
        <section key={slate.id} data-slate hidden={hidden} className="space-y-2">
          <h2 className="type-eyebrow border-b border-rule-strong pb-1 pt-2 text-muted-foreground">
            <SlateLabel slate={slate} />
          </h2>
          {games.map(({ card }) => (
            <ScheduleCard key={card.gameId} game={card} />
          ))}
        </section>
      ))}
    </div>
  );
}

const ROW =
  "grid grid-cols-[minmax(0,1fr)_var(--score-col,0px)_2.5rem_3rem] items-center gap-x-1.5 px-2.5";
const LABEL =
  "type-eyebrow text-muted-foreground";

function ScheduleCard({ game }: { game: ScheduleCardGame }) {
  const diff =
    game.marketLine != null && game.homeLine != null
      ? game.homeLine - game.marketLine
      : null;
  return (
    <article
      data-live={game.liveKey}
      data-game={game.gameId}
      data-away={game.away.name}
      data-home={game.home.name}
      {...game.data}
      hidden={game.hidden}
      className="group overflow-hidden rounded-sm border border-border bg-card text-sm has-[[data-live-score]]:[--score-col:3rem]"
    >
      <div
        className={`${ROW} bg-muted/35 py-1.5 [&_[data-live-block]]:row-start-1 [&_[data-live-block]]:col-span-full [&_[data-live-block]]:w-full [&_[data-live-block]]:flex-row [&_[data-live-block]]:gap-3 [&_[data-live-block]]:px-0 [&_[data-live-part=situation]]:ml-auto [&_[data-live-part=situation]]:text-xs [&_[data-live-part=situation]]:text-foreground [&_[data-live-part=field]]:h-2.5 [&_[data-live-part=field]]:w-28`}
      >
        {/* `contents`, so the time and the live block the writer puts after
            it are both items of this grid. */}
        <span className="contents text-xs text-muted-foreground">
          <Kickoff start={game.start} part="time" />
        </span>
        <span
          className={`${LABEL} col-start-2 hidden text-right group-has-[[data-live-score]]:block`}
        >
          Score
        </span>
        <span className={`${LABEL} col-start-3 text-right`}>Proj</span>
        <span className={`${LABEL} col-start-4 text-right`}>Line</span>
      </div>
      <TeamRow
        side="away"
        team={game.away}
        points={game.awayPoints}
        line={game.homeLine == null ? null : -game.homeLine}
      />
      <TeamRow
        side="home"
        team={game.home}
        points={game.homePoints}
        line={game.homeLine}
      />
      <div className="flex justify-between gap-3 border-t border-border bg-muted/35 px-2.5 py-1.5 font-mono text-xs tabular-nums text-muted-foreground">
        <span>
          Market{" "}
          <span className="font-semibold text-foreground">
            {formatHomeLine(game.marketLine)}
          </span>{" "}
          · diff {formatHomeLine(diff)}
        </span>
        <span>
          Total{" "}
          <span className="font-semibold text-foreground">
            {formatNumber(game.modelTotal)}
          </span>{" "}
          / {formatNumber(game.marketTotal)}
        </span>
      </div>
      {/* The live score writer shows this once the game has started; the
          schedule's click handler opens the game's win probability. */}
      <button
        type="button"
        data-live-probability
        hidden
        className="flex w-full items-center gap-1.5 border-t border-border px-2.5 py-2 text-xs text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ChartNoAxesCombined className="size-3.5" aria-hidden="true" />
        Win probability
      </button>
      {game.picks.length > 0 && (
        <ul className="border-t border-border px-2.5 py-1.5 text-xs text-primary">
          {game.picks.map((pick) => (
            <li key={pick}>{pick}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function TeamRow({
  side,
  team,
  points,
  line,
}: {
  side: "away" | "home";
  team: MatchupSide;
  points: number | null;
  line: number | null;
}) {
  return (
    // The live score writer appends this side's score, which the row pins to
    // its score track so it sits between the name and the projection.
    <div
      data-team-cell={side}
      className={`${ROW} py-1.5 border-t border-border [&>[data-live-score]]:row-start-1 [&>[data-live-score]]:col-start-2 [&>[data-live-score]]:pl-0`}
    >
      <span
        className="flex min-w-0 items-center gap-2 border-l-[3px] pl-2"
        style={{ borderColor: teamColor(team.team) ?? "var(--border)" }}
      >
        <TeamLabel {...team} />
      </span>
      <span className="col-start-3 text-right font-mono font-semibold tabular-nums group-has-[[data-live-score]]:font-normal group-has-[[data-live-score]]:text-muted-foreground">
        {formatNumber(points, 0)}
      </span>
      <span className="col-start-4 text-right font-mono tabular-nums">
        {formatHomeLine(line)}
      </span>
    </div>
  );
}
