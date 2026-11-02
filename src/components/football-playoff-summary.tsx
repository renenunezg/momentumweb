import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { ToggleGroup } from "@/components/toggle-group";

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
      <div className="flex flex-wrap items-center justify-center gap-1 type-meta text-muted-foreground">
        {identity && <TeamLogo team={identity} name={detail} className="size-4" />}
        <span>{detail}</span>
      </div>
    </div>
  );
}

export type PlayoffFilter = "contenders" | "all" | "field";
const FILTERS = [
  { key: "contenders", label: "In the mix" },
  { key: "all", label: "All teams" },
  { key: "field", label: "Bracket teams" },
] as const;

export function PlayoffTeamFilter({ value, onChange, description }: {
  value: PlayoffFilter;
  onChange: (value: PlayoffFilter) => void;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <ToggleGroup
        label="Filter teams"
        variant="chip"
        options={FILTERS}
        value={value}
        onChange={onChange}
      />
      <p className="type-meta text-muted-foreground" aria-live="polite">{description}</p>
    </div>
  );
}
