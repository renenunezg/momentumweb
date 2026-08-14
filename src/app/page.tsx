import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { fetchFullBetLedger } from "@/lib/bet-ledger";
import { aggregateLedger } from "@/lib/betting-aggs";
import { supabaseCfb } from "@/lib/supabase";
import { posts } from "./blog/posts";

export const revalidate = 300;

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

function signed(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals));
  const text = Math.abs(rounded).toFixed(decimals);
  if (rounded > 0) return `+${text}`;
  if (rounded < 0) return `-${text}`;
  return text;
}

type CfbHeadline = {
  topTeam: string | null;
  teamCount: number;
  season: number | null;
  week: number | null;
  gameCount: number;
};

async function getCfbHeadline(): Promise<CfbHeadline | null> {
  try {
    const latestRes = await supabaseCfb
      .from("team_ratings")
      .select("season, week")
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .limit(1);
    const latest = latestRes.data?.[0];
    if (!latest) return null;
    const [topRes, countRes, gamesRes] = await Promise.all([
      supabaseCfb
        .from("team_ratings")
        .select("team")
        .eq("season", latest.season)
        .eq("week", latest.week)
        .eq("classification", "fbs")
        .order("power_rating", { ascending: false })
        .limit(1),
      supabaseCfb
        .from("team_ratings")
        .select("team_id", { count: "exact", head: true })
        .eq("season", latest.season)
        .eq("week", latest.week),
      supabaseCfb
        .from("game_projections")
        .select("game_id", { count: "exact", head: true })
        .eq("season", latest.season)
        .eq("week", latest.week),
    ]);
    return {
      topTeam: topRes.data?.[0]?.team ?? null,
      teamCount: countRes.count ?? 0,
      season: latest.season,
      week: latest.week,
      gameCount: gamesRes.count ?? 0,
    };
  } catch {
    // Home should never 500 because Supabase is unreachable; the CFB card
    // degrades to a plain link.
    return null;
  }
}

const upcomingSports = [
  { name: "NFL", label: "Football" },
  { name: "NHL", label: "Hockey" },
];

export default async function Home() {
  const [mlb, cfb] = await Promise.all([getMlbHeadline(), getCfbHeadline()]);
  const latestPosts = posts.slice(0, 2);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-10">
        {/* Hero */}
        <section>
          <h1 className="font-heading text-3xl tracking-tight">
            Ren&eacute; N&uacute;&ntilde;ez
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xl">
            I&apos;m a data analyst / statistician working on modeling momentum
            and sports.
          </p>
        </section>

        {/* Models */}
        <section className="mt-10">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Models
          </h2>
          <Link
            href="/mlb"
            className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-lg tracking-tight group-hover:underline underline-offset-4">
                  MLB
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                View picks &rarr;
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Hierarchical Bayesian model simulating every game one plate
              appearance at a time.
            </p>
            {mlb && (
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    ROI
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {mlb.roi != null ? `${signed(mlb.roi * 100, 1)}%` : "–"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Record
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {mlb.wins}&ndash;{mlb.losses}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Net units
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {signed(mlb.netUnits, 1)}u
                  </p>
                </div>
                <p className="ml-auto self-end font-mono text-xs text-muted-foreground">
                  Updated nightly
                </p>
              </div>
            )}
          </Link>

          <Link
            href="/cfb"
            className="group mt-4 block rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-lg tracking-tight group-hover:underline underline-offset-4">
                  CFB
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Preseason
                </span>
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                View ratings &rarr;
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Power ratings for every Division 1 program, with weekly spread
              and total projections priced against the market.
            </p>
            {cfb && (
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    No. 1
                  </p>
                  <p className="mt-0.5 font-mono text-sm">
                    {cfb.topTeam ?? "–"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Teams rated
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {cfb.teamCount}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    Week {cfb.week ?? "–"} games
                  </p>
                  <p className="mt-0.5 font-mono text-sm tabular-nums">
                    {cfb.gameCount}
                  </p>
                </div>
                <p className="ml-auto self-end font-mono text-xs text-muted-foreground">
                  {cfb.season} preseason
                </p>
              </div>
            )}
          </Link>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {upcomingSports.map((sport) => (
              <div
                key={sport.name}
                className="rounded-xl border border-dashed border-border p-4"
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

        {/* Latest writing */}
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
            <div className="flex flex-col gap-4">
              {latestPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30"
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
