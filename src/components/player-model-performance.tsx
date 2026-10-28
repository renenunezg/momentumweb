import { MLB_PLAYER_EVALUATION } from "@/lib/mlb-player-evaluation";
import { supabase, supabaseCfb, supabaseNfl } from "@/lib/supabase";
import { traitLabel } from "@/lib/position-traits";
import { formatNumber } from "@/lib/utils";
import { LastUpdated } from "@/components/last-updated";

function record(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

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
        trade prices or WAR accuracy, and it is not a comparison with the public projection systems.
      </p>
      <LastUpdated
        timestamp={report.fittedAt}
        schedule={`Evaluation snapshot · ${report.modelVersion}`}
      />
    </div>
  );
}

async function CfbResults() {
  const { data, error } = await supabaseCfb
    .from("player_model_meta")
    .select("season, as_of, value_model_version, reliability")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return <Unavailable failed={!!error} />;
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
  return (
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
      <p className="text-sm text-muted-foreground">
        Grade holdout results and WAR validation are not yet published to this
        page&apos;s data source.
      </p>
      <LastUpdated timestamp={data.as_of} schedule={data.value_model_version} />
    </div>
  );
}

async function NflResults() {
  const latest = await supabaseNfl
    .from("position_traits")
    .select("season, week, as_of, model_version")
    .eq("trait", "grade")
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
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
  ];
  return (
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
        The evaluation sample size, test seasons, and grade holdout scores are
        not published in this feed. These diagnostics do not establish forecast
        accuracy or validate WAR.
      </p>
      <LastUpdated
        timestamp={publication.as_of}
        schedule={`${publication.season} · Week ${publication.week} · ${[...new Set([...measures.values()].map((row) => row.modelVersion))].join(" · ")}`}
      />
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
      <h2 className="font-heading text-xl text-primary">
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
