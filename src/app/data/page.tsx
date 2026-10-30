import type { Metadata } from "next";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";

export const metadata: Metadata = {
  title: "Data and Exports",
  description:
    "Download the tables behind every performance page as CSV, or read them directly from the public PostgREST endpoint, so every published number can be recomputed.",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Every table a performance page reads, with the page it recomputes. The CSV
// routes stream the same tables through the same read-only client.
const EXPORTS: { sport: string; items: { href: string; table: string; schema: string; recomputes: string }[] }[] = [
  {
    sport: "MLB",
    items: [
      {
        href: "/mlb/api/export/ledger.csv",
        table: "bet_ledger_v",
        schema: "mlb",
        recomputes:
          "Prediction results: ROI, P&L, records by market and by model version. One row per graded prediction at quarter-Kelly stake and the best pregame price published; the view applies the 4.5 percent (6.5 percent on totals) edge gate to every past prediction.",
      },
      {
        href: "/mlb/api/export/predictions.csv",
        table: "model_outputs_season_unified",
        schema: "mlb",
        recomputes:
          "Forecast accuracy: Brier, log loss, winner rate and runs MAE from both team rows of every game with a stored forecast, with prediction_updated_at against start_time so the freeze can be checked.",
      },
    ],
  },
  {
    sport: "College football",
    items: [
      {
        href: "/cfb/api/export/graded-games.csv",
        table: "graded_games",
        schema: "cfb",
        recomputes: "Live forecast accuracy: the published and pure margins, the closing line with its source (captured before kickoff, or the CFBD median recorded after the game) and the final score of every graded game.",
      },
      {
        href: "/cfb/api/export/backtest.csv",
        table: "backtest_predictions",
        schema: "cfb",
        recomputes: "The historical walk-forward table of the model core, with its model_version and classification on every row.",
      },
      {
        href: "/cfb/api/export/recommendations.csv",
        table: "recommendations",
        schema: "cfb",
        recomputes: "Prediction results: every recorded market decision with its policy version, price, book, outcome, profit and closing line.",
      },
    ],
  },
  {
    sport: "NFL",
    items: [
      {
        href: "/nfl/api/export/graded-games.csv",
        table: "graded_games",
        schema: "nfl",
        recomputes: "Live forecast accuracy: the published and pure margins, the closing line with its source (captured before kickoff, or the nflverse value recorded after the game) and the final score of every graded game.",
      },
      {
        href: "/nfl/api/export/backtest.csv",
        table: "backtest_predictions",
        schema: "nfl",
        recomputes: "The historical walk-forward table, pure and half-closing-line blend per game.",
      },
      {
        href: "/nfl/api/export/recommendations.csv",
        table: "recommendations",
        schema: "nfl",
        recomputes: "Prediction results: every recorded market decision with its policy version, price, book, outcome and profit.",
      },
    ],
  },
];

// Precomputed tables and functions the pages also read; they are public but
// cannot be rebuilt from the exports above, so they are listed for reference.
const ALSO_PUBLIC = [
  { schema: "mlb", name: "closing_lines", kind: "table", note: "one closing quote per game, captured before first pitch, written once and frozen; same shape in cfb, nfl and nhl" },
  { schema: "cfb", name: "closing_lines", kind: "table", note: "the kickoff capture's provider median per game, frozen once written" },
  { schema: "nfl", name: "closing_lines", kind: "table", note: "the live worker's pre-kickoff close per game, frozen once written" },
  { schema: "nhl", name: "closing_lines", kind: "table", note: "the last partner-book quote before puck drop per game, frozen once written" },
  { schema: "cfb", name: "performance_metrics", kind: "table", note: "live accuracy by prediction source and segment, computed by the model repo" },
  { schema: "nfl", name: "performance_metrics", kind: "table", note: "same contract as cfb.performance_metrics" },
  { schema: "nfl", name: "live_predictions", kind: "view", note: "the frozen forecast snapshot paired with each result" },
  { schema: "mlb", name: "model_evaluation", kind: "table", note: "the nightly evaluation rows the MLB accuracy tab shows" },
  { schema: "mlb", name: "model_calibration", kind: "table", note: "calibration bins with their row counts" },
  { schema: "mlb", name: "player_value_evaluation", kind: "view", note: "the grade's head-to-head with ZiPS, THE BAT X and Steamer" },
  { schema: "nfl", name: "position_grade_evaluation", kind: "table", note: "the NFL grade and QB rating comparisons" },
  { schema: "cfb", name: "player_grade_validation", kind: "table", note: "the CFB grade comparisons" },
  { schema: "mlb", name: "bet_record_summary", kind: "function", note: "W-L-P by market with optional date and team filters" },
  { schema: "cfb", name: "recommendation_summary", kind: "function", note: "the prediction-results segments" },
  { schema: "nfl", name: "recommendation_dashboard", kind: "function", note: "the prediction-results segments and seasons" },
  { schema: "nfl", name: "forecast_accuracy", kind: "function", note: "live or backtest MAE by season (p_source)" },
];

const code = "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]";

export default function DataPage() {
  return (
    <PageShell width="reading">
      <PageHeader>
        <div>
          <PageTitle>Data and Exports</PageTitle>
          <PageDescription>Everything a performance page shows can be recomputed from these files.</PageDescription>
        </div>
      </PageHeader>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Each performance page is a formatted view of a public table. The downloads below are
        those tables, streamed row by row through the same read-only connection the pages use,
        refreshed within an hour of a publish. Nothing is aggregated on the way out, so a reader
        can rebuild every headline and check every freeze timestamp without trusting the page.
      </p>

      {EXPORTS.map((group) => (
        <section key={group.sport} className="space-y-3">
          <h2 className="type-section">{group.sport}</h2>
          <ul className="divide-y divide-border border-y border-border">
            {group.items.map((item) => (
              <li key={item.href} className="space-y-1 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <a href={item.href} className="type-label font-semibold underline underline-offset-4">
                    {item.href.split("/").pop()}
                  </a>
                  <span className="type-meta text-muted-foreground">
                    <code className={code}>{item.schema}.{item.table}</code>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.recomputes}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="type-section">Reading the tables directly</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The same tables answer PostgREST requests with the public read-only key the site itself
          ships. Each sport is its own schema, selected with the <code className={code}>Accept-Profile</code>{" "}
          header on reads and <code className={code}>Content-Profile</code> on function calls. Responses
          are capped at 1,000 rows, so page with <code className={code}>Range</code> or{" "}
          <code className={code}>limit</code> and <code className={code}>offset</code>.
        </p>
        <pre className="overflow-x-auto rounded-sm border border-border bg-muted/40 p-3 text-xs leading-relaxed">
{`curl "${SUPABASE_URL}/rest/v1/bet_ledger_v?select=*&order=date,game_pk&limit=1000" \\
  -H "apikey: ${ANON_KEY}" \\
  -H "Authorization: Bearer ${ANON_KEY}" \\
  -H "Accept-Profile: mlb"

curl -X POST "${SUPABASE_URL}/rest/v1/rpc/forecast_accuracy" \\
  -H "apikey: ${ANON_KEY}" \\
  -H "Authorization: Bearer ${ANON_KEY}" \\
  -H "Content-Profile: nfl" -H "Content-Type: application/json" \\
  -d '{"p_source":"live"}'`}
        </pre>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {ALSO_PUBLIC.map((item) => (
            <li key={`${item.schema}.${item.name}`}>
              <code className={code}>{item.schema}.{item.name}</code>{" "}
              <span className="type-meta">({item.kind})</span>: {item.note}
            </li>
          ))}
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Row-level security limits this key to reading. The evaluation code that produces the
          precomputed tables lives in each model repository; the exports are what it was run on.
        </p>
      </section>
    </PageShell>
  );
}
