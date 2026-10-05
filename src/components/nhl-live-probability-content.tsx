"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import {
  nhlLiveProbabilityClock,
  nhlLiveProbabilitySettled,
  nhlLiveProbabilityStale,
  parseNhlLiveProbability,
  type NhlLiveProbability,
} from "@/lib/nhl-live-probability";
import { formatFairOdds, formatPct } from "@/lib/utils";

const PERIODS = [0, 1200, 2400, 3600];

function periodLabel(elapsed: number) {
  return elapsed >= 3600 ? "End" : `P${Math.floor(elapsed / 1200) + 1}`;
}

export default function NhlLiveProbabilityContent({ gameId, away, home }: {
  gameId: string; away: string; home: string;
}) {
  const [data, setData] = useState<NhlLiveProbability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const theme = useChartTheme();

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    async function refresh() {
      clearTimeout(timer);
      if (cancelled || settled || document.visibilityState !== "visible") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch(`/nhl/api/live-probability/${gameId}`, {
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
        });
        if (!response.ok) throw new Error(response.status === 404
          ? "Win probability is not available for this game yet."
          : "Could not refresh win probability. Retrying shortly.");
        const snapshot = parseNhlLiveProbability(await response.json(), gameId);
        if (!snapshot) throw new Error("The latest game state is unavailable. Retrying shortly.");
        if (!cancelled && !request.signal.aborted) {
          setData(snapshot);
          setError(null);
          setNow(Date.now());
          settled = nhlLiveProbabilitySettled(snapshot);
        }
      } catch (cause) {
        if (!cancelled && !request.signal.aborted) setError(cause instanceof Error ? cause.message : "Refresh failed.");
      } finally {
        if (!cancelled && !settled && !request.signal.aborted) timer = setTimeout(refresh, 30_000);
      }
    }
    function visibility() {
      clearTimeout(timer);
      if (document.visibilityState === "visible") void refresh();
      else controller?.abort();
    }
    void refresh();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [gameId]);

  const stale = data ? nhlLiveProbabilityStale(data, now) : false;
  const available = data?.home_win_probability != null;
  const started = data?.abstract_state === "Live" || data?.abstract_state === "Final";
  const status = !data ? "Loading win probability..."
    : data.unavailable_reason ?? (data.abstract_state === "Final" ? "Final"
      : data.abstract_state === "Pre" ? "Pregame"
      : nhlLiveProbabilityClock(data));
  return (
    <div className="mt-5 space-y-4">
      <div role="status" className="text-xs text-muted-foreground">
        {error ?? (stale ? "Update delayed. Showing the last available game state." : status)}
      </div>
      {data && available && <>
        <div className="flex items-end justify-between gap-4 border-y border-rule-strong py-3">
          {[{ team: away, score: data.away_score, probability: data.away_win_probability },
            { team: home, score: data.home_score, probability: data.home_win_probability }].map((side, i) => (
            <div key={i} className={i ? "text-right" : ""}>
              <div className="text-sm">{side.team}{started && <strong className="ml-2 tabular-nums">{side.score}</strong>}</div>
              <div className="mt-1 text-3xl tabular-nums">{formatPct(side.probability)}</div>
              {data.abstract_state !== "Final" && <div className="mt-1 text-sm tabular-nums">
                <span className="mr-1.5 text-xs text-muted-foreground">Fair odds</span>
                <span className="font-medium">{formatFairOdds(side.probability)}</span>
              </div>}
            </div>
          ))}
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{home} win probability</div>
          <div className="h-56 w-full min-w-0" role="img" aria-label={`${home} win probability chart, ${formatPct(data.home_win_probability)} at the latest state`}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 224 }}>
              <LineChart data={data.history} margin={{ top: 8, right: 10, bottom: 0, left: -10 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="s" type="number" domain={[0, 3600]} ticks={PERIODS} tickFormatter={periodLabel} {...chartAxisProps(theme)} />
                <YAxis domain={[0, 1]} ticks={[0, .5, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} {...chartAxisProps(theme)} width={45} />
                <ReferenceLine y={.5} stroke={theme["muted-foreground"]} strokeDasharray="3 3" />
                <Tooltip contentStyle={chartTooltipStyle(theme)}
                  formatter={(v) => [formatPct(Number(v)), `${home} win probability`]}
                  labelFormatter={(_, values) => {
                    const point = values[0]?.payload;
                    return point ? `${away} ${point.a}, ${home} ${point.h}` : "";
                  }} />
                <Line type="linear" dataKey="p" stroke={theme["chart-1"]} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.abstract_state === "Final" ? "Final result" : `Latest update: ${new Date(data.fetched_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`}
          {data.abstract_state === "Live" && !stale && !error && " · Refreshes while open"}
        </p>
      </>}
      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        Based on the score, time remaining, power plays, and empty nets, anchored on the published pregame
        expected goals for this game. Overtime and the shootout are an even split. Pregame picks stay fixed;
        live probabilities do not include live betting odds, goalies, or injuries.{" "}
        Fair odds are derived from these probabilities without bookmaker margin.
      </p>
    </div>
  );
}
