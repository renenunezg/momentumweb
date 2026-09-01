"use client";

import { useMemo, useState } from "react";
import type {
  CfbTeamIdentity,
  CfbTeamRating,
  CfbTeamUnitRating,
} from "@/lib/types";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import { GroupRatings } from "@/components/group-ratings";
import {
  PowerRatingsTable,
  type LimitedDataRule,
} from "@/components/power-ratings-table";
import { ToggleGroup } from "@/components/toggle-group";
import { UnitRatingsTable } from "@/components/unit-ratings-table";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";

const VIEWS = [
  { key: "top25", label: "Top 25" },
  { key: "fbs", label: "FBS" },
  { key: "fcs", label: "FCS" },
  { key: "conference", label: "Conference" },
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
] as const;

const CLASSES = [
  { key: "fbs", label: "FBS" },
  { key: "fcs", label: "FCS" },
  { key: "all", label: "All D1" },
] as const;

type ClassKey = (typeof CLASSES)[number]["key"];

const LIMITED: LimitedDataRule = {
  isLimited: (r) => (r.missing_input_count ?? 0) >= 4,
  rowNote:
    "Several rating inputs are unavailable for this team; treat the rating as degraded.",
  allNote:
    "Several rating inputs are unavailable for every team here; treat these ratings as degraded.",
};

const rowKey = (r: { team_id: number }) => r.team_id;

export default function CfbRatings({
  ratings,
  units,
  teams,
}: {
  ratings: CfbTeamRating[];
  units: CfbTeamUnitRating[];
  teams: CfbTeamIdentity[];
}) {
  // Search params are read in the browser without opting the server page into
  // dynamic rendering. The server snapshot uses the default view, then deep
  // links switch locally after hydration without a refetch.
  const search = useLocationSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const requestedView = params.get("class");
  const view: View =
    VIEWS.find((option) => option.key === requestedView)?.key ?? "top25";
  const initialConference = params.get("conf") ?? undefined;

  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.team_id, t])),
    [teams]
  );
  const logo = (r: { team_id: number }) => teamById.get(r.team_id);

  // Every view is a slice of the ratings already in the browser, so switching
  // only updates the URL-backed client view: no navigation, no refetch.
  const visible = useMemo(() => {
    if (view === "fbs" || view === "fcs")
      return ratings.filter((r) => r.classification === view);
    // Top 25 ranks across all of D1; today that is every FBS team, but an FCS
    // team good enough to crack it should show up rather than be filtered out.
    return ratings.slice(0, 25);
  }, [ratings, view]);

  function select(next: View) {
    const url = new URL(window.location.href);
    if (next === "top25") url.searchParams.delete("class");
    else url.searchParams.set("class", next);
    if (next !== "conference") url.searchParams.delete("conf");
    replaceLocation(url);
  }

  function selectConference(name: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("class", "conference");
    url.searchParams.set("conf", name);
    replaceLocation(url);
  }

  return (
    <ViewTabs label="Ratings view" options={VIEWS} value={view} onValueChange={select}>
      <ViewTabPanel value={view}>
        {view === "conference" ? (
          <GroupRatings
            ratings={ratings}
            rowKey={rowKey}
            logo={logo}
            groupOf={(r) => r.conference ?? "Independent"}
            tierOf={(r) => r.classification ?? "fbs"}
            tiers={["fbs", "fcs"]}
            noun="conferences"
            overallRankLabel="D1 Rk"
            initialGroup={initialConference}
            onSelect={selectConference}
            limited={LIMITED}
          />
        ) : view === "units" ? (
          <CfbUnitRatings units={units} ratings={ratings} logo={logo} />
        ) : (
          <PowerRatingsTable
            rows={visible}
            rowKey={rowKey}
            logo={logo}
            caption={`${VIEWS.find((v) => v.key === view)?.label} power ratings`}
            group={{ label: "Conference", value: (r) => r.conference }}
            showSd
            tag={(r) =>
              view === "top25" && r.classification !== "fbs" ? (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.classification ?? "?"}
                </span>
              ) : null
            }
            limited={LIMITED}
          />
        )}
      </ViewTabPanel>
    </ViewTabs>
  );
}

function CfbUnitRatings({
  units,
  ratings,
  logo,
}: {
  units: CfbTeamUnitRating[];
  ratings: CfbTeamRating[];
  logo: (r: { team_id: number }) => CfbTeamIdentity | undefined;
}) {
  const [classification, setClassification] = useState<ClassKey>("fbs");
  const powerRank = useMemo(
    () => new Map<string | number, number>(ratings.map((r, i) => [r.team_id, i + 1])),
    [ratings]
  );
  const ratingsSeason = ratings[0]?.season ?? null;
  const sourceSeasons = useMemo(
    () =>
      [...new Set(units.map((u) => u.source_season).filter((s) => s != null))].sort(
        (a, b) => a - b
      ),
    [units]
  );
  const shown = useMemo(
    () =>
      units.filter(
        (u) => classification === "all" || u.classification === classification
      ),
    [units, classification]
  );

  if (units.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Unit ratings have not been published for this ratings snapshot.
      </p>
    );
  }

  return (
    <UnitRatingsTable
      units={shown}
      columns={UNIT_COLUMNS}
      defaultSort="pass_offense"
      rowKey={rowKey}
      logo={logo}
      powerRank={powerRank}
      caption={`${CLASSES.find((c) => c.key === classification)?.label} unit ratings`}
      intro={
        <>
          Opponent-adjusted PPA per game above an average FBS team. Positive is
          better in every column. These are descriptive companions to the power
          ratings, not model inputs or components of Off and Def. Pass and run
          blocking are shared-outcome proxies, not isolated line grades.
          {sourceSeasons.length === 1 &&
            (ratingsSeason != null && sourceSeasons[0] < ratingsSeason ? (
              <> Preseason unit ratings use {sourceSeasons[0]} game history.</>
            ) : (
              <> Unit ratings use {sourceSeasons[0]} games played so far.</>
            ))}
        </>
      }
      controls={
        <ToggleGroup
          label="Classification"
          options={CLASSES}
          value={classification}
          onChange={setClassification}
          className="shrink-0"
        />
      }
      badge={(u) =>
        u.unit_history_missing
          ? {
              label: "No history",
              note: "No prior-season unit history is available; all unit values use the neutral fallback.",
            }
          : null
      }
    />
  );
}
