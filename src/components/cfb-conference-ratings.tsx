"use client";

import { useMemo, useState } from "react";
import type { CfbTeamIdentity, CfbTeamRating } from "@/lib/types";
import { cn } from "@/lib/utils";
import { replaceLocation } from "@/lib/use-location-search";
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

type Conference = {
  name: string;
  tier: string;
  teams: CfbTeamRating[];
  avg: number;
};

export default function CfbConferenceRatings({
  ratings,
  teamById,
  initialConference,
}: {
  ratings: CfbTeamRating[];
  teamById: Map<number, CfbTeamIdentity>;
  initialConference?: string;
}) {
  // Ratings arrive sorted by power_rating desc, so insertion order within a
  // conference is already the conference ranking and the array index is the
  // overall D1 rank.
  const { conferences, d1Rank } = useMemo(() => {
    const groups = new Map<string, CfbTeamRating[]>();
    for (const r of ratings) {
      const name = r.conference ?? "Independent";
      const group = groups.get(name);
      if (group) group.push(r);
      else groups.set(name, [r]);
    }
    const conferences: Conference[] = [...groups.entries()]
      .map(([name, teams]) => ({
        name,
        tier: teams[0].classification ?? "fbs",
        teams,
        avg: teams.reduce((sum, t) => sum + t.power_rating, 0) / teams.length,
      }))
      .sort((a, b) => b.avg - a.avg);
    return {
      conferences,
      d1Rank: new Map(ratings.map((r, i) => [r.team_id, i + 1])),
    };
  }, [ratings]);

  const [selectedName, setSelectedName] = useState(
    () =>
      conferences.find((c) => c.name === initialConference)?.name ??
      conferences[0]?.name
  );
  const selected =
    conferences.find((c) => c.name === selectedName) ?? conferences[0];

  // Switching is pure state so the table swaps instantly; the URL is rewritten
  // in place only so the view stays shareable.
  function select(name: string) {
    setSelectedName(name);
    const url = new URL(window.location.href);
    url.searchParams.set("class", "conference");
    url.searchParams.set("conf", name);
    replaceLocation(url);
  }

  if (!selected) return null;

  // A badge on every row singles out nobody; whole conferences (all of FCS
  // today) run on reduced inputs, so say it once above the table instead.
  const allLimited = selected.teams.every(
    (r) => (r.missing_input_count ?? 0) >= 4
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {["fbs", "fcs"].map((tier) => {
          const inTier = conferences
            .filter((c) => c.tier === tier)
            .sort((a, b) => a.name.localeCompare(b.name));
          if (inTier.length === 0) return null;
          return (
            <div
              key={tier}
              className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:w-7 sm:shrink-0 sm:pt-1.5">
                {tier}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {inTier.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => select(c.name)}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
                      c.name === selected.name
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.name}
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
        {allLimited && (
          <p className="text-xs text-accent-amber">
            Several rating inputs are unavailable for every team here; treat
            these ratings as degraded.
          </p>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">Rk</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  D1 Rk
                </TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Off</TableHead>
                <TableHead className="text-right">Def</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.teams.map((r, index) => (
                <TableRow key={r.team_id}>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 align-middle">
                      <TeamLogo team={teamById.get(r.team_id)} name={r.team} />
                      <span className="font-medium">{r.team}</span>
                    </span>
                    {(r.missing_input_count ?? 0) >= 4 && !allLimited && (
                      <span
                        className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
                        title="Several rating inputs are unavailable for this team; treat the rating as degraded."
                      >
                        Limited data
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                    {d1Rank.get(r.team_id)}
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
