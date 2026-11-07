// The site's calendar day and server-rendered times use Pacific, including
// DST; kickoffs are rewritten into the visitor's zone in the browser.
// Source timestamps and league-defined schedule boundaries stay unchanged.
export const SITE_TIME_ZONE = "America/Los_Angeles";

const timestamp = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatSiteTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : timestamp.format(date);
}
