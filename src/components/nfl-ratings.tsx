"use client";

import { useMemo } from "react";
import type {
  NflTeamIdentity,
  NflTeamRating,
  NflTeamUnitRating,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import NflDivisionRatings from "@/components/nfl-division-ratings";
import NflUnitRatings from "@/components/nfl-unit-ratings";
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
  { key: "all", label: "All" },
  { key: "afc", label: "AFC" },
  { key: "nfc", label: "NFC" },
  { key: "division", label: "Division" },
  { key: "units", label: "Units" },
] as const;

type View = (typeof VIEWS)[number]["key"];

export default function NflRatings({
  ratings,
  units,
  teams,
}: {
  ratings: NflTeamRating[];
  units: NflTeamUnitRating[];
  teams: NflTeamIdentity[];
}) {
  // Search params are read in the browser without opting the server page into
  // dynamic rendering. The server snapshot uses the default view, then deep
  // links switch locally after hydration without a refetch.
  const search = useLocationSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const requestedView = params.get("view");
  const view: View =
    VIEWS.find((option) => option.key === requestedView)?.key ?? "all";
  const initialDivision = params.get("division") ?? undefined;

  // Teams cross the server boundary as an array; index them once here so
  // every view looks logos up by abbreviation.
  const teamByAbbr = useMemo(
    () => new Map(teams.map((t) => [t.team_abbr, t])),
    [teams]
  );

  // Every view is a slice of the ratings already in the browser, so switching
  // only updates the URL-backed client view: no navigation, no refetch.
  const visible = useMemo(() => {
    if (view === "afc" || view === "nfc")
      return ratings.filter((r) => r.conference?.toLowerCase() === view);
    return ratings;
  }, [ratings, view]);

  function select(next: View) {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    if (next !== "division") url.searchParams.delete("division");
    replaceLocation(url);
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

      {view === "division" ? (
        <NflDivisionRatings
          ratings={ratings}
          teamByAbbr={teamByAbbr}
          initialDivision={initialDivision}
        />
      ) : view === "units" ? (
        <NflUnitRatings units={units} ratings={ratings} teamByAbbr={teamByAbbr} />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">Rk</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="hidden sm:table-cell">Division</TableHead>
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
                    {(r.missing_input_count ?? 0) >= 1 && (
                      <span
                        className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent-amber"
                        title="A preseason rating input is unavailable for this team; treat the rating as degraded."
                      >
                        Limited data
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {r.division ?? "–"}
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
      )}
    </div>
  );
}
