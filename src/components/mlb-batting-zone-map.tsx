"use client";

import { ZONE_SPLITS, battingSplitLabel } from "@/lib/mlb-batting-value";
import { cn, formatSigned } from "@/lib/utils";

export type BattingZone = (typeof ZONE_SPLITS)[number];

// Statcast's attack zones, from the catcher's view: the heart is the middle two thirds of the strike zone, the shadow
// runs a third of a zone either side of its border, chase out to twice the zone, and waste beyond. The drawing's
// outer box is 2.6 zones across, so each figure is that zone's inset from the box edge as a percentage per side.
const INSET: Record<BattingZone, number> = { waste: 0, chase: 11.5, shadow: 24.5, heart: 37 };
const ZONE_BORDER_INSET = 30.75;
const OUTWARD: readonly BattingZone[] = ["waste", "chase", "shadow", "heart"];
const DEPTH: Record<BattingZone, string> = {
  waste: "bg-primary/[0.04]",
  chase: "bg-primary/[0.08]",
  shadow: "bg-primary/[0.13]",
  heart: "bg-primary/[0.19]",
};

// The row glyph gives the inner zones more room than true scale, since the outer rings hold the smaller runs.
const MINI_INSET: Record<BattingZone, number> = { waste: 0, chase: 9, shadow: 19, heart: 30 };

const rect = (inset: number) => ({ inset: `${inset}%` });
const pct = (v: number) => `${Math.round(100 * v)}%`;

// The zone picker: four nested regions, each a pressed button. A later region sits on top of the earlier ones, so a
// click lands on the region it is drawn in.
export function BattingZonePicker({
  value,
  onChange,
  shares,
  className,
}: {
  value: BattingZone;
  onChange: (zone: BattingZone) => void;
  // Each zone's share of all tracked pitches.
  shares: Partial<Record<BattingZone, number>>;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-64 shrink-0", className)}>
      <div role="group" aria-label="Zone" className="relative aspect-[5/6] w-full">
        {OUTWARD.map((zone) => {
          const active = zone === value;
          const share = shares[zone];
          return (
            <button
              key={zone}
              type="button"
              aria-pressed={active}
              aria-label={`${battingSplitLabel(zone)}${share != null ? `, ${pct(share)} of pitches` : ""}`}
              onClick={() => onChange(zone)}
              style={rect(INSET[zone])}
              className={cn(
                "absolute flex flex-col items-center rounded-[3px] border pt-1 transition-colors",
                "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                zone === "heart" && "justify-center pt-0",
                active ? "border-primary bg-primary/35 text-foreground" : cn("border-border text-muted-foreground hover:bg-primary/25 hover:text-foreground", DEPTH[zone])
              )}
            >
              <span className="type-eyebrow leading-tight">{battingSplitLabel(zone)}</span>
              {share != null && <span className="font-mono text-[10px] leading-tight tabular-nums">{pct(share)}</span>}
            </button>
          );
        })}
        <span aria-hidden="true" style={rect(ZONE_BORDER_INSET)} className="pointer-events-none absolute border border-dashed border-foreground/40" />
      </div>
      <svg aria-hidden="true" viewBox="0 0 34 10" className="mx-auto mt-1.5 block w-[19%] fill-muted-foreground/40">
        <path d="M0 0H34V4L17 10L0 4Z" />
      </svg>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">Dashed line: the strike zone. Share of all tracked pitches.</p>
    </div>
  );
}

// One hitter's runs per 100 pitches in each zone, green above the league and red below. Each zone has its own `scale`
// (the runs per 100 that reads as full strength there), because heart pitches swing far more runs than waste pitches
// and one scale would leave the outer rings blank. The chosen zone carries the outline.
export function BattingZoneMini({
  rates,
  selected,
  scale,
  className,
}: {
  rates: Partial<Record<BattingZone, number>>;
  selected: BattingZone;
  scale: Record<BattingZone, number>;
  className?: string;
}) {
  const label = OUTWARD.map((zone) => `${battingSplitLabel(zone)} ${rates[zone] == null ? "no pitches" : formatSigned(rates[zone], 1)}`).join(", ");
  return (
    <span role="img" aria-label={`Runs per 100 pitches: ${label}`} title={label} className={cn("relative block h-[3.25rem] w-11 shrink-0", className)}>
      {OUTWARD.map((zone) => {
        const v = rates[zone];
        const strength = v == null ? 0 : Math.min(1, Math.abs(v) / scale[zone]);
        const color = v != null && v < 0 ? "var(--negative)" : "var(--positive)";
        return (
          <span
            key={zone}
            style={{ ...rect(MINI_INSET[zone]), backgroundColor: v == null ? undefined : `color-mix(in oklch, ${color} ${Math.round(8 + 82 * strength)}%, var(--background))` }}
            className={cn("absolute rounded-[2px] border border-background", v == null && "bg-muted")}
          />
        );
      })}
      <span aria-hidden="true" style={rect(MINI_INSET[selected])} className="absolute rounded-[2px] border border-foreground/80" />
    </span>
  );
}
