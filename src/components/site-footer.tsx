"use client";

import { usePathname } from "next/navigation";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/site";

export function ContactLine({ className }: { className?: string }) {
  return (
    <p className={className}>
      Get in touch with feedback, ideas, or anything else:{" "}
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="text-foreground hover:underline underline-offset-4"
      >
        {CONTACT_EMAIL}
      </a>
    </p>
  );
}

export function SiteFooter() {
  // The hub carries the contact line in its hero, so the footer would repeat it.
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <ContactLine className="text-muted-foreground" />
        <nav aria-label="Social" className="flex items-center gap-4">
          {SOCIAL_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
