"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/utils";
import type { TeamLogoSource } from "@/components/team-logo";
import { ToggleGroup } from "@/components/toggle-group";
import {
  PowerRatingsTable,
  type LimitedDataRule,
  type PowerRatingRow,
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
  groupOf,
  tierOf,
  tiers,
  noun,
  overallRankLabel,
  initialGroup,
  onSelect,
  limited,
}: {
  ratings: T[];
  rowKey: (row: T) => string | number;
  logo: (row: T) => TeamLogoSource | undefined;
  groupOf: (row: T) => string;
  tierOf: (row: T) => string;
  tiers: readonly string[];
  noun: string;
  overallRankLabel: string;
  initialGroup?: string;
  onSelect: (name: string) => void;
  limited: LimitedDataRule;
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
    <div className="space-y-6">
      <div className="space-y-3">
        {tiers.map((tier) => {
          const inTier = groups
            .filter((g) => g.tier === tier)
            .sort((a, b) => a.name.localeCompare(b.name));
          if (inTier.length === 0) return null;
          return (
            <div
              key={tier}
              className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:w-7 sm:shrink-0 sm:pt-1.5">
                {tier}
              </span>
              <ToggleGroup
                variant="chip"
                label={`${tier.toUpperCase()} ${noun}`}
                options={inTier.map((g) => ({ key: g.name, label: g.name }))}
                value={selected.name}
                onChange={select}
              />
            </div>
          );
        })}
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-lg tracking-tight">{selected.name}</h2>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Avg {formatNumber(selected.avg)}
          </span>
        </div>
        <PowerRatingsTable
          rows={selected.teams}
          rowKey={rowKey}
          logo={logo}
          caption={`${selected.name} power ratings`}
          overallRank={{
            label: overallRankLabel,
            value: (row) => overallRank.get(rowKey(row)),
          }}
          limited={limited}
        />
      </section>
    </div>
  );
}
