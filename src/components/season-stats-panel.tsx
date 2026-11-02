import type { CSSProperties } from "react";
import { InfoTip } from "@/components/info-tip";
import { EMPTY } from "@/lib/utils";
import type { SeasonStatsData } from "@/lib/season-stats";

// Columns per row on phones and wider screens. The hairline grid paints any
// unfilled slot in the border color, so the last cell spans the rest of its row.
const COLS = 4;
const COLS_SM = 8;

function gridVars(count: number): CSSProperties {
  const cols = Math.min(count, COLS);
  const colsSm = Math.min(count, COLS_SM);
  const span = (c: number) => c - ((count - 1) % c);
  return { "--cols": cols, "--cols-sm": colsSm, "--last": span(cols), "--last-sm": span(colsSm) } as CSSProperties;
}

function TippedLabel({ label, tip }: { label: string; tip: string }) {
  const cut = label.lastIndexOf(" ") + 1;
  return (
    <>
      {label.slice(0, cut)}
      <span className="whitespace-nowrap">
        {label.slice(cut)} <InfoTip text={tip} label={`What is ${label}?`} className="align-middle" />
      </span>
    </>
  );
}

export function SeasonStatsPanel({ stats }: { stats: SeasonStatsData }) {
  return (
    <section aria-label="Season stats" className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-xs font-semibold">{stats.season} season stats</h3>
        <p className="font-mono text-[11px] text-muted-foreground">{stats.context}</p>
      </div>
      {stats.tiers.map(({ label, stats: metrics }) => (
        <div key={label} className="space-y-1.5">
          <h4 className="type-eyebrow text-muted-foreground">{label}</h4>
          <dl
            style={gridVars(metrics.length)}
            className="grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-[repeat(var(--cols-sm),minmax(0,1fr))]"
          >
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="flex min-w-0 flex-col bg-background px-1.5 py-1.5 last:[grid-column:span_var(--last)] sm:px-3 sm:last:[grid-column:span_var(--last-sm)]"
              >
                {/* A label that wraps on a phone keeps its tip on the line of its last word, and
                    the value sits at the bottom so values in a row stay level. */}
                <dt className="text-center text-[10px] leading-tight text-muted-foreground">
                  {metric.tip ? <TippedLabel label={metric.label} tip={metric.tip} /> : metric.label}
                </dt>
                <dd className="mt-auto whitespace-nowrap pt-0.5 text-center font-mono text-sm font-semibold tabular-nums sm:text-base">
                  {metric.value ?? EMPTY}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-muted-foreground">{stats.note}</p>
    </section>
  );
}
