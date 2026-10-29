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

// Both teams in one cell, side by side. Each half carries a floor wide enough
// for the longest name so the auto table layout cannot collapse the column,
// paints its own color bar and tint, and fills the row however tall a
// neighbouring cell makes it: the cell's 1px height lets the grid's 100%
// resolve. Phones never see this table; they get ScheduleCards.
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
    <TableCell className="h-px p-0">
      <span className="grid h-full grid-cols-[minmax(16rem,1fr)_minmax(16rem,1fr)]">
        <Side side="away" {...away} />
        <Side side="home" {...home} />
      </span>
    </TableCell>
  );
}

export function ScheduleMatchupHead() {
  return (
    <TableHead className="p-0">
      <span className="grid grid-cols-2">
        <span className="px-[var(--table-cell-x)]">Away</span>
        <span className="px-[var(--table-cell-x)]">Home</span>
      </span>
    </TableHead>
  );
}

function Side({
  side,
  name,
  team,
  rank,
  markers,
}: MatchupSide & { side: "away" | "home" }) {
  const color = teamColor(team);
  return (
    // The live score writer appends this side's score to the span. A side
    // with no color on file paints nothing.
    <span
      className="flex min-w-0 items-center gap-2 px-[var(--table-cell-x)] py-[var(--table-cell-y)]"
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
      <TeamLabel name={name} team={team} rank={rank} markers={markers} />
    </span>
  );
}

// Logo, name, rank and markers: the part of a side that the table cell and
// the phone card render the same way. Rank and markers sit inside the name's
// span so a name that wraps keeps them on its last line.
export function TeamLabel({ name, team, rank, markers = [] }: MatchupSide) {
  return (
    <>
      <TeamLogo team={team} name={name} />
      <span className="font-medium">
        {name}
        {rank != null && (
          <span className="ml-2 whitespace-nowrap font-mono text-xs font-normal opacity-60">
            <span className="sr-only">rank </span>
            {rank}
          </span>
        )}
        {markers.map(
          (marker) =>
            marker && (
              <span
                key={marker.label}
                className="type-eyebrow ml-2 whitespace-nowrap opacity-70"
                title={marker.note}
              >
                {marker.label}
                <span className="sr-only">: {marker.note}</span>
              </span>
            ),
        )}
      </span>
    </>
  );
}
