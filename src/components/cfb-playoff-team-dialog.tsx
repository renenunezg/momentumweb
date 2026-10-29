"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamLogo } from "@/components/team-logo";
import {
  type CfbPlayoffForecast,
  type CfbPlayoffTeam,
} from "@/lib/cfb-playoffs";
import { playoffDate, playoffPercent } from "@/lib/football-playoff-format";
import type { PlayoffIdentities } from "./cfb-playoff-bracket";
export function CfbPlayoffTeamDialog({
  team,
  forecast,
  identities,
  modelDate,
  onClose,
}: {
  team: CfbPlayoffTeam | null;
  forecast: CfbPlayoffForecast;
  identities: PlayoffIdentities;
  modelDate: string;
  onClose: () => void;
}) {
  const range = team
    ? [
        team.playoff,
        team.selection_sensitivity,
        team.dependence_tiebreak_sensitivity,
      ]
    : [];
  const games = team
    ? forecast.games.filter(
        (g) => g.home_id === team.id || g.away_id === team.id,
      )
    : [];
  return (
    <Dialog
      open={team !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {team && (
        <DialogContent>
          <DialogTitle className="type-section flex items-center gap-3 pr-8">
            <TeamLogo
              team={identities[team.id]}
              name={team.team}
              className="size-8"
            />
            {team.team}
          </DialogTitle>
          <DialogDescription className="mt-2 text-xs text-muted-foreground">
            {team.conference} · {team.wins}-{team.losses} overall
            {team.conference !== "Independent" &&
              ` · ${team.conference_wins}-${team.conference_losses} conference`}
          </DialogDescription>
          <div className="my-6 grid grid-cols-3 gap-3">
            {[
              ["Make CFP", team.playoff],
              ["First-round bye", team.bye],
              ["National title", team.champion],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="type-eyebrow text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
                  {playoffPercent(Number(value))}
                </p>
              </div>
            ))}
          </div>
          <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
            Playoff estimates range from {playoffPercent(Math.min(...range))} to{" "}
            {playoffPercent(Math.max(...range))} across the tested selection and
            season-dependence assumptions. This is a sensitivity range, not a
            confidence interval.
          </p>
          <h3 className="type-subsection mt-6">
            Remaining regular season
          </h3>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Game probabilities from the {playoffDate(modelDate)} weekly model.
            Games after CFP selection are excluded.
          </p>
          <ul className="divide-y divide-border">
            {games.map((g) => {
              const home = g.home_id === team.id;
              const id = home ? g.away_id : g.home_id;
              return (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm">
                      <TeamLogo
                        team={identities[id]}
                        name={forecast.names.get(id)!}
                      />
                      <span>
                        {g.neutral ? "vs." : home ? "vs." : "at"}{" "}
                        {forecast.names.get(id)}
                      </span>
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {playoffDate(g.date)}
                      {g.provisional ? " · provisional flex matchup" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                    {playoffPercent(
                      home
                        ? g.home_win_probability
                        : 1 - g.home_win_probability,
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {games.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              Regular season complete.
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {team.conference !== "Independent" && (
              <>
                Conference title-game chance:{" "}
                {playoffPercent(team.conference_title_game)}. Conference title
                chance: {playoffPercent(team.conference_champion)}.{" "}
              </>
            )}
            Expected record through conference championships:{" "}
            {team.expected_wins.toFixed(1)}-{team.expected_losses.toFixed(1)}.
          </p>
        </DialogContent>
      )}
    </Dialog>
  );
}
