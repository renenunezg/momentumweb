"use client";

import { useMemo, useState } from "react";
import type { NflTeamIdentity, NflTeamRating } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

function fmt(value: number | null, decimals = 1): string {
  if (value == null) return "–";
  return value.toFixed(decimals);
}

type Division = {
  name: string;
  conference: string;
  teams: NflTeamRating[];
  avg: number;
};

export default function NflDivisionRatings({
  ratings,
  teamByAbbr,
  initialDivision,
}: {
  ratings: NflTeamRating[];
  teamByAbbr: Map<string, NflTeamIdentity>;
  initialDivision?: string;
}) {
  // Ratings arrive sorted by power_rating desc, so insertion order within a
  // division is already the division ranking and the array index is the
  // league rank.
  const { divisions, leagueRank } = useMemo(() => {
    const groups = new Map<string, NflTeamRating[]>();
    for (const r of ratings) {
      const name = r.division ?? "Unknown";
      const group = groups.get(name);
      if (group) group.push(r);
      else groups.set(name, [r]);
    }
    const divisions: Division[] = [...groups.entries()]
      .map(([name, teams]) => ({
        name,
        conference: teams[0].conference ?? "AFC",
        teams,
        avg: teams.reduce((sum, t) => sum + t.power_rating, 0) / teams.length,
      }))
      .sort((a, b) => b.avg - a.avg);
    return {
      divisions,
      leagueRank: new Map(ratings.map((r, i) => [r.team_abbr, i + 1])),
    };
  }, [ratings]);

  const [selectedName, setSelectedName] = useState(
    () =>
      divisions.find((d) => d.name === initialDivision)?.name ??
      divisions[0]?.name
  );
  const selected =
    divisions.find((d) => d.name === selectedName) ?? divisions[0];

  // Switching is pure state so the table swaps instantly; the URL is
  // rewritten in place only so the view stays shareable.
  function select(name: string) {
    setSelectedName(name);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "division");
    url.searchParams.set("division", name);
    window.history.replaceState(null, "", url);
  }

  if (!selected) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {["AFC", "NFC"].map((conference) => {
          const inConference = divisions
            .filter((d) => d.conference === conference)
            .sort((a, b) => a.name.localeCompare(b.name));
          if (inConference.length === 0) return null;
          return (
            <div
              key={conference}
              className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:w-7 sm:shrink-0 sm:pt-1.5">
                {conference}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {inConference.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => select(d.name)}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
                      d.name === selected.name
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-lg tracking-tight">
            {selected.name}
          </h2>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Avg {fmt(selected.avg)}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">Rk</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  NFL Rk
                </TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Off</TableHead>
                <TableHead className="text-right">Def</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.teams.map((r, index) => (
                <TableRow key={r.team_abbr}>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 align-middle">
                      <TeamLogo
                        team={teamByAbbr.get(r.team_abbr)}
                        name={r.team}
                      />
                      <span className="font-medium">{r.team}</span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                    {leagueRank.get(r.team_abbr)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {fmt(r.power_rating)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmt(r.offense_points)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {fmt(r.defense_points)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
