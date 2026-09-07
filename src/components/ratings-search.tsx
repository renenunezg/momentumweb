"use client";

import { useMemo, useState } from "react";

export function useRatingsSearch<T extends { team: string }>(
  rows: T[],
  searchRows = rows
) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const source = needle ? searchRows : rows;
  const matches = useMemo(
    () =>
      source
        .map((row, index) => ({ row, rank: index + 1 }))
        .filter(({ row }) => row.team.toLowerCase().includes(needle)),
    [source, needle]
  );

  return { query, setQuery, matches, total: source.length };
}

export function RatingsSearch({
  query,
  onChange,
  shown,
  total,
  scope,
}: {
  query: string;
  onChange: (query: string) => void;
  shown: number;
  total: number;
  scope?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Find a team"
        aria-label="Find a team"
        className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 font-mono text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
      />
      <span className="font-mono text-xs text-muted-foreground" role="status">
        {shown === 0 ? "No teams match your search." : `${shown} of ${total} teams`}
        {scope && ` · ${scope}`}
      </span>
    </div>
  );
}
