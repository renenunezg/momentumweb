"use client";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { PlayerHeadshot } from "@/components/player-headshot";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import type { CollegePlayer, PlayerComparison } from "@/lib/draft";
import styles from "./draft-workspace.module.css";

export function DraftPlayerTable({
  players,
  destinations,
  onSelect,
}: {
  players: CollegePlayer[];
  destinations: Record<
    string,
    { name: string; logo: TeamLogoSource | undefined; pick: number }
  >;
  onSelect: (player: CollegePlayer) => void;
}) {
  const measured = players.flatMap((p) =>
    p.value_above_replacement == null ? [] : [p.value_above_replacement],
  );
  const low = Math.min(0, ...measured);
  const high = Math.max(1, ...measured);
  const x = (value: number) => (100 * (value - low)) / (high - low);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.playerTable}>
        <caption className="sr-only">
          College players, impact scores, and current mock selections
        </caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Position</th>
            <th scope="col">College impact</th>
            <th scope="col">Position rank</th>
            <th scope="col">Games</th>
            <th scope="col">Your mock</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const value = p.value_above_replacement;
            const destination = destinations[p.athlete_id];
            return (
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
                        onClick={() => onSelect(p)}
                      >
                        {p.athlete_name}
                      </button>
                      <small>{p.team}</small>
                    </div>
                  </div>
                </td>
                <td>{p.position ?? "Not listed"}</td>
                <td>
                  {value == null ? (
                    "Not measured"
                  ) : (
                    <div className={styles.impactCell}>
                      <span className={styles.impactTrack} aria-hidden="true">
                        <span
                          className={styles.zeroLine}
                          style={{ left: `${x(0)}%` }}
                        />
                        <span
                          className={styles.blueBar}
                          style={{
                            left: `${x(Math.min(0, value))}%`,
                            width: `${Math.abs(x(value) - x(0))}%`,
                          }}
                        />
                      </span>
                      <span className={styles.impactScore}>
                        {value.toFixed(1)}
                      </span>
                    </div>
                  )}
                </td>
                <td>{p.position_rank ?? "Not measured"}</td>
                <td>{p.games ?? "Not measured"}</td>
                <td>
                  {destination ? (
                    <span className={styles.teamIdentity}>
                      <TeamLogo
                        team={destination.logo}
                        name={destination.name}
                        className="h-5 w-5"
                      />
                      <span>
                        Pick {destination.pick}
                        <small>{destination.name}</small>
                      </span>
                    </span>
                  ) : (
                    <span className={styles.context}>Not selected</span>
                  )}
                </td>
              </tr>
            );
          })}
          {!players.length && (
            <tr>
              <td colSpan={6}>No college players match these filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DraftComparison({
  player,
  comparison,
}: {
  player: CollegePlayer;
  comparison: PlayerComparison;
}) {
  if (
    player.value_above_replacement == null ||
    !comparison.count ||
    comparison.median == null
  )
    return <p>No measured position comparison is available for this player.</p>;
  const { low, high, bins, median, count } = comparison;
  const x = (value: number) =>
    12 + 476 * Math.max(0, Math.min(1, (value - low) / (high - low)));
  const peak = Math.max(1, ...bins);
  return (
    <figure className={styles.comparison}>
      <figcaption>
        <h3>How he compares at his position</h3>
        <p>
          {count.toLocaleString()} measured{" "}
          {player.position_group ?? player.position} players · College
          performance, not NFL potential
        </p>
      </figcaption>
      <svg
        viewBox="0 0 500 125"
        role="img"
        aria-label={`${player.athlete_name}: ${player.value_above_replacement.toFixed(1)} points. Position median: ${median.toFixed(1)}. Bars show how many players have similar scores.`}
      >
        {bins.map((n, i) => (
          <rect
            key={i}
            x={12 + i * 23.8}
            y={110 - (n / peak) * 80}
            width="21"
            height={(n / peak) * 80}
            className={styles.distributionBin}
          />
        ))}
        <line
          x1={x(median)}
          x2={x(median)}
          y1="15"
          y2="112"
          className={styles.medianMarker}
        />
        <line
          x1={x(player.value_above_replacement)}
          x2={x(player.value_above_replacement)}
          y1="8"
          y2="112"
          className={styles.playerMarker}
        />
        <circle
          cx={x(player.value_above_replacement)}
          cy="8"
          r="5"
          className={styles.playerDot}
        />
      </svg>
      <div className={styles.plotLabels}>
        <span>{low.toFixed(1)} pts</span>
        <span>{high.toFixed(1)} pts</span>
      </div>
      <div className={styles.legend}>
        <span>
          <i className={styles.amberKey} />
          Player: {player.value_above_replacement.toFixed(1)}
        </span>
        <span>
          <i className={styles.blueKey} />
          Position median: {median.toFixed(1)}
        </span>
      </div>
    </figure>
  );
}
