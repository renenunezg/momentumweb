import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "NHL Team Ratings & Analysis",
  description:
    "NHL team ratings from goals and expected goals, attack and defense strengths, and daily game projections priced against the market.",
};

const nhlLinks = [
  { href: "/nhl/ratings", label: "Ratings" },
  { href: "/nhl/games", label: "Games" },
  { href: "/nhl/schedule", label: "Schedule" },
  { href: "/nhl/history", label: "History" },
  { href: "/nhl/performance", label: "Performance" },
  { href: "/nhl/methodology", label: "Methodology" },
];

export default function NhlLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Nav links={nhlLinks} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
