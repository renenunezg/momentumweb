import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { MlbPlayoffEditions } from "@/components/mlb-playoff-editions";
import { fetchPlayoffEditions } from "@/lib/mlb-playoffs.server";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "MLB Playoff Simulator",
  description:
    "Explore model-derived MLB series scores, advancement probabilities and World Series chances in an interactive postseason bracket.",
};

export default async function PlayoffsPage() {
  const editions = await fetchPlayoffEditions();
  return (
    <PageShell width="wide">
      <PageHeader className="border-b border-border pb-section">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            MLB / Postseason
          </p>
          <PageTitle>
            The road to the World Series
          </PageTitle>
          <PageDescription className="max-w-2xl">
            Every series. Every possible path. Powered by our plate-appearance
            model.
          </PageDescription>
        </div>
        <Trophy
          className="hidden size-12 shrink-0 text-amber-500 sm:block"
          aria-hidden="true"
        />
      </PageHeader>
      {editions.length > 0 ? (
        <MlbPlayoffEditions editions={editions} />
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Trophy
            className="mx-auto mb-4 size-9 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-heading text-2xl">
            The postseason forecast is not available yet
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            The bracket will appear when a complete model forecast is published
            with the official playoff field, matchup probabilities and current
            series results.
          </p>
        </div>
      )}
    </PageShell>
  );
}
