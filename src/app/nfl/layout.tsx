import type { Metadata } from "next";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "NFL Model Ratings",
  description:
    "NFL power ratings, weekly spread and total projections, unit ratings, and model performance against the closing line.",
};

const nflLinks = [
  { href: "/nfl/methodology", label: "Methodology" },
  { href: "/nfl/ratings", label: "Ratings" },
  { href: "/nfl/schedule", label: "Schedule" },
  { href: "/nfl/history", label: "History" },
  { href: "/nfl/performance", label: "Performance" },
  { href: "/about", label: "About" },
];

export default function NflLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Nav links={nflLinks} />
      {children}
    </>
  );
}
