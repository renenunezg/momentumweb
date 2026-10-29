import { PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type {
  ModelEvaluation,
  CalibrationBin,
  EdgeBucket,
  PosteriorSigma,
} from "@/lib/types";
import { aggregateLedger } from "@/lib/betting-aggs";
import { fetchFullBetLedger } from "@/lib/bet-ledger";
import { PerformanceTabs } from "./tabs";
import { LastUpdated } from "@/components/last-updated";
import { PlayerModelPerformance } from "@/components/player-model-performance";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "MLB Model Performance",
  description:
    "Calibration, Brier score, and prediction ROI of the MLB model's win probabilities and run totals, graded at the best pregame price published, plus how the player grades rank later production. Updated nightly.",
};

export default async function PerformancePage() {
  const [evalRes, calRes, edgeRes, residRes, latestRes, sigmasRes, ledger] = await Promise.all([
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
      .from("posterior_sigmas")
      .select("*")
      .order("refit_date", { ascending: false })
      .limit(20),
    fetchFullBetLedger().catch((error: unknown) => {
      console.error("MLB prediction ledger unavailable:", error instanceof Error ? error.message : "read failed");
      return null;
    }),
  ]);

  const readError =
    evalRes.error ?? calRes.error ?? edgeRes.error ?? residRes.error ?? latestRes.error ?? sigmasRes.error;
  if (readError) console.error("MLB performance read failed:", readError.message);
  const evaluations = (evalRes.data ?? []) as ModelEvaluation[];
  const lastUpdated: string | null = latestRes.data?.[0]?.created_at ?? null;
  const calibration = (calRes.data ?? []) as CalibrationBin[];
  const edgeBuckets = (edgeRes.data ?? []) as EdgeBucket[];
  const posteriorSigmas = (sigmasRes.data ?? []) as PosteriorSigma[];
  const liveKpis = ledger === null ? null : aggregateLedger(ledger);
  // The ledger pools the retired v1 model with v2; each row names its model.
  const eraKpis = ledger === null
    ? null
    : {
        v1: aggregateLedger(ledger.filter((row) => row.model_version === "v1")),
        v2: aggregateLedger(ledger.filter((row) => row.model_version === "v2")),
      };

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
    if (predRes.error) throw predRes.error;

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

  if (readError || evaluations.length === 0) {
    return (
      <PageShell>
        <PageTitle>
          MLB Model Performance
        </PageTitle>
        <p className="text-muted-foreground">
          {readError ? "Performance data is temporarily unavailable." : "No evaluation data available yet."}
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <PageTitle>
          MLB Model Performance
        </PageTitle>
        <LastUpdated
          timestamp={lastUpdated}
          schedule="Updates nightly ~midnight PT"
        />
      </PageHeader>
      <p className="max-w-3xl type-body text-muted-foreground">
        How the MLB model&apos;s win probabilities and run totals have held up,
        scored overnight after every game. Two model versions are pooled here:
        v1, an XGBoost model, through May 11, 2026, and v2, the Bayesian
        simulation, from May 12.
      </p>
      <PerformanceTabs
        evaluations={evaluations}
        calibration={calibration}
        edgeBuckets={edgeBuckets}
        residuals={residuals}
        posteriorSigmas={posteriorSigmas}
        liveKpis={liveKpis}
        eraKpis={eraKpis}
        players={<PlayerModelPerformance sport="mlb" />}
      />
    </PageShell>
  );
}
