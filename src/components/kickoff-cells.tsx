import { formatKickoffDay, formatKickoffTime } from "@/lib/football";
import { TableCell } from "@/components/ui/table";

// Server-rendered in Eastern so the cached HTML reads correctly without
// JavaScript; useVisitorKickoffs rewrites the text into the visitor's zone
// once the enclosing client component hydrates.
export function Kickoff({
  start,
  part,
}: {
  start: string | null;
  part: "day" | "time";
}) {
  return (
    <time dateTime={start ?? undefined} data-kickoff={part}>
      {part === "day" ? formatKickoffDay(start) : formatKickoffTime(start)}
    </time>
  );
}

export function KickoffCells({ start }: { start: string | null }) {
  const cell = "whitespace-nowrap text-center text-xs text-muted-foreground";
  return (
    <>
      <TableCell className={cell}>
        <Kickoff start={start} part="day" />
      </TableCell>
      <TableCell className={cell}>
        <Kickoff start={start} part="time" />
      </TableCell>
    </>
  );
}
