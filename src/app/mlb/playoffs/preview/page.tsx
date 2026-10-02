import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { MlbPlayoffEditions } from "@/components/mlb-playoff-editions";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import { parsePlayoffForecast } from "@/lib/mlb-playoffs";

export const dynamic = "force-dynamic";

export default async function PlayoffPreviewPage() {
  // This local fixture must never replace the published Supabase forecast.
  if (process.env.NODE_ENV !== "development") notFound();

  const fixture: { original?: unknown; divisionSeriesPreview?: unknown } = JSON.parse(
    await readFile(path.join(process.cwd(), "output/playwright/bracket-editions-preview.json"), "utf8"),
  );
  const original = parsePlayoffForecast(fixture.original);
  const divisionSeriesPreview = parsePlayoffForecast(fixture.divisionSeriesPreview);
  if (!original || !divisionSeriesPreview) throw new Error("Invalid local bracket preview");

  return (
    <PageShell width="wide">
      <PageHeader className="border-b border-border pb-section">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            MLB / Postseason / Local preview
          </p>
          <PageTitle>The road to the World Series</PageTitle>
          <PageDescription>
            Follow the next round. Keep the original picks on the record.
          </PageDescription>
        </div>
      </PageHeader>
      <MlbPlayoffEditions original={original} divisionSeriesPreview={divisionSeriesPreview} />
    </PageShell>
  );
}
