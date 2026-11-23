import type { ReactNode } from "react";
import { PlayerHeadshot } from "@/components/player-headshot";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";

// Headshot, name and team line for a player, shared by the Heisman tracker and
// the player grades of both football sports. A CFBD athlete id resolves to the
// ESPN portrait; an NFL row carries its own headshot URL.
export function PlayerCell({
  athleteId,
  headshotUrl,
  name,
  team,
  position,
  logo,
  headshotFallback,
  wrapName = false,
}: {
  athleteId: string;
  headshotUrl?: string | null;
  name: string;
  team: string;
  position: string | null;
  logo: TeamLogoSource | undefined;
  headshotFallback?: ReactNode;
  // Wrap a name too long for its cell instead of cutting it short.
  wrapName?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <PlayerHeadshot name={name} src={headshotUrl ?? cfbPlayerHeadshotUrl(athleteId)} className="h-9 w-9" fallback={headshotFallback} />
      <div className="min-w-0">
        <div className={wrapName ? "font-medium whitespace-normal [overflow-wrap:anywhere]" : "truncate font-medium"}>{name}</div>
        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <TeamLogo team={logo} name={team} className="h-3.5 w-3.5" />
          <span className="truncate">
            {team}
            {position ? ` · ${position}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
