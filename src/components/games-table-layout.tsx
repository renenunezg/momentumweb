import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function GamesTableLayout({
  caption,
  projectionLabel,
  showTotals = false,
  children,
}: {
  caption: string;
  projectionLabel: "xR" | "xG";
  showTotals?: boolean;
  children: ReactNode;
}) {
  return (
    <Table className={showTotals ? "min-w-[48rem] table-fixed" : undefined}>
      {showTotals && (
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[15%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
        </colgroup>
      )}
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">{projectionLabel}</TableHead>
          <TableHead className="text-right">Win</TableHead>
          <TableHead className="text-right">Edge</TableHead>
          <TableHead className="text-right">Model / Book</TableHead>
          <TableHead className="text-right">{showTotals ? "ML pick" : "Play"}</TableHead>
          {showTotals && (
            <>
              <TableHead className="border-l border-border text-right">Proj. total</TableHead>
              <TableHead className="text-right">Total pick</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

export function GameMatchupHeader({
  away,
  home,
  hasPlay = false,
  columnCount = 6,
  status,
  detail,
}: {
  away: string;
  home: string;
  hasPlay?: boolean;
  columnCount?: number;
  status: ReactNode;
  detail: ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="whitespace-normal border-t border-border pt-5 pb-1">
        {/* Keep the matchup visible while numeric columns scroll on mobile. */}
        <div className="sticky left-0 flex w-[calc(100vw-2.5rem)] max-w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 md:w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-sm font-semibold", hasPlay && "text-positive")}>
              {away} @ {home}
            </span>
            <span aria-live="polite" className="contents">{status}</span>
          </div>
          <span className="min-w-0 text-xs font-normal text-muted-foreground">{detail}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
