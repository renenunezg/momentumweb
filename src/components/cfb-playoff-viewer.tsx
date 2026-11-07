"use client";
import { useMemo, useState } from "react";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlayoffMetric as Metric, PlayoffTeamFilter, type PlayoffFilter } from "./football-playoff-summary";
import { TeamLogo } from "@/components/team-logo";
import { HowGraded } from "@/components/how-graded";
import {
  CfbPlayoffBracket,
  type PlayoffIdentities,
} from "./cfb-playoff-bracket";
import { CfbPlayoffTeamDialog } from "./cfb-playoff-team-dialog";
import {
  decodeCfbPlayoffs,
  type CfbPlayoffPayload,
  type CfbPlayoffTeam,
} from "@/lib/cfb-playoffs";
import { playoffDate, playoffPercent } from "@/lib/football-playoff-format";

function TeamButton({
  team,
  identities,
  onTeam,
}: {
  team: CfbPlayoffTeam;
  identities: PlayoffIdentities;
  onTeam: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onTeam(team.id)}
      className="flex max-w-full items-center gap-1.5 text-left font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring sm:gap-2"
    >
      <TeamLogo team={identities[team.id]} name={team.team} className="size-4 sm:size-5" />
      <span>
        {team.ap_rank && (
          <span className="mr-1 type-meta text-muted-foreground">
            #{team.ap_rank}
          </span>
        )}
        {team.team}
      </span>
    </button>
  );
}
const rate = (w: number, l: number) => (w + l ? w / (w + l) : 0);
// Uppercase eyebrow headers would force the four-number conference table
// wider than a phone, so they may wrap below sm.
const numHead = "whitespace-normal text-right sm:whitespace-nowrap";
const VIEWS = [
  { key: "bracket", label: "Playoff bracket" },
  { key: "conferences", label: "Conferences" },
] as const;

export function CfbPlayoffViewer({
  payload,
  identities,
}: {
  payload: CfbPlayoffPayload;
  identities: PlayoffIdentities;
}) {
  const forecast = useMemo(() => decodeCfbPlayoffs(payload), [payload]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlayoffFilter>("contenders");
  const [conference, setConference] = useState("SEC");
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("bracket");
  const field = new Set(payload.bracket.map((s) => s.team_id));
  const teams = forecast.teams;
  const conferences = [...new Set(teams.map((t) => t.conference))].sort();
  const actualConference = conferences.includes(conference)
    ? conference
    : conferences[0];
  const members = teams
    .filter((t) => t.conference === actualConference)
    .sort(
      (a, b) =>
        rate(b.conference_wins, b.conference_losses) -
          rate(a.conference_wins, a.conference_losses) ||
        rate(b.wins, b.losses) - rate(a.wins, a.losses) ||
        a.team.localeCompare(b.team),
    );
  const independent = actualConference === "Independent";
  const best = (
    group: CfbPlayoffTeam[],
    key: "playoff" | "bye" | "champion" | "conference_champion",
  ) => group.reduce((a, b) => (a[key] > b[key] ? a : b));
  const shown = teams.filter(
    (t) =>
      (filter === "all" ||
        (filter === "field" && field.has(t.id)) ||
        (filter === "contenders" &&
          (t.playoff >= 0.01 || t.ap_rank !== null))) &&
      t.team.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 type-meta text-muted-foreground">
        <span>
          Results: {playoffDate(payload.results_as_of)} ·{" "}
          {new Date(payload.results_as_of).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "America/Los_Angeles",
          })}{" "}
          PT
        </span>
        <span>
          Model: {playoffDate(payload.model_as_of)} · AP Week {payload.ap_week}
        </span>
        <span>{payload.draws.toLocaleString("en-US")} simulated seasons</span>
        {payload.status === "local_preview" && (
          <span className="type-eyebrow rounded border border-border px-2 py-0.5">
            Local preview
          </span>
        )}
      </div>
      <HowGraded label="How this works">
        <p>
          Momentum simulates the remaining schedule, conference championships,
          and every playoff round. The fitted schedule-adjusted-record
          selector chooses the field under the{" "}
          <a
            className="text-primary underline"
            href="https://collegefootballplayoff.com/sports/2024/5/29/12-team-format"
            target="_blank"
            rel="noopener noreferrer"
          >
            2026 CFP rules
          </a>
          . The displayed bracket is one legal simulated field, not a
          certainty.
        </p>
        <p>
          On the 2024 and 2025 twelve-team fields the record-based selector and
          a learned committee model scored about the same (Brier 0.034 against
          0.035, each ahead in one season). That was a retrospective comparison
          on the seasons used to choose the selector; championship odds have no
          separate historical calibration claim.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {payload.limitations.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p>
          Probabilities below 0.1% include outcomes not observed in these
          simulations; they do not imply impossibility. Conference standings are
          ordered by conference win percentage, then overall win percentage;
          ties are not shown in official tiebreak order.
        </p>
      </HowGraded>
      <ViewTabs
        label="Playoff views"
        options={VIEWS}
        value={view}
        onValueChange={setView}
        className="min-w-0"
      >
        <ViewTabPanel value="bracket" className="min-w-0 space-y-8">
          <div className="grid grid-cols-3 gap-3 border-y border-rule-strong sm:gap-4">
            {(
              [
                ["Playoff leader", "playoff"],
                ["Bye favorite", "bye"],
                ["Title favorite", "champion"],
              ] as const
            ).map(([label, key]) => {
              const t = best(teams, key);
              return (
                <Metric
                  key={key}
                  label={label}
                  detail={t.team}
                  identity={identities[t.id]}
                  value={playoffPercent(t[key])}
                />
              );
            })}
          </div>
          <CfbPlayoffBracket
            bracket={payload.bracket}
            teams={forecast.byId}
            identities={identities}
            onTeam={setSelected}
          />
          <section
            className="space-y-4"
            aria-label="Team playoff probabilities"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="type-section">
                Playoff probabilities
              </h2>
              <label className="w-full sm:w-56">
                <span className="sr-only">Find a team</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a team"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-ring sm:text-sm"
                />
              </label>
            </div>
            <PlayoffTeamFilter value={filter} onChange={setFilter} description={
              filter === "contenders"
                ? "Teams with at least a 1% playoff chance, plus every AP-ranked team."
                : filter === "field"
                  ? "The 12 teams in the bracket above, one possible simulated field."
                  : "Every team in the forecast, including those with less than a 1% playoff chance."
            } />
            <Table density="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Record
                  </TableHead>
                  <TableHead className={numHead}>Make CFP</TableHead>
                  <TableHead className={numHead}>Bye</TableHead>
                  <TableHead className={numHead}>Win title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-normal font-sans">
                      <TeamButton
                        team={t}
                        identities={identities}
                        onTeam={setSelected}
                      />
                      <p className="mt-0.5 type-meta text-muted-foreground">
                        {t.conference}
                        <span className="sm:hidden">
                          {" "}
                          · {t.wins}-{t.losses}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {t.wins}-{t.losses}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {playoffPercent(t.playoff)}
                    </TableCell>
                    <TableCell className="text-right">
                      {playoffPercent(t.bye)}
                    </TableCell>
                    <TableCell className="text-right">
                      {playoffPercent(t.champion)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {shown.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No matching teams.
              </p>
            )}
          </section>
        </ViewTabPanel>
        <ViewTabPanel value="conferences" className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="type-section">{actualConference}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Current standings and the paths to a championship.
              </p>
            </div>
            <label className="flex w-full items-center gap-3 sm:w-auto">
              <span className="type-eyebrow text-muted-foreground">
                Conference
              </span>
              <select
                aria-label="Choose conference"
                value={actualConference}
                onChange={(e) => setConference(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm"
              >
                {conferences.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3 border-y border-rule-strong sm:gap-4">
            <Metric
              label={
                independent ? "Teams in the race" : "Conference title favorite"
              }
              detail={
                independent
                  ? "Independents"
                  : best(members, "conference_champion").team
              }
              identity={independent ? undefined : identities[best(members, "conference_champion").id]}
              value={
                independent
                  ? String(members.length)
                  : playoffPercent(
                      best(members, "conference_champion").conference_champion,
                    )
              }
            />
            <Metric
              label="Expected playoff bids"
              detail="Across all simulations"
              value={members.reduce((sum, t) => sum + t.playoff, 0).toFixed(1)}
            />
            <Metric
              label="Best playoff chance"
              detail={best(members, "playoff").team}
              identity={identities[best(members, "playoff").id]}
              value={playoffPercent(best(members, "playoff").playoff)}
            />
          </div>
          <Table
            density="compact"
            aria-label={`${actualConference} standings and probabilities`}
          >
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Overall
                </TableHead>
                <TableHead className={numHead}>Conf.</TableHead>
                <TableHead className={numHead}>Title game</TableHead>
                <TableHead className={numHead}>Win conf.</TableHead>
                <TableHead className={numHead}>Make CFP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-normal font-sans">
                    <TeamButton
                      team={t}
                      identities={identities}
                      onTeam={setSelected}
                    />
                    <p className="mt-0.5 type-meta text-muted-foreground sm:hidden">
                      {t.wins}-{t.losses} overall
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    {t.wins}-{t.losses}
                  </TableCell>
                  <TableCell className="text-right">
                    {independent
                      ? "–"
                      : `${t.conference_wins}-${t.conference_losses}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {independent
                      ? "–"
                      : playoffPercent(t.conference_title_game)}
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    {independent
                      ? "–"
                      : playoffPercent(t.conference_champion)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {playoffPercent(t.playoff)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ViewTabPanel>
      </ViewTabs>
      <CfbPlayoffTeamDialog
        team={selected === null ? null : (forecast.byId.get(selected) ?? null)}
        forecast={forecast}
        identities={identities}
        modelDate={payload.model_as_of}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
