"use client";

import { useMemo, type ReactNode } from "react";
import { replaceLocation, useLocationSearch } from "@/lib/use-location-search";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";

const VIEWS = [
  { key: "all", label: "All" },
  { key: "compare", label: "Compare" },
] as const;

type View = (typeof VIEWS)[number]["key"];

// The view is read in the browser so the cached page stays static; deep links
// switch after hydration without a refetch.
export function NhlRatingsViews({ table, compare }: { table: ReactNode; compare: ReactNode }) {
  const search = useLocationSearch();
  const view: View = useMemo(
    () => (new URLSearchParams(search).get("view") === "compare" ? "compare" : "all"),
    [search],
  );

  function select(next: View) {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    replaceLocation(url);
  }

  return (
    <ViewTabs label="Ratings view" options={VIEWS} value={view} onValueChange={select}>
      <ViewTabPanel value={view}>{view === "compare" ? compare : table}</ViewTabPanel>
    </ViewTabs>
  );
}
