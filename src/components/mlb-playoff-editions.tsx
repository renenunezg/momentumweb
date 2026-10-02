"use client";

import { useState } from "react";
import { MlbPlayoffBracket } from "@/components/mlb-playoff-bracket";
import { ViewTabs, ViewTabPanel } from "@/components/view-tabs";
import type { PlayoffEdition, PlayoffStage } from "@/lib/mlb-playoffs";

const STAGE_NAMES: Record<PlayoffStage, string> = {
  WC: "Wild Card",
  DS: "Division Series",
  CS: "Championship Series",
  WS: "World Series",
};

// One tab per round: the bracket as the model saw it going into that round.
// Earlier tabs stay as they were published, so each prediction can be judged
// against what happened next.
export function MlbPlayoffEditions({
  editions,
}: {
  editions: PlayoffEdition[];
}) {
  const latest = editions[editions.length - 1].stage;
  const [stage, setStage] = useState<PlayoffStage>(latest);

  return (
    <ViewTabs
      label="Forecast before each round"
      options={editions.map((edition) => ({
        key: edition.stage,
        label: STAGE_NAMES[edition.stage],
      }))}
      value={stage}
      onValueChange={setStage}
    >
      {editions.map(({ stage: key, forecast }) => (
        <ViewTabPanel key={key} value={key} className="space-y-section">
          <div className="space-y-heading">
            <h2 className="font-heading text-xl">
              Before the {STAGE_NAMES[key]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {key === "WC"
                ? "The original bracket, forecast before the first postseason game."
                : `Results through the previous round are locked. The rest of the bracket is the forecast going into the ${STAGE_NAMES[key]}.`}{" "}
              {key === latest
                ? "This is the latest forecast; it stays fixed once the round begins."
                : "This forecast is frozen and is not updated with later results."}
            </p>
            <p className="text-xs text-muted-foreground">
              Published{" "}
              {new Date(forecast.generated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "America/New_York",
              })}
              .
            </p>
          </div>
          <MlbPlayoffBracket forecast={forecast} initialRound={key} />
        </ViewTabPanel>
      ))}
    </ViewTabs>
  );
}
