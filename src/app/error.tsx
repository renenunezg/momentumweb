"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl min-w-0 px-4 py-16">
      <h1 className="font-heading text-2xl tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        The page could not load its data. The models keep running; this is the
        site failing to read them.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </main>
  );
}
