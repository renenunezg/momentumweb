import { Suspense, type ReactNode } from "react";
import { PageShell } from "@/components/page-layout";
import { IntentLink as Link } from "@/components/navigation-link";
import { SiteHeader } from "@/components/site-header";
import { ContactLine } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { HomeComparisons } from "@/components/home-comparisons";
import { CarryFigure, PositionGapFigure, SystemComparisonFigure } from "@/components/home-figures";
import { HomePowerRatings } from "@/components/home-power-ratings";
import { HomeTabs } from "@/components/home-tabs";
import { DailyPicks } from "@/components/daily-picks";
import { SITE_TIME_ZONE, siteDate } from "@/lib/daily-picks";
import { fetchDailyPicks } from "@/lib/daily-picks-fetch";
import {
  fetchCarryPuzzle,
  fetchComparisons,
  fetchHomeRatings,
  fetchMlbLead,
  fetchPositionGaps,
} from "@/lib/home-research.server";
import { posts } from "./blog/posts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL_LINKS } from "@/lib/site";

export const revalidate = 3600;

// Each section reads only what it shows and degrades on its own: home should
// never 500 because one published table is unreachable.

function Unavailable({ what }: { what: string }) {
  return <p className="type-meta text-muted-foreground">{what} is temporarily unavailable.</p>;
}

function Loading() {
  return <p className="type-meta text-muted-foreground">Loading...</p>;
}

function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mt-4 inline-block type-label font-semibold text-primary underline underline-offset-4">
      {children}
    </Link>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="type-eyebrow text-muted-foreground">{children}</p>;
}

const listJoin = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

async function TodayPredictions() {
  const today = siteDate();
  const sports = await fetchDailyPicks(today);
  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: SITE_TIME_ZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return <DailyPicks sports={sports} dateLabel={dateLabel} />;
}

async function LeadStudy() {
  const lead = await fetchMlbLead().catch(() => null);
  if (!lead) return <Unavailable what="The MLB grade comparison" />;
  const first = Math.min(...lead.seasons);
  const last = Math.max(...lead.seasons);
  return (
    <section className="grid gap-6 border-b border-rule-strong py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 lg:py-10">
      <div>
        <Eyebrow>Player grades | MLB</Eyebrow>
        <h2 className="mt-2 type-title">
          How the MLB grade compares with {listJoin(lead.rows.map((r) => r.system))}
        </h2>
        <p className="mt-4 type-body text-muted-foreground">
          Each preseason from {first} to {last}, the grade was rebuilt from inputs dated before opening day and
          scored against what hitters went on to produce: batting runs plus Statcast fielding and baserunning per
          600 PA, the target the grade is built around, with the systems&apos; positional adjustment removed. On
          hitting alone the published grade trails all three systems. These seasons were in view while the grade
          was designed.
        </p>
        <MoreLink href="/mlb/performance">The full evaluation</MoreLink>
      </div>
      <SystemComparisonFigure
        n={1}
        rows={lead.rows}
        caption={`Spearman rank correlation with rest-of-season value, about ${lead.hitters} hitters per preseason. Each line runs from the system's WAR rate to the grade; the difference carries its 95% interval. Higher is better.`}
      />
    </section>
  );
}

async function Comparisons() {
  const rows = await fetchComparisons();
  if (rows.length === 0) return <Unavailable what="The model comparison table" />;
  return <HomeComparisons rows={rows} />;
}

const shortDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

async function CarryEntry() {
  const puzzle = await fetchCarryPuzzle().catch(() => null);
  if (!puzzle) return <Unavailable what="The carry study" />;
  const { long, short } = puzzle;
  const ball = (b: typeof long) =>
    `${b.name}${b.team ? ` (${b.team})` : ""}, ${shortDate(b.date)}: ${b.exit.toFixed(1)} mph at ${b.launch}°, ${b.distance} ft against ${b.expected} ft expected`;
  return (
    <>
      <h2 className="mt-1.5 type-subsection">
        Nearly the same contact, {long.distance - short.distance} feet apart
      </h2>
      <figure className="mt-3">
        <CarryFigure puzzle={puzzle} />
        <figcaption className="mt-2 type-meta text-muted-foreground">
          <span className="font-semibold text-foreground">Figure 2.</span> {ball(long)} (solid). {ball(short)} (dashed).
          Swing physics predicts {Math.round(puzzle.share * 100)}% of the differences in hitters&apos; carry in 2025, a
          season not used for the slope; its constants were fitted on 2026 and checked on 2025.
        </figcaption>
      </figure>
      <MoreLink href="/mlb/carry">Read the carry study</MoreLink>
    </>
  );
}

async function PositionGrades() {
  const { nfl, cfb } = await fetchPositionGaps();
  const panels = [
    nfl && { key: "nfl", label: "NFL", gaps: nfl, href: "/nfl/players" },
    cfb && { key: "cfb", label: "CFB", gaps: cfb, href: "/cfb/players" },
  ].filter((p) => p != null);
  if (panels.length === 0) return <Unavailable what="The position grade evaluation" />;
  return (
    <figure>
      <HomeTabs
        label="Sport"
        panels={panels.map((p) => ({
          key: p.key,
          label: p.label,
          content: (
            <>
              <PositionGapFigure rows={p.gaps.rows} />
              <p className="mt-2 type-meta text-muted-foreground">{p.gaps.note}</p>
              <MoreLink href={p.href}>All {p.label} player grades</MoreLink>
            </>
          ),
        }))}
      />
      <figcaption className="mt-3 type-meta text-muted-foreground">
        <span className="font-semibold text-foreground">Figure 3.</span>{" "}Difference between the grade and the
        same season&apos;s EPA credit in rank correlation with next-season EPA credit, with its 95% interval. A filled
        point clears zero.
      </figcaption>
    </figure>
  );
}

async function PowerRatings() {
  const ratings = await fetchHomeRatings();
  const panels = (["cfb", "nfl", "nhl"] as const).flatMap((sport) => {
    const league = ratings[sport];
    return league
      ? [{
          key: sport,
          label: sport.toUpperCase(),
          content: (
            <>
              <HomePowerRatings league={league} />
              <MoreLink href={`/${sport}/ratings`}>All {sport.toUpperCase()} ratings</MoreLink>
            </>
          ),
        }]
      : [];
  });
  if (panels.length === 0) return <Unavailable what="Power ratings" />;
  return <HomeTabs label="League" panels={panels} />;
}

export default function Home() {
  const latestPosts = posts.slice(0, 2);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
            },
            {
              "@type": "Person",
              name: SITE_NAME,
              url: SITE_URL,
              jobTitle: "Data & AI Engineer",
              sameAs: SOCIAL_LINKS.map((link) => link.href),
            },
          ],
        }}
      />
      <SiteHeader />
      <PageShell width="wide" className="gap-0 pt-2 sm:pt-4">
        <header className="space-y-1 border-y border-rule-strong border-t-foreground py-3 [border-top-width:2px]">
          <div className="type-label">
            <h1 className="inline font-normal">
              Sports research by <span className="font-semibold">Ren&eacute; N&uacute;&ntilde;ez</span>.
            </h1>{" "}
            <p className="inline">
              Player grades, team ratings and game forecasts, each compared with the public systems and markets that
              measure the same thing.
            </p>
          </div>
          <ContactLine className="type-meta text-muted-foreground" />
        </header>

        <div className="border-b border-rule-strong py-2">
          <Suspense fallback={<Loading />}>
            <TodayPredictions />
          </Suspense>
        </div>

        <Suspense fallback={<Loading />}>
          <LeadStudy />
        </Suspense>

        <section className="border-b border-rule-strong py-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="type-section">Model comparisons</h2>
          </div>
          <p className="mt-1 mb-4 max-w-3xl type-label text-muted-foreground">
            Each model next to the benchmark it is measured against. Where an evaluation publishes a 95% interval, a
            difference counts only when the interval clears zero. Game forecasts are scored on every graded game and
            carry no interval yet, so their rows report the sign only; the football lines shown are the published
            market-informed lines, which blend the market they are compared with.
          </p>
          <Suspense fallback={<Loading />}>
            <Comparisons />
          </Suspense>
        </section>

        <div className="grid gap-10 border-b border-rule-strong py-8 lg:grid-cols-3">
          <article className="min-w-0">
            <Eyebrow>Carry | MLB</Eyebrow>
            <Suspense fallback={<Loading />}>
              <CarryEntry />
            </Suspense>
          </article>
          <article className="min-w-0">
            <Eyebrow>Player grades | NFL and CFB</Eyebrow>
            <h2 className="mt-1.5 mb-3 type-subsection">How grades compare with EPA at predicting next season</h2>
            <Suspense fallback={<Loading />}>
              <PositionGrades />
            </Suspense>
          </article>
          <article className="min-w-0">
            <Eyebrow>Power ratings</Eyebrow>
            <h2 className="mt-1.5 mb-3 type-subsection">The strongest teams in each league</h2>
            <Suspense fallback={<Loading />}>
              <PowerRatings />
            </Suspense>
          </article>
        </div>

        <section className="grid gap-2 py-8 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
          <div className="flex items-baseline justify-between gap-4 sm:block">
            <h2 className="type-eyebrow text-muted-foreground">Writing</h2>
            <Link href="/blog" className="type-label font-semibold text-primary underline underline-offset-4 sm:mt-2 sm:inline-block">
              All posts
            </Link>
          </div>
          {latestPosts.length === 0 ? (
            <p className="type-label text-muted-foreground">Nothing published yet.</p>
          ) : (
            <ul>
              {latestPosts.map((post) => (
                <li key={post.slug} className="border-t border-border first:border-t-0 sm:first:border-t">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group grid gap-0.5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4"
                  >
                    <span className="type-meta text-muted-foreground">
                      {new Date(`${post.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    </span>
                    <span className="type-label font-semibold underline-offset-4 group-hover:underline">{post.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageShell>
    </>
  );
}
