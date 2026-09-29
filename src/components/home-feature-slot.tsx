import type { ReactNode } from "react";
import Link from "next/link";
import { PageSection } from "@/components/page-layout";

export type HomeFeature = {
  id: string;
  label: string;
  title: string;
  description?: string;
  period?: string;
  content: ReactNode;
  note?: string;
  link: { href: string; label: string };
};

export function HomeFeatureSlot({ feature }: { feature: HomeFeature }) {
  const headingId = `home-feature-${feature.id}`;

  return (
    <aside aria-labelledby={headingId} className="min-w-0 self-start max-lg:w-full max-lg:max-w-xl lg:border-l lg:border-border lg:pl-section">
      <PageSection>
        <div className="flex items-baseline justify-between gap-heading">
          <h2 id={headingId} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {feature.label}
          </h2>
          {feature.period && <span className="text-xs text-muted-foreground">{feature.period}</span>}
        </div>
        <div className="space-y-section border-y border-rule-strong py-section text-sm">
          <header className="space-y-heading">
            <h3 className="font-heading text-xl">{feature.title}</h3>
            {feature.description && <p className="text-xs text-muted-foreground">{feature.description}</p>}
          </header>
          {feature.content}
        </div>
        <footer className="space-y-heading text-xs">
          {feature.note && <p className="text-muted-foreground">{feature.note}</p>}
          <Link href={feature.link.href} className="flex items-center justify-between gap-heading font-mono uppercase tracking-wider underline-offset-4 hover:underline">
            {feature.link.label} <span aria-hidden="true">&rarr;</span>
          </Link>
        </footer>
      </PageSection>
    </aside>
  );
}
