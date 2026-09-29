import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { TableOfContents } from "./toc";
import { MethodologyContent } from "./methodology-content";
import { fetchNflPickExample } from "@/lib/football-pick-example";

export const revalidate = 1800;
export const metadata: Metadata = {
  title: "NFL Model Methodology",
  description:
    "How the NFL model works: drive-based Bayesian ratings from EPA and points, quarterback and rest adjustments, a capped market blend, and an honest backtest.",
};

export default async function Page() {
  const example = await fetchNflPickExample();
  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>NFL Model Methodology</PageTitle>
          <PageDescription>
            Drive-based Bayesian ratings from EPA and points, QB and rest
            adjustments, a capped market blend, and an honest backtest
          </PageDescription>
        </div>
      </PageHeader>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <TableOfContents />
        <MethodologyContent example={example} />
      </div>
    </PageShell>
  );
}
