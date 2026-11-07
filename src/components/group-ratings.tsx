"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/utils";
import type { TeamLogoSource } from "@/components/team-logo";
import {
  PowerRatingsTable,
  type LimitedDataRule,
  type MarketStrength,
  type PowerRatingRow,
  type RatingChange,
  type RatingGap,
} from "@/components/power-ratings-table";

interface Group<T> {
  name: string;
  tier: string;
  teams: T[];
  avg: number;
}

// Ratings grouped by conference (CFB) or division (NFL), one group shown at a
// time. Rows arrive sorted by power rating, so insertion order within a group
// is already the group ranking and the array index is the overall rank.
export function GroupRatings<T extends PowerRatingRow>({
  ratings,
  rowKey,
  logo,
  shortName,
  ratingTip,
  groupOf,
  tierOf,
  tiers,
  label,
  overallRankLabel,
  initialGroup,
  onSelect,
  limited,
  market,
  gap,
  change,
}: {
  ratings: T[];
  rowKey: (row: T) => string | number;
  logo: (row: T) => TeamLogoSource | undefined;
  shortName?: (row: T) => string;
  ratingTip: string;
  groupOf: (row: T) => string;
  tierOf: (row: T) => string;
  tiers: readonly string[];
  // The menu's name for one group: "Conference", "Division".
  label: string;
  overallRankLabel: string;
  initialGroup?: string;
  onSelect: (name: string) => void;
  limited: LimitedDataRule;
  market?: (row: T) => MarketStrength;
  gap?: RatingGap<T>;
  change?: RatingChange<T>;
}) {
  const { groups, overallRank } = useMemo(() => {
    const byName = new Map<string, T[]>();
    for (const r of ratings) {
      const name = groupOf(r);
      const group = byName.get(name);
      if (group) group.push(r);
      else byName.set(name, [r]);
    }
    const groups: Group<T>[] = [...byName.entries()]
      .map(([name, teams]) => ({
        name,
        tier: tierOf(teams[0]),
        teams,
        avg: teams.reduce((sum, t) => sum + t.power_rating, 0) / teams.length,
      }))
      .sort((a, b) => b.avg - a.avg);
    return {
      groups,
      overallRank: new Map(ratings.map((r, i) => [rowKey(r), i + 1])),
    };
  }, [ratings, groupOf, tierOf, rowKey]);

  const [selectedName, setSelectedName] = useState(
    () => groups.find((g) => g.name === initialGroup)?.name ?? groups[0]?.name
  );
  const selected = groups.find((g) => g.name === selectedName) ?? groups[0];
  if (!selected) return null;

  function select(name: string) {
    setSelectedName(name);
    onSelect(name);
  }

  return (
    <div className="space-y-section">
      <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        {label}
        <select
          value={selected.name}
          onChange={(event) => select(event.target.value)}
          className="min-w-0 rounded-md border border-input bg-background px-3 py-1.5 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs"
        >
          {tiers.map((tier) => {
            const inTier = groups
              .filter((g) => g.tier === tier)
              .sort((a, b) => a.name.localeCompare(b.name));
            if (inTier.length === 0) return null;
            return (
              <optgroup key={tier} label={tier.toUpperCase()}>
                {inTier.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="type-section">{selected.name}</h2>
          <span className="type-eyebrow text-muted-foreground">
            Avg {formatNumber(selected.avg)}
          </span>
        </div>
        <PowerRatingsTable
          rows={selected.teams}
          heatmapRows={ratings}
          rowKey={rowKey}
          logo={logo}
          shortName={shortName}
          ratingTip={ratingTip}
          caption={`${selected.name} power ratings`}
          overallRank={{
            label: overallRankLabel,
            value: (row) => overallRank.get(rowKey(row)),
          }}
          limited={limited}
          market={market}
          gap={gap}
          change={change}
        />
      </section>
    </div>
  );
}
