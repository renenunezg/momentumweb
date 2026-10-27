import { InfoTip } from "@/components/info-tip";
import { EMPTY } from "@/lib/utils";
import type { BaseballSeasonStatsData } from "@/lib/season-stats";

export function BaseballSeasonStats({ stats }: { stats: BaseballSeasonStatsData }) {
  return (
    <section aria-label="Season stats" className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-xs font-semibold">{stats.season} season stats</h3>
        <p className="font-mono text-[11px] text-muted-foreground">
          {stats.level} · {stats.sample}
        </p>
      </div>
      {[
        { label: "Production", metrics: stats.production },
        { label: "Underlying skills", metrics: stats.underlying },
      ].map(({ label, metrics }) => (
        <div key={label} className="space-y-1.5">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</h4>
          <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-8">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0 bg-background px-2 py-2.5 sm:px-3">
                <dt className="flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground">
                  {metric.label}
                  <InfoTip text={metric.tip} label={`What is ${metric.label}?`} />
                </dt>
                <dd className="mt-1 whitespace-nowrap font-mono text-sm font-semibold tabular-nums sm:text-base">
                  {metric.value ?? EMPTY}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-muted-foreground">{stats.trackingNote}</p>
    </section>
  );
}
