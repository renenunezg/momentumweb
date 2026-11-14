import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { MlbPlayoffEditions } from "@/components/mlb-playoff-editions";
import { fetchPlayoffEditions } from "@/lib/mlb-playoffs.server";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;
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
          <p className="type-eyebrow mb-2 text-muted-foreground">
            MLB / Postseason
          </p>
          <PageTitle>
            The road to the World Series
          </PageTitle>
          <PageDescription className="max-w-2xl">
            Series odds and paths from the plate-appearance model.
          </PageDescription>
        </div>
        <Trophy
          className="hidden size-12 shrink-0 text-primary sm:block"
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
          <h2 className="type-section">
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
