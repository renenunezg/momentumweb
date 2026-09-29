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
  children,
}: {
  caption: string;
  projectionLabel: "xR" | "xG";
  children: ReactNode;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">{projectionLabel}</TableHead>
          <TableHead className="text-right">Win</TableHead>
          <TableHead className="text-right">Edge</TableHead>
          <TableHead className="text-right">Model / Book</TableHead>
          <TableHead className="text-right">Play</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

export function GameMatchupHeader({
  away,
  home,
  hasPlay,
  status,
  detail,
}: {
  away: string;
  home: string;
  hasPlay: boolean;
  status: ReactNode;
  detail: ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={6} className="whitespace-normal border-t border-border pt-5 pb-1">
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
