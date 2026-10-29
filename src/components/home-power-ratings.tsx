import { HeatValue } from "@/components/heat-value";
import { TeamLogo } from "@/components/team-logo";
import { formatNumber, formatSigned } from "@/lib/utils";
import type { LeagueRatings } from "@/lib/home-research.server";

export function HomePowerRatings({ league }: { league: LeagueRatings }) {
  const split = league.teams.some((t) => t.offense != null);
  return (
    <div>
      <p className="mb-1 type-meta text-muted-foreground">{league.period}</p>
      <table className="w-full type-label tabular-nums">
        <caption className="sr-only">Top power ratings. {league.period}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Team</th>
            <th scope="col">Rating</th>
            {split && <th scope="col">Offense and defense</th>}
          </tr>
        </thead>
        <tbody>
          {league.teams.map((t, i) => (
            <tr key={t.key} className="border-t border-border first:border-t-0">
              <td className="w-6 py-1.5 pr-2 text-right type-meta text-muted-foreground">{i + 1}</td>
              <td className="py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  <TeamLogo team={t.logo} name={t.team} />
                  <span className="truncate font-semibold">{t.team}</span>
                </span>
              </td>
              <td className="py-1.5 text-center">
                <HeatValue style={t.heat} className="font-semibold">{formatNumber(t.rating, league.digits)}</HeatValue>
              </td>
              {split && (
                <td className="py-1.5 pl-2 text-right whitespace-nowrap type-meta text-muted-foreground">
                  <abbr title="Offense / defense, points" className="no-underline">
                    {formatSigned(t.offense, 1)} / {formatSigned(t.defense, 1)}
                  </abbr>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
