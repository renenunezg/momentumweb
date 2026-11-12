"use client";

import { useState } from "react";
import { Pager } from "@/components/pager";
import { ToggleGroup } from "@/components/toggle-group";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SIZES = [
  { key: "7", label: "7 days" },
  { key: "14", label: "14 days" },
  { key: "30", label: "30 days" },
] as const;
type SizeKey = (typeof SIZES)[number]["key"];

// A figure colored by its sign, such as a profit; plain strings stay neutral.
export type PagedCell = string | { text: string; tone: "positive" | "negative" | null };

const TONES = { positive: "text-positive", negative: "text-negative" } as const;

// A table of rows a server component has already formatted, newest first.
// With `paged`, it shows the latest 7 rows and offers 14 or 30 a page, with
// previous and next controls; without it, every row.
export function PagedTable({
  caption,
  columns,
  rows,
  paged = false,
}: {
  caption: string;
  // The first column is the row label; the rest are right-aligned figures.
  columns: string[];
  rows: { key: string; cells: PagedCell[] }[];
  paged?: boolean;
}) {
  const [sizeKey, setSizeKey] = useState<SizeKey>("7");
  const [page, setPage] = useState(0);
  const size = paged ? Number(sizeKey) : rows.length;
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, totalPages - 1);
  const shown = rows.slice(current * size, (current + 1) * size);
  return (
    <div className="space-y-2">
      {paged && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            label="Rows per page"
            options={SIZES}
            value={sizeKey}
            onChange={(next) => {
              setSizeKey(next);
              setPage(0);
            }}
            variant="pill"
          />
          <Pager page={current} totalPages={totalPages} onPage={setPage} />
        </div>
      )}
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((column, i) => (
              <TableHead key={column} className={i === 0 ? undefined : "text-right"}>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((row) => (
            <TableRow key={row.key}>
              {row.cells.map((cell, i) => {
                const tone = typeof cell === "string" || cell.tone == null ? "" : ` ${TONES[cell.tone]}`;
                return (
                  <TableCell
                    key={columns[i]}
                    className={(i === 0 ? "font-mono" : "text-right font-mono tabular-nums") + tone}
                  >
                    {typeof cell === "string" ? cell : cell.text}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
