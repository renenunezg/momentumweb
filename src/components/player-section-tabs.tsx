"use client";

import { usePathname } from "next/navigation";
import { NavigationLink as Link } from "@/components/navigation-link";
import { cn } from "@/lib/utils";
import { TAB_ITEM, TAB_LIST, TAB_OFF, TAB_ON } from "@/lib/tab-styles";

// The player pages under one Players nav entry. Links rather than a tablist:
// each is its own route with its own data and metadata.
export const CFB_PLAYER_SECTIONS = [
  { href: "/cfb/players", label: "Grades" },
  { href: "/cfb/heisman", label: "Heisman" },
  { href: "/cfb/draft", label: "Draft" },
] as const;
export const NFL_PLAYER_SECTIONS = [
  { href: "/nfl/players", label: "Grades" },
  { href: "/nfl/awards", label: "Awards" },
] as const;
// The carry study and its lab share the MLB Swing Lab nav entry.
export const MLB_SWING_SECTIONS = [
  { href: "/mlb/swing-lab", label: "Swing lab" },
  { href: "/mlb/carry", label: "Carry study" },
] as const;

export function PlayerSectionTabs({
  sections = CFB_PLAYER_SECTIONS,
  label = "Player pages",
  className,
}: {
  sections?: readonly { href: string; label: string }[];
  label?: string;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className={cn(TAB_LIST, className)}
    >
      {sections.map((section) => {
        const active = pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(TAB_ITEM, active ? TAB_ON : TAB_OFF)}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
