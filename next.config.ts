import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Legacy pre-/mlb URLs: keep old bookmarks and indexed links working.
    return [
      { source: "/games", destination: "/mlb/games", permanent: true },
      { source: "/history", destination: "/mlb/history", permanent: true },
      { source: "/performance", destination: "/mlb/performance", permanent: true },
      // The only pre-/mlb API route was live-scores; /api/revalidate is
      // site-wide and must not be bounced.
      { source: "/api/live-scores", destination: "/mlb/api/live-scores", permanent: true },
    ];
  },
};

export default nextConfig;
