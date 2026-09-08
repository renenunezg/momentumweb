import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Data Analyst who builds probabilistic forecasting models and benchmarks them against the market in public.",
};

const links = [
  { label: "Resume", value: "Resume (PDF)", href: "/resume.pdf" },
  { label: "GitHub", value: "github.com/renenunezg", href: "https://github.com/renenunezg" },
  { label: "LinkedIn", value: "linkedin.com/in/renenunezg", href: "https://linkedin.com/in/renenunezg" },
  { label: "Email", value: "renenunezgalaviz@gmail.com", href: "mailto:renenunezgalaviz@gmail.com" },
  { label: "Twitter", value: "@nunezanalytics", href: "https://twitter.com/nunezanalytics" },
];

const strengths = [
  {
    title: "Probabilistic modeling",
    body: "Hierarchical Bayesian models fit with NUTS (PyMC, numpyro, JAX), Monte Carlo simulation, and parameter uncertainty carried through to the published number.",
  },
  {
    title: "Forecast evaluation",
    body: "Calibration, Brier and log-loss scoring, walk-forward validation on untouched holdouts, and benchmarking against efficient markets, with the record kept in public.",
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
    role: "Data Analyst",
    org: "Group U",
    when: "2026 – present",
    body: "Operational and workforce reporting for a contact-center business: service-level and productivity KPIs, the pipelines behind them, and the reports leadership reads every day.",
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
    body: "Hierarchical Bayesian plate-appearance model and per-PA Monte Carlo simulator; run distributions published daily and graded live.",
  },
  {
    name: "College football",
    href: "/cfb/methodology",
    body: "Possession-level power ratings with calibrated margin and total uncertainty, validated walk-forward against closing lines.",
  },
  {
    name: "NFL",
    href: "/nfl/methodology",
    body: "Bayesian power ratings from drive-level EPA with QB and rest adjustments, backtested from 2016 with untouched holdout seasons.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

export default function AboutPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: SITE_NAME,
          url: SITE_URL,
          image: `${SITE_URL}/portrait.jpeg`,
          jobTitle: "Data Analyst",
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
            className="rounded-full object-cover"
            priority
          />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl tracking-tight">
            Ren&eacute; N&uacute;&ntilde;ez
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Data Analyst in the San Diego&ndash;Tijuana area, with a
            background in behavioral neuroscience research, municipal government, and
            production statistical systems. Outside work I build probabilistic
            forecasting models for MLB, college football, and the NFL, publish their
            numbers before the games start, and grade them against the closing line in
            public. The betting market is the benchmark because it is the sharpest
            public probability estimate available, not because the goal is a betting
            product.
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

      <section className="mt-10">
        <SectionLabel>Looking for</SectionLabel>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Data scientist, analytics engineer, and applied statistics or forecasting
          roles where calibrated probabilities and honest evaluation matter more than a
          point estimate. San Diego, Tijuana, or remote.
        </p>
      </section>

      <section className="mt-10">
        <SectionLabel>Strengths</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {strengths.map(({ title, body }) => (
            <div key={title} className="rounded-sm border border-border p-3">
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
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
      </section>

      <section className="mt-10">
        <SectionLabel>Models on this site</SectionLabel>
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
      </section>
    </main>
  );
}
