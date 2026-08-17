import type { Metadata } from "next";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "CFB Model Ratings",
  description:
    "College football power ratings, weekly spread and total projections, and model performance against the closing line.",
};

const cfbLinks = [
  { href: "/cfb/methodology", label: "Methodology" },
  { href: "/cfb/ratings", label: "Ratings" },
  { href: "/cfb/schedule", label: "Schedule" },
  { href: "/cfb/history", label: "History" },
  { href: "/cfb/performance", label: "Performance" },
  { href: "/about", label: "About" },
];

export default function CfbLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Nav links={cfbLinks} />
      {children}
    </>
  );
}
