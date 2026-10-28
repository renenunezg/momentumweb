import { PageSection, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL, SOCIAL_LINKS } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Data & AI Engineer building player grades, team ratings, and statistical tools for sports analysis, fantasy, and DFS research.",
};

const links = [
  { label: "Resume", value: "Resume (PDF)", href: "/resume.pdf" },
  ...SOCIAL_LINKS,
  { label: "Email", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
];

const strengths = [
  {
    title: "Probabilistic modeling",
    body: "Hierarchical Bayesian models fit with NUTS (PyMC, NumPyro, JAX), Monte Carlo simulation, and parameter uncertainty carried through to the published number.",
  },
  {
    title: "Forecast evaluation",
    body: "Calibration, Brier and log-loss scoring, walk-forward validation with each model's holdout status stated, and benchmarking against efficient markets, with the record kept in public.",
  },
  {
    title: "Data engineering",
    body: "Python, SQL and Postgres, ETL and scheduled pipelines on GitHub Actions and Supabase, with write-gated production boundaries.",
  },
  {
    title: "Reporting",
    body: "SQL reporting infrastructure, KPI dashboards in Power BI and Tableau, and the Next.js and TypeScript frontend that serves these models.",
  },
];

const experience = [
  {
    role: "Data & AI Engineer",
    org: "Group U",
    when: "2026 – present",
    body: "Account-level forecasts covering about 48,000 calls a week, built from historical trends, seasonality, and holidays to guide staffing decisions; headcount targets from a model of missed-call rate against staffing, plus the hiring scenarios behind staffing decisions; root-cause analyses of forecast misses; AI call-quality scoring with AssemblyAI and Claude, measured for error, bias, and agreement against supervisor grades; and automated executive KPI reporting on PostgreSQL and Azure SQL.",
  },
  {
    role: "Data Science Research Volunteer",
    org: "Salk Institute for Biological Studies",
    when: "Jul 2025 – Mar 2026",
    body: "Built the labeled dataset behind a SLEAP pose-estimation model from tube-test dominance video, resolved systematic labeling inconsistencies across cohorts, and cross-validated the model to decide which displacement classifications were reliable enough for downstream analysis.",
  },
  {
    role: "Data Analyst",
    org: "Tijuana City Council",
    when: "Jan – Jul 2025",
    body: "Beneficiary lookup dashboard deployed in an air-gapped environment for elected officials and staff; query optimization that cut lookup time 22% during live sessions; ETL automation that removed 30% of manual data handling.",
  },
  {
    role: "Data Analyst",
    org: "Executive Offices",
    when: "2022 – 2024",
    body: "SQL reporting infrastructure for billing, occupancy, and fiscal activity of Mexican companies entering the U.S. market; resolved duplicate records, manual-entry errors, and malformed dates, cutting the error rate 26%.",
  },
];

const models = [
  {
    name: "MLB",
    href: "/mlb/methodology",
    body: "Hitter and pitcher grades, skill profiles, projected production, and trade value, alongside a Bayesian plate-appearance model and game simulator.",
  },
  {
    name: "College football",
    href: "/cfb/methodology",
    body: "Team and unit ratings, position-specific player grades, and player comparisons, with possession-level modeling and public forecast evaluation.",
  },
  {
    name: "NFL",
    href: "/nfl/methodology",
    body: "Team ratings from drive-level EPA, player grades, projected production, and position-specific comparisons, with season and awards analysis.",
  },
  {
    name: "NHL",
    href: "/nhl/methodology",
    body: "Shot-quality team ratings and a Poisson goal model, with attack and defense strengths, home and road splits, and public evaluation of win probabilities against the market.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export default function AboutPage() {
  return (
    <PageShell width="reading">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: SITE_NAME,
          url: SITE_URL,
          image: `${SITE_URL}/portrait.jpeg`,
          jobTitle: "Data & AI Engineer",
          sameAs: links
            .filter((l) => l.href.startsWith("https://"))
            .map((l) => l.href),
        }}
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div className="shrink-0">
          <Image
            src="/portrait.jpeg"
            alt="René Núñez"
            width={96}
            height={96}
            className="size-24 rounded-full object-cover"
            priority
          />
        </div>

        <div className="flex-1 min-w-0">
          <PageTitle>
            Ren&eacute; N&uacute;&ntilde;ez
          </PageTitle>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Data &amp; AI Engineer in the San Diego&ndash;Tijuana area, with a
            background in behavioral neuroscience research, municipal government, and
            production statistical systems. I build Momentum to explore player
            talent, team strength, and the numbers behind performance across MLB,
            college football, the NFL, and the NHL. Player grades, team ratings, and
            comparisons support sports analysis, fantasy, and DFS research. Game
            forecasts and public evaluation show how the models perform over time.
          </p>

          <div className="mt-5 flex flex-col gap-1.5">
            {links.map(({ label, value, href }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground w-16 shrink-0">
                  {label}
                </span>
                <Link
                  href={href}
                  target={href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline underline-offset-4"
                >
                  {value}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageSection>
        <SectionLabel>Looking for</SectionLabel>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Data scientist, analytics engineer, and applied statistics or forecasting
          roles where calibrated probabilities and honest evaluation matter more than a
          point estimate. San Diego, Tijuana, or remote.
        </p>
      </PageSection>

      <PageSection>
        <SectionLabel>Strengths</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {strengths.map(({ title, body }) => (
            <Card key={title} size="sm"><CardContent>
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </CardContent></Card>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <SectionLabel>Experience</SectionLabel>
        <div className="divide-y divide-border border-y border-rule-strong">
          {experience.map(({ role, org, when, body }) => (
            <div key={`${org}-${role}`} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-medium">
                  {role}
                  <span className="text-muted-foreground"> &middot; {org}</span>
                </p>
                <p className="font-mono text-xs text-muted-foreground">{when}</p>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          B.S. in Computer Science, CETYS Universidad (2025), with the EGEL-CENEVAL
          Sobresaliente distinction in Intelligent Computing, and an exchange semester
          at Universit&agrave; di Bergamo focused on data science and machine learning.
        </p>
      </PageSection>

      <PageSection>
        <SectionLabel>Sports analysis on this site</SectionLabel>
        <div className="divide-y divide-border border-y border-rule-strong">
          {models.map(({ name, href, body }) => (
            <Link
              key={name}
              href={href}
              className="group -mx-3 block px-3 py-4 transition-colors hover:bg-muted/50"
            >
              <p className="text-sm font-medium group-hover:underline underline-offset-4">
                {name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </Link>
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}
