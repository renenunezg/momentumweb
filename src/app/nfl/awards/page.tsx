import Link from "next/link";
import type { Metadata } from "next";
import { AWARDS, type AwardKey } from "@/lib/nfl-awards-types";
import { fetchAwards } from "@/lib/nfl-awards";
import { NflAwardsBoard } from "@/components/nfl-awards-board";
import { PlayerHeadshot } from "@/components/player-headshot";
import { LastUpdated } from "@/components/last-updated";

export const revalidate = 300;
export const metadata: Metadata = { title: "NFL Awards Tracker", description: "Weekly NFL award forecasts, player performance, and historical validation." };
const percent = (n: number | undefined) => n == null ? "Unavailable" : `${Math.round(n * 100)}%`;

export default async function AwardsPage({ searchParams }: {
  searchParams: Promise<{ award?: string; season?: string; week?: string }>;
}) {
  const params = await searchParams;
  const award: AwardKey = params.award && Object.hasOwn(AWARDS, params.award) ? params.award as AwardKey : "MVP";
  const season = params.season && /^\d{4}$/.test(params.season) ? Number(params.season) : undefined;
  const week = params.week && /^\d{1,2}$/.test(params.week) ? Number(params.week) : undefined;
  const { snapshots, meta, board, history, unavailable } = await fetchAwards(award, season, week);
  const query = (a: AwardKey, s?: number, w?: number) => `/nfl/awards?${new URLSearchParams({ award: a,
    ...(s == null ? {} : { season: String(s) }), ...(w == null ? {} : { week: String(w) }) })}`;
  return <main id="main" className="mx-auto w-full min-w-0 max-w-5xl space-y-6 px-4 py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div>
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">The race, week by week</p>
      <h1 className="font-heading text-3xl tracking-tight">NFL Awards Tracker</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Award forecasts alongside on-field performance. Follow the leaders, see what drives their rankings, and revisit each weekly snapshot.</p>
    </div>{meta && <LastUpdated timestamp={meta.as_of} schedule="Updates after completed weekly games" />}</div>
    <nav aria-label="NFL awards" className="flex flex-wrap gap-2 border-b border-rule-strong pb-4">
      {(Object.keys(AWARDS) as AwardKey[]).map((key) => <Link key={key} href={query(key, season, week)} aria-current={award === key ? "page" : undefined}
        className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${award === key ? "border-foreground bg-foreground text-background" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{key}</Link>)}
    </nav>
    <div><h2 className="font-heading text-xl">{AWARDS[award]}</h2>{meta && <p className="mt-1 font-mono text-xs text-muted-foreground">{meta.season} season · Through week {meta.week}</p>}</div>
    {unavailable ? <p role="status" className="rounded-lg border p-5 text-sm text-muted-foreground">Awards data is temporarily unavailable. Please try again later.</p>
      : !meta ? <p className="rounded-lg border p-5 text-sm text-muted-foreground">No snapshot has been published for this selection yet. Forecasts appear after completed regular-season games.</p>
      : <>
        <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Choose a historical snapshot</summary><div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto">{snapshots.map((s) => <Link key={`${s.season}-${s.week}`} href={query(award, s.season, s.week)} className="rounded border px-2 py-1 hover:bg-muted" aria-current={s.season === meta.season && s.week === meta.week ? "page" : undefined}>{s.season} · W{s.week}</Link>)}</div></details>
        {meta.status === "watchlist" ? <section className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">Documented injury-return watchlist, in alphabetical order. These are candidates to follow, not a predicted finishing order. There is not enough comparable history under the revised criteria to publish a CPOY forecast.</p>
          <div className="grid gap-3 sm:grid-cols-2">{[...board].sort((a, b) => a.candidate_name.localeCompare(b.candidate_name)).map((row) => <article className="rounded-lg border p-4" key={row.candidate_id}>
            <div className="flex items-center gap-3"><PlayerHeadshot name={row.candidate_name} src={row.headshot_url} /><div><h3 className="font-medium">{row.candidate_name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{row.team} · {row.position}</p></div></div>
            <p className="mt-3 text-sm text-muted-foreground">{row.context_reason}</p>{row.context_source?.startsWith("https://") && <a className="mt-2 inline-block text-xs underline" href={row.context_source}>Source context</a>}
          </article>)}</div>
        </section> : meta.status !== "ready" ? <p className="rounded-lg border p-5 text-sm text-muted-foreground">{meta.status === "missing_comeback_context"
          ? "Comeback forecasts need dated, sourced eligibility context. This award has not passed that data check yet."
          : meta.status === "insufficient_history" ? "There is not enough eligible historical data to fit this award model yet."
          : "Waiting for completed regular-season games before building this award board."}</p>
          : <>
            <div className="grid gap-4 border-y border-rule-strong py-5 sm:grid-cols-3">
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Forecast leader</p><p className="mt-2 text-xl font-medium">{board[0]?.candidate_name}</p><p className="mt-1 text-xs text-muted-foreground">{board[0]?.team} · {board[0]?.position}</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Historical top-three hit rate</p><p className="mt-2 font-mono text-2xl">{percent(meta.validation.top_three_rate)}</p><p className="mt-1 text-xs text-muted-foreground">{meta.validation.seasons} retrospective validation seasons at this horizon</p></div>
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Forecast status</p><p className="mt-2 text-xl font-medium">{meta.validation.probabilities_publishable ? "Validated" : "Experimental"}</p><p className="mt-1 text-xs text-muted-foreground">{meta.validation.probabilities_publishable ? "Win probabilities available" : "Win percentages withheld pending validation"}</p></div>
            </div>
            <NflAwardsBoard rows={board} award={award} />
          </>}
        {history.length > 0 && <section className="space-y-3"><h2 className="font-heading text-lg">Weekly leaders</h2><div className="flex gap-3 overflow-x-auto pb-2">{history.filter((r) => r.predicted_rank === 1).map((row) => <Link key={row.week} href={query(award, row.season, row.week)} className="min-w-44 rounded-lg border p-4 hover:bg-muted"><p className="font-mono text-xs text-muted-foreground">Week {row.week}</p><p className="mt-2 font-medium">{row.candidate_name}</p><p className="mt-1 text-xs text-muted-foreground">{row.team}</p></Link>)}</div></section>}
        <details className="border-t pt-5 text-sm"><summary className="cursor-pointer font-medium">Methodology and validation</summary><div className="mt-4 max-w-3xl space-y-3 leading-relaxed text-muted-foreground">
          <p>Each award has a separate regularized model trained on earlier seasons only. Candidates come from statistics available at the selected cutoff. Missing winners count as misses. The model predicts award winners; it does not estimate ballot share.</p>
          <p>Remaining-season player totals shrink toward prior-season rates with a four-game prior. Team records use a beta prior. Coach forecasts compare projected wins with a preseason baseline formed from the prior season record. These projections assume continued availability and do not yet model future injury risk. Full-game production informs the award forecast; competitive-drive EPA is a separate performance measure. Awards do not change team ratings.</p>
          <p>Historical results use reconstructed source files and a 24-hour result-availability assumption. Previously inspected years are retrospective validation, not a fresh holdout. CPOY training excludes seasons before the 2024 criteria change.</p>
          <p>Winner hit rate: {percent(meta.validation.winner_hit_rate)}. Winner coverage: {percent(meta.validation.winner_pool_coverage)}. Log loss: {meta.validation.log_loss?.toFixed(2) ?? "unavailable"}. Brier score: {meta.validation.brier?.toFixed(2) ?? "unavailable"}.</p>
          <p>Precise probabilities require at least eight validation seasons, complete winner coverage, better log loss than a uniform baseline, and a leader-confidence gap of at most ten percentage points. Until then, rankings remain experimental.</p>
          <p>Sources: <a className="underline" href="https://nflreadpy.nflverse.com/api/load_functions/">nflverse player and schedule data</a>, <a className="underline" href="https://static.clubs.nfl.com/image/upload/saints/bvaqvsl0fwdhlxu6wnw2.pdf">NFL Record and Fact Book</a>, and <a className="underline" href="https://amp.nfl.com/news/list-of-nfl-honors-award-winners-from-2025-nfl-season">NFL Honors results</a>.</p>
        </div></details>
      </>}
  </main>;
}
