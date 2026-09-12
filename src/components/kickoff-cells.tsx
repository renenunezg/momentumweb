import { formatKickoff } from "@/lib/football";
import type { FootballSlate, KickoffPart } from "@/lib/football-slates";
import { TableCell, TableHead } from "@/components/ui/table";

// Server-rendered in Eastern so the cached HTML reads correctly without
// JavaScript; useVisitorKickoffs rewrites the text into the visitor's zone
// once the enclosing client component hydrates.
export function Kickoff({
  start,
  part,
}: {
  start: string | null;
  part: KickoffPart;
}) {
  return (
    <time dateTime={start ?? undefined} data-kickoff={part}>
      {formatKickoff[part](start)}
    </time>
  );
}

// The day belongs to the slate row, so a game row carries only its time. The
// live score writer swaps it for the clock and field strip in place.
export function KickoffCell({ start }: { start: string | null }) {
  return (
    <TableCell className="whitespace-nowrap text-center text-xs text-muted-foreground">
      <Kickoff start={start} part="time" />
    </TableCell>
  );
}

// Heads a slate's rows with its day and clock hour. The label is pinned to
// the left edge so it stays readable on a phone while the numbers scroll;
// `columns` is the table's column count so the heading spans the row. The
// filters skip this row because it carries no data-search.
export function SlateRow({
  slate,
  columns,
}: {
  slate: Pick<FootballSlate<unknown>, "start" | "broadcast">;
  columns: number;
}) {
  const start =
    slate.start == null ? null : new Date(slate.start).toISOString();
  return (
    <tr>
      <TableHead
        scope="rowgroup"
        colSpan={columns}
        className="h-auto px-0 pt-3 pb-1"
      >
        <span className="sticky left-0 inline-block px-2">
          {start ? (
            <>
              <Kickoff start={start} part="day" /> ·{" "}
              <Kickoff start={start} part="hour" />
              {slate.broadcast && ` · ${slate.broadcast}`}
            </>
          ) : (
            "Kickoff TBD"
          )}
        </span>
      </TableHead>
    </tr>
  );
}
