import { teamColor } from "@/lib/team-colors";
import { TeamLogo, type TeamLogoSource } from "@/components/team-logo";
import { TableCell, TableHead } from "@/components/ui/table";

export interface ScheduleMarker {
  label: string;
  note: string;
}

export interface MatchupSide {
  name: string;
  team: (TeamLogoSource & { color: string | null }) | undefined;
  rank: number | undefined;
  markers?: (ScheduleMarker | false | null | undefined)[];
}

// Both teams in one cell so a phone can pin the matchup while the numbers
// scroll under it: the sides sit in two columns where the table has room and
// stack on a narrow screen. The desktop halves carry a floor wide enough for
// the longest name so the auto table layout cannot collapse the column, and
// the phone grid is a fixed width so names wrap instead. Each side paints its
// own color bar and tint; the cell's 1px height lets the grid's 100% resolve,
// so the sides fill the row however tall a neighbouring cell makes it.
//
// The primary color is an accent only, never a text background: CFBD's
// primary and secondary are not a usable pair (55 of 243 D1 teams have a
// secondary failing WCAG AA against their own primary, and San Diego ships
// the same hex twice), so text stays on the theme foreground.
export function ScheduleMatchupCell({
  away,
  home,
}: {
  away: MatchupSide;
  home: MatchupSide;
}) {
  return (
    <TableCell className="sticky left-0 z-10 h-px p-0 max-md:bg-background max-md:shadow-[1px_0_0_var(--border)] md:static">
      <span className="grid h-full w-56 grid-rows-2 text-xs md:w-auto md:grid-cols-[minmax(16rem,1fr)_minmax(16rem,1fr)] md:grid-rows-none md:text-sm">
        <Side side="away" {...away} />
        <Side side="home" {...home} />
      </span>
    </TableCell>
  );
}

export function ScheduleMatchupHead() {
  return (
    <TableHead className="sticky left-0 z-10 p-0 max-md:bg-background max-md:shadow-[1px_0_0_var(--border)] md:static">
      <span className="px-2 md:hidden">Matchup</span>
      <span className="hidden md:grid md:grid-cols-2">
        <span className="px-2">Away</span>
        <span className="px-2">Home</span>
      </span>
    </TableHead>
  );
}

function Side({
  side,
  name,
  team,
  rank,
  markers = [],
}: MatchupSide & { side: "away" | "home" }) {
  const color = teamColor(team);
  return (
    // The live score writer appends this side's score to the span. A side
    // with no color on file paints nothing.
    <span
      className="flex min-w-0 items-center gap-2 px-2 py-1.5"
      data-team-cell={side}
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
      <TeamLogo team={team} name={name} />
      <span className="font-medium max-md:whitespace-normal">{name}</span>
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
          ),
      )}
    </span>
  );
}
