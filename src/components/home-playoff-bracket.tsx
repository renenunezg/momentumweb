import "server-only";
import { Trophy } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { chooseBracket, type BracketSeries, type PlayoffForecast, type PlayoffTeam } from "@/lib/mlb-playoffs";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { cn, formatPct } from "@/lib/utils";

function ProjectedSeries({ series, teams, fullNames = false }: {
  series: BracketSeries;
  teams: Map<string, PlayoffTeam>;
  fullNames?: boolean;
}) {
  return (
    <div
      aria-label={`${series.node.id}: ${series.matchup.teams.map((code) => teams.get(code)!.name).join(" versus ")}, projected ${series.outcome.wins.join(" to ")}`}
      className="relative z-10 divide-y divide-border border border-border bg-background"
    >
      {series.matchup.teams.map((code, index) => {
        const team = teams.get(code)!;
        return (
          <div key={code} className={cn("flex items-center gap-1 px-2 py-heading text-xs", code === series.winner ? "bg-muted/50" : "text-muted-foreground")}>
            <span className="w-2 shrink-0 font-mono text-muted-foreground">{team.seed}</span>
            <TeamLogo team={mlbTeamIdentity(code)} name={team.name} className="h-4 w-4" />
            <span className="min-w-0 flex-1" title={team.name}>{fullNames ? team.name : code}</span>
            <span className={cn("font-mono tabular-nums", code === series.winner && "text-positive")}>{series.outcome.wins[index]}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HomePlayoffBracket({ forecast }: { forecast: PlayoffForecast }) {
  const bracket = chooseBracket(forecast);
  const teams = new Map(forecast.teams.map((team) => [team.code, team]));
  const final = bracket.find((series) => series.node.id === "WS")!;
  const champion = teams.get(final.winner)!;
  const titleChance = forecast.odds.find((row) => row.team === champion.code)?.champion;

  return (
    <>
      {(["AL", "NL"] as const).map((league) => {
        const championship = bracket.find((series) => series.node.round === "CS" && series.node.league === league)!;
        // Follow the actual feeder nodes so connector positions match the bracket.
        const divisions = [championship.node.left, championship.node.right].map((id) => bracket.find((series) => series.node.id === id)!);
        return (
          <section key={league} aria-label={`${league} projected bracket`} className="space-y-content">
            <h4 className="font-heading text-base">{league === "AL" ? "American League" : "National League"}</h4>
            <div className="grid grid-cols-3 gap-content text-xs text-muted-foreground">
              <span>Wild Card</span><span>Division Series</span><span>{league}CS</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-content">
              <div className="space-y-content">
                {divisions.map((division) => {
                  const wildCard = bracket.find((series) => series.node.id === division.node.left || series.node.id === division.node.right)!;
                  return <ProjectedSeries key={wildCard.node.id} series={wildCard} teams={teams} />;
                })}
              </div>
              <div className="relative space-y-content before:absolute before:-right-[7px] before:top-1/4 before:h-1/2 before:w-[7px] before:border-y before:border-r before:border-border">
                {divisions.map((series) => (
                  <div key={series.node.id} className="relative before:absolute before:-left-3 before:top-1/2 before:w-3 before:border-t before:border-border">
                    <ProjectedSeries series={series} teams={teams} />
                  </div>
                ))}
              </div>
              <div className="relative before:absolute before:-left-[6px] before:top-1/2 before:w-[6px] before:border-t before:border-border">
                <ProjectedSeries series={championship} teams={teams} />
              </div>
            </div>
          </section>
        );
      })}
      <section aria-label="Projected World Series" className="space-y-content border-t border-border pt-section">
        <h4 className="font-heading text-base">World Series</h4>
        <ProjectedSeries series={final} teams={teams} fullNames />
        <div className="flex items-center gap-content py-heading">
          <Trophy className="h-5 w-5 shrink-0 text-positive" aria-hidden="true" />
          <div>
            <p className="text-sm">{champion.name}</p>
            <p className="text-xs text-muted-foreground">Projected champion{titleChance != null && ` · ${formatPct(titleChance)} title chance`}</p>
          </div>
        </div>
      </section>
    </>
  );
}
