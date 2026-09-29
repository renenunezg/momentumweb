"use client";

import { PageShell, PageTitle } from "@/components/page-layout";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <PageShell width="reading">
      <PageTitle>
        Something went wrong
      </PageTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        The page could not load its data. The models keep running; this is the
        site failing to read them.
      </p>
      <button
        type="button"
        onClick={reset}
        className="self-start rounded-md border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </PageShell>
  );
}
