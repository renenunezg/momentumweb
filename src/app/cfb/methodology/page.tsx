import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { TableOfContents } from "./toc";
import { MethodologyContent } from "./methodology-content";
import { fetchCfbPickExample } from "@/lib/football-pick-example";
import { supabaseCfb } from "@/lib/supabase";

export const revalidate = 1800;
export const metadata: Metadata = {
  title: "College Football Model Methodology",
  description:
    "How the college football model works: possession-based Bayesian ratings, calibrated game distributions, a published line blended with the market, and a live in-game win probability model.",
};

export default async function Page() {
  const [example, backtestVersion] = await Promise.all([
    fetchCfbPickExample(),
    // The backtest table carries its model version on every row; one row names it.
    supabaseCfb.from("backtest_predictions").select("model_version").limit(1).maybeSingle(),
  ]);
  if (backtestVersion.error) throw backtestVersion.error;
  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>College Football Model Methodology</PageTitle>
          <PageDescription>
            Possession-based ratings, calibrated game distributions, and an
            in-game win probability model anchored on the published pregame
            line
          </PageDescription>
        </div>
      </PageHeader>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <TableOfContents />
        <MethodologyContent example={example} backtestVersion={backtestVersion.data?.model_version ?? null} />
      </div>
    </PageShell>
  );
}
