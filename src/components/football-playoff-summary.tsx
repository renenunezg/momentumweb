import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";

export function PlayoffMetric({
  label,
  value,
  detail,
  identity,
}: {
  label: string;
  value: string;
  detail: string;
  identity?: TeamLogoSource;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 py-3 text-center">
      <p className="type-eyebrow text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-base font-bold tabular-nums text-primary sm:text-xl">
        {value}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
        {identity && <TeamLogo team={identity} name={detail} className="size-4" />}
        <span>{detail}</span>
      </div>
    </div>
  );
}

export type PlayoffFilter = "contenders" | "all" | "field";

export function PlayoffTeamFilter({ value, onChange, description }: {
  value: PlayoffFilter;
  onChange: (value: PlayoffFilter) => void;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter teams">
        {([
          ["contenders", "In the mix"],
          ["all", "All teams"],
          ["field", "Bracket teams"],
        ] as const).map(([key, label]) => (
          <button type="button" key={key} aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`rounded-full border px-3 py-1.5 text-xs ${value === key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">{description}</p>
    </div>
  );
}
