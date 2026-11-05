import type { Metadata } from "next";
import Link from "next/link";
import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import { LastUpdated } from "@/components/last-updated";
import { SwingLab } from "@/components/mlb-swing-lab";
import { fetchCarry } from "@/lib/mlb-carry";

// The lab on its own URL so a shared link gets the lab's card: X never sees
// /mlb/carry#lab's fragment. The carry study's reads are webhook-covered and
// nothing here depends on the clock, so the week is only a backstop.
export const revalidate = 604800;

export const metadata: Metadata = {
  title: "MLB Swing Lab",
  description:
    "Change any MLB hitter's swing plane and see how far his fly balls would carry and how his season line would move, from batted-ball physics and the hitters who really changed.",
};

export default async function MlbSwingLabPage() {
  // A failed read throws so ISR keeps the last good page.
  const { study, hitters, updatedAt } = await fetchCarry();
  if (!study) {
    return (
      <PageShell>
        <PageTitle>Swing lab</PageTitle>
        <p className="text-muted-foreground">The carry study has not been published yet.</p>
      </PageShell>
    );
  }

  const season = study.season;
  const current = hitters.filter((h) => h.season === season);

  return (
    <PageShell>
      <PageHeader>
        <div>
          <PageTitle>Swing lab</PageTitle>
          <PageDescription className="type-eyebrow">Through the {season} season</PageDescription>
        </div>
        <LastUpdated timestamp={updatedAt} schedule="Updates each offseason" />
      </PageHeader>

      <div className="max-w-3xl space-y-3 text-sm leading-relaxed">
        <p>
          Pick a hitter or a generic one and change his swing. Carry comes from rerunning the collision and flight physics on his own
          batted balls with each ball&apos;s contact held fixed; the season line comes from the hitters who changed. The{" "}
          <Link href="/mlb/carry" className="underline underline-offset-2 hover:text-foreground">
            carry study
          </Link>{" "}
          explains where the numbers come from.
        </p>
      </div>

      <SwingLab study={{ season, lab: study.lab, swing_types: study.swing_types, changers: { coefficients: study.changers.coefficients } }} hitters={current} />
    </PageShell>
  );
}
