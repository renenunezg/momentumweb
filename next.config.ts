import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Legacy pre-/mlb URLs: keep old bookmarks and indexed links working.
    return [
      { source: "/games", destination: "/mlb/games", permanent: true },
      { source: "/history", destination: "/mlb/history", permanent: true },
      { source: "/performance", destination: "/mlb/performance", permanent: true },
      { source: "/api/:path*", destination: "/mlb/api/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
