"use client";

import { useMemo, useState } from "react";
import type { PosteriorSkill } from "@/lib/types";
import { EMPTY, formatNumber } from "@/lib/utils";
import { ToggleGroup } from "@/components/toggle-group";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TABS = [
  { key: "bat_rhp", label: "Batters vs RHP", actor_type: "batter", split_label: "vs_rhp" },
  { key: "bat_lhp", label: "Batters vs LHP", actor_type: "batter", split_label: "vs_lhp" },
  { key: "sp", label: "Starting Pitchers", actor_type: "pitcher", split_label: "sp" },
  { key: "rp", label: "Relief Pitchers", actor_type: "pitcher", split_label: "rp" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function SkillTable({
  title,
  rows,
  heading,
  valueLabel,
}: {
  title: string;
  rows: PosteriorSkill[];
  heading: string;
  valueLabel: string;
}) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-sm uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {rows.length > 0 ? (
        <Table>
          <TableCaption className="sr-only">{title}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>{heading}</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">{valueLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.rank}-${r.actor_id}`}>
                <TableCell className="font-mono text-muted-foreground">{r.rank}</TableCell>
                <TableCell className="font-medium">
                  {r.actor_name || `id ${r.actor_id}`}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.team || EMPTY}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatNumber(r.skill_score, 3)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No data.</p>
      )}
    </div>
  );
}

export function TopSkillsLeaderboard({ skills }: { skills: PosteriorSkill[] }) {
  const [tabKey, setTabKey] = useState<TabKey>("bat_rhp");
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];

  const { best, worst } = useMemo(() => {
    const subset = skills.filter(
      (s) => s.actor_type === tab.actor_type && s.split_label === tab.split_label
    );
    // The database ranks by ascending xwOBA, so rank_type "top" is the highest
    // skill score: the best batter but the worst pitcher. Swap for pitchers.
    const invert = tab.actor_type === "pitcher";
    const bestKey = invert ? "bottom" : "top";
    const byRank = (a: PosteriorSkill, b: PosteriorSkill) => a.rank - b.rank;
    return {
      best: subset.filter((s) => s.rank_type === bestKey).sort(byRank),
      worst: subset.filter((s) => s.rank_type !== bestKey).sort(byRank),
    };
  }, [skills, tab]);

  const heading = tab.actor_type === "batter" ? "Hitter" : "Pitcher";
  const valueLabel = tab.actor_type === "batter" ? "xwOBA" : "xwOBA against";

  return (
    <div>
      <ToggleGroup
        variant="pill"
        label="Skill leaderboard split"
        options={TABS}
        value={tabKey}
        onChange={setTabKey}
        className="mb-4"
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <SkillTable title={`Best ${heading}s`} rows={best} heading={heading} valueLabel={valueLabel} />
        <SkillTable title={`Worst ${heading}s`} rows={worst} heading={heading} valueLabel={valueLabel} />
      </div>
    </div>
  );
}
