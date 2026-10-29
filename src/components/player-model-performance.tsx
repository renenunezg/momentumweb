import type { ReactNode } from "react";
import { MLB_PLAYER_EVALUATION } from "@/lib/mlb-player-evaluation";
import { supabase, supabaseCfb, supabaseNfl } from "@/lib/supabase";
import { traitLabel } from "@/lib/position-traits";
import { formatNumber } from "@/lib/utils";
import {
  FORWARD_SYSTEM_LABELS,
  NFL_BASELINE_LABELS,
  NFL_HOLDOUT_LABELS,
  describeGap,
  fetchCfbGradeValidation,
  fetchMlbForwardEvaluation,
  fetchNflGradeEvaluation,
  type ForwardBlock,
  type ForwardComparison,
  type ForwardSnapshotSystem,
  type ForwardSystem,
  type NflGradeEvaluationRow,
} from "@/lib/grade-evaluation";
import { LastUpdated } from "@/components/last-updated";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function record(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const POSITION_ORDER = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "P", "K"];
const positionRank = (group: string) => {
  const i = POSITION_ORDER.indexOf(group);
  return i === -1 ? POSITION_ORDER.length : i;
};

function CorrelationBar({
  label,
  value,
  baseline = false,
}: {
  label: string;
  value: number;
  baseline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{formatNumber(value, 2)}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-sm bg-grid">
        <span
          className={`absolute h-full ${baseline ? "bg-muted-foreground/60" : "bg-primary"}`}
          style={{
            left: `${Math.min(50, (value + 1) * 50)}%`,
            width: `${Math.min(1, Math.abs(value)) * 50}%`,
          }}
        />
        <span className="absolute left-1/2 h-full border-l border-foreground/30" />
      </div>
    </div>
  );
}

function Unavailable({ failed }: { failed: boolean }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {failed
        ? "Player-model results are temporarily unavailable."
        : "Player-model evaluation results have not been published yet."}
    </p>
  );
}

const numCell = "text-right font-mono tabular-nums whitespace-nowrap";

function Gap({ diff, lo, hi }: { diff: number; lo: number | null; hi: number | null }) {
  const { text, verdict } = describeGap(diff, lo, hi);
  return (
    <span className={verdict === "clear of zero" ? "font-medium" : undefined}>
      {text}
      {verdict && <span className="ml-1 text-xs font-normal text-muted-foreground">{verdict}</span>}
    </span>
  );
}

function EvalTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: { label: string; numeric?: boolean }[];
  rows: ReactNode[][];
}) {
  return (
    <Table>
      <TableCaption className="text-left">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.label} className={c.numeric ? "text-right" : undefined}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((cells, i) => (
          <TableRow key={i}>
            {cells.map((cell, j) => (
              <TableCell key={j} className={columns[j]?.numeric ? numCell : "align-top"}>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// MLB: the served model's development pairs (frozen in the repo) and the
// forward head-to-head with the public projection systems (published on the
// model row by mlbmodel's v2.players.forward).

const SYSTEMS: ForwardSystem[] = ["zips", "the_bat", "steamer"];
const SNAPSHOTS: ForwardSnapshotSystem[] = ["zips_ros", "the_bat_ros"];

function forwardRows(
  block: ForwardBlock | undefined,
  window: "preseason" | "in_season",
  label: string,
  pitchers = false,
): ReactNode[][] {
  if (!block) return [];
  return SYSTEMS.flatMap((system) => {
    const c: ForwardComparison | undefined = block[window][system];
    if (!c) return [];
    return [[
      label,
      // THE BAT X is the hitter system; its pitcher projections are THE BAT.
      pitchers && system === "the_bat" ? "THE BAT" : FORWARD_SYSTEM_LABELS[system],
      window === "preseason" ? `Preseason, ${c.checkpoints} springs` : `In season, ${c.checkpoints} month starts`,
      formatNumber(c.rho_grade, 2),
      formatNumber(c.rho_system, 2),
      <Gap key="gap" diff={c.diff} lo={c.ci95[0]} hi={c.ci95[1]} />,
      `${c.wins} of ${c.checkpoints}`,
    ]];
  });
}

async function MlbForward({ modelVersion }: { modelVersion: string }) {
  const forward = await fetchMlbForwardEvaluation(modelVersion);
  if (!forward) {
    return (
      <p className="text-sm text-muted-foreground">
        The comparison with the public projection systems has not been published for this model version yet.
      </p>
    );
  }
  const hitters = forward.pools.hitter;
  const full = hitters.full_grade_vs_war_rate_position_neutral;
  const batting = hitters.batting_grade_vs_woba;
  const columns = [
    { label: "Grade" },
    { label: "System" },
    { label: "Window" },
    { label: "Grade rho", numeric: true },
    { label: "System rho", numeric: true },
    { label: "Gap (95% CI)", numeric: true },
    { label: "Won", numeric: true },
  ];
  const snapshotRows: ReactNode[][] = SNAPSHOTS.flatMap((system) => {
    const c = full?.rest_of_season_snapshots?.[system];
    if (!c) return [];
    return [[
      "Full grade, bat, glove and legs",
      FORWARD_SYSTEM_LABELS[system],
      `${c.checkpoints} dated snapshots`,
      formatNumber(c.rho_grade, 2),
      formatNumber(c.rho_system, 2),
      <Gap key="gap" diff={c.diff} lo={c.ci95[0]} hi={c.ci95[1]} />,
      `${c.wins} of ${c.checkpoints}`,
    ]];
  });
  const pitcherRows: ReactNode[][] = (["SP", "RP"] as const).flatMap((pool) =>
    forwardRows(forward.pools[pool].grade_vs_fip, "preseason", pool === "SP" ? "Starters vs projected FIP" : "Relievers vs projected FIP", true),
  );
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-lg">Against the public projection systems</h3>
        <p className="text-sm text-muted-foreground">
          The grade is rebuilt at each checkpoint of {forward.seasons.join(", ")}{" "}from only what was knowable that
          morning and scored, on the players common to every system, against rest-of-season production per 600 PA or
          per 180 and 65 IP. Rho is Spearman rank correlation; the gap is grade minus system with a 95 percent paired
          bootstrap interval over players. The bat, glove and legs rows remove the positional adjustment from the
          systems&apos; WAR rate, since the target is runs above the average player at the same position.
        </p>
      </div>
      <EvalTable
        caption="Hitters: the full grade on bat, glove and legs against the systems' WAR rate; hitting alone against their projected wOBA (that row uses a batting-only refit of the grade, not the published number)."
        columns={columns}
        rows={[
          ...forwardRows(full, "preseason", "Full grade, bat, glove and legs"),
          ...forwardRows(full, "in_season", "Full grade, bat, glove and legs"),
          ...forwardRows(batting, "preseason", "Batting-only refit, hitting"),
          ...forwardRows(batting, "in_season", "Batting-only refit, hitting"),
          ...snapshotRows,
        ]}
      />
      <EvalTable
        caption="Pitchers, preseason, against the systems' projected FIP (ERA and WAR per inning are in the published payload). ZiPS has no cached 2024 pitcher set."
        columns={columns}
        rows={pitcherRows}
      />
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">Where this comparison is not level</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {forward.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      </details>
      <LastUpdated timestamp={forward.computed_at} schedule="Rebuilt each offseason and after model changes" />
    </div>
  );
}

async function MlbResults() {
  const current = await supabase
    .from("player_values")
    .select("model_version")
    .limit(1)
    .maybeSingle();
  if (current.error || !current.data)
    return <Unavailable failed={!!current.error} />;
  const report = MLB_PLAYER_EVALUATION;
  if (current.data.model_version !== report.modelVersion)
    return <Unavailable failed={false} />;
  const first = report.devSeasons[0];
  const last = report.devSeasons[report.devSeasons.length - 1];
  const previous = report.previous;
  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-lg">Predicting next-season production</h3>
          <p className="text-sm text-muted-foreground">
            Development pairs {first} to {first + 1} through {last - 1} to {last}, each held out in
            turn: the grade fitted on the other pairs ranks the held-out season. Rank correlation
            with next-season runs above average per 600 PA, 180 IP or 65 IP; higher is better, and
            each baseline uses the same players within its group.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {report.groups.map((result) => (
            <article key={result.key} className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-semibold">{result.label}</h4>
                <p className="text-xs text-muted-foreground">
                  about {result.n} players per pair, {report.pairs} pairs
                </p>
              </div>
              <CorrelationBar label="Player grade" value={result.grade} />
              <CorrelationBar label="Shrunk outcome record" value={result.shrunkOnly} baseline />
              <CorrelationBar label="Prior production" value={result.priorProduction} baseline />
              <CorrelationBar label="Marcel projection" value={result.marcel} baseline />
            </article>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Hyperparameters were chosen on these same pairs, so this is a development result, not a
          holdout. The {report.holdoutPair[0]} to {report.holdoutPair[1]} pair is the first the
          design never saw and will be reported untouched when it arrives. The previous version
          ({previous.modelVersion}), scored once on the {previous.inputSeason} to {previous.outcomeSeason} pair
          it never saw, reached {formatNumber(previous.groups[0].grade, 2)} for batters against{" "}
          {formatNumber(previous.groups[0].priorXwoba, 2)} for prior-season xwOBA (within sampling noise),{" "}
          {formatNumber(previous.groups[1].grade, 2)} for starters and {formatNumber(previous.groups[2].grade, 2)} for relievers.
        </p>
        <p className="text-xs text-muted-foreground">
          Correlation runs from -1 to +1, with zero at the center. This evaluates production rankings
          among players who returned with 100 plate appearances or batters faced; it does not validate
          trade prices or WAR accuracy.
        </p>
        <LastUpdated
          timestamp={report.fittedAt}
          schedule={`Evaluation snapshot · ${report.modelVersion}`}
        />
      </div>
      <MlbForward modelVersion={report.modelVersion} />
    </div>
  );
}

// CFB: the served grade's validation rows and the value model's reliabilities.

async function CfbResults() {
  const [meta, validation] = await Promise.all([
    supabaseCfb
      .from("player_model_meta")
      .select("season, as_of, value_model_version, reliability")
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchCfbGradeValidation().catch(() => null),
  ]);
  if (meta.error || !meta.data) return <Unavailable failed={!!meta.error} />;
  const data = meta.data;
  let results: unknown;
  try {
    results = JSON.parse(data.reliability);
  } catch {
    return <Unavailable failed />;
  }
  if (!Array.isArray(results)) return <Unavailable failed />;
  const rows = results
    .map(record)
    .filter(
      (row) =>
        typeof row.position_group === "string" &&
        number(row.split_half_correlation) != null &&
        number(row.players) != null,
    );
  if (rows.length === 0) return <Unavailable failed={false} />;

  const validationRows = (validation ?? []).slice().sort((a, b) => positionRank(a.position_group) - positionRank(b.position_group));
  const kinds = [
    { kind: "rest_of_season", title: "Within the season", detail: "Grade at weeks 5 to 9 against the player's rest-of-season opponent-adjusted EPA credit per game, averaged over the five weeks." },
    { kind: "next_season", title: "Next season", detail: "Final-week grade against the player's EPA credit per game at the end of the following season, among players graded at the same position in both." },
  ];
  const first = validationRows[0];
  const columns = [
    { label: "Position" },
    { label: "Players", numeric: true },
    { label: "Grade rho", numeric: true },
    { label: "EPA credit rho", numeric: true },
    { label: "Games rho", numeric: true },
    { label: "Value above repl. rho", numeric: true },
    { label: "Grade minus EPA (95% CI)", numeric: true },
  ];
  return (
    <div className="space-y-8">
      {first && (
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-lg">How the grade ranks later production</h3>
            <p className="text-sm text-muted-foreground">
              Served grade model {first.grade_model_version} (weights {first.model_sha.slice(0, 8)}) on{" "}
              {first.input_value_model_version}&nbsp;credit. Rho is Spearman rank correlation on the same players; the
              gap is grade minus EPA credit with a 95 percent paired bootstrap interval. Baselines: the player&apos;s
              EPA credit to date, games played, and value above replacement. Holdout status: {first.holdout_status}.
            </p>
          </div>
          {kinds.map(({ kind, title, detail }) => {
            const subset = validationRows.filter((row) => row.eval_kind === kind);
            if (subset.length === 0) return null;
            return (
              <EvalTable
                key={kind}
                caption={`${title}, ${subset[0].seasons}. ${detail}`}
                columns={columns}
                rows={subset.map((row) => [
                  row.position_group,
                  formatNumber(row.players, 0),
                  formatNumber(row.spearman_grade, 2),
                  formatNumber(row.spearman_epa_credit, 2),
                  formatNumber(row.spearman_games, 2),
                  formatNumber(row.spearman_value_above_replacement, 2),
                  <Gap key="gap" diff={row.diff_grade_minus_epa} lo={row.diff_lo_95} hi={row.diff_hi_95} />,
                ])}
              />
            );
          })}
          <p className="text-xs text-muted-foreground">
            Offensive grades are built mostly on EPA credit, so they rank players much as the credit does; the
            defensive grades rest on tagged disruption plays and box-score counts. A first untouched test of this
            model, the 2026 rest-of-season endpoint, is pre-registered and will be published here whatever it says.
          </p>
          <LastUpdated timestamp={first.computed_at} schedule="Published with each evaluation run" />
        </div>
      )}
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-lg">How consistently player value repeats</h3>
          <p className="text-sm text-muted-foreground">
            Odd-game against even-game correlation of opponent-adjusted EPA credit per
            game for the {data.season} player-value model ({data.value_model_version}).
            These are the value model&apos;s reliabilities, not the grade&apos;s, and they
            measure repeatability of credited production, not next-season forecast accuracy.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <article
              key={String(row.position_group)}
              className="space-y-3 rounded-lg border p-4"
            >
              <CorrelationBar
                label={String(row.position_group)}
                value={number(row.split_half_correlation)!}
              />
              <p className="text-xs text-muted-foreground">
                {number(row.players)} players
              </p>
            </article>
          ))}
        </div>
        {!first && (
          <p className="text-sm text-muted-foreground">
            Grade validation results have not been published to this page&apos;s data source yet.
          </p>
        )}
        <LastUpdated timestamp={data.as_of} schedule={data.value_model_version} />
      </div>
    </div>
  );
}

// NFL: the published grade evaluation rows and the traits' reliabilities.

function ratingPivot(rows: NflGradeEvaluationRow[]): ReactNode[][] {
  const baselines = [...new Set(rows.map((row) => row.baseline))];
  return baselines.map((baseline) => {
    const dev = rows.find((row) => row.baseline === baseline && row.sample_set === "development_cv");
    const val = rows.find((row) => row.baseline === baseline && row.sample_set === "validation");
    const cell = (row: NflGradeEvaluationRow | undefined) =>
      row ? [
        formatNumber(row.grade_spearman, 2),
        formatNumber(row.baseline_spearman, 2),
        <Gap key="gap" diff={row.difference} lo={row.difference_ci_low} hi={row.difference_ci_high} />,
      ] : ["–", "–", "–"];
    return [NFL_BASELINE_LABELS[baseline] ?? baseline, ...cell(dev), ...cell(val)];
  });
}

function NflEvaluation({ rows }: { rows: NflGradeEvaluationRow[] }) {
  const grade = rows
    .filter((row) => row.evaluation === "next_season")
    .sort((a, b) => positionRank(a.position_group) - positionRank(b.position_group) || a.baseline.localeCompare(b.baseline));
  const qb = rows.filter((row) => row.evaluation === "rest_of_season" && row.position_group === "QB");
  const rb = rows.filter((row) => row.evaluation === "rest_of_season" && row.position_group === "RB");
  if (grade.length === 0 && qb.length === 0) return null;
  const gradeColumns = [
    { label: "Position" },
    { label: "Sample", numeric: true },
    { label: "Grade rho", numeric: true },
    { label: "Baseline" },
    { label: "Baseline rho", numeric: true },
    { label: "Gap (95% CI)", numeric: true },
  ];
  const gradeRow = (row: NflGradeEvaluationRow) => [
    row.position_group,
    `${row.players ?? row.player_seasons}${row.thin_sample ? ", small" : ""}`,
    formatNumber(row.grade_spearman, 2),
    NFL_BASELINE_LABELS[row.baseline] ?? row.baseline,
    formatNumber(row.baseline_spearman, 2),
    <Gap key="gap" diff={row.difference} lo={row.difference_ci_low} hi={row.difference_ci_high} />,
  ];
  const validation = grade.filter((row) => row.sample_set === "validation");
  const development = grade.filter((row) => row.sample_set === "development_cv");
  const ratingColumns = [
    { label: "Baseline" },
    { label: "Dev rating rho", numeric: true },
    { label: "Dev baseline rho", numeric: true },
    { label: "Dev gap (95% CI)", numeric: true },
    { label: "2025 rating rho", numeric: true },
    { label: "2025 baseline rho", numeric: true },
    { label: "2025 gap (95% CI)", numeric: true },
  ];
  const statuses = [...new Set(rows.map((row) => row.holdout_status))].filter((s) => s !== "development");
  const qbDev = qb.find((row) => row.sample_set === "development_cv");
  const qbVal = qb.find((row) => row.sample_set === "validation");
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-lg">How the grades rank later production</h3>
        <p className="text-sm text-muted-foreground">
          Rho is Spearman rank correlation on the same players; the gap is grade minus baseline with a 95 percent
          player-level bootstrap interval. Next-season rows score the final-week grade against per-game EPA credit the
          following season among players who qualified at the same position in both. Rating rows score the QB and RB
          ratings at each week against the rest of that season, averaged over weeks.
        </p>
      </div>
      {validation.length > 0 && (
        <EvalTable
          caption={`Trait grades, next season, ${validation[0].seasons} pair: ${NFL_HOLDOUT_LABELS[validation[0].holdout_status] ?? validation[0].holdout_status}.`}
          columns={gradeColumns}
          rows={validation.map(gradeRow)}
        />
      )}
      {development.length > 0 && (
        <EvalTable
          caption={`Trait grades, next season, development pairs ${development[0].seasons}, cross-validated; sample counts player-seasons.`}
          columns={gradeColumns}
          rows={development.map(gradeRow)}
        />
      )}
      {qb.length > 0 && (
        <EvalTable
          caption={`QB rating, rest-of-season EPA per dropback: development ${qbDev?.seasons ?? ""} (${qbDev?.player_seasons ?? ""} passer-seasons, leave-one-season-out) and ${qbVal?.validation_season ?? ""} (${qbVal?.players ?? ""} passers, ${NFL_HOLDOUT_LABELS[qbVal?.holdout_status ?? ""] ?? ""}). The rating carries the prior season; the "+ last season" rows give the baseline the same information.`}
          columns={ratingColumns}
          rows={ratingPivot(qb)}
        />
      )}
      {rb.length > 0 && (
        <EvalTable
          caption="RB rating, rest-of-season EPA per game, same layout. No RB gap is distinguishable from noise."
          columns={ratingColumns}
          rows={ratingPivot(rb)}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Defensive EPA credit counts only tagged disruption plays, so the defensive grades forecast repeatable
        involvement rather than coverage quality, and much of their edge comes from smoothing counting stats.
        {statuses.length > 0 && ` Validation seasons: ${statuses.map((s) => NFL_HOLDOUT_LABELS[s] ?? s).join("; ")}.`}
      </p>
      <LastUpdated timestamp={rows[0].computed_at} schedule="Published with each evaluation run" />
    </div>
  );
}

async function NflResults() {
  const [latest, evaluation] = await Promise.all([
    supabaseNfl
      .from("position_traits")
      .select("season, week, as_of, model_version")
      .eq("trait", "grade")
      .order("season", { ascending: false })
      .order("week", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchNflGradeEvaluation().catch(() => null),
  ]);
  if (latest.error || !latest.data)
    return <Unavailable failed={!!latest.error} />;
  const publication = latest.data;
  const measures = new Map<
    string,
    { position: string; trait: string; reliability: number; modelVersion: string }
  >();
  // Reliability is model-level metadata repeated on player rows. Deduplicate
  // it without treating today's roster size as the evaluation sample size.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseNfl
      .from("position_traits")
      .select("position_group, trait, reliability, athlete_id, model_version")
      .eq("season", publication.season)
      .eq("week", publication.week)
      .eq("in_grade", true)
      .not("reliability", "is", null)
      .order("athlete_id")
      .order("trait")
      .range(from, from + 999);
    if (error) return <Unavailable failed />;
    for (const row of data ?? []) {
      const reliability = number(row.reliability);
      if (reliability == null) continue;
      const key = `${row.position_group}:${row.trait}`;
      const previous = measures.get(key);
      if (previous && (previous.reliability !== reliability || previous.modelVersion !== row.model_version))
        return <Unavailable failed />;
      measures.set(key, {
        position: row.position_group,
        trait: row.trait,
        reliability,
        modelVersion: row.model_version,
      });
    }
    if ((data?.length ?? 0) < 1000) break;
  }
  if (measures.size === 0) return <Unavailable failed={false} />;
  const positions = [
    ...new Set([...measures.values()].map((row) => row.position)),
  ].sort((a, b) => positionRank(a) - positionRank(b));
  return (
    <div className="space-y-8">
      {evaluation && evaluation.length > 0 && <NflEvaluation rows={evaluation} />}
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-lg">How consistently graded traits repeat</h3>
          <p className="text-sm text-muted-foreground">
            Correlation between odd-game and even-game measurements for traits
            used in the grade. Strong repeatability can reflect a stable role as
            well as skill.
          </p>
        </div>
        <div className="grid items-start gap-4 md:grid-cols-2">
          {positions.map((position) => (
            <article key={position} className="space-y-4 rounded-lg border p-4">
              <h4 className="font-semibold">{position}</h4>
              {[...measures.values()]
                .filter((row) => row.position === position)
                .sort((a, b) => b.reliability - a.reliability)
                .map((row) => (
                  <CorrelationBar
                    key={row.trait}
                    label={traitLabel(row.trait, "nfl").label}
                    value={row.reliability}
                  />
                ))}
            </article>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {evaluation && evaluation.length > 0
            ? "Reliability is repeatability, not forecast accuracy; the tables above carry the forecast results. Neither validates WAR."
            : "The evaluation sample size, test seasons, and grade holdout scores are not published in this feed. These diagnostics do not establish forecast accuracy or validate WAR."}
        </p>
        <LastUpdated
          timestamp={publication.as_of}
          schedule={`${publication.season} · Week ${publication.week} · ${[...new Set([...measures.values()].map((row) => row.modelVersion))].join(" · ")}`}
        />
      </div>
    </div>
  );
}

export async function PlayerModelPerformance({
  sport,
}: {
  sport: "mlb" | "nfl" | "cfb";
}) {
  return (
    <section aria-label="Player model performance" className="space-y-5">
      <h2 className="type-section">
        Player model performance
      </h2>
      {sport === "mlb" ? (
        <MlbResults />
      ) : sport === "cfb" ? (
        <CfbResults />
      ) : (
        <NflResults />
      )}
    </section>
  );
}
