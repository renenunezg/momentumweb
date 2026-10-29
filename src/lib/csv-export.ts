// Public CSV exports of the tables the performance pages read, so a reader
// can recompute every headline without finding the PostgREST endpoint. Each
// route streams one table in stable 1000-row pages through the same anon
// client the pages use; nothing here aggregates, joins or touches a model
// repo. The CDN holds a copy for an hour, like the pages.

export const EXPORT_PAGE_SIZE = 1000;

type Row = Record<string, unknown>;

export interface ExportPage {
  data: Row[] | null;
  error: { message: string } | null;
}

export interface CsvExport {
  filename: string;
  columns: readonly string[];
  // One page of rows in a stable order; the export stops at the first short page.
  page: (from: number, to: number) => PromiseLike<ExportPage>;
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// PostgREST's typed builder cannot type a column list built at runtime; the
// export only needs each row as a record of cells.
export function toPage(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): PromiseLike<ExportPage> {
  return query.then((result) => ({ data: result.data as Row[] | null, error: result.error }));
}

export function csvLine(columns: readonly string[], row: Row): string {
  return columns.map((column) => csvCell(row[column])).join(",") + "\n";
}

export async function csvResponse(spec: CsvExport): Promise<Response> {
  const encoder = new TextEncoder();
  // The first page is read before the response starts so a failed read is a
  // 503 rather than a truncated file the CDN would cache as complete.
  const first = await spec.page(0, EXPORT_PAGE_SIZE - 1);
  if (first.error) {
    return Response.json(
      { error: `${spec.filename} is temporarily unavailable.` },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(spec.columns.join(",") + "\n"));
      let rows = first.data ?? [];
      let from = 0;
      for (;;) {
        for (const row of rows) controller.enqueue(encoder.encode(csvLine(spec.columns, row)));
        if (rows.length < EXPORT_PAGE_SIZE) break;
        from += EXPORT_PAGE_SIZE;
        const next = await spec.page(from, from + EXPORT_PAGE_SIZE - 1);
        if (next.error) {
          controller.error(new Error(next.error.message));
          return;
        }
        rows = next.data ?? [];
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${spec.filename}"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Vercel-CDN-Cache-Control": "public, s-maxage=3600",
    },
  });
}
