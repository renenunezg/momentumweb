import { teamColor } from "@/lib/team-colors";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { TableCell } from "@/components/ui/table";

export interface ScheduleMarker {
  label: string;
  note: string;
}

// One side of a matchup. The primary color is an accent only, never a text
// background: CFBD's primary and secondary are not a usable pair (55 of 243 D1
// teams have a secondary failing WCAG AA against their own primary, and San
// Diego ships the same hex twice), so text stays on the theme foreground.
// A cell with no bar is a team with no color on file.
export function ScheduleTeamCell({
  side,
  name,
  team,
  rank,
  markers = [],
}: {
  side: "away" | "home";
  name: string;
  team: (TeamLogoSource & { color: string | null }) | undefined;
  rank: number | undefined;
  markers?: (ScheduleMarker | false | null | undefined)[];
}) {
  const color = teamColor(team);
  return (
    <TableCell
      style={
        color
          ? {
              boxShadow: `inset 3px 0 0 ${color}`,
              // 14 hex = 8% alpha: enough to read as the team's color, light
              // enough to leave the theme's text contrast untouched.
              backgroundColor: `${color}14`,
            }
          : undefined
      }
    >
      {/* The live score writer appends this side's score to the span. */}
      <span className="flex items-center gap-2" data-team-cell={side}>
        <TeamLogo team={team} name={name} />
        <span className="font-medium">{name}</span>
        {rank != null && (
          <span className="font-mono text-xs opacity-60">
            <span className="sr-only">rank </span>
            {rank}
          </span>
        )}
        {markers.map(
          (marker) =>
            marker && (
              <span
                key={marker.label}
                className="font-mono text-[10px] uppercase tracking-wider opacity-70"
                title={marker.note}
              >
                {marker.label}
                <span className="sr-only">: {marker.note}</span>
              </span>
            )
        )}
      </span>
    </TableCell>
  );
}
