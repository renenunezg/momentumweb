"use client";

import { useMemo } from "react";
import type {
  NflTeamIdentity,
  NflTeamRating,
  NflTeamUnitRating,
} from "@/lib/types";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import { GroupRatings } from "@/components/group-ratings";
import {
  PowerRatingsTable,
  type LimitedDataRule,
} from "@/components/power-ratings-table";
import { UnitRatingsTable } from "@/components/unit-ratings-table";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";

const VIEWS = [
  { key: "all", label: "All" },
  { key: "afc", label: "AFC" },
  { key: "nfc", label: "NFC" },
  { key: "division", label: "Division" },
  { key: "units", label: "Units" },
] as const;

type View = (typeof VIEWS)[number]["key"];

const UNIT_COLUMNS = [
  { key: "rush_offense", label: "Rush O" },
  { key: "pass_offense", label: "Pass O" },
  { key: "rush_defense", label: "Rush D" },
  { key: "pass_defense", label: "Pass D" },
  { key: "pass_block", label: "Pass Blk" },
  { key: "run_block", label: "Run Blk" },
  { key: "special_teams", label: "ST" },
] as const;

const LIMITED: LimitedDataRule = {
  isLimited: (r) => (r.missing_input_count ?? 0) >= 1,
  rowNote:
    "A preseason rating input is unavailable for this team; treat the rating as degraded.",
  allNote:
    "A preseason rating input is unavailable for every team here; treat these ratings as degraded.",
};

const rowKey = (r: { team_abbr: string }) => r.team_abbr;

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

  const teamByAbbr = useMemo(
    () => new Map(teams.map((t) => [t.team_abbr, t])),
    [teams]
  );
  const logo = (r: { team_abbr: string }) => teamByAbbr.get(r.team_abbr);

  const visible = useMemo(() => {
    if (view === "afc" || view === "nfc")
      return ratings.filter((r) => r.conference?.toLowerCase() === view);
    return ratings;
  }, [ratings, view]);

  const powerRank = useMemo(
    () => new Map<string | number, number>(ratings.map((r, i) => [r.team_abbr, i + 1])),
    [ratings]
  );

  function select(next: View) {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    if (next !== "division") url.searchParams.delete("division");
    replaceLocation(url);
  }

  function selectDivision(name: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "division");
    url.searchParams.set("division", name);
    replaceLocation(url);
  }

  return (
    <ViewTabs label="Ratings view" options={VIEWS} value={view} onValueChange={select}>
      <ViewTabPanel value={view}>
        {view === "division" ? (
          <GroupRatings
            ratings={ratings}
            rowKey={rowKey}
            logo={logo}
            groupOf={(r) => r.division ?? "Unknown"}
            tierOf={(r) => r.conference ?? "AFC"}
            tiers={["AFC", "NFC"]}
            noun="divisions"
            overallRankLabel="NFL Rk"
            initialGroup={initialDivision}
            onSelect={selectDivision}
            limited={LIMITED}
          />
        ) : view === "units" ? (
          units.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Unit ratings appear once the season has played games; the
              preseason forecast publishes team ratings only.
            </p>
          ) : (
            <UnitRatingsTable
              units={units}
              columns={UNIT_COLUMNS}
              defaultSort="pass_offense"
              rowKey={rowKey}
              logo={logo}
              powerRank={powerRank}
              caption="NFL unit ratings"
              intro="Points per game above league average, opponent adjusted. Companions to the power ratings, not components: they do not sum to Off and Def, and the line ratings attribute outcomes without snap level film data. Click a column to sort."
            />
          )
        ) : (
          <PowerRatingsTable
            rows={visible}
            rowKey={rowKey}
            logo={logo}
            caption={`${VIEWS.find((v) => v.key === view)?.label} power ratings`}
            group={{ label: "Division", value: (r) => r.division }}
            showSd
            limited={LIMITED}
          />
        )}
      </ViewTabPanel>
    </ViewTabs>
  );
}
