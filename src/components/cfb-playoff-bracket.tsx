"use client";
import { Fragment } from "react";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import {
  type CfbPlayoffSlot,
  type CfbPlayoffTeam,
} from "@/lib/cfb-playoffs";
import { playoffPercent } from "@/lib/football-playoff-format";

export type PlayoffIdentities = Record<number, TeamLogoSource>;
interface Props {
  bracket: CfbPlayoffSlot[];
  teams: Map<number, CfbPlayoffTeam>;
  identities: PlayoffIdentities;
  onTeam: (id: number) => void;
}
const PATHS = [
  [8, 9, 1],
  [5, 12, 4],
  [7, 10, 2],
  [6, 11, 3],
] as const;
export function CfbPlayoffBracket({
  bracket,
  teams,
  identities,
  onTeam,
}: Props) {
  const slots = new Map(bracket.map((s) => [s.seed, s]));
  function line(seed: number, bye = false) {
    const slot = slots.get(seed)!;
    const team = teams.get(slot.team_id)!;
    return (
      <button
        type="button"
        key={seed}
        onClick={() => onTeam(team.id)}
        aria-label={`${team.team}, seed ${seed}, ${playoffPercent(team.playoff)} playoff chance`}
        className="grid h-full min-h-11 w-full grid-cols-[10px_16px_minmax(0,1fr)] items-center gap-x-1 px-2 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[18px_20px_minmax(0,1fr)] sm:gap-x-2 sm:px-3"
      >
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {seed}
        </span>
        <TeamLogo team={identities[team.id]} name={team.team} className="size-4 sm:size-5" />
        <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <span className="text-[11px] font-semibold leading-tight sm:text-sm">
            {team.team}
            {bye && <span className="sr-only">, first-round bye</span>}
          </span>
          <span className="shrink-0 text-[10px] font-semibold leading-tight tabular-nums text-primary sm:text-xs">
            {playoffPercent(team.playoff)}
          </span>
        </span>
      </button>
    );
  }
  return (
    <section aria-label="Projected playoff bracket" className="space-y-4">
      <div>
        <h2 className="type-section">
          The projected bracket
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One possible field. Percentages show each team&apos;s overall chance
          to make the playoff.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.15fr_1.15fr_.85fr_.8fr] lg:gap-6">
        <div className="col-span-2 grid grid-cols-2 items-center gap-x-6 gap-y-4 sm:gap-x-8">
          <h3 className="type-eyebrow text-muted-foreground">
            First round
          </h3>
          <h3 className="type-eyebrow text-muted-foreground">
            Quarterfinals
          </h3>
          {PATHS.map(([h, a, b]) => (
            <Fragment key={b}>
              <div className="relative grid grid-rows-2 gap-2">
                {[h, a].map((seed) => (
                  <div key={seed} className="overflow-hidden rounded-lg border border-border bg-card">
                    {line(seed)}
                  </div>
                ))}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute left-full top-0 h-full w-6 overflow-visible text-primary/50 sm:w-8"
                >
                  <path
                    d="M0 24 H12 V76 H0 M12 50 H24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div className="overflow-hidden rounded-lg border border-primary/30 bg-card">
                {line(b, true)}
                <p className="border-t border-border px-2 py-1.5 text-[9px] text-muted-foreground sm:px-3 sm:text-[10px]">
                  Bye · faces {h} / {a} winner
                </p>
              </div>
            </Fragment>
          ))}
        </div>
        <div className="hidden lg:block">
          <h3 className="type-eyebrow mb-4 text-muted-foreground">
            Semifinals
          </h3>
          <div className="flex h-[440px] flex-col justify-around">
            {[
              [1, 8, 9, 4, 5, 12],
              [2, 7, 10, 3, 6, 11],
            ].map((p) => (
              <div
                key={p[0]}
                className="divide-y divide-border rounded-lg border border-border bg-card text-xs text-muted-foreground"
              >
                <p className="p-4">{p.slice(0, 3).join(" / ")} path</p>
                <p className="p-4">{p.slice(3).join(" / ")} path</p>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <h3 className="type-eyebrow mb-4 text-muted-foreground">
            Championship
          </h3>
          <div className="flex h-[440px] items-center">
            <div className="w-full rounded-lg border border-primary/30 bg-primary/5 p-5 text-center">
              <p className="font-heading text-lg text-primary">
                National title
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Semifinal winners
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground lg:hidden">
        Semifinals: the 1 and 4 paths meet; the 2 and 3 paths meet. Winners
        advance to the national championship.
      </p>
    </section>
  );
}
