export function CfbPageLoading() {
  return (
    <main
      id="main"
      role="status"
      aria-label="Loading CFB results"
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8"
    >
      <p className="text-sm text-muted-foreground">Loading results…</p>
      <div className="h-9 w-72 max-w-full animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </main>
  );
}
