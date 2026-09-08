export default function Loading() {
  return <main id="main" aria-busy="true" className="mx-auto w-full min-w-0 max-w-6xl space-y-6 px-4 py-8">
    <p role="status" className="font-mono text-sm text-muted-foreground">Loading NFL data...</p>
    <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
      <div className="h-8 w-56 bg-muted/40" />
      <div className="h-10 w-full bg-muted/40" />
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-12 bg-muted/20" />)}
    </div>
  </main>;
}
