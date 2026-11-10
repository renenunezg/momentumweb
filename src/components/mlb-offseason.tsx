import Link from "next/link";

const DAY_MS = 86_400_000;

function dayNumber(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS;
}

function formatDate(isoDate: string, withYear: boolean): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(withYear && { year: "numeric" }),
  });
}

const RECAP_LINKS = [
  { href: "/mlb/performance", label: "Performance" },
  { href: "/mlb/playoffs", label: "Playoffs" },
  { href: "/mlb/awards", label: "Awards" },
];

/** The empty games page between the last World Series game and Opening Day. */
export function MlbOffseason({
  season,
  seasonEnded,
  openingDay,
  today,
}: {
  season: number;
  seasonEnded: string;
  openingDay: string;
  today: string;
}) {
  const daysLeft = dayNumber(openingDay) - dayNumber(today);
  const span = dayNumber(openingDay) - dayNumber(seasonEnded);
  const elapsed = Math.min(1, Math.max(0, (dayNumber(today) - dayNumber(seasonEnded)) / span));

  return (
    <section
      aria-labelledby="offseason-heading"
      className="rounded-xl border border-border bg-muted/30 p-5 sm:p-8"
    >
      <p className="type-eyebrow text-primary">Offseason</p>
      <h2 id="offseason-heading" className="mt-1 type-section">
        The {season} MLB season is over.
      </h2>

      <div className="mt-6 flex items-end gap-3">
        <span className="type-display tabular-nums text-primary">{daysLeft}</span>
        <span className="pb-1.5 type-label text-muted-foreground">
          {daysLeft === 1 ? "day" : "days"} until Opening Day, when predictions return
        </span>
      </div>

      <div className="mt-6">
        <div
          role="progressbar"
          aria-label="Offseason elapsed"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(elapsed * 100)}
          className="relative h-2 rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${elapsed * 100}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background"
            style={{ left: `${elapsed * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between gap-4 type-meta text-muted-foreground">
          <span>Final game, {formatDate(seasonEnded, false)}</span>
          <span className="text-right">Opening Day, {formatDate(openingDay, true)}</span>
        </div>
      </div>

      <nav aria-label={`${season} season recap`} className="mt-8 border-t border-border pt-4">
        <p className="type-meta text-muted-foreground">Look back at {season}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {RECAP_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 type-label transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
