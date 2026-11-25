import { renderProfileCard } from "@/components/share-player-card";
import { fetchPlayerDetails, fetchPlayerValue } from "@/lib/mlb-players";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import {
  PANEL_LABELS,
  PITCHER_GROUPS,
  cardPanels,
  formatMillions,
  headlineValue,
  impactSub,
  outlookLines,
  panelMean,
  panelTraits,
  playerFacts,
  traitLabel,
  valueSub,
  valueTone,
} from "@/lib/player-values";
import { seasonStats } from "@/lib/season-stats";
import { supabaseMlbCached } from "@/lib/supabase";
import { EMPTY, formatNumber, formatSigned } from "@/lib/utils";

// One image per player, drawn on its first request and rebuilt by the grades
// publish webhook, like the player grades page.
export const dynamic = "force-static";
export const revalidate = 604800;
export const generateStaticParams = () => [];

export async function GET(_request: Request, { params }: { params: Promise<{ position: string; playerId: string }> }) {
  const { position, playerId } = await params;
  const id = Number(playerId);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const row = await fetchPlayerValue(id);
  if (!row || row.position_group.toLowerCase() !== position.toLowerCase()) return new Response("Not found", { status: 404 });
  const detail = (await fetchPlayerDetails([id], supabaseMlbCached))[String(id)];
  const pitcher = PITCHER_GROUPS.has(row.position_group);
  const graded = row.grade != null;
  const head = headlineValue(row);
  const lines = seasonStats(detail.seasonStats, pitcher, false);
  return renderProfileCard({
    league: "MLB",
    context: `Projecting the ${row.season} season | Grade is relative to his position`,
    player: {
      name: row.player_name ?? String(row.player_id),
      sub: `${row.team || "FA"} · ${row.position_group}`,
      team: row.team || "FA",
      logo: mlbTeamIdentity(row.team),
      portraitUrl: mlbPlayerHeadshotUrl(row.player_id),
    },
    grade: {
      text: formatNumber(row.grade, 0),
      sub: graded && row.grade_low != null ? `range ${formatNumber(row.grade_low, 0)} to ${formatNumber(row.grade_high, 0)}` : "",
      value: row.grade,
    },
    facts: playerFacts(row),
    headlines: [
      { label: head.label, value: graded ? formatMillions(head.value) : EMPTY, sub: valueSub(row), tone: valueTone(row) },
      { label: "Impact", value: row.impact_war == null ? EMPTY : formatSigned(row.impact_war, 1), sub: impactSub(row, pitcher) },
    ],
    panels: cardPanels(pitcher).flatMap((panel) => {
      const traits = panelTraits(detail.traits, panel);
      const mean = panelMean(detail.traits, panel);
      return traits.length === 0
        ? []
        : [
            {
              title: PANEL_LABELS[panel] ?? panel,
              grade: mean == null ? undefined : formatNumber(mean, 0),
              rows: traits.map((t) => ({
                label: traitLabel(t.trait).label,
                share: t.percentile ?? 0,
                text: t.grade == null ? EMPTY : String(Math.round(t.grade)),
                physical: t.kind === "physical",
                dimmed: !t.in_grade,
              })),
            },
          ];
    }),
    // Impact already shows last season's fWAR, from the valuation's own
    // source, so the season line leaves out its copy of the figure.
    stats: lines && {
      title: `${lines.season} season stats`,
      context: lines.context,
      tiers: lines.tiers.map((tier) => ({ ...tier, stats: tier.stats.filter((stat) => stat.label !== "fWAR") })),
    },
    outlook: detail.outlook.map((year) => outlookLines(year, graded)),
  });
}
