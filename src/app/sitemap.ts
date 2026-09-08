import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { posts } from "./blog/posts";

// Data pages refresh with each model publish; prose pages change with commits.
const DATA_ROUTES = [
  "/mlb/games",
  "/mlb/history",
  "/mlb/performance",
  "/cfb/ratings",
  "/cfb/schedule",
  "/cfb/heisman",
  "/cfb/history",
  "/cfb/performance",
  "/nfl/ratings",
  "/nfl/schedule",
  "/nfl/season-wins",
  "/nfl/awards",
  "/nfl/history",
  "/nfl/performance",
];
const PROSE_ROUTES = [
  "/about",
  "/blog",
  "/mlb/methodology",
  "/cfb/methodology",
  "/nfl/methodology",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...DATA_ROUTES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...PROSE_ROUTES.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
