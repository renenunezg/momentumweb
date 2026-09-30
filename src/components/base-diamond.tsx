import { baseOccupancyLabel } from "@/lib/mlb-bases";

export function BaseDiamond({ bases }: { bases: number }) {
  const label = baseOccupancyLabel(bases);
  return (
    <svg viewBox="0 0 32 28" className="h-7 w-8 shrink-0" role="img" aria-label={label}>
      <title>{label}</title>
      <path d="M16 3 28 14 16 25 4 14Z" fill="none" className="stroke-muted-foreground/50" strokeWidth="1" />
      {[[28, 14], [16, 3], [4, 14]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.5" strokeWidth="1.25"
          className={bases & (1 << i) ? "fill-positive stroke-positive" : "fill-background stroke-muted-foreground"} />
      ))}
    </svg>
  );
}
