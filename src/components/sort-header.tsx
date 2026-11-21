import { InfoTip } from "@/components/info-tip";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// A sortable column header of the player grade tables: the label is the sort
// button, the arrow marks the active direction, and an optional tip follows.
export function SortHeader<K extends string>({
  label,
  sortKey,
  active,
  dir,
  onSort,
  tip,
  className,
}: {
  label: string;
  sortKey: K;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: K) => void;
  tip?: string;
  className?: string;
}) {
  return (
    <TableHead className={cn("whitespace-nowrap", className)} aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn("type-eyebrow inline-flex items-center gap-1", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        {label}
        {active && <span aria-hidden="true">{dir === "desc" ? "▼" : "▲"}</span>}
      </button>
      {tip && <InfoTip text={tip} label={`What is ${label}?`} className="ml-1" />}
    </TableHead>
  );
}
