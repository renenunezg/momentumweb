import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { TableOfContents } from "./toc";
import { MethodologyContent } from "./methodology-content";

export const metadata: Metadata = {
  title: "NHL Model Methodology",
  description:
    "How the NHL model works: last-25-game shot-quality windows by venue and situation, a linear goal map, attack and defense strengths, a Poisson goal grid, and partner-book pricing with frozen picks.",
};

export default function Page() {
  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NHL Model Methodology</PageTitle>
          <PageDescription>
            Shot-quality windows, a Poisson goal grid, and frozen partner-book
            picks: the spreadsheet model, run daily
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
