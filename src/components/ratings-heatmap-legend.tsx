export function RatingsHeatmapLegend({ centered = false }: { centered?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span>{centered ? "Below avg" : "Weaker"}</span>
        <span
          aria-hidden="true"
          className="h-2 w-20 rounded-sm"
          style={{ background: "linear-gradient(to right, var(--rating-weak), transparent, var(--rating-strong))" }}
        />
        <span>{centered ? "Above avg" : "Stronger"}</span>
      </span>
      <span>{centered ? "0 = average" : "Each column relative to all teams"}</span>
    </div>
  );
}
