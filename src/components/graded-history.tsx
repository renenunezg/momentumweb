import { NavigationLink as Link } from "@/components/navigation-link";
import { formatHomeLine } from "@/lib/football";
import { cn, formatNumber } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Both the live grading record and the frozen backtest render through the
// same row shape: a home-axis model margin, closing spread, and result.
export interface GradedRow {
  game_id: number | string;
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  neutral_site: boolean | null;
  home_points: number | null;
  away_points: number | null;
  closing_spread: number | null;
  model_margin: number | null;
  actual_margin: number | null;
}

const numCell = "text-right font-mono tabular-nums";

export function GradedHistoryTable({
  rows,
  caption,
}: {
  rows: GradedRow[];
  caption: string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Season</TableHead>
            <TableHead className="text-right">Wk</TableHead>
            <TableHead>Matchup</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right">Model</TableHead>
            <TableHead className="text-right">Close</TableHead>
            <TableHead className="text-right">Result</TableHead>
            <TableHead className="text-right">Model err</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const modelLine = r.model_margin != null ? -r.model_margin : null;
            const marketMargin =
              r.closing_spread != null ? -r.closing_spread : null;
            const modelErr =
              r.model_margin != null && r.actual_margin != null
                ? r.model_margin - r.actual_margin
                : null;
            const marketErr =
              marketMargin != null && r.actual_margin != null
                ? marketMargin - r.actual_margin
                : null;
            const modelCloser =
              modelErr != null && marketErr != null
                ? Math.abs(modelErr) < Math.abs(marketErr)
                : null;
            return (
              <TableRow key={r.game_id}>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {r.season}
                </TableCell>
                <TableCell className={`${numCell} text-muted-foreground`}>
                  {r.week}
                </TableCell>
                <TableCell>
                  <span className="font-medium">
                    {r.away_team}
                    <span className="text-muted-foreground">
                      {" "}
                      {r.neutral_site ? "vs" : "@"}{" "}
                    </span>
                    {r.home_team}
                  </span>
                </TableCell>
                <TableCell className={`${numCell} whitespace-nowrap`}>
                  {r.away_points ?? "–"}&ndash;{r.home_points ?? "–"}
                </TableCell>
                <TableCell className={numCell}>
                  {formatHomeLine(modelLine)}
                </TableCell>
                <TableCell className={`${numCell} text-muted-foreground`}>
                  {formatHomeLine(r.closing_spread)}
                </TableCell>
                <TableCell className={numCell}>
                  {r.actual_margin != null
                    ? formatHomeLine(-r.actual_margin)
                    : "–"}
                </TableCell>
                <TableCell
                  className={cn(
                    numCell,
                    modelCloser === true && "text-positive",
                    modelCloser === false && "text-muted-foreground",
                  )}
                >
                  {modelErr != null ? formatNumber(Math.abs(modelErr)) : "–"}
                  {modelCloser === true && (
                    <span className="sr-only">
                      {" "}
                      (model closer than the closing line)
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Season filters are links, not tabs: each one is a server round trip with its
// own URL, so it should be bookmarkable and reachable without JavaScript.
export function SeasonLinks({
  options,
  activeKey,
  team,
  clearHref,
}: {
  options: { key: string; label: string; href: string }[];
  activeKey: string;
  team: string;
  clearHref: string;
}) {
  return (
    <nav
      aria-label="Season"
      className="flex flex-wrap items-center gap-0 font-mono text-xs uppercase tracking-wider"
    >
      {options.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          aria-current={o.key === activeKey ? "page" : undefined}
          className={cn(
            "border-b-2 px-3 py-2 transition-colors",
            o.key === activeKey
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
      {team && (
        <span className="ml-3 flex items-center gap-2 normal-case">
          <span className="text-muted-foreground">Team: {team}</span>
          <Link
            href={clearHref}
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            clear
          </Link>
        </span>
      )}
    </nav>
  );
}

export function HistoryPager({
  page,
  totalPages,
  pageUrl,
}: {
  page: number;
  totalPages: number;
  pageUrl: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const linkClass =
    "rounded-md border border-border px-3 py-1.5 transition-colors hover:border-foreground/30";
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs"
    >
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex flex-wrap gap-2">
        {page > 2 && (
          <Link href={pageUrl(1)} className={linkClass}>
            First
          </Link>
        )}
        {page > 1 && (
          <Link href={pageUrl(page - 1)} className={linkClass}>
            &larr; Newer
          </Link>
        )}
        {Array.from(
          { length: Math.min(totalPages, 5) },
          (_, i) => Math.max(1, Math.min(page - 2, totalPages - 4)) + i,
        ).map((value) => (
          <Link
            key={value}
            href={pageUrl(value)}
            aria-label={`Page ${value}`}
            aria-current={value === page ? "page" : undefined}
            className={cn(
              linkClass,
              value === page && "bg-foreground text-background",
            )}
          >
            {value}
          </Link>
        ))}
        {page < totalPages && (
          <Link href={pageUrl(page + 1)} className={linkClass}>
            Older &rarr;
          </Link>
        )}
        {page < totalPages - 1 && (
          <Link href={pageUrl(totalPages)} className={linkClass}>
            Last
          </Link>
        )}
      </div>
    </nav>
  );
}
