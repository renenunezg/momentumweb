export default function Loading() {
  return (
    <main
      id="main"
      aria-busy="true"
      className="mx-auto max-w-6xl space-y-6 px-4 py-8"
    >
      <p role="status">Loading NFL records...</p>
      <div className="h-12 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded bg-muted" />
    </main>
  );
}
