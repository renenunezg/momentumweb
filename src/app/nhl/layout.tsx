import type { Metadata } from "next";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "NHL Model Predictions",
  description:
    "Daily NHL win probabilities, goal totals, and partner-book picks from a Poisson goal model built on shot-quality windows.",
};

const nhlLinks = [
  { href: "/nhl/methodology", label: "Methodology" },
  { href: "/nhl/games", label: "Games" },
  { href: "/nhl/ratings", label: "Ratings" },
  { href: "/nhl/schedule", label: "Schedule" },
  { href: "/nhl/history", label: "History" },
  { href: "/nhl/performance", label: "Performance" },
  { href: "/about", label: "About" },
];

export default function NhlLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Nav links={nhlLinks} />
      {children}
    </>
  );
}
