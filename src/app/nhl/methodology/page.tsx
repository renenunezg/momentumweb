import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { TableOfContents } from "./toc";
import { MethodologyContent } from "./methodology-content";

export const metadata: Metadata = {
  title: "NHL Model Methodology",
  description:
    "How the NHL model works: 50-game goal and expected-goal windows shrunk to the league average, attack and defense strengths, a Poisson goal grid, the sportsbook market with a back-to-back adjustment, and partner-book pricing with frozen predictions.",
};

export default function Page() {
  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NHL Model Methodology</PageTitle>
          <PageDescription>
            Goal and expected-goal strengths, a Poisson goal grid, the
            market price, and frozen partner-book predictions, run daily
          </PageDescription>
        </div>
      </PageHeader>
      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <TableOfContents />
        <MethodologyContent />
      </div>
    </PageShell>
  );
}
