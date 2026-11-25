import { renderProfileCard } from "@/components/share-player-card";
import { lmbFacts, lmbHeadlines, lmbLedger, lmbTeamCode, lmbTeamLogo, parseRatingModel } from "@/lib/lmb";
import { fetchLmbRatingModel, fetchLmbRatings } from "@/lib/lmb-data";
import { lmbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { formatNumber } from "@/lib/utils";

// One image per player, drawn on its first request and rebuilt by the ratings
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(_request: Request, { params }: { params: Promise<{ position: string; playerId: string }> }) {
  const { position, playerId } = await params;
  const id = Number(playerId);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const [rows, model] = await Promise.all([fetchLmbRatings([id]), fetchLmbRatingModel()]);
  const row = rows.find((r) => r.player_id === id);
  if (!row || !model || row.pos.toLowerCase() !== position.toLowerCase()) return new Response("Not found", { status: 404 });
  const fit = parseRatingModel(model.details, row.season);
  const code = lmbTeamCode(row.team_id ?? undefined);
  return renderProfileCard({
    league: "LMB",
    context: `Projecting the ${row.grade_season} season | Runs and WAR from ${row.season}`,
    player: {
      name: row.name,
      sub: `${code ?? "No club"} · ${row.pos}`,
      team: code ?? "LMB",
      logo: code ? lmbTeamLogo(code) : undefined,
      portraitUrl: lmbPlayerHeadshotUrl(row.player_id),
    },
    grade: {
      text: formatNumber(row.grade, 0),
      sub: row.grade == null ? "" : `range ${formatNumber(row.grade_lo, 0)} to ${formatNumber(row.grade_hi, 0)}`,
      value: row.grade,
    },
    facts: lmbFacts(row),
    headlines: lmbHeadlines(row),
    stats: {
      title: `${row.season} WAR ledger`,
      context: fit.runsPerWin == null ? "" : `${formatNumber(fit.runsPerWin, 2)} runs per win`,
      tiers: [{ label: "Runs", stats: lmbLedger(row, fit) }],
    },
  });
}
