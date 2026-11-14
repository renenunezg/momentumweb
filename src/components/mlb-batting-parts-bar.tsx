import { BATTING_PARTS, BATTING_PART_LABELS, battingTotal, type BattingPart, type BattingParts } from "@/lib/mlb-batting-value";
import { cn, formatSigned } from "@/lib/utils";

// The three parts are the brand teal at three strengths, lightest for the first thing a hitter does at a pitch and
// full for the last. None is the green or red that signed figures wear, so a part on the losing side of zero still
// reads as that part.
export const BATTING_PART_FILL: Record<BattingPart, string> = {
  decision: "bg-primary/30",
  contact: "bg-primary/60",
  quality: "bg-primary",
};

// A hitter's runs split around zero: parts that cost runs stack to the left, parts that added them to the right,
// always in the order Decision, Contact, Quality outward from zero. The dark tick is the total. `negative` and
// `positive` are the runs each side of the track holds, shared by every row of a table so the zeros line up.
export function BattingPartsBar({
  parts,
  negative,
  positive,
  axis = false,
  className,
}: {
  parts: BattingParts;
  negative: number;
  positive: number;
  // Names zero and the total tick under the track, for a bar that stands alone as the key.
  axis?: boolean;
  className?: string;
}) {
  const span = negative + positive;
  const zero = (100 * negative) / span;
  const total = zero + (100 * battingTotal(parts)) / span;
  const label = BATTING_PARTS.map((p) => `${BATTING_PART_LABELS[p]} ${formatSigned(parts[p], 0)}`).join(", ");
  const segments = (sign: 1 | -1, extent: number, outerEnd: string) =>
    BATTING_PARTS.filter((p) => sign * parts[p] > 0).map((p) => (
      <span key={p} className={cn("h-full", outerEnd, BATTING_PART_FILL[p])} style={{ width: `${(100 * sign * parts[p]) / extent}%` }} />
    ));

  return (
    <span role="img" aria-label={label} title={label} className="block">
      <span className={cn("relative block h-3", className)}>
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <span className="absolute inset-y-0 left-0 flex flex-row-reverse gap-px" style={{ width: `${zero}%` }}>
          {segments(-1, negative, "last:rounded-l-[2px]")}
        </span>
        <span className="absolute inset-y-0 right-0 flex gap-px" style={{ width: `${100 - zero}%` }}>
          {segments(1, positive, "last:rounded-r-[2px]")}
        </span>
        <span className="absolute inset-y-[-3px] w-px bg-rule-strong" style={{ left: `${zero}%` }} />
        <span className="absolute inset-y-[-3px] w-0.5 -translate-x-1/2 rounded-full bg-foreground" style={{ left: `${total}%` }} />
      </span>
      {axis && (
        <span className="relative mt-1.5 block h-4 type-meta text-muted-foreground">
          <span className="absolute -translate-x-1/2" style={{ left: `${zero}%` }}>0</span>
          <span className={cn("absolute font-semibold text-foreground", total > 85 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${total}%` }}>
            Total
          </span>
        </span>
      )}
    </span>
  );
}

// The runs each side of a shared track has to hold for these rows.
export function battingPartsExtent(rows: BattingParts[]): { negative: number; positive: number } {
  let negative = 1;
  let positive = 1;
  for (const row of rows) {
    let down = 0;
    let up = 0;
    for (const p of BATTING_PARTS) {
      if (row[p] < 0) down -= row[p];
      else up += row[p];
    }
    negative = Math.max(negative, down);
    positive = Math.max(positive, up);
  }
  return { negative, positive };
}

export function BattingPartsLegend({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 type-meta text-muted-foreground", className)}>
      {BATTING_PARTS.map((p) => (
        <span key={p} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("size-2.5 rounded-[2px]", BATTING_PART_FILL[p])} />
          {BATTING_PART_LABELS[p]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-foreground" />
        Total
      </span>
    </span>
  );
}
