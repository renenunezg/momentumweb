import { PageDescription, PageHeader, PageShell, PageTitle } from "@/components/page-layout";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { playoffPercent } from "@/lib/football-playoff-format";
import { lmbTeamLogo, lmbTeamName } from "@/lib/lmb";
import { fetchLmbPlayoffOdds } from "@/lib/lmb-data";
import type { LmbPlayoffOddsRow } from "@/lib/lmb-types";
import { formatDate } from "@/lib/utils";

// Every read here is expired by the revalidation webhook when its table is
// published, and nothing on the page depends on the clock, so the week is only
// a backstop.
export const revalidate = 604800;
export const metadata: Metadata = {
  title: "LMB Playoff Odds",
  description:
    "Each Liga Mexicana de Béisbol club's chance to reach the playoffs, win its zone and take the Serie del Rey, from simulations of the rest of the season.",
};

const ZONES = ["Norte", "Sur"] as const;
// The odds are stored in basis points.
const COLUMNS: { key: keyof LmbPlayoffOddsRow; label: string; wide?: boolean }[] = [
  { key: "p_playoffs", label: "Playoffs" },
  { key: "p_zone_series", label: "Zone series", wide: true },
  { key: "p_zone_final", label: "Zone final", wide: true },
  { key: "p_final", label: "Final" },
  { key: "p_champion", label: "Champion" },
];

// The NFL division races' table: compact rows, the code on phones and the full
// name from sm up, with the record under it.
function ZoneTable({ rows }: { rows: LmbPlayoffOddsRow[] }) {
  return (
    <Table density="compact">
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="hidden text-right md:table-cell">Proj. wins</TableHead>
          {COLUMNS.map(({ key, label, wide }) => (
            <TableHead key={key} className={wide ? "hidden text-right sm:table-cell" : "text-right"}>
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.team}>
            <TableCell className="whitespace-normal font-sans">
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <TeamLogo team={lmbTeamLogo(row.team)} name={lmbTeamName(row.team)} className="size-5 shrink-0" />
                <span className="type-label font-semibold">
                  <span className="sm:hidden">{row.team}</span>
                  <span className="hidden sm:inline">{lmbTeamName(row.team)}</span>
                </span>
              </span>
              <p className="mt-0.5 type-meta text-muted-foreground">
                {row.wins}-{row.losses}
              </p>
            </TableCell>
            <TableCell className="hidden text-right md:table-cell">{row.proj_wins.toFixed(1)}</TableCell>
            {COLUMNS.map(({ key, wide }) => (
              <TableCell
                key={key}
                className={`text-right ${wide ? "hidden sm:table-cell" : ""} ${key === "p_playoffs" ? "font-semibold text-primary" : ""}`}
              >
                {playoffPercent(Number(row[key]) / 10000)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function LmbPlayoffsPage() {
  const rows = await fetchLmbPlayoffOdds();
  return (
    <PageShell width="wide">
      <PageHeader className="border-b border-border pb-section">
        <div>
          <p className="type-eyebrow mb-2 text-muted-foreground">LMB / Postseason</p>
          <PageTitle>The road to the Serie del Rey</PageTitle>
          <PageDescription className="max-w-2xl">
            Playoff and title odds for every club, from simulations of the rest of the season.
          </PageDescription>
        </div>
        <Trophy className="hidden size-12 shrink-0 text-primary sm:block" aria-hidden="true" />
      </PageHeader>
      {rows.length > 0 ? (
        <div className="min-w-0 space-y-6">
          <p className="type-meta text-muted-foreground">
            {rows[0].season} outlook · Results as of {formatDate(rows[0].as_of)}
          </p>
          <h2 className="type-section">Zone races</h2>
          <div className="grid gap-6">
            {ZONES.map((zone) => (
              <section key={zone} className="min-w-0 space-y-3">
                <h3 className="type-subsection">Zona {zone}</h3>
                <ZoneTable rows={rows.filter((row) => row.zone === zone)} />
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Trophy className="mx-auto mb-4 size-9 text-muted-foreground" aria-hidden="true" />
          <h2 className="type-section">The playoff odds are not available yet</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Odds for the Norte and Sur zones will appear once the season&apos;s first simulation is published; the LMB
            season runs from April to September.
          </p>
        </div>
      )}
    </PageShell>
  );
}
