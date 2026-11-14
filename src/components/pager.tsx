"use client";

/** Previous / next controls for a client-side paged list; renders nothing for a single page. page is zero-based. */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (next: number) => void }) {
  if (totalPages <= 1) return null;
  const button =
    // Phones get a full-size touch target; the pager is the only way through a long list.
    "inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 sm:size-8";
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1 font-mono text-xs">
      <button type="button" aria-label="Previous page" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} className={button}>
        {"<"}
      </button>
      <span className="text-muted-foreground">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        aria-label="Next page"
        onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className={button}
      >
        {">"}
      </button>
    </nav>
  );
}
