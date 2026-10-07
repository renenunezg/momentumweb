"use client";
import { PlayerHeadshot } from "@/components/player-headshot";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import type { CollegePlayer, PlayerComparison } from "@/lib/draft";
import styles from "./draft-workspace.module.css";

export function DraftImpactChart({
  players,
  selected,
  onSelect,
}: {
  players: CollegePlayer[];
  selected: Set<string>;
  onSelect: (player: CollegePlayer) => void;
}) {
  const rows = players
    .filter((p) => p.value_above_replacement != null)
    .slice(0, 12);
  const low = Math.min(0, ...rows.map((p) => p.value_above_replacement!));
  const high = Math.max(1, ...rows.map((p) => p.value_above_replacement!));
  const x = (v: number) => (100 * (v - low)) / (high - low);
  return (
    <figure className={styles.impactChart}>
      <figcaption>
        <h3>College impact comparison</h3>
        <p>
          Top measured scores on this page · Select a player to compare him with
          his position.
        </p>
        <div className={styles.legend}>
          <span>
            <i className={styles.blueKey} />
            College player
          </span>
          <span>
            <i className={styles.amberKey} />
            Selected in your mock
          </span>
        </div>
      </figcaption>
      {rows.length ? (
        rows.map((p) => {
          const value = p.value_above_replacement!,
            drafted = selected.has(p.athlete_id);
          return (
            <button
              key={p.athlete_id}
              className={styles.impactRow}
              onClick={() => onSelect(p)}
              aria-label={`${p.athlete_name}, ${value.toFixed(1)} college impact points${drafted ? ", selected in your mock" : ""}`}
            >
              <PlayerHeadshot
                name={p.athlete_name}
                src={cfbPlayerHeadshotUrl(p.athlete_id, 96)}
                className="h-10 w-10"
              />
              <span className={styles.impactIdentity}>
                <strong>{p.athlete_name}</strong>
                <small>{p.team}</small>
              </span>
              <span className={styles.impactTrack}>
                <span
                  className={styles.zeroLine}
                  style={{ left: `${x(0)}%` }}
                />
                <span
                  className={drafted ? styles.amberBar : styles.blueBar}
                  style={{
                    left: `${x(Math.min(0, value))}%`,
                    width: `${Math.max(0.7, Math.abs(x(value) - x(0)))}%`,
                  }}
                />
              </span>
              <strong className={styles.impactScore}>{value.toFixed(1)}</strong>
            </button>
          );
        })
      ) : (
        <p>No measured college scores match this filter.</p>
      )}
    </figure>
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
