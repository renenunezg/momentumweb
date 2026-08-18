"use client";

import { useMemo, useState } from "react";
import type {
  CfbTeamIdentity,
  CfbTeamRating,
  CfbTeamUnitRating,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import CfbConferenceRatings from "@/components/cfb-conference-ratings";
import CfbUnitRatings from "@/components/cfb-unit-ratings";
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

const VIEWS = [
  { key: "top25", label: "Top 25" },
  { key: "fbs", label: "FBS" },
  { key: "fcs", label: "FCS" },
  { key: "conference", label: "Conference" },
  { key: "units", label: "Units" },
] as const;

type View = (typeof VIEWS)[number]["key"];

export default function CfbRatings({
  ratings,
  units,
  teams,
  initialView,
  initialConference,
}: {
  ratings: CfbTeamRating[];
  units: CfbTeamUnitRating[];
  teams: CfbTeamIdentity[];
  initialView?: string;
  initialConference?: string;
}) {
  const [view, setView] = useState<View>(
    () => VIEWS.find((v) => v.key === initialView)?.key ?? "top25"
  );

  // Teams cross the server boundary as an array; index them once here so both
  // this table and the conference view look logos up by id.
  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.team_id, t])),
    [teams]
  );

  // Every view is a slice of the ratings already in the browser, so switching
  // is state only: no navigation, no refetch.
  const visible = useMemo(() => {
    if (view === "fbs" || view === "fcs")
      return ratings.filter((r) => r.classification === view);
    // Top 25 ranks across all of D1; today that is every FBS team, but an FCS
    // team good enough to crack it should show up rather than be filtered out.
    return ratings.slice(0, 25);
  }, [ratings, view]);

  // Whole tiers (all of FCS today) run on reduced inputs, and a badge on every
  // row says nothing; call it out once instead and keep the per-row badge for
  // tables where it actually singles a team out.
  const allLimited = visible.every((r) => (r.missing_input_count ?? 0) >= 4);

  function select(next: View) {
    setView(next);
    const url = new URL(window.location.href);
    if (next === "top25") url.searchParams.delete("class");
    else url.searchParams.set("class", next);
    if (next !== "conference") url.searchParams.delete("conf");
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-0 font-mono text-xs uppercase tracking-wider">
        {VIEWS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => select(tab.key)}
            className={cn(
              // Tailwind's preflight resets text-transform on <button>, so the
              // tab bar's uppercase has to be set here rather than inherited.
              "border-b-2 px-3 py-2 uppercase transition-colors",
              tab.key === view
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === "conference" ? (
        <CfbConferenceRatings
          ratings={ratings}
          teamById={teamById}
          initialConference={initialConference}
        />
      ) : view === "units" ? (
        <CfbUnitRatings units={units} ratings={ratings} teamById={teamById} />
      ) : (
        <div className="space-y-2">
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
                  <TableHead className="hidden sm:table-cell">
                    Conference
                  </TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Off</TableHead>
                  <TableHead className="text-right">Def</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    SD
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, index) => (
                  <TableRow key={r.team_id}>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 align-middle">
                        <TeamLogo team={teamById.get(r.team_id)} name={r.team} />
                        <span className="font-medium">{r.team}</span>
                      </span>
                      {view === "top25" && r.classification !== "fbs" && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {r.classification ?? "?"}
                        </span>
                      )}
                      {(r.missing_input_count ?? 0) >= 4 && !allLimited && (
                        <span
                          className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
                          title="Several rating inputs are unavailable for this team; treat the rating as degraded."
                        >
                          Limited data
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {r.conference ?? "–"}
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
                    <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground sm:table-cell">
                      {fmt(r.power_rating_sd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
