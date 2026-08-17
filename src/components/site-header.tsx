import Link from "next/link";
import { HeaderDate } from "@/components/header-date";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/mlb", label: "MLB" },
  { href: "/cfb", label: "CFB" },
  { href: "/nfl", label: "NFL" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-heading text-lg tracking-tight">
            Home
          </Link>
          <HeaderDate />
        </div>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
