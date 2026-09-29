import { PageShell, PageTitle } from "@/components/page-layout";
export default function Loading() {
  return (
    <PageShell>
      <PageTitle>MLB Prediction History</PageTitle>

      {/* Filter skeleton */}
      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-28 bg-muted/40 animate-pulse" />
        <div className="h-9 w-28 bg-muted/40 animate-pulse" />
        <div className="h-9 w-28 bg-muted/40 animate-pulse" />
      </div>

      {/* Record summary skeleton */}
      <div className="flex flex-wrap gap-4">
        <div className="h-5 w-24 bg-muted/40 animate-pulse" />
        <div className="h-5 w-24 bg-muted/40 animate-pulse" />
        <div className="h-5 w-28 bg-muted/40 animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-full bg-muted/40 animate-pulse" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-full bg-muted/20 animate-pulse"
          />
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground font-mono">
        Loading history…
      </p>
    </PageShell>
  );
}
