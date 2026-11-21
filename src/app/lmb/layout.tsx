import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "LMB Forecasts & Analysis",
  description:
    "Liga Mexicana de Béisbol game forecasts from a lineup simulation, compared with the Kalshi market and graded in public.",
};

const lmbLinks = [
  { href: "/lmb/players", label: "Players" },
  { href: "/lmb/prospects", label: "Prospects" },
  { href: "/lmb/games", label: "Games" },
  { href: "/lmb/playoffs", label: "Playoffs" },
  { href: "/lmb/awards", label: "Awards" },
  { href: "/lmb/history", label: "History" },
  { href: "/lmb/performance", label: "Performance" },
  { href: "/lmb/methodology", label: "Methodology" },
];

export default function LmbLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Nav links={lmbLinks} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
