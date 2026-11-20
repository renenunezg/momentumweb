import type { Metadata } from "next";
import Link from "next/link";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";

export const metadata: Metadata = {
  title: "LMB Model Methodology",
  description:
    "How the LMB forecast works: hierarchical Bayesian batter and pitcher skills from LMB play-by-play since 2021, park effects pooled toward altitude, a lineup Monte Carlo simulation, a 50/50 log-odds blend with the Kalshi midpoint, and picks priced at the Kalshi ask plus fee.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="type-section">{title}</h2>
      {children}
    </section>
  );
}

const p = "text-sm leading-relaxed text-muted-foreground";
const link = "underline underline-offset-2 hover:text-foreground";

export default function Page() {
  return (
    <PageShell width="reading">
      <PageHeader>
        <div>
          <PageTitle>LMB Model Methodology</PageTitle>
          <PageDescription>
            Player skills, a lineup simulation and the Kalshi market, forecast before each game and graded after it
          </PageDescription>
        </div>
      </PageHeader>

      <Section title="Overview">
        <p className={p}>
          The Liga Mexicana de Béisbol model forecasts each game from its lineups: who wins and how many runs each
          team scores. The forecast updates until first pitch, freezes then, and is scored against the result and
          against the Kalshi market on the{" "}
          <Link href="/lmb/performance" className={link}>Performance</Link> page. It is a forecasting and market
          benchmarking project, not wagering advice.
        </p>
      </Section>

      <Section title="Player skills">
        <p className={p}>
          Batter and pitcher skills are hierarchical Bayesian estimates fitted on LMB play-by-play since 2021, from the
          MLB Stats API, which carries the league. Each player is pulled toward the league average in proportion to how
          little of him has been seen, so a short record leans on the average.
        </p>
        <p className={p}>
          Park effects are pooled toward what each park&apos;s altitude predicts, since the league plays from sea level
          to well over a mile up. Each season has its own run level.
        </p>
      </Section>

      <Section title="Simulation">
        <p className={p}>
          A Monte Carlo simulation plays each game plate appearance by plate appearance, with the posted lineups or,
          before they post, projected ones. It gives each team&apos;s win probability (Sim on the games page) and a
          distribution of the runs it scores.
        </p>
      </Section>

      <Section title="The Kalshi blend">
        <p className={p}>
          The published win probability blends the simulation with the Kalshi midpoint, half and half on the log-odds
          scale. Kalshi prices are shown in cents for a yes contract that pays one dollar, so 54¢ implies 54%.
        </p>
      </Section>

      <Section title="Picks">
        <p className={p}>
          A game gets at most one moneyline pick: the team with the highest expected value at its Kalshi ask plus the
          trading fee. Value picks have a non-negative expected value and leans a small negative one. Each day also
          has a minimum of three games, ranked an hour before the day&apos;s first pitch. The ask sits above the
          midpoint, so most picks carry a small negative expected value, and the record is a benchmark of the forecast
          against the market rather than a claim of profit.
        </p>
        <p className={p}>
          Every pick is graded at one unit at its frozen ask plus fee. The full record is in the{" "}
          <Link href="/lmb/history?view=picks" className={link}>pick history</Link>.
        </p>
      </Section>

      <Section title="Grading">
        <p className={p}>
          Each game is scored once, by log loss, Brier score and how often the favored team won, with the average miss
          of expected runs beside them. The comparison with Kalshi uses only games with a quote captured before first
          pitch, so it is reported apart from the all-games figures.
        </p>
      </Section>
    </PageShell>
  );
}
