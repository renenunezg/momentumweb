import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prerendering reads Supabase for every page, and the Nano instance stalls
  // under a burst of reads (2026-11-17: a build with two workers took the
  // database down until Postgres was restarted). One worker, with
  // src/lib/supabase-fetch.ts sending its reads one at a time, keeps the build
  // to a single read in flight. Pages wait on each other's reads, so a page
  // gets three minutes before the build gives up on it.
  staticPageGenerationTimeout: 180,
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 2,
    staticGenerationRetryCount: 1,
  },
  async redirects() {
    // Legacy pre-/mlb URLs: keep old bookmarks and indexed links working.
    return [
      { source: "/games", destination: "/mlb/games", permanent: true },
      { source: "/history", destination: "/mlb/history", permanent: true },
      { source: "/performance", destination: "/mlb/performance", permanent: true },
      // The only pre-/mlb API route was live-scores; /api/revalidate is
      // site-wide and must not be bounced.
      { source: "/api/live-scores", destination: "/mlb/api/live-scores", permanent: true },
      // Renamed to pair with Batting value (2026-11-14).
      { source: "/mlb/pitch-value", destination: "/mlb/pitching-value", permanent: true },
      // The seven-day NHL schedule was retired for the daily games page (2026-11-17).
      { source: "/nhl/schedule", destination: "/nhl/games", permanent: true },
    ];
  },
};

export default nextConfig;
