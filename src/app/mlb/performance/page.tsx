import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type {
  ModelEvaluation,
  CalibrationBin,
  EdgeBucket,
  PosteriorSkill,
  PosteriorSigma,
} from "@/lib/types";
import { aggregateLedger } from "@/lib/betting-aggs";
import { fetchFullBetLedger } from "@/lib/bet-ledger";
import { PerformanceTabs } from "./tabs";
import { LastUpdated } from "@/components/last-updated";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "MLB Model Performance",
  description:
    "Calibration, Brier score, and betting ROI of the MLB model's win probabilities and run totals against the closing line, updated nightly.",
};

export default async function PerformancePage() {
  const [evalRes, calRes, edgeRes, residRes, latestRes, skillsRes, sigmasRes, ledger] = await Promise.all([
    supabase
      .from("model_evaluation")
      .select("*")
      .order("date", { ascending: true }),
    supabase
      .from("model_calibration")
      .select("*")
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("model_edge_buckets")
      .select("*")
      .order("date", { ascending: false })
      .limit(40),
    supabase
      .from("games")
      .select("game_pk, home_team, home_score, away_score")
      .eq("status", "Final")
      .order("game_date", { ascending: false })
      .limit(500),
    supabase
      .from("model_evaluation")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("posterior_skills")
      .select("*")
      .order("refit_date", { ascending: false })
      .limit(80),
    supabase
      .from("posterior_sigmas")
      .select("*")
      .order("refit_date", { ascending: false })
      .limit(20),
    // The betting tab degrades to empty KPIs if the ledger view is unreachable;
    // the rest of the page must still render.
    fetchFullBetLedger().catch(() => []),
  ]);

  const evaluations = (evalRes.data ?? []) as ModelEvaluation[];
  const lastUpdated: string | null = latestRes.data?.[0]?.created_at ?? null;
  const calibration = (calRes.data ?? []) as CalibrationBin[];
  const edgeBuckets = (edgeRes.data ?? []) as EdgeBucket[];
  const posteriorSkills = (skillsRes.data ?? []) as PosteriorSkill[];
  const posteriorSigmas = (sigmasRes.data ?? []) as PosteriorSigma[];
  const liveKpis = aggregateLedger(ledger);

  // Residuals join predictions to graded games here rather than in PostgREST:
  // an embedded !inner needs an FK constraint, which these tables lack.
  type FinalGame = {
    game_pk: number;
    home_team: string;
    home_score: number | null;
    away_score: number | null;
  };
  const finalGames = (residRes.data ?? []) as FinalGame[];
  const gameByPk = new Map(finalGames.map((g) => [g.game_pk, g]));

  let residuals: number[] = [];
  if (finalGames.length > 0) {
    const predRes = await supabase
      .from("model_outputs_season_unified")
      .select("game_pk, team, expected_runs")
      .in("game_pk", finalGames.map((g) => g.game_pk));

    residuals = (predRes.data ?? [])
      .map((r) => {
        const g = r.game_pk != null ? gameByPk.get(r.game_pk) : undefined;
        if (!g || r.expected_runs == null) return null;
        const actual = r.team === g.home_team ? g.home_score : g.away_score;
        if (actual == null) return null;
        return actual - r.expected_runs;
      })
      .filter((v): v is number => v != null);
  }

  if (evaluations.length === 0) {
    return (
      <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8">
        <h1 className="font-heading text-2xl tracking-tight">
          MLB Model Performance
        </h1>
        <p className="mt-4 text-muted-foreground">
          No evaluation data available yet. Run the pipeline to generate
          performance metrics.
        </p>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl tracking-tight">
          MLB Model Performance
        </h1>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates nightly ~midnight PT"
        />
      </div>
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        How the MLB model&apos;s win probabilities and run totals have held
        up: calibration, Brier score, and betting results against the closing
        line, scored overnight after every game.
      </p>
      <PerformanceTabs
        evaluations={evaluations}
        calibration={calibration}
        edgeBuckets={edgeBuckets}
        residuals={residuals}
        posteriorSkills={posteriorSkills}
        posteriorSigmas={posteriorSigmas}
        liveKpis={liveKpis}
      />
    </main>
  );
}
