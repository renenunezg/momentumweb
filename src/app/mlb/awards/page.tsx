import { PageDescription, PageHeader, PageSection, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { AwardFavorites, AwardRace, AwardTrackRecord, GoldGloveField } from "@/components/mlb-awards";
import { fetchAwards } from "@/lib/mlb-awards.server";
import { HowGraded } from "@/components/how-graded";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;
export const metadata: Metadata = {
  title: "MLB Awards Forecast",
  description:
    "Frozen forecasts for MVP, Cy Young, Rookie of the Year, Reliever of the Year, and the Gold Gloves, fitted on past ballots and graded against the winners.",
};

const LEAGUES = ["AL", "NL"] as const;
const BALLOTS = [
  { id: "mvp", award: "MVP", title: "Most Valuable Player" },
  { id: "cy-young", award: "CY", title: "Cy Young" },
  { id: "rookie", award: "ROY", title: "Rookie of the Year" },
  { id: "reliever", award: "RP", title: "Reliever of the Year" },
] as const;
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "UT"];
const TRACK_RECORD = [
  { key: "MVP", label: "MVP" }, { key: "CY", label: "Cy Young" }, { key: "ROY", label: "Rookie of the Year" },
  { key: "RP", label: "Reliever" }, { key: "GG_FIELD", label: "Gold Glove fielders" }, { key: "GG_C", label: "Gold Glove catchers" },
  { key: "GG_P", label: "Gold Glove pitchers" },
];
const FROZEN_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

function Unavailable({ children }: { children: React.ReactNode }) {
  return <PageShell><PageTitle>Awards Forecast</PageTitle>{children}</PageShell>;
}

export default async function MlbAwardsPage() {
  const { season, models, rows } = await fetchAwards();
  if (season == null || rows.length === 0) return <Unavailable><p className="text-muted-foreground">No award forecasts have been published yet.</p></Unavailable>;

  const race = (award: string, league: string, position = "") =>
    rows.filter((row) => row.award === award && row.league === league && row.position === position);
  const pitchers = models.find((model) => model.model === "GG_P")?.backtest;
  const track = TRACK_RECORD.flatMap(({ key, label }) => {
    const model = models.find((candidate) => candidate.model === key);
    return model ? [{ label, model }] : [];
  });

  return (
    <PageShell>
      <PageHeader>
        <div>
          <p className="type-eyebrow mb-2 text-muted-foreground">{season} season · Frozen {FROZEN_DATE.format(new Date(models[0].as_of))}</p>
          <PageTitle>MLB Awards Forecast</PageTitle>
          <PageDescription>Who the voters will pick, not who deserves it.</PageDescription>
          <div className="mt-2">
            <HowGraded label="How this works">
              <p>
                Each race is fitted on past ballots and winners using regular-season numbers only, then frozen and graded
                against the result.
              </p>
            </HowGraded>
          </div>
        </div>
      </PageHeader>

      <AwardFavorites races={BALLOTS.map(({ id, award, title }) => ({
        id, title, rows: LEAGUES.flatMap((league) => race(award, league).filter((row) => row.rank === 1)),
      }))} />

      <PageSection>
        <h2 className="type-section">Track record</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Winners called from earlier seasons only, against picking the leader in one stat.
        </p>
        <HowGraded>
          <p>Ballot awards cover 2016 to 2025, the others 2020 to 2025.</p>
        </HowGraded>
        <AwardTrackRecord rows={track} />
      </PageSection>

      {BALLOTS.map(({ id, award, title }) => (
        <PageSection key={award} id={id} className="scroll-mt-24 border-t border-rule-strong pt-section">
          <h2 className="type-section">{title}</h2>
          {award === "RP" && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The BBWAA award is new, so this model learned from the Rivera and Hoffman awards, which a different panel votes on.
            </p>
          )}
          <div className="grid gap-8 lg:grid-cols-2">
            {LEAGUES.map((league) => <AwardRace key={league} title={`${league} candidate`} rows={race(award, league)} strip />)}
          </div>
        </PageSection>
      ))}

      <PageSection id="gold-gloves" className="scroll-mt-24 border-t border-rule-strong pt-section">
        <h2 className="type-section">Gold Gloves</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Picked from the three finalists at each position: a blind test published after the winners, not an advance call.
        </p>
        <HowGraded>
          <p>
            This board was run without the {season} winners. Pitchers and utility players are ranked with no probability: the pitcher model called{" "}
            {pitchers?.hits} of {pitchers?.races}, and utility has too few seasons to test. The track record above picks from
            every qualified fielder, a harder test than three finalists.
          </p>
        </HowGraded>
        <div className="grid gap-8 lg:grid-cols-2">
          {LEAGUES.map((league) => (
            <GoldGloveField key={league} league={league} rows={POSITIONS.flatMap((position) => race("GG", league, position).filter((row) => row.rank === 1))} />
          ))}
        </div>
        <h3 className="type-subsection pt-4">Every finalist</h3>
        <div className="space-y-6">
          {POSITIONS.map((position) => (
            <div key={position} className="grid gap-8 lg:grid-cols-2">
              {LEAGUES.map((league) => <AwardRace key={league} title={`${league} ${position}`} rows={race("GG", league, position)} />)}
            </div>
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}
