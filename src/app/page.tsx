import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { fetchFullBetLedger } from "@/lib/bet-ledger";
import { aggregateLedger } from "@/lib/betting-aggs";
import { supabaseCfb, supabaseNfl } from "@/lib/supabase";
import { formatPct, formatSigned } from "@/lib/utils";
import { fetchCfbPickSummary } from "@/lib/cfb-picks";
import { fetchNflPickSummary } from "@/lib/nfl-picks";
import {
  MARKET_LABELS,
  marketRecords,
  type MarketRecord,
} from "@/lib/football-picks";
import { SITE_TIME_ZONE, siteDate } from "@/lib/daily-picks";
import { fetchDailyPicks } from "@/lib/daily-picks-fetch";
import { DailyPicks } from "@/components/daily-picks";
import { posts } from "./blog/posts";
import { JsonLd } from "@/components/json-ld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type MlbHeadline = {
  roi: number | null;
  wins: number;
  losses: number;
  netUnits: number;
};

async function getMlbHeadline(): Promise<MlbHeadline | null> {
  try {
    const ledger = await fetchFullBetLedger();
    if (ledger.length === 0) return null;
    const kpis = aggregateLedger(ledger);
    const wins = ledger.filter((r) => r.won).length;
    return {
      roi: kpis.roi,
      wins,
      losses: ledger.length - wins,
      netUnits: kpis.net_profit_units,
    };
  } catch {
    // Home should never 500 because Supabase is unreachable; the MLB card
    // degrades to a plain link.
    return null;
  }
}

type FootballHeadline = {
  season: number | null;
  week: number | null;
  // Preseason ratings carry a preseason model version; once a weekly refit
  // has published, the card reads as live.
  live: boolean;
  markets: MarketRecord[];
};

const SEASON_TO_DATE = { market: "all", period: "all", from: null } as const;

async function getCfbHeadline(): Promise<FootballHeadline | null> {
  try {
    const latestRes = await supabaseCfb
      .from("team_ratings")
      .select("season, week, model_version")
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .limit(1);
    const latest = latestRes.data?.[0];
    if (!latest) return null;
    const summary = await fetchCfbPickSummary({
      ...SEASON_TO_DATE,
      season: latest.season,
    });
    return {
      season: latest.season,
      week: latest.week,
      live: !String(latest.model_version ?? "").startsWith("preseason"),
      markets: marketRecords(summary.metrics),
    };
  } catch {
    // Home should never 500 because Supabase is unreachable; the CFB card
    // degrades to a plain link.
    return null;
  }
}

async function getNflHeadline(): Promise<FootballHeadline | null> {
  try {
    const latestRes = await supabaseNfl
      .from("game_projections")
      .select("season, week")
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .limit(1);
    const latest = latestRes.data?.[0];
    if (!latest) return null;
    const summary = await fetchNflPickSummary({
      ...SEASON_TO_DATE,
      season: latest.season,
    });
    return {
      season: latest.season,
      week: latest.week,
      live: true,
      markets: marketRecords(summary.metrics),
    };
  } catch {
    // Home should never 500 because Supabase is unreachable; the NFL card
    // degrades to a plain link.
    return null;
  }
}

function StatusBadge({ live }: { live: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`}
      />
      {live ? "Live" : "Preseason"}
    </span>
  );
}

// Record and ROI per market, never pooled: a spread edge and a total edge are
// different claims, so each is judged on its own sample.
function FootballStats({ headline }: { headline: FootballHeadline }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
      {headline.markets.map((record) => (
        <div key={record.market}>
          <p className="text-xs text-muted-foreground">
            {MARKET_LABELS[record.market]} ROI
          </p>
          <p className="mt-0.5 font-mono text-sm tabular-nums">
            {formatPct(record.roi)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
            {record.wins}&ndash;{record.losses}&ndash;{record.pushes}
            {record.pending ? ` · ${record.pending} pending` : ""}
          </p>
        </div>
      ))}
      <p className="ml-auto self-end font-mono text-xs text-muted-foreground">
        {headline.live
          ? `${headline.season} week ${headline.week ?? "–"}`
          : `${headline.season} preseason`}
      </p>
    </div>
  );
}

const upcomingSports = [{ name: "NHL", label: "Hockey" }];

export default async function Home() {
  const today = siteDate();
  const [mlb, cfb, nfl, daily] = await Promise.all([
    getMlbHeadline(),
    getCfbHeadline(),
    getNflHeadline(),
    fetchDailyPicks(today),
  ]);
  const dateLabel = new Date(`${today}T12:00:00Z`).toLocaleDateString(
    "en-US",
    { timeZone: SITE_TIME_ZONE, weekday: "long", month: "short", day: "numeric" },
  );
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
              jobTitle: "Data Analyst",
              sameAs: [
                "https://github.com/renenunezg",
                "https://linkedin.com/in/renenunezg",
                "https://twitter.com/nunezanalytics",
              ],
            },
          ],
        }}
      />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl min-w-0 px-4 py-10">
        <section>
          <h1 className="font-heading text-3xl tracking-tight">
            Ren&eacute; N&uacute;&ntilde;ez
          </h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Data Analyst. I build probabilistic forecasting
            models for sports and benchmark them against the market in public.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Models
          </h2>
          {/* Entries are separated by rules, not enclosed in boxes. */}
          <div className="divide-y divide-border border-y border-rule-strong">
          <Link
            href="/mlb"
            className="group -mx-3 block px-3 py-5 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-lg tracking-tight group-hover:underline underline-offset-4">
                  MLB
                </span>
                <StatusBadge live />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                View today&apos;s slate &rarr;
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Hierarchical Bayesian model simulating every game one plate
              appearance at a time.
            </p>
            {mlb && (
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    ROI
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {mlb.roi != null ? `${formatSigned(mlb.roi * 100, 1)}%` : "–"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Record
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {mlb.wins}&ndash;{mlb.losses}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Net units
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {formatSigned(mlb.netUnits, 1)}u
                  </p>
                </div>
                <p className="ml-auto self-end font-mono text-xs text-muted-foreground">
                  Updated nightly
                </p>
              </div>
            )}
          </Link>

          <Link
            href="/cfb/predictions"
            className="group -mx-3 block px-3 py-5 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-lg tracking-tight group-hover:underline underline-offset-4">
                  CFB
                </span>
                <StatusBadge live={cfb?.live ?? false} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                View predictions &rarr;
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Weekly spread, total, and moneyline predictions with frozen
              lines, built on power ratings for every Division 1 program.
            </p>
            {cfb && <FootballStats headline={cfb} />}
          </Link>

          <Link
            href="/nfl/predictions"
            className="group -mx-3 block px-3 py-5 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-lg tracking-tight group-hover:underline underline-offset-4">
                  NFL
                </span>
                <StatusBadge live={nfl?.live ?? false} />
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                View predictions &rarr;
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Bayesian power ratings for all 32 teams from drive-level EPA,
              with weekly spread and total projections priced against the
              market.
            </p>
            {nfl && <FootballStats headline={nfl} />}
          </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {upcomingSports.map((sport) => (
              <div
                key={sport.name}
                className="border-b border-dashed border-border py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-heading text-base tracking-tight text-muted-foreground">
                    {sport.name}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground/70">
                    Planned
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {sport.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <DailyPicks sports={daily} dateLabel={dateLabel} />

        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Latest writing
            </h2>
            <Link
              href="/blog"
              className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              All posts &rarr;
            </Link>
          </div>
          {latestPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing published yet.
            </p>
          ) : (
            <div className="divide-y divide-border border-y border-rule-strong">
              {latestPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group -mx-3 block px-3 py-5 transition-colors hover:bg-muted/50"
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {post.date}
                  </p>
                  <h3 className="font-heading text-base tracking-tight mt-1 group-hover:underline underline-offset-4">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {post.summary}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
