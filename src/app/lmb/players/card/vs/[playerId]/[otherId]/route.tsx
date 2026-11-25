import { renderMetricsComparison, type ComparisonPlayer } from "@/components/share-player-card";
import { lmbComparisonMetrics, lmbTeamCode, lmbTeamLogo } from "@/lib/lmb";
import { fetchLmbRatings } from "@/lib/lmb-data";
import type { LmbPlayerRatingRow } from "@/lib/lmb-types";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";

// One image per pair of players, drawn on its first request and rebuilt by
// the ratings publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

function face(row: LmbPlayerRatingRow): ComparisonPlayer {
  const code = lmbTeamCode(row.team_id ?? undefined);
  return {
    name: row.name,
    sub: `${code ?? "No club"} · ${row.pos}`,
    team: code ?? "LMB",
    logo: code ? lmbTeamLogo(code) : undefined,
    portraitUrl: lmbPlayerHeadshotUrl(row.player_id),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ playerId: string; otherId: string }> }) {
  const { playerId, otherId } = await params;
  const ids: [number, number] = [Number(playerId), Number(otherId)];
  if (!ids.every(Number.isInteger) || ids[0] === ids[1]) return new Response("Not found", { status: 404 });
  const rows = await fetchLmbRatings(ids);
  const first = rows.find((row) => row.player_id === ids[0]);
  const second = rows.find((row) => row.player_id === ids[1]);
  if (!first || !second) return new Response("Not found", { status: 404 });
  return renderMetricsComparison({
    league: "LMB",
    context: `Projecting the ${first.grade_season} season | Runs and WAR from ${first.season}`,
    players: [face(first), face(second)],
    metrics: lmbComparisonMetrics([first, second]),
  });
}
