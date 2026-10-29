export function RatingsHeatmapLegend({ centered = false }: { centered?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-meta text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span>{centered ? "Below avg" : "Weaker"}</span>
        <span
          aria-hidden="true"
          className="h-2 w-24 rounded-full"
          style={{ background: "linear-gradient(to right, var(--worse), var(--cell-neutral), var(--better))" }}
        />
        <span>{centered ? "Above avg" : "Stronger"}</span>
      </span>
      <span>{centered ? "0 = average" : "Each column relative to all teams"}</span>
    </div>
  );
}
