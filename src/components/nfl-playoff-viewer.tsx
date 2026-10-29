"use client";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { playoffDate, playoffPercent } from "@/lib/football-playoff-format";
import type {
  NflPlayoffPayload,
  NflPlayoffTeam,
  NflPlayoffMetric,
} from "@/lib/nfl-playoffs";
import { NflPlayoffBracket } from "./nfl-playoff-bracket";
import { PlayoffMetric, PlayoffTeamFilter, type PlayoffFilter } from "./football-playoff-summary";
const cell = "px-1.5 py-3 text-right tabular-nums sm:px-4";
const record = (t: NflPlayoffTeam) =>
  `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ""}`;
export function NflPlayoffViewer({
  payload,
  identities,
}: {
  payload: NflPlayoffPayload;
  identities: Record<string, TeamLogoSource>;
}) {
  const [conference, setConference] = useState("AFC");
  const [filter, setFilter] = useState<PlayoffFilter>("all");
  const field = new Set(payload.bracket.map((slot) => slot.team_id));
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<NflPlayoffMetric>("playoff");
  const byId = useMemo(
    () => new Map(payload.teams.map((t) => [t.id, t])),
    [payload],
  );
  const teams = useMemo(
    () =>
      [...payload.teams].sort(
        (a, b) =>
          b[metric] - a[metric] ||
          b.expected_wins - a.expected_wins ||
          a.id.localeCompare(b.id),
      ),
    [payload, metric],
  );
  const chosen = selected ? byId.get(selected) : null;
  const sb = payload.path.find((g) => g.round === "Super Bowl")!;
  function teamButton(id: string) {
    const t = byId.get(id)!;
    return (
      <button
        type="button"
        onClick={() => setSelected(id)}
        className="flex min-w-0 items-center gap-2 text-left font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Explore ${t.team}`}
      >
        <TeamLogo
          team={identities[id]}
          name={t.team}
          className="size-5 shrink-0"
        />
        <span className="text-xs sm:text-sm">
          <span className="sm:hidden">{id}</span>
          <span className="hidden sm:inline">{t.team}</span>
        </span>
      </button>
    );
  }
  function table(group: NflPlayoffTeam[], division = false) {
    const columns: [NflPlayoffMetric, string][] = division
      ? [
          ["division_title", "Division"],
          ["playoff", "Playoffs"],
          ["bye", "Bye"],
        ]
      : [
          ["playoff", "Playoffs"],
          ["super_bowl", "Reach SB"],
          ["champion", "Win SB"],
        ];
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-[11px] sm:text-sm">
          <thead className="bg-muted/50 text-[10px] text-muted-foreground">
            <tr>
              <th className="px-2 py-3 text-left sm:px-4" scope="col">
                Team
              </th>
              <th className={`${cell} hidden md:table-cell`} scope="col">
                Proj. wins
              </th>
              {columns.map(([key, label]) => (
                <th
                  key={key}
                  className={cell}
                  scope="col"
                  aria-sort={metric === key ? "descending" : "none"}
                >
                  <button
                    type="button"
                    onClick={() => setMetric(key)}
                    className="underline-offset-4 hover:underline"
                    aria-label={`Sort by ${label}`}
                  >
                    {label}
                    {metric === key ? " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.map((t) => (
              <tr
                key={t.id}
                className="border-t border-border hover:bg-muted/30"
              >
                <td className="px-2 py-3 sm:px-4">
                  {teamButton(t.id)}
                  <p className="mt-1 text-[9px] text-muted-foreground sm:text-[11px]">
                    {record(t)} · {t.division}
                  </p>
                </td>
                <td className={`${cell} hidden md:table-cell`}>
                  {t.expected_wins.toFixed(1)}
                </td>
                {columns.map(([key]) => (
                  <td
                    key={key}
                    className={`${cell} ${key === metric ? "font-semibold text-primary" : ""}`}
                  >
                    {playoffPercent(t[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!group.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No matching teams.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <p>
          {payload.season} outlook · Results as of{" "}
          {playoffDate(payload.results_as_of)}
        </p>
        <p>{payload.draws.toLocaleString("en-US")} simulated seasons</p>
      </div>
      {Date.now() - Date.parse(payload.results_as_of) > 48 * 3600 * 1000 && (
        <p className="rounded-md border border-amber-600/30 bg-amber-500/10 p-3 text-sm">
          Older forecast: recent results may not be included.
        </p>
      )}
      <Tabs defaultValue="bracket" className="min-w-0">
        <TabsList className="mb-5">
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="odds">Probabilities</TabsTrigger>
          <TabsTrigger value="divisions">Division races</TabsTrigger>
        </TabsList>
        <TabsContent value="bracket" className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 border-y border-rule-strong sm:gap-4">
            {([
              ["Playoff leader", "playoff"],
              ["Title favorite", "champion"],
            ] as const).map(([label, key]) => {
              const leader = payload.teams.reduce((a, b) => a[key] >= b[key] ? a : b);
              return <PlayoffMetric key={key} label={label} value={playoffPercent(leader[key])} detail={leader.id} identity={identities[leader.id]} />;
            })}
          </div>
          <div>
            <h2 className="type-section">The projected path</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              One plausible field, with the favorite advancing in each matchup.
              Higher seeds host; the lowest remaining seed visits No. 1 after
              Wild Card weekend. Matchup percentages are conditional on these
              opponents meeting.
            </p>
          </div>
          <NflPlayoffBracket payload={payload} byId={byId} identities={identities} onTeam={setSelected} />
          <section
            aria-label="Projected Super Bowl"
            className="rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-7"
          >
            <p className="type-eyebrow text-muted-foreground">
              Super Bowl · Neutral site
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {teamButton(sb.home)}
                <span className="text-xs text-muted-foreground">vs.</span>
                {teamButton(sb.away)}
              </div>
              <p className="text-sm">
                <span className="font-semibold text-primary">{sb.winner}</span>{" "}
                projected winner ·{" "}
                {playoffPercent(
                  sb.winner === sb.home
                    ? sb.home_win_probability
                    : 1 - sb.home_win_probability,
                )}
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This matchup&apos;s favorite is a scenario result. Overall title
              odds include every possible path.
            </p>
          </section>
        </TabsContent>
        <TabsContent value="odds" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="type-section">Playoff probabilities</h2>
            <label className="w-full sm:w-56">
              <span className="sr-only">Find a team</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a team"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm"
              />
            </label>
          </div>
          <PlayoffTeamFilter value={filter} onChange={setFilter} description={
            filter === "contenders" ? "Teams with at least a 1% playoff chance."
              : filter === "field" ? "The 14 teams in the projected bracket, one possible playoff field."
                : "All 32 teams, including those with less than a 1% playoff chance."
          } />
          <p className="text-xs text-muted-foreground">
            Select a team for seed odds and its remaining schedule. Select a
            column to sort.
          </p>
          {table(
            teams.filter((t) =>
              (filter === "all" || (filter === "field" ? field.has(t.id) : t.playoff >= 0.01)) &&
              `${t.team} ${t.id}`.toLowerCase().includes(query.trim().toLowerCase()),
            ),
          )}
        </TabsContent>
        <TabsContent value="divisions" className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="type-section">Division races</h2>
            <div
              role="group"
              aria-label="Choose conference"
              className="flex gap-2"
            >
              {["AFC", "NFC"].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={conference === c}
                  onClick={() => setConference(c)}
                  className={`rounded-full border px-4 py-2 text-xs ${conference === c ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Division winners take seeds 1-4. Three wild cards complete each
            conference. Only the No. 1 seed earns a bye.
          </p>
          <div className="grid gap-6 xl:grid-cols-2">
            {[
              ...new Set(
                teams
                  .filter((t) => t.conference === conference)
                  .map((t) => t.division),
              ),
            ]
              .sort()
              .map((d) => (
                <section key={d} className="min-w-0 space-y-3">
                  <h3 className="type-subsection">{d}</h3>
                  {table(
                    teams.filter((t) => t.division === d),
                    true,
                  )}
                </section>
              ))}
          </div>
        </TabsContent>
      </Tabs>
      <section className="space-y-3 border-t border-border pt-5" aria-label="QB availability">
        <h2 className="type-section">QB availability</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Reported return windows adjust the quarterback assumption for each game and playoff round.
          The forecast uses the midpoint of each reported range and updates when a newer report is supplied.
        </p>
        {payload.qb_availability?.length ? (
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            {payload.qb_availability.map(q => (
              <details key={q.team} className="min-w-0 rounded-lg border border-border p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  {q.team} · {q.player}
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {q.status === "overdue" ? "Estimate overdue · update needed" :
                     q.status === "season_out" ? "Reported out for season" :
                     q.status === "unknown" ? "Return date unknown" :
                     q.status === "cleared" ? "Cleared to return" :
                     `Expected return: ${q.expected_return_date ?? q.return_earliest} · Reported range: ${q.return_earliest} to ${q.return_latest}`}
                  </span>
                </summary>
                <div className="mt-3 space-y-3 text-xs leading-relaxed">
                  <p>Backup: {q.backup}</p>
                  <p className="text-muted-foreground">{q.uncertainty}</p>
                  <p className="text-muted-foreground">
                    <a href={q.source_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Source report</a>
                    {" · "}{playoffDate(q.reported_at)}
                    <span className="block">Observed {playoffDate(q.observed_at)}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...q.games.map(g => ({label: `W${g.week}`, share: g.return_share})),
                      ...q.postseason.map(g => ({label: g.round, share: g.return_share}))].map(g => (
                      <span key={g.label} className="rounded bg-muted px-2 py-1">
                        {g.label}: {g.share === null ? "ETA unknown" : g.share === 0 ? q.backup : "Starter expected"}
                      </span>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">
          {payload.qb_availability === undefined ? "This snapshot does not include reported return windows." :
            "No usable QB return estimates in this snapshot. Current QB assumptions remain in effect."}
        </p>}
      </section>
      <details className="border-t border-border pt-5">
        <summary className="cursor-pointer text-sm font-semibold">
          How this forecast works
        </summary>
        <div className="mt-4 max-w-3xl space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Forecasts are computed offline from Momentum&apos;s NFL game model.
            Completed regular-season results are preserved. The field follows
            the{" "}
            <a
              className="text-primary underline"
              href="https://www.nfl.com/standings/tie-breaking-procedures"
              target="_blank"
              rel="noopener noreferrer"
            >
              NFL seeding rules
            </a>
            , with reseeding after the Wild Card round.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            {payload.limitations.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p>
            Very small simulated probabilities do not establish mathematical
            elimination or clinching.
          </p>
          <p>
            Model: {payload.model}. Snapshot: {playoffDate(payload.model_as_of)}
            .
          </p>
        </div>
      </details>
      <Dialog
        open={!!chosen}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {chosen && (
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogTitle className="type-section flex items-center gap-3 pr-6">
              <TeamLogo team={identities[chosen.id]} name={chosen.team} />
              {chosen.team}
            </DialogTitle>
            <DialogDescription>
              {chosen.division} · {record(chosen)} ·{" "}
              {chosen.expected_wins.toFixed(1)} projected wins
            </DialogDescription>
            <div className="my-4 grid grid-cols-3 gap-3">
              {(
                [
                  ["Playoffs", chosen.playoff],
                  ["Reach Super Bowl", chosen.super_bowl],
                  ["Win Super Bowl", chosen.champion],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="type-eyebrow text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
                    {playoffPercent(value)}
                  </p>
                </div>
              ))}
            </div>
            <h3 className="type-subsection">Conference seed</h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {chosen.seed_probabilities.map((p, i) => (
                <div
                  key={i}
                  className="rounded border border-border p-2 text-center"
                >
                  <p className="text-[10px] text-muted-foreground">#{i + 1}</p>
                  <p className="mt-1 text-xs font-semibold tabular-nums">
                    {playoffPercent(p)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Unconditional seed odds. A deep tiebreaker involved this team in{" "}
              {playoffPercent(chosen.deep_tiebreak_rate)} of simulated seasons;
              this is not a confidence interval.
            </p>
            <h3 className="type-subsection mt-4">
              Remaining regular season
            </h3>
            <ul className="divide-y divide-border">
              {payload.games
                .filter((g) => g.home === chosen.id || g.away === chosen.id)
                .map((g) => {
                  const home = g.home === chosen.id,
                    opponent = byId.get(home ? g.away : g.home)!;
                  return (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-3 py-3 text-xs"
                    >
                      <div>
                        <p className="flex items-center gap-2 font-semibold">
                          <TeamLogo team={identities[opponent.id]} name={opponent.team} className="size-4" />
                          {g.neutral ? "vs." : home ? "vs." : "at"}{" "}
                          {opponent.team}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Week {g.week} ·{" "}
                          {g.date ? playoffDate(g.date) : "Date TBD"}
                          {g.neutral ? " · Neutral site" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-primary">
                        {playoffPercent(
                          home
                            ? g.home_win_probability
                            : 1 - g.home_win_probability,
                        )}
                      </span>
                    </li>
                  );
                })}
            </ul>
            {!payload.games.some(
              (g) => g.home === chosen.id || g.away === chosen.id,
            ) && (
              <p className="text-sm text-muted-foreground">
                Regular season complete.
              </p>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
