"use client";

import { SwingHoop } from "@/components/mlb-swing-hoop";
import { useChartTheme } from "@/lib/chart-theme";
import type { CarryHitterRow } from "@/lib/mlb-carry";

/** The flattest and steepest swing planes among qualified hitters, drawn together. */
export function SwingHoopPair({ flat, steep }: { flat: CarryHitterRow; steep: CarryHitterRow }) {
  const theme = useChartTheme();
  const items = [
    { row: flat, color: theme["brand-highlight"], dashed: false },
    { row: steep, color: theme["chart-1"], dashed: true },
  ];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {items.map(({ row, color, dashed }) => (
          <span key={row.player_id} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0 w-4" style={{ borderTop: `${dashed ? "2px dashed" : "3px solid"} ${color}` }} />
            {row.player_name}: {row.tilt?.toFixed(0)}° tilt, {row.carry > 0 ? "+" : ""}{row.carry.toFixed(1)} ft carry
          </span>
        ))}
        <span>Drag to rotate</span>
      </div>
      <SwingHoop
        label={`Barrel paths: ${flat.player_name}'s flat plane at ${flat.tilt?.toFixed(0)} degrees and ${steep.player_name}'s steep plane at ${steep.tilt?.toFixed(0)} degrees`}
        hoops={items.map(({ row, color, dashed }) => ({ tilt: row.tilt ?? 32, color, dashed }))}
      />
    </div>
  );
}
