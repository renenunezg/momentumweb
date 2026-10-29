"use client";
import { Fragment } from "react";
import { TeamLogo, type TeamLogoSource } from "./team-logo";
import { playoffPercent } from "@/lib/football-playoff-format";
import type { NflPlayoffPayload, NflPlayoffPath, NflPlayoffTeam } from "@/lib/nfl-playoffs";

export function NflPlayoffBracket({ payload, byId, identities, onTeam }: {
  payload: NflPlayoffPayload;
  byId: Map<string, NflPlayoffTeam>;
  identities: Record<string, TeamLogoSource>;
  onTeam: (id: string) => void;
}) {
  function team(id: string, seed: number | null, probability?: number, winner = false) {
    return (
      <button type="button" onClick={() => onTeam(id)}
        aria-label={`Explore ${byId.get(id)!.team}${probability === undefined ? ", first-round bye" : `, ${playoffPercent(probability)} matchup win chance`}`}
        className={`grid min-h-11 w-full grid-cols-[8px_14px_minmax(0,1fr)] items-center gap-x-1 px-1 py-1.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[10px_20px_minmax(0,1fr)] sm:px-2 ${winner ? "bg-primary/5" : ""}`}>
        <span className="text-[9px] tabular-nums text-muted-foreground">{seed}</span>
        <TeamLogo team={identities[id]} name={byId.get(id)!.team} className="size-3.5 sm:size-5" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-semibold leading-tight sm:text-xs">
            <span className="sm:hidden">{id}</span>
            <span className="hidden sm:inline">{byId.get(id)!.team}</span>
          </span>
          <span className={`text-[9px] leading-tight tabular-nums sm:text-[10px] ${winner ? "font-semibold text-primary" : "text-muted-foreground"}`}>
            {probability === undefined ? "Bye" : playoffPercent(probability)}
          </span>
        </span>
      </button>
    );
  }
  function matchup(game: NflPlayoffPath) {
    return (
      <div className="w-full overflow-hidden rounded-md border border-border bg-card divide-y divide-border">
        {team(game.home, game.home_seed, game.home_win_probability, game.winner === game.home)}
        {team(game.away, game.away_seed, 1 - game.home_win_probability, game.winner === game.away)}
      </div>
    );
  }
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      {(["AFC", "NFC"] as const).map((conference) => {
        const path = payload.path.filter((game) => game.conference === conference);
        const bye = payload.bracket.find((slot) => slot.conference === conference && slot.seed === 1)!.team_id;
        const divisional = path.filter((game) => game.round === "Divisional")
          .sort((a, b) => Number(b.home === bye || b.away === bye) - Number(a.home === bye || a.away === bye));
        const championship = path.find((game) => game.round === "Conference")!;
        return (
          <section key={conference} aria-label={`${conference} projected bracket`} className="min-w-0 space-y-3">
            <h3 className="type-subsection">{conference}</h3>
            <div className="type-eyebrow grid grid-cols-3 gap-x-3 text-muted-foreground sm:gap-x-6">
              <h4>Wild Card</h4><h4>Divisional</h4><h4>{conference} title</h4>
            </div>
            <div className="grid grid-cols-3 grid-rows-4 gap-x-3 gap-y-3 sm:gap-x-6">
              {divisional.map((game, index) => {
                // Follow this scenario's winners because the NFL reseeds after Wild Card weekend.
                const feeders = [game.home, game.away].map((id) =>
                  path.find((candidate) => candidate.round === "Wild Card" && candidate.winner === id));
                return (
                  <Fragment key={game.home}>
                    {feeders.map((feeder, position) => (
                      <div key={position} className="col-start-1 flex items-center"
                        style={{ gridRow: index * 2 + position + 1 }}>
                        {feeder ? matchup(feeder) : (
                          <div className="w-full overflow-hidden rounded-md border border-primary/30 bg-card">{team(bye, 1)}</div>
                        )}
                      </div>
                    ))}
                    <div className="relative col-start-2 flex items-center"
                      style={{ gridRow: `${index * 2 + 1} / span 2` }}>
                      <IncomingBracketLines />
                      {matchup(game)}
                    </div>
                  </Fragment>
                );
              })}
              <div className="relative col-start-3 row-start-1 row-span-4 flex items-center">
                <IncomingBracketLines />
                {matchup(championship)}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Highlighted teams advance in this scenario. {conference} champion advances to the Super Bowl.</p>
          </section>
        );
      })}
    </div>
  );
}

function IncomingBracketLines() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 100" preserveAspectRatio="none"
      className="pointer-events-none absolute right-full top-[calc(25%-3px)] h-[calc(50%+6px)] w-3 overflow-visible text-primary/50 sm:w-6">
      <path d="M0 0 H12 V100 H0 M12 50 H24" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
