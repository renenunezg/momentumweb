"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartAxisProps, chartTooltipStyle, useChartTheme } from "@/lib/chart-theme";
import { liveProbabilityStale, parseLiveProbability, type LiveProbability } from "@/lib/mlb-live-probability";
import { formatFairOdds, formatPct } from "@/lib/utils";

export default function LiveProbabilityContent({ gamePk, away, home }: { gamePk: number; away: string; home: string }) {
  const [data, setData] = useState<LiveProbability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const theme = useChartTheme();

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    async function refresh() {
      clearTimeout(timer);
      if (cancelled || finished || document.visibilityState !== "visible") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setNow(Date.now());
      try {
        const response = await fetch(`/mlb/api/live-probability/${gamePk}`, {
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
        });
        if (!response.ok) throw new Error(response.status === 404
          ? "Win probability is not available for this game yet."
          : "Could not refresh win probability. Retrying shortly.");
        const snapshot = parseLiveProbability(await response.json(), gamePk);
        if (!snapshot) throw new Error("The latest game state is unavailable. Retrying shortly.");
        if (!cancelled && !request.signal.aborted) {
          setData(snapshot);
          setError(null);
          setNow(Date.now());
          finished = snapshot.abstract_state === "Final" && snapshot.home_win_probability !== null;
        }
      } catch (cause) {
        if (!cancelled && !request.signal.aborted) setError(cause instanceof Error ? cause.message : "Refresh failed.");
      } finally {
        if (!cancelled && !finished && !request.signal.aborted) timer = setTimeout(refresh, 30_000);
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
  }, [gamePk]);

  const stale = data ? liveProbabilityStale(data, now) : false;
  const state = data?.state;
  const available = data?.home_win_probability != null;
  const points = data ? [...data.history, ...(available && data.abstract_state === "Live" ? [{
    id: "now", label: "Now", description: "Current game state", home_score: data.home_score,
    away_score: data.away_score, home_win_probability: data.home_win_probability,
  }] : [])] : [];
  return (
    <div className="mt-5 space-y-4">
      <div role="status" className="text-xs text-muted-foreground">
        {error ?? (stale ? "Update delayed. Showing the last available game state." :
          data ? data.unavailable_reason ?? data.status : "Loading win probability...")}
      </div>
      {data && available && <>
        <div className="flex items-end justify-between gap-4 border-y border-rule-strong py-3">
          {[{ team: away, score: data.away_score, probability: data.away_win_probability },
            { team: home, score: data.home_score, probability: data.home_win_probability }].map((side, i) => (
            <div key={side.team} className={i ? "text-right" : ""}>
              <div className="text-sm">{side.team} <strong className="ml-2 tabular-nums">{side.score}</strong></div>
              <div className="mt-1 text-3xl tabular-nums">{formatPct(side.probability)}</div>
              {data.abstract_state !== "Final" && <div className="mt-1 text-sm tabular-nums">
                <span className="mr-1.5 text-xs text-muted-foreground">Fair odds</span>
                <span className="font-medium">{formatFairOdds(side.probability)}</span>
              </div>}
            </div>
          ))}
        </div>
        {state && <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{state.top ? "Top" : "Bottom"} {state.inning} &middot; {state.outs} out{state.outs === 1 ? "" : "s"} &middot; {state.balls}-{state.strikes}</span>
          <span className="text-xs text-muted-foreground">{state.bases === 0 ? "Bases empty" :
            `${["1st", "2nd", "3rd"].filter((_, i) => state.bases & (1 << i)).join(" & ")} occupied`}</span>
        </div>}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{home} win probability</div>
          <div className="h-56 w-full min-w-0" role="img" aria-label={`${home} win probability chart, ${formatPct(data.home_win_probability)} at the latest state`}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 224 }}>
              <LineChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: -10 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" {...chartAxisProps(theme)} minTickGap={32} />
                <YAxis domain={[0, 1]} ticks={[0, .5, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} {...chartAxisProps(theme)} width={45} />
                <ReferenceLine y={.5} stroke={theme["muted-foreground"]} strokeDasharray="3 3" />
                <Tooltip contentStyle={chartTooltipStyle(theme)}
                  formatter={(v) => [formatPct(Number(v)), `${home} win probability`]}
                  labelFormatter={(_, values) => values[0]?.payload?.description ?? ""} />
                <Line type="linear" dataKey="home_win_probability" stroke={theme["chart-1"]} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {!!data.history_omitted && <p className="text-xs text-muted-foreground">Some plays are missing from the chart.</p>}
        <p className="text-xs text-muted-foreground">
          {data.abstract_state === "Final" ? "Final result" : `Latest feed: ${new Date(data.source_timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`}
          {data.abstract_state !== "Final" && !stale && !error && " · Refreshes while open"}
        </p>
      </>}
      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        Based on score, inning, runners, outs, and count using league-average teams.
        Pregame picks stay fixed; live probabilities do not include team strength or betting odds.
        Fair odds are derived from these probabilities without bookmaker margin.
      </p>
    </div>
  );
}
