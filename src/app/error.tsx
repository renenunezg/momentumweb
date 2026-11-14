"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { PageShell, PageTitle } from "@/components/page-layout";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <PageShell width="reading">
      <PageTitle>
        Something went wrong
      </PageTitle>
      <p className="text-sm text-muted-foreground leading-relaxed">
        The page could not load its data. The models are still running, and the
        site could not read their output.
      </p>
      <button
        type="button"
        // reset alone re-renders the failed payload; a server read needs the refresh.
        onClick={() => startTransition(() => {
          router.refresh();
          reset();
        })}
        className="type-eyebrow self-start rounded-md border border-border px-3 py-1.5 transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </PageShell>
  );
}
