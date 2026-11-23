"use client";

import { useState } from "react";
import { PlayerCell } from "@/components/player-cell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViewTabPanel, ViewTabs } from "@/components/view-tabs";
import { lmbLevelLabel, statsApiTeamLogo } from "@/lib/lmb";
import type { LmbProspectRow } from "@/lib/lmb-types";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { PROSPECT_PAGE, PROSPECT_ROLES, type ProspectRole } from "@/lib/prospect-values";
import { formatNumber } from "@/lib/utils";

const ROLE_CODE: Record<ProspectRole, LmbProspectRow["role"]> = { hitter: "H", pitcher: "P" };

// One role's prospects in rank order, PROSPECT_PAGE at a time like the MLB list.
function ProspectRanks({ rows, noun }: { rows: LmbProspectRow[]; noun: string }) {
  const [shown, setShown] = useState(PROSPECT_PAGE);
  const visible = rows.slice(0, shown);
  return (
    <>
      <p className="max-w-4xl text-sm text-muted-foreground leading-relaxed">
        {rows.length === 0 ? `No ${noun} are ranked.` : `Showing ${visible.length} of ${formatNumber(rows.length, 0)} ${noun}.`}
      </p>
      <Table>
        <TableHeader>
          <TableRow className="type-eyebrow [&>th]:text-muted-foreground">
            <TableHead className="w-8">#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Age</TableHead>
            <TableHead className="hidden sm:table-cell">Born in Mexico</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={row.player_id}>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.role_rank}</TableCell>
              <TableCell className="min-w-56 max-w-72">
                <PlayerCell
                  athleteId={String(row.player_id)}
                  headshotUrl={lmbPlayerHeadshotUrl(row.player_id)}
                  name={row.name}
                  team={[row.team, lmbLevelLabel(row.level)].filter(Boolean).join(" · ")}
                  position={null}
                  logo={statsApiTeamLogo(row.team_id)}
                />
              </TableCell>
              <TableCell className="font-mono tabular-nums">{formatNumber(row.age, 1)}</TableCell>
              <TableCell className="hidden font-mono text-xs sm:table-cell">{row.mexican_born ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {shown < rows.length && (
        <button
          type="button"
          onClick={() => setShown(shown + PROSPECT_PAGE)}
          className="min-h-10 self-start rounded-md border border-border px-4 text-sm text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          Show {Math.min(PROSPECT_PAGE, rows.length - shown)} more
        </button>
      )}
    </>
  );
}

export default function LmbProspects({ rows }: { rows: LmbProspectRow[] }) {
  const [role, setRole] = useState<ProspectRole>("hitter");
  return (
    <ViewTabs label="Prospect role" options={PROSPECT_ROLES} value={role} onValueChange={setRole}>
      {PROSPECT_ROLES.map(({ key, label }) => (
        <ViewTabPanel key={key} value={key} className="space-y-section">
          <ProspectRanks rows={rows.filter((row) => row.role === ROLE_CODE[key])} noun={label.toLowerCase()} />
        </ViewTabPanel>
      ))}
    </ViewTabs>
  );
}
