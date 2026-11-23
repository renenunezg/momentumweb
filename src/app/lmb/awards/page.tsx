import { PageHeader, PageSection, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { AwardFavorites, AwardRace, AwardTrackRecord, type AwardPortraits } from "@/components/award-races";
import { HowGraded } from "@/components/how-graded";
import { lmbTeamCodeByName, lmbTeamLogo, parseAwardValidation } from "@/lib/lmb";
import { fetchLmbAwards } from "@/lib/lmb-data";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;
export const metadata: Metadata = {
  title: "LMB Awards Forecast",
  description:
    "Award boards for the Liga Mexicana de Béisbol: MVP, Pitcher, Reliever, Rookie and Manager of the Year, fitted on past winners and graded against the league's picks.",
};

const AWARDS = [
  { id: "mvp", award: "MVP", title: "Most Valuable Player", short: "MVP" },
  { id: "pitcher", award: "POY", title: "Pitcher of the Year", short: "Pitcher" },
  { id: "reliever", award: "REL", title: "Reliever of the Year", short: "Reliever" },
  { id: "rookie", award: "ROY", title: "Rookie of the Year", short: "Rookie" },
  { id: "manager", award: "MOY", title: "Manager of the Year", short: "Manager" },
] as const;
const CANDIDATE: Record<string, string> = { MOY: "Manager", POY: "Pitcher", REL: "Reliever", ROY: "Rookie" };
const FROZEN_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

const PORTRAITS: AwardPortraits = {
  headshot: lmbPlayerHeadshotUrl,
  logo: (team) => {
    const code = lmbTeamCodeByName(team);
    return code ? lmbTeamLogo(code) : undefined;
  },
};

function Unavailable({ children }: { children: React.ReactNode }) {
  return <PageShell><PageTitle>Awards Forecast</PageTitle>{children}</PageShell>;
}

export default async function LmbAwardsPage() {
  const { season, models, rows } = await fetchLmbAwards();
  if (season == null || rows.length === 0) return <Unavailable><p className="text-muted-foreground">No award forecasts have been published yet.</p></Unavailable>;

  const awards = AWARDS.filter(({ award }) => rows.some((row) => row.award === award));
  const race = (award: string) => rows.filter((row) => row.award === award);
  const late = (award: string) => models.find((model) => model.award === award)?.after_announcement === true;
  const allLate = awards.every(({ award }) => late(award));
  // The one stat each award's baseline picks the leader in (BASELINE in momentumlmb's backend/awards/features.py);
  // a tie for the lead splits the hit, so a count can be fractional.
  const BASELINE: Record<string, string> = {
    MVP: "batting runs",
    POY: "wins",
    REL: "saves",
    ROY: "batting or pitching runs",
    MOY: "win pct",
  };
  const track = awards.flatMap(({ award, short }) => {
    const model = models.find((candidate) => candidate.award === award);
    const fit = model ? parseAwardValidation(model.backtest) : null;
    return fit ? [{ label: short, fit: { ...fit, baseline: BASELINE[award] }, years: fit.years }] : [];
  });
  const years = track.flatMap((row) => row.years);
  const frozen = models.reduce((latest, model) => (model.as_of > latest ? model.as_of : latest), models[0].as_of);
  const lateNote = (
    <>These boards were frozen after the league announced its {season} winners, so they are not a forecast made in advance.</>
  );

  return (
    <PageShell>
      <PageHeader>
        <div>
          <p className="type-eyebrow mb-2 text-muted-foreground">
            {season} season · Frozen {FROZEN_DATE.format(new Date(frozen))}{allLate && ", after the winners were announced"}
          </p>
          <PageTitle>LMB Awards Forecast</PageTitle>
          <div className="mt-heading">
            <HowGraded label="How this works" lead={allLate ? lateNote : <>A forecast of who wins each award.</>}>
              <p>
                Each race is fitted on past winners from season statistics, then frozen and graded against the
                result.
              </p>
            </HowGraded>
          </div>
        </div>
      </PageHeader>

      <AwardFavorites
        className="lg:grid-cols-5"
        portraits={PORTRAITS}
        races={awards.map(({ id, award, title }) => ({ id, title, rows: race(award).filter((row) => row.rank === 1) }))}
      />

      {track.length > 0 && (
        <PageSection>
          <h2 className="type-section">Track record</h2>
          <HowGraded lead={<>How often each model&apos;s favorite won in past seasons, against picking the leader in one stat.</>}>
            <p>
              Races from {Math.min(...years)} to {Math.max(...years)}; the 2020 season was not played.
            </p>
          </HowGraded>
          <AwardTrackRecord rows={track} />
        </PageSection>
      )}

      {/* One race per award, two to a row, so each table keeps the width of an MLB league's. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        {awards.map(({ id, award, title }) => (
          <PageSection key={award} id={id} className="min-w-0 scroll-mt-24 border-t border-rule-strong pt-section">
            <h2 className="type-section">{title}</h2>
            {!allLate && late(award) && <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{lateNote}</p>}
            <AwardRace title={CANDIDATE[award] ?? "Candidate"} rows={race(award)} strip portraits={PORTRAITS} />
          </PageSection>
        ))}
      </div>
    </PageShell>
  );
}
