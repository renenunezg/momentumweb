"use client";

import { NavigationLink as Link } from "@/components/navigation-link";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

const mlbLinks = [
  { href: "/mlb/players", label: "Players" },
  { href: "/mlb/prospects", label: "Prospects" },
  { href: "/mlb/carry", label: "Carry" },
  { href: "/mlb/games", label: "Games" },
  { href: "/mlb/playoffs", label: "Playoffs" },
  { href: "/mlb/history", label: "History" },
  { href: "/mlb/performance", label: "Performance" },
  { href: "/mlb/methodology", label: "Methodology" },
];

export function Nav({
  links = mlbLinks,
}: {
  links?: { href: string; label: string; match?: string[] }[];
}) {
  const pathname = usePathname();

  return (
    <>
      <SiteHeader />
      <nav
        aria-label="Section"
        className="relative z-10 border-b border-border bg-background"
      >
        <div className="mx-auto w-full max-w-7xl min-w-0 px-page-gutter">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : (link.match ?? [link.href]).some((prefix) => pathname.startsWith(prefix));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap px-3 py-3.5 text-xs font-semibold tracking-wide transition-colors ${
                    isActive
                      ? "border-b-2 border-[var(--brand-highlight)] text-primary"
                      : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
