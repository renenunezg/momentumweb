"use client";

import { useState } from "react";
import { MlbPlayoffBracket } from "@/components/mlb-playoff-bracket";
import { ViewTabs, ViewTabPanel } from "@/components/view-tabs";
import type { PlayoffForecast } from "@/lib/mlb-playoffs";

export function MlbPlayoffEditions({
  original,
  divisionSeriesPreview,
}: {
  original: PlayoffForecast;
  divisionSeriesPreview: PlayoffForecast;
}) {
  const [edition, setEdition] = useState<"updated" | "original">("updated");

  return (
    <ViewTabs
      label="Bracket edition"
      options={[
        { key: "updated", label: "Division Series update" },
        { key: "original", label: "Original bracket" },
      ]}
      value={edition}
      onValueChange={setEdition}
    >
      <ViewTabPanel value="updated" className="space-y-section">
        <div className="space-y-heading">
          <h2 className="font-heading text-xl">Updated for the Division Series</h2>
          <p className="text-sm text-muted-foreground">
            Wild Card results are locked. The remaining path uses the eight teams
            that advanced, including the White Sox.
          </p>
          <p role="status" className="border-l-2 border-accent-amber pl-3 text-xs leading-relaxed text-muted-foreground">
            Local preview: remaining series use the original snapshot’s matchup
            probabilities. Pitching, rosters and title odds have not been refreshed.
            A new model forecast is required before publishing this update.
          </p>
        </div>
        <MlbPlayoffBracket
          forecast={divisionSeriesPreview}
          stale={false}
          edition="conditional-preview"
        />
      </ViewTabPanel>
      <ViewTabPanel value="original" className="space-y-section">
        <div className="space-y-heading">
          <h2 className="font-heading text-xl">Original postseason bracket</h2>
          <p className="text-sm text-muted-foreground">
            The original picks stay unchanged, including Houston. Evaluate this
            bracket separately from forecasts made after each round.
          </p>
          <p className="text-xs text-muted-foreground">
            Frozen {new Date(original.generated_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York",
            })}. The original championship chances below belong to that snapshot.
          </p>
        </div>
        <MlbPlayoffBracket forecast={original} stale={false} edition="original" />
      </ViewTabPanel>
    </ViewTabs>
  );
}
