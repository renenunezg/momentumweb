export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8 space-y-6">
      <h1 className="font-heading text-2xl tracking-tight">Backtest History</h1>

      {/* Filter skeleton */}
      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-16 bg-muted/40 animate-pulse" />
        <div className="h-8 w-16 bg-muted/40 animate-pulse" />
        <div className="h-8 w-16 bg-muted/40 animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-full bg-muted/40 animate-pulse" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 w-full bg-muted/20 animate-pulse" />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground font-mono">
        Loading history…
      </p>
    </main>
  );
}
