"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ViewTabs, ViewTabPanel } from "@/components/view-tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildMock,
  pickReason,
  positionNames,
  priorityLabel,
} from "@/lib/draft";
import type {
  CollegePlayer,
  DraftPosition,
  DraftWorkspace as Workspace,
  MockMode,
  RosterPlayer,
} from "@/lib/draft";
import styles from "./draft-workspace.module.css";
import { PlayerHeadshot } from "@/components/player-headshot";
import {
  cfbPlayerHeadshotUrl,
  nflPlayerHeadshotUrl,
} from "@/lib/player-headshots";
import { DraftImpactChart, DraftComparison } from "./draft-charts";
import { useDraftSection } from "./use-draft-section";
import type { PlayerPage, HistoryPage } from "@/lib/draft";

type Tab = "mock" | "players" | "roster" | "guide" | "history";
const tabs: { key: Tab; label: string }[] = [
  { key: "mock", label: "Mock draft" },
  { key: "players", label: "Player map" },
  { key: "roster", label: "Team roster" },
  { key: "guide", label: "How the draft works" },
];
const date = (value: string) =>
  new Date(
    value.length === 10 ? `${value}T12:00:00Z` : value,
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const score = (value?: number) =>
  value == null ? "Not measured" : value.toFixed(1);
const groups = [
  "Offensive line",
  "Backfield",
  "Receivers",
  "Front seven",
  "Secondary",
  "Nickel option",
  "Fullback option",
  "Specialists",
];
const packageLabel = (value: string) =>
  value === "3WR 1TE"
    ? "Offense"
    : value === "Special Teams"
      ? "Special teams"
      : value.replace("Base ", "").replace(" D", " defense");
const subscribeStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};
function Source({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function DraftWorkspace({
  data,
  initialPlayers,
  initialRoster,
}: {
  data: Workspace;
  initialPlayers: PlayerPage;
  initialRoster: RosterPlayer[];
}) {
  const { board, meta } = data;
  const [tab, setTab] = useState<Tab>("mock");
  const [edits, setEdits] = useState<{
    mode: MockMode;
    overrides: Record<number, string>;
  } | null>(null);
  const [team, setTeam] = useState(board.picks[0].owner);
  const [highlight, setHighlight] = useState("");
  const [unit, setUnit] = useState("3WR 1TE");
  const [slot, setSlot] = useState<number | null>(null);
  const [pickNumber, setPickNumber] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("QB");
  const [profile, setProfile] = useState<CollegePlayer | null>(null);
  const [notice, setNotice] = useState("");
  const storageKey = `momentum-draft-${board.edition}`;
  const stored = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const saved = useMemo(() => {
    try {
      const value: unknown = JSON.parse(stored ?? "null");
      if (
        value &&
        typeof value === "object" &&
        "mode" in value &&
        (value.mode === "needs" || value.mode === "value") &&
        "overrides" in value &&
        value.overrides &&
        typeof value.overrides === "object"
      ) {
        return {
          mode: value.mode as MockMode,
          overrides: Object.fromEntries(
            Object.entries(value.overrides).filter(
              ([n, id]) =>
                typeof id === "string" &&
                board.picks.some((p) => String(p.pick) === n) &&
                board.prospects.some((p) => p.id === id),
            ),
          ) as Record<number, string>,
        };
      }
    } catch {
      /* Invalid browser state falls back to the published board. */
    }
    return { mode: "needs" as MockMode, overrides: {} };
  }, [stored, board]);
  const { mode, overrides } = edits ?? saved;
  function save(nextMode: MockMode, nextOverrides: Record<number, string>) {
    setEdits({ mode: nextMode, overrides: nextOverrides });
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ mode: nextMode, overrides: nextOverrides }),
      );
    } catch {
      setNotice(
        "Changes are kept for this visit. Browser storage is unavailable.",
      );
    }
  }
  const picks = useMemo(
    () => buildMock(board, mode, overrides),
    [board, mode, overrides],
  );
  const selectedPick =
    pickNumber == null ? null : picks.find((p) => p.pick === pickNumber);
  const playerUrl = `/cfb/api/draft/players?year=${board.season}&view=page&position=${encodeURIComponent(position)}&query=${encodeURIComponent(query)}&offset=${page * 50}`;
  const playerSection = useDraftSection<PlayerPage>(
    playerUrl,
    tab === "players",
    {
      url: `/cfb/api/draft/players?year=${board.season}&view=page&position=QB&query=&offset=0`,
      data: initialPlayers,
    },
  );
  const historySection = useDraftSection<HistoryPage>(
    `/cfb/api/draft/history?year=${board.season}&view=page&query=${encodeURIComponent(query)}&offset=${page * 50}`,
    tab === "history",
  );
  const rosterTeam = selectedPick?.owner ?? team;
  const rosterSection = useDraftSection<RosterPlayer[]>(
    `/cfb/api/draft/roster?year=${board.season}&team=${rosterTeam}`,
    tab === "roster" || !!selectedPick,
    {
      url: `/cfb/api/draft/roster?year=${board.season}&team=${board.picks[0].owner}`,
      data: initialRoster,
    },
  );
  const roster = rosterSection.data ?? [];
  const players = playerSection.data;
  const history = historySection.data;
  const activeSection =
    tab === "players"
      ? playerSection
      : tab === "history"
        ? historySection
        : rosterSection;
  const profileGroup =
    profile?.position_group ?? profile?.position ?? "Not listed";
  const profileSection = useDraftSection<PlayerPage>(
    `/cfb/api/draft/players?year=${board.season}&view=page&position=${encodeURIComponent(profileGroup)}&query=${encodeURIComponent(profile?.athlete_name ?? "")}`,
    !!profile && profileGroup !== position,
  );
  const comparison =
    profileGroup === position
      ? players?.comparison
      : profileSection.data?.comparison;
  const mockPlayerIds = new Set(
    picks.flatMap((p) => (p.player.athlete_id ? [p.player.athlete_id] : [])),
  );
  const teamPicks = picks.filter((p) => p.owner === team);
  const teamRows = roster.filter((r) => r.team === team);
  const units = [...new Set(teamRows.map((r) => r.pos_grp))].sort();
  const activeUnit = units.includes(unit) ? unit : (units[0] ?? "");
  const slots = [
    ...new Set(
      teamRows.filter((r) => r.pos_grp === activeUnit).map((r) => r.pos_slot),
    ),
  ]
    .sort((a, b) => a - b)
    .map((id) => {
      const rows = teamRows
        .filter((r) => r.pos_grp === activeUnit && r.pos_slot === id)
        .sort((a, b) => a.pos_rank - b.pos_rank);
      return { id, first: rows[0], rows };
    });
  const selectedSlot = slots.find((s) => s.id === slot) ?? slots[0];
  function openRoster(owner: string) {
    setTeam(owner);
    setSlot(null);
    setTab("roster");
  }
  function selectNeed(need: DraftPosition) {
    const row = teamRows.find((r) => r.draft_position === need);
    if (row) {
      setUnit(row.pos_grp);
      setSlot(row.pos_slot);
    }
  }
  const currentForPick: RosterPlayer[] = [];
  if (selectedPick) {
    const seen = new Set<string>();
    for (const row of roster
      .filter(
        (r) =>
          r.team === selectedPick.owner &&
          r.draft_position === selectedPick.player.position,
      )
      .sort((a, b) => a.pos_rank - b.pos_rank)) {
      if (!seen.has(row.player_name)) currentForPick.push(row);
      seen.add(row.player_name);
    }
  }
  const filteredPlayers = players?.rows ?? [];
  const filteredHistory = history?.rows ?? [];
  function changeQuery(value: string) {
    setQuery(value);
    setPage(0);
  }

  return (
    <div className={styles.workspace}>
      <p className={styles.context}>
        Working mock · Player ranks and team priorities from Pro Football Mania.
        Selections are editable and are not predictions of confirmed picks.
      </p>
      <ViewTabs
        label="Draft workspace"
        options={
          tab === "history"
            ? [...tabs, { key: "history", label: "Past draft classes" }]
            : tabs
        }
        value={tab}
        onValueChange={(value) => {
          setTab(value);
          changeQuery("");
        }}
      >
        <ViewTabPanel value="mock">
          <div className={styles.heading}>
            <div>
              <h2>Round 1</h2>
              <p>
                Select a player to review or change the pick. Select a team to
                explore its roster.
              </p>
            </div>
            <span>{date(board.order_date)} projected order</span>
          </div>
          <div className={styles.controls}>
            <label>
              How picks are chosen
              <select
                value={mode}
                onChange={(e) => save(e.target.value as MockMode, {})}
              >
                <option value="needs">Player ranking + team priorities</option>
                <option value="value">Player ranking only</option>
              </select>
            </label>
            <label>
              Highlight a team
              <select
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
              >
                <option value="">All teams</option>
                {Object.entries(board.teams)
                  .sort((a, b) => a[1].name.localeCompare(b[1].name))
                  .map(([id, t]) => (
                    <option key={id} value={id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className={styles.button}
              onClick={() => {
                save("needs", {});
                setNotice(
                  "Starting mock restored. Your custom picks have been cleared.",
                );
              }}
            >
              Reset mock
            </button>
          </div>
          {highlight && (
            <p>
              {board.teams[highlight].name}:{" "}
              {picks.some((p) => p.owner === highlight)
                ? `picks ${picks
                    .filter((p) => p.owner === highlight)
                    .map((p) => `No. ${p.pick}`)
                    .join(", ")}`
                : "no first-round pick in this order"}
              .
            </p>
          )}
          <div className={styles.tableWrap}>
            <table>
              <caption className="sr-only">
                {board.season} first-round mock draft
              </caption>
              <thead>
                <tr>
                  <th>Pick</th>
                  <th>Team</th>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Scouting rank</th>
                  <th>Why this pick</th>
                </tr>
              </thead>
              <tbody>
                {picks.map((p) => (
                  <tr
                    key={p.pick}
                    className={
                      highlight && p.owner !== highlight
                        ? styles.dimmed
                        : undefined
                    }
                  >
                    <td className={styles.pickNumber}>{p.pick}</td>
                    <td>
                      <button
                        className={styles.link}
                        onClick={() => openRoster(p.owner)}
                      >
                        {board.teams[p.owner].name}
                      </button>
                      {p.original !== p.owner && (
                        <small>Via {p.original}</small>
                      )}
                    </td>
                    <td>
                      <div className={styles.playerCell}>
                        <PlayerHeadshot
                          name={p.player.name}
                          src={
                            p.player.athlete_id
                              ? cfbPlayerHeadshotUrl(p.player.athlete_id, 96)
                              : null
                          }
                          className="h-10 w-10"
                        />
                        <div>
                          <button
                            className={styles.link}
                            onClick={() => setPickNumber(p.pick)}
                          >
                            {p.player.name}
                          </button>
                          <small>{p.player.school}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <abbr title={positionNames[p.player.position]}>
                        {p.player.position}
                      </abbr>
                    </td>
                    <td>{p.player.rank ?? "Not ranked"}</td>
                    <td>{pickReason(p, mode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className={styles.disclosure}>
            <summary>How are these picks chosen?</summary>
            <p>
              In the team-priorities setting, the mock considers the five
              highest-ranked eligible players and chooses one at the team&apos;s
              highest remaining priority. A position picked earlier by the same
              team is no longer treated as an unfilled priority. Quarterbacks
              are considered only while quarterback is a remaining priority.
              Otherwise, the mock follows the player ranking. This rule has not
              been validated as a prediction model.
            </p>
            <p>
              The order includes currently reported pick trades. Slots 19-32
              depend on projected playoff results. Dallas keeps the later of its
              own and Green Bay&apos;s firsts; the Jets receive the earlier one.
              Future trades are not simulated, and prospects have not all
              declared for the draft.
            </p>
            <p>
              The top 40 source entries include one duplicate: Brauntae and Tae
              Johnson are the same Notre Dame player. Jayden Maiava is available
              as an additional custom selection, without an invented scouting
              rank. Changing an earlier pick clears your later overrides so
              players cannot be selected twice.
            </p>
            <p>
              Your choices are saved in this browser for this source edition.
              They do not change the public board.
            </p>
          </details>
        </ViewTabPanel>
        <ViewTabPanel value="roster">
          <div className={styles.controls}>
            <label>
              NFL team
              <select
                value={team}
                onChange={(e) => {
                  setTeam(e.target.value);
                  setSlot(null);
                }}
              >
                {Object.entries(board.teams)
                  .sort((a, b) => a[1].name.localeCompare(b[1].name))
                  .map(([id, t]) => (
                    <option key={id} value={id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Unit
              <select
                value={activeUnit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setSlot(null);
                }}
              >
                {units.map((value) => (
                  <option key={value} value={value}>
                    {packageLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.heading}>
            <div>
              <h2>{board.teams[team].name}</h2>
              <p>
                {teamPicks.length
                  ? `This mock adds ${teamPicks.map((p) => `${p.player.name} at No. ${p.pick}`).join("; ")}.`
                  : "No first-round pick in the current ownership list."}
              </p>
            </div>
          </div>
          <div className={styles.priorities}>
            {board.teams[team].needs.map((need, i) => (
              <button
                key={need}
                onClick={() => selectNeed(need)}
                className={styles.priority}
              >
                <span>{priorityLabel(i + 1)}</span>
                <strong>{positionNames[need]}</strong>
                <small>
                  {teamPicks
                    .filter((p) => p.player.position === need)
                    .map((p) => `No. ${p.pick} · ${p.player.name}`)
                    .join(", ") || "No addition in this mock"}
                </small>
              </button>
            ))}
          </div>
          <p className={styles.context}>
            Priorities rank importance, not the number of players needed. Select
            a priority or position to connect the current roster with the
            proposed pick.
          </p>
          {!rosterSection.data && (
            <p role="status">Loading {board.teams[team].name} roster…</p>
          )}
          <div className={styles.rosterLayout}>
            <div className={styles.rosterGroups}>
              {groups.map((group) => {
                const positions = slots.filter(
                  (s) => s.first.display_group === group,
                );
                return (
                  positions.length > 0 && (
                    <section key={group}>
                      <h3>{group}</h3>
                      {group === "Nickel option" && (
                        <p>
                          A fifth defensive back, usually replacing a
                          linebacker. Not an extra twelfth defender.
                        </p>
                      )}
                      {group === "Fullback option" && (
                        <p>
                          An alternative personnel package, not an extra starter
                          alongside three receivers and a tight end.
                        </p>
                      )}
                      {group === "Specialists" && (
                        <p>
                          Separate kicking and return units, not one on-field
                          formation.
                        </p>
                      )}
                      <div className={styles.positionGrid}>
                        {positions.map((s) => {
                          const need = s.first.draft_position
                            ? board.teams[team].needs.indexOf(
                                s.first.draft_position,
                              ) + 1
                            : 0;
                          return (
                            <button
                              key={s.id}
                              className={styles.position}
                              aria-pressed={selectedSlot?.id === s.id}
                              onClick={() => setSlot(s.id)}
                            >
                              <PlayerHeadshot
                                name={s.first.player_name}
                                src={
                                  s.first.espn_id
                                    ? nflPlayerHeadshotUrl(s.first.espn_id)
                                    : null
                                }
                                className="h-14 w-14"
                              />
                              <span className={styles.positionCode}>
                                {s.first.pos_abb}
                              </span>
                              <strong>{s.first.position_name}</strong>
                              <span>{s.first.player_name}</span>
                              {need > 0 && <small>{priorityLabel(need)}</small>}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )
                );
              })}
            </div>
            {selectedSlot && (
              <aside className={styles.inspector}>
                <span className={styles.eyebrow}>
                  Current roster → draft group
                </span>
                <h3>{selectedSlot.first.position_name}</h3>
                <p>
                  {selectedSlot.first.draft_position
                    ? positionNames[selectedSlot.first.draft_position]
                    : "Special teams - outside the scouting board's position groups"}
                </p>
                <h4>What this mock adds</h4>
                {teamPicks
                  .filter(
                    (p) =>
                      p.player.position === selectedSlot.first.draft_position,
                  )
                  .map((p) => (
                    <button
                      key={p.pick}
                      className={styles.addition}
                      onClick={() => setPickNumber(p.pick)}
                    >
                      <strong>+ {p.player.name}</strong>
                      <span>Pick {p.pick} · Review or change →</span>
                    </button>
                  ))}
                {!teamPicks.some(
                  (p) =>
                    p.player.position === selectedSlot.first.draft_position,
                ) && <p>No player at this position in the current mock.</p>}
                <p className={styles.context}>
                  A proposed addition joins the position group. This does not
                  predict his exact side, starting role, or who leaves the team.
                </p>
                <h4>Current depth chart</h4>
                <ol className={styles.depth}>
                  {selectedSlot.rows.map((r, i) => (
                    <li key={`${r.player_name}-${i}`}>
                      <span>#{r.pos_rank}</span>
                      <strong>{r.player_name}</strong>
                    </li>
                  ))}
                </ol>
                <p className={styles.context}>
                  These numbers show depth-chart order, not draft priority.
                </p>
                <details>
                  <summary>Contract context</summary>
                  {selectedSlot.rows.map((r, i) => (
                    <p key={i}>
                      {r.player_name}:{" "}
                      {r.apy_cap_pct == null
                        ? "No unambiguous active contract match."
                        : `${(r.apy_cap_pct * 100).toFixed(1)}% of the salary cap at signing in average annual value.`}
                    </p>
                  ))}
                  <p>
                    This does not establish expiry, release cost, or whether a
                    player will leave.
                  </p>
                </details>
              </aside>
            )}
          </div>
          <p className={styles.context}>
            Depth charts dated {date(meta.depth_as_of)} or later. Left and right
            are the player&apos;s defensive or offensive side; these are
            position groups, not a play diagram. In a 3-4, outside linebackers
            map to edge and defensive ends to interior line. In a 4-3, defensive
            ends map to edge. Actual snap-by-snap alignment can vary.
          </p>
        </ViewTabPanel>
        <ViewTabPanel value="players">
          <div className={styles.heading}>
            <div>
              <h2>College performance, by position</h2>
              <p>
                Compare college impact within a position. These scores measure
                college play, not NFL potential or draft eligibility.
              </p>
            </div>
            <span>Through week {meta.college_week}</span>
          </div>
          <div className={styles.controls}>
            <label>
              Position
              <select
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All positions</option>
                {(players?.positions ?? initialPlayers.positions).map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Player or college
              <input
                type="search"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                placeholder="Search all college players"
              />
            </label>
          </div>
          {players && (
            <>
              <DraftImpactChart
                players={filteredPlayers}
                selected={mockPlayerIds}
                onSelect={setProfile}
              />
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Position</th>
                      <th>College impact</th>
                      <th>Position rank</th>
                      <th>Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((p) => (
                      <tr key={p.athlete_id}>
                        <td>
                          <div className={styles.playerCell}>
                            <PlayerHeadshot
                              name={p.athlete_name}
                              src={cfbPlayerHeadshotUrl(p.athlete_id, 96)}
                              className="h-9 w-9"
                            />
                            <div>
                              <button
                                className={styles.link}
                                onClick={() => setProfile(p)}
                              >
                                {p.athlete_name}
                              </button>
                              <small>{p.team}</small>
                            </div>
                          </div>
                        </td>
                        <td>{p.position ?? "Not listed"}</td>
                        <td>{score(p.value_above_replacement)}</td>
                        <td>{p.position_rank ?? "Not measured"}</td>
                        <td>{p.games ?? "Not measured"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                {players.total.toLocaleString()} matching players. Showing{" "}
                {players.total ? page * 50 + 1 : 0}-
                {Math.min((page + 1) * 50, players.total)}.
              </p>
            </>
          )}
          {!players && !activeSection.error && (
            <p role="status">Loading college players…</p>
          )}
        </ViewTabPanel>
        <ViewTabPanel value="guide">
          <h2>A great player and a great fit are different questions.</h2>
          <div className={styles.steps}>
            {[
              [
                "1",
                "Evaluate the player",
                "College play, physical traits, and development inform his NFL potential. That evaluation should not depend on which team wants him.",
              ],
              [
                "2",
                "Look at the team",
                "Compare its priorities with current players and the prospects available. A priority ranks importance; it is not a count of players needed.",
              ],
              [
                "3",
                "Place the pick",
                "Use the pick order and its current owner. Trades can change which team gets to make the selection.",
              ],
            ].map(([number, title, copy]) => (
              <section key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </section>
            ))}
          </div>
          <section className={styles.trade}>
            <h3>The best quarterback can still go first.</h3>
            <div>
              <strong>
                Original owner
                <br />
                <small>Already has a proven QB</small>
              </strong>
              <span aria-hidden="true">⇄</span>
              <strong>
                Trade buyer
                <br />
                <small>Needs a quarterback</small>
              </strong>
            </div>
            <p>
              The owner can receive picks or players in exchange for No. 1. This
              is an explanation of how value affects placement, not a trade
              predicted by this mock.
            </p>
          </section>
          <p>
            Available now: outside scouting ranks, editable picks, team
            priorities, current roster context, college performance, and
            historical playing time. Momentum&apos;s own NFL-performance model
            and future-trade predictions are not yet available.
          </p>
        </ViewTabPanel>
        <ViewTabPanel value="history">
          <div className={styles.heading}>
            <div>
              <h2>How much did past draft picks play?</h2>
              <p>
                First three NFL seasons, regular-season offense and defense.
                Playing time depends on opportunity and is not a complete
                measure of player quality.
              </p>
            </div>
          </div>
          <label>
            Player, college, position, or draft year
            <input
              type="search"
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
            />
          </label>
          {history ? (
            <>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Player / college</th>
                      <th>Class</th>
                      <th>Pick</th>
                      <th>Position</th>
                      <th>College impact</th>
                      <th>NFL plays: first 3 seasons</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((p) => (
                      <tr key={`${p.draft_year}-${p.pick}`}>
                        <td>
                          {p.college_name}
                          <small>{p.collegeTeam}</small>
                        </td>
                        <td>{p.draft_year}</td>
                        <td>{p.pick}</td>
                        <td>{p.draft_position}</td>
                        <td>{score(p.value_above_replacement)}</td>
                        <td>
                          {p.outcome_status === "observed"
                            ? p.nfl_first3_scrimmage_snaps?.toLocaleString()
                            : "Not available"}
                        </td>
                        <td>
                          {!p.identity_verified ||
                          p.outcome_status === "unresolved_identity"
                            ? "Player match needs review"
                            : p.outcome_status === "observed"
                              ? "Three seasons available"
                              : "Fewer than three seasons"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Showing {history.total ? page * 50 + 1 : 0}-
                {Math.min((page + 1) * 50, history.total)} of{" "}
                {history.total.toLocaleString()} matches. Historical snapshot:{" "}
                {date(meta.history_as_of)}. Includes drafted players only, so it
                cannot estimate a college player&apos;s probability of being
                drafted. College scores span model versions and are not directly
                comparable across draft classes.
              </p>
            </>
          ) : (
            !activeSection.error && (
              <p role="status">Loading historical players…</p>
            )
          )}
        </ViewTabPanel>
      </ViewTabs>
      {(tab === "players" || tab === "history") && (
        <div className={styles.controls} aria-label="Result pages">
          <button
            className={styles.button}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous 50
          </button>
          <span>Page {page + 1}</span>
          <button
            className={styles.button}
            disabled={
              !((tab === "players" ? players?.total : history?.total) ?? 0) ||
              (page + 1) * 50 >=
                ((tab === "players" ? players?.total : history?.total) ?? 0)
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Next 50
          </button>
        </div>
      )}
      {activeSection.error && (
        <p role="alert">
          This view could not load.{" "}
          <button className={styles.link} onClick={activeSection.retry}>
            Retry
          </button>
        </p>
      )}
      <p className={styles.context} role="status">
        {notice}
      </p>
      <details className={styles.disclosure}>
        <summary>Sources and data coverage</summary>
        <p>
          <Source href={board.sources.order}>
            Projected order: {date(board.order_date)}
          </Source>{" "}
          ·{" "}
          <Source href={board.sources.rank}>
            Scouting ranks: {date(board.rank_date)}
          </Source>{" "}
          ·{" "}
          <Source href={board.sources.needs}>
            Team priorities: {date(board.needs_date)}
          </Source>
        </p>
        <p>
          <Source href="https://collegefootballdata.com/">
            CollegeFootballData
          </Source>
          : college rosters and Momentum&apos;s published college player values
          through week {meta.college_week}, dated {date(meta.college_as_of)}.
          Players without a measured score remain searchable. College position
          labels come from the college source and may differ from a projected
          NFL role.
        </p>
        <p>
          <Source href="https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html">
            nflverse
          </Source>
          : NFL depth charts and historical draft and snap data. Contract
          context is Over The Cap via nflverse. Roster information is evidence
          about current roles, not a prediction of future departures.
        </p>
        <p>
          <Source href="https://fightingirish.com/sports/football/roster/player/tae-johnson">
            Notre Dame confirms Tae Johnson&apos;s identity
          </Source>
          ; the duplicated scouting entry is counted once.
        </p>
        <button
          className={styles.link}
          onClick={() => {
            setTab("history");
            changeQuery("");
          }}
        >
          Explore past draft classes →
        </button>
      </details>
      <Dialog
        open={!!selectedPick}
        onOpenChange={(open) => {
          if (!open) setPickNumber(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <div className={styles.workspace}>
            {selectedPick && (
              <>
                <span className={styles.eyebrow}>
                  Pick {selectedPick.pick} ·{" "}
                  {board.teams[selectedPick.owner].name}
                </span>
                <PlayerHeadshot
                  name={selectedPick.player.name}
                  src={
                    selectedPick.player.athlete_id
                      ? cfbPlayerHeadshotUrl(
                          selectedPick.player.athlete_id,
                          160,
                        )
                      : null
                  }
                  className="h-20 w-20"
                />
                <DialogTitle className="pr-8 text-2xl">
                  {selectedPick.player.name}
                </DialogTitle>
                <DialogDescription>
                  {positionNames[selectedPick.player.position]} ·{" "}
                  {selectedPick.player.school}
                </DialogDescription>
                <div className={styles.fit}>
                  <div>
                    <small>Team priority</small>
                    <strong>{priorityLabel(selectedPick.priority)}</strong>
                  </div>
                  <span aria-hidden="true">→</span>
                  <div>
                    <small>Proposed addition</small>
                    <strong>{selectedPick.player.name}</strong>
                  </div>
                </div>
                <h3>Why this pick?</h3>
                <p>
                  {pickReason(selectedPick, mode)}.{" "}
                  {selectedPick.player.rank
                    ? `Scouting rank: No. ${selectedPick.player.rank}.`
                    : "Unranked custom option."}{" "}
                  {selectedPick.best.id !== selectedPick.player.id &&
                    `The highest-ranked player still available was ${selectedPick.best.name}, No. ${selectedPick.best.rank}.`}
                </p>
                <p>
                  {selectedPick.priority
                    ? `${positionNames[selectedPick.player.position]} is the team's ${priorityLabel(selectedPick.priority).toLowerCase()}.`
                    : "This position is outside the team's top three priorities."}{" "}
                  {selectedPick.priority > 0 &&
                    !selectedPick.remainingNeeds.includes(
                      selectedPick.player.position,
                    ) &&
                    "This position was already selected earlier in this mock."}
                </p>
                <h3>Current players he would join</h3>
                {!rosterSection.data && (
                  <p role="status">Loading current players…</p>
                )}
                <div className={styles.current}>
                  {currentForPick.slice(0, 6).map((r) => (
                    <div key={r.player_name}>
                      <strong>{r.player_name}</strong>
                      <small>
                        {r.position_name} · depth #{r.pos_rank}
                      </small>
                    </div>
                  ))}
                </div>
                <p className={styles.context}>
                  An addition to the position group, not a prediction of his
                  exact side or starting role.
                </p>
                <details>
                  <summary>Who owns this pick?</summary>
                  <p>
                    {selectedPick.ownership_note}{" "}
                    <Source href={selectedPick.ownership_source}>
                      Ownership source
                    </Source>
                  </p>
                  <p>
                    Originally {board.teams[selectedPick.original].name}; now{" "}
                    {board.teams[selectedPick.owner].name}.{" "}
                    {selectedPick.playoff_projection
                      ? "This slot depends on a projected playoff finish."
                      : "The slot can change with season results and tiebreakers."}
                  </p>
                </details>
                <label>
                  Make your pick
                  <select
                    value={selectedPick.player.id}
                    onChange={(e) => {
                      const next = Object.fromEntries(
                        Object.entries(overrides).filter(
                          ([n]) => Number(n) < selectedPick.pick,
                        ),
                      );
                      next[selectedPick.pick] = e.target.value;
                      save(mode, next);
                    }}
                  >
                    {board.prospects
                      .filter(
                        (p) =>
                          !picks
                            .slice(0, selectedPick.pick - 1)
                            .some((earlier) => earlier.player.id === p.id),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.rank ? `Rank ${p.rank}` : "Unranked"} · {p.name} ·{" "}
                          {p.position} · {p.school}
                        </option>
                      ))}
                  </select>
                </label>
                <div className={styles.controls}>
                  <button
                    className={styles.button}
                    disabled={selectedPick.pick === 1}
                    onClick={() => setPickNumber(selectedPick.pick - 1)}
                  >
                    Previous pick
                  </button>
                  <button
                    className={styles.button}
                    disabled={selectedPick.pick === 32}
                    onClick={() => setPickNumber(selectedPick.pick + 1)}
                  >
                    Next pick
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!profile}
        onOpenChange={(open) => {
          if (!open) setProfile(null);
        }}
      >
        <DialogContent>
          <div className={styles.workspace}>
            {profile && (
              <>
                <PlayerHeadshot
                  name={profile.athlete_name}
                  src={cfbPlayerHeadshotUrl(profile.athlete_id, 160)}
                  className="h-20 w-20"
                />
                <DialogTitle className="pr-8 text-2xl">
                  {profile.athlete_name}
                </DialogTitle>
                <DialogDescription>
                  {profile.team} · {profile.position ?? "Position not listed"}
                </DialogDescription>
                <div className={styles.fit}>
                  <div>
                    <small>College impact</small>
                    <strong>{score(profile.value_above_replacement)}</strong>
                  </div>
                  <div>
                    <small>Position rank</small>
                    <strong>{profile.position_rank ?? "Not measured"}</strong>
                  </div>
                </div>
                {comparison ? (
                  <DraftComparison player={profile} comparison={comparison} />
                ) : profileSection.error ? (
                  <p role="alert">
                    The comparison could not load.{" "}
                    <button
                      className={styles.link}
                      onClick={profileSection.retry}
                    >
                      Retry
                    </button>
                  </p>
                ) : (
                  <p role="status">Loading position comparison…</p>
                )}
                <p>
                  {profile.games ?? "No"} games measured through week{" "}
                  {meta.college_week}. Impact is points above a positional
                  replacement, adjusted for opponents.
                </p>
                <p>
                  NFL potential has not been rated by Momentum. We have not
                  confirmed draft eligibility or declaration for every college
                  player.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
