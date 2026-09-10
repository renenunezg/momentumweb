"use client";

import { useTransition, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PickMarket, PickPeriod } from "@/lib/football-picks";

export function PickFilters({
  season,
  latestSeason,
  market,
  period,
  seasonOptions,
}: {
  season: number | null;
  latestSeason: number;
  market: PickMarket;
  period: PickPeriod;
  seasonOptions?: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const seasons = [
    ...new Set([
      ...(season ? [season] : []),
      ...(seasonOptions ??
        Array.from({ length: 5 }, (_, i) => latestSeason - i)),
    ]),
  ].sort((a, b) => b - a);
  function navigate(form: HTMLFormElement, nextPeriod = period) {
    const data = new FormData(form);
    const query = new URLSearchParams({
      season: String(data.get("season")),
      market: String(data.get("market")),
      period: nextPeriod,
    });
    startTransition(() =>
      router.push(`${pathname}?${query}`, { scroll: false }),
    );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(event.currentTarget);
  }
  const selectClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm";
  return (
    <form
      onSubmit={submit}
      aria-busy={pending}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="grid gap-1 text-xs text-muted-foreground">
        Season
        <select
          key={`season-${season}`}
          name="season"
          aria-label="Season"
          defaultValue={season ?? "all"}
          className={selectClass}
        >
          <option value="all">All seasons</option>
          {seasons.map((year) => (
            <option key={year}>{year}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Market
        <select
          key={`market-${market}`}
          name="market"
          aria-label="Market"
          defaultValue={market}
          className={selectClass}
        >
          <option value="all">All markets</option>
          <option value="h2h">Moneyline</option>
          <option value="spreads">Spread</option>
          <option value="totals">Total</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-input px-4 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? "Updating…" : "Apply"}
      </button>
      <div
        className="flex gap-1 sm:ml-auto"
        role="group"
        aria-label="Date range"
      >
        {(["7", "14", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={period === value}
            onClick={(event) => {
              if (event.currentTarget.form)
                navigate(event.currentTarget.form, value);
            }}
            className={`h-9 rounded-md border px-3 text-sm disabled:opacity-50 ${period === value ? "border-foreground bg-foreground text-background" : "border-input hover:bg-muted"}`}
          >
            {value === "all" ? "All time" : `${value}D`}
          </button>
        ))}
      </div>
      <p className="w-full text-xs text-muted-foreground">
        Date range uses the date a decision was recorded (UTC), including
        pending games. Applies to records and history. Choosing a market lists
        its recommended picks only; No Play decisions appear under All markets.
      </p>
    </form>
  );
}
