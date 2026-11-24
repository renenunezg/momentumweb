import type { ReactNode } from "react";
import { renderShareFrame, ShareLogo, SHARE_COLORS as C } from "@/components/share-card";
import { ELLIPSIS, NOT_FOUND, POSTER_HEADERS, POSTER_SIZE, gradeStrength, heatFill, loadPortrait } from "@/components/share-poster";
import { footballSeasonStats } from "@/lib/football-season-stats";
import { hockeySeasonStats } from "@/lib/hockey-season-stats";
import { barLook, cardHeadlines, nilLine, rankByPosition, traitLines, traitSections, type CardHeadline } from "@/lib/player-card";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import type { GradedPlayer, GradedPlayerTrait, GradeTeam, PositionGrades } from "@/lib/position-grades";
import { POSITION_LABELS, SPORT_COPY, TRAIT_SECTION_LABELS, isUnitRow, traitLabel, type GradeSport } from "@/lib/position-traits";
import type { SeasonStat } from "@/lib/season-stats";
import { EMPTY, formatNumber } from "@/lib/utils";

// One player's opened card as a post-sized image: his headline numbers, every
// trait bar and his season line, by the same rules as the page (lib/player-card).

const PORTRAIT = 136;
const TILE_HEIGHT = 112;
const STAT_HEIGHT = 58;
const GAP = 20;
// The frame around the body: its padding, header and footer, with breathing room.
const CHROME_HEIGHT = 260;
// Room for the body in the tallest image, the 4:5 poster.
const BODY_HEIGHT = POSTER_SIZE.height - CHROME_HEIGHT;
const TRAIT_HEIGHT = 36;
const MAX_TILES_PER_ROW = 5;
// A lone headline keeps a tile's width instead of stretching across the card.
const MIN_TILES_PER_ROW = 3;
const MAX_STATS_PER_ROW = 8;
const MAX_STAT_ROWS = 3;

const TONES: Record<string, string> = { "text-positive": C.positive, "text-destructive": C.negative };

function Tile({ headline, width }: { headline: CardHeadline; width: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
        width,
        height: TILE_HEIGHT,
        padding: "0 14px",
        border: `1.5px solid ${C.rule}`,
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 15, color: C.gray, letterSpacing: 1.5, textTransform: "uppercase", ...ELLIPSIS }}>{headline.label}</div>
      <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: (headline.tone && TONES[headline.tone]) || C.white, ...ELLIPSIS }}>
        {headline.value}
      </div>
      <div style={{ display: "flex", maxHeight: 36, overflow: "hidden", fontSize: 14, lineHeight: 1.25, color: C.gray }}>{headline.sub || " "}</div>
    </div>
  );
}

function barColor(trait: GradedPlayerTrait | undefined): string {
  const look = barLook(trait);
  return look.inferred ? C.blue : look.style ? C.gray : C.green;
}

function TraitBar({ sport, name, trait, height, size }: { sport: GradeSport; name: string; trait: GradedPlayerTrait | undefined; height: number; size: number }) {
  const { label, short = label } = traitLabel(name, sport);
  const { dimmed } = barLook(trait);
  const pct = trait?.percentile ?? null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height, color: dimmed ? C.gray : C.white }}>
      <div style={{ flex: 1, fontSize: size, ...ELLIPSIS }}>{short}</div>
      <div style={{ display: "flex", width: 150, height: 8, borderRadius: 2, background: C.grid }}>
        <div style={{ width: `${pct ?? 0}%`, height: "100%", borderRadius: 2, background: barColor(trait), opacity: dimmed ? 0.4 : 1 }} />
      </div>
      <div style={{ display: "flex", width: 32, justifyContent: "flex-end", fontSize: size - 2, color: C.gray }}>
        {pct == null ? EMPTY : Math.round(pct)}
      </div>
    </div>
  );
}

type TraitBlock = { title: string | null; names: string[] };

// Sections down two columns: whole sections where there are several, split at
// the boundary that best balances them, and a lone section cut in half.
function traitColumns(sections: { kind: string | null; names: string[] }[], label: (kind: string | null) => string): TraitBlock[][] {
  const blocks = sections.map((section) => ({ title: label(section.kind), names: section.names }));
  if (blocks.length === 1) {
    const half = Math.ceil(blocks[0].names.length / 2);
    return [[{ title: blocks[0].title, names: blocks[0].names.slice(0, half) }], [{ title: null, names: blocks[0].names.slice(half) }]];
  }
  const size = (list: TraitBlock[]) => list.reduce((sum, block) => sum + block.names.length + 1, 0);
  let cut = 1;
  for (let at = 1; at < blocks.length; at++) {
    const gap = (i: number) => Math.abs(size(blocks.slice(0, i)) - size(blocks.slice(i)));
    if (gap(at) < gap(cut)) cut = at;
  }
  return [blocks.slice(0, cut), blocks.slice(cut)];
}

const LEGEND = [
  { label: "Measured", color: C.green, opacity: 1, show: () => true },
  { label: "Inferred from teammates or unit results", color: C.blue, opacity: 1, show: (looks: ReturnType<typeof barLook>[]) => looks.some((l) => l.inferred) },
  { label: "Style or role", color: C.gray, opacity: 1, show: (looks: ReturnType<typeof barLook>[]) => looks.some((l) => l.style) },
  { label: "Not graded", color: C.green, opacity: 0.4, show: (looks: ReturnType<typeof barLook>[]) => looks.some((l) => l.dimmed) },
];

function Section({ children, gap = 0 }: { children: ReactNode; gap?: number }) {
  return <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>;
}

export async function renderPlayerCard({
  league,
  sport,
  position,
  athleteId,
  context,
  grades,
  teams,
  loadPlayer,
}: {
  league: string;
  sport: GradeSport;
  position: string;
  athleteId: string;
  context: string;
  grades: PositionGrades;
  teams: GradeTeam[];
  // A player's full rows when the page's own read did not carry them.
  loadPlayer: (season: number, athleteId: string) => Promise<GradedPlayer | undefined>;
}) {
  const id = decodeURIComponent(athleteId);
  const row = grades.index.find((r) => r.athleteId === id && r.positionGroup.toLowerCase() === position.toLowerCase());
  if (!row || grades.season == null) return NOT_FOUND();
  const player = grades.details[id] ?? (await loadPlayer(grades.season, id));
  if (!player) return NOT_FOUND();

  const unit = isUnitRow(id);
  const logo = teams.find((t) => t.team === row.team);
  const portrait = unit ? null : await loadPortrait(row.headshotUrl ?? cfbPlayerHeadshotUrl(id, 320));
  const [grade, ...headlines] = cardHeadlines({
    sport,
    row,
    player,
    positionRank: sport === "nfl" ? rankByPosition(grades.index).get(id) : undefined,
  });
  const nil = sport === "cfb" && player.nilPrice != null ? nilLine(player) : null;

  const tileRows = Math.ceil(headlines.length / MAX_TILES_PER_ROW);
  const perRow = Math.max(MIN_TILES_PER_ROW, tileRows ? Math.ceil(headlines.length / tileRows) : 1);
  const inner = POSTER_SIZE.width - 144;
  const tileWidth = Math.floor((inner - 12 * (perRow - 1)) / perRow);

  const stats = sport === "nhl" ? hockeySeasonStats(player.seasonStats) : footballSeasonStats(sport, player.seasonStats);
  // Whole tiers of the season line, while they fit in a few rows; a tier too
  // long for one row splits evenly.
  const tiers: { label: string; rows: SeasonStat[][] }[] = [];
  let statRows = 0;
  for (const tier of stats?.tiers ?? []) {
    const rows = Math.ceil(tier.stats.length / MAX_STATS_PER_ROW);
    if (rows === 0 || statRows + rows > MAX_STAT_ROWS) break;
    const per = Math.ceil(tier.stats.length / rows);
    tiers.push({ label: tier.label, rows: Array.from({ length: rows }, (_, at) => tier.stats.slice(at * per, (at + 1) * per)) });
    statRows += rows;
  }
  const statsHeight = tiers.length ? 30 + tiers.length * 24 + statRows * (STAT_HEIGHT + 6) : 0;

  const lines = traitLines(sport, [player]);
  const columns = lines.length
    ? traitColumns(traitSections(lines), (kind) => (kind ? TRAIT_SECTION_LABELS[kind as keyof typeof TRAIT_SECTION_LABELS].label : "Attributes"))
    : [];
  const slots = Math.max(1, ...columns.map((blocks) => blocks.reduce((sum, block) => sum + block.names.length + 1, 0)));
  const used = PORTRAIT + (tileRows ? GAP + tileRows * (TILE_HEIGHT + 12) : 0) + (nil ? 34 : 0) + (statsHeight ? GAP + statsHeight : 0) + GAP + 34;
  const traitHeight = Math.max(20, Math.min(TRAIT_HEIGHT, Math.floor((BODY_HEIGHT - used) / slots)));
  // A card with few traits is a shorter image, so nothing floats in empty space.
  const size = { width: POSTER_SIZE.width, height: Math.min(POSTER_SIZE.height, CHROME_HEIGHT + used + slots * traitHeight) };
  const traitSize = Math.max(15, Math.min(21, Math.round(traitHeight * 0.62)));
  const looks = player.traits.filter((t) => lines.some((line) => line.name === t.trait)).map(barLook);

  return renderShareFrame({
    eyebrow: league,
    size,
    headers: POSTER_HEADERS,
    body: (
      <Section gap={GAP}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, height: PORTRAIT }}>
          {portrait ? (
            <div style={{ display: "flex", width: PORTRAIT, height: PORTRAIT, borderRadius: PORTRAIT / 2, overflow: "hidden", background: C.rule }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws only <img>; next/image cannot render in an ImageResponse */}
              <img src={portrait} width={PORTRAIT} height={PORTRAIT} alt="" style={{ objectFit: "contain" }} />
            </div>
          ) : (
            <ShareLogo team={logo} name={row.team} size={PORTRAIT - 16} />
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
            <div style={{ fontSize: 54, fontWeight: 600, lineHeight: 1.05, ...ELLIPSIS }}>{unit ? `${row.team} offensive line` : row.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, color: C.gray }}>
              {!unit && portrait && <ShareLogo team={logo} name={row.team} size={30} />}
              {`${unit ? "Unit" : row.team} · ${POSITION_LABELS[row.positionGroup as keyof typeof POSITION_LABELS] ?? row.positionGroup} · ${formatNumber(row.games, 0)} games`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 15, color: C.gray, letterSpacing: 1.5, textTransform: "uppercase" }}>{grade.label}</div>
            <div
              style={{
                display: "flex",
                width: 150,
                height: 76,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: heatFill(row.grade == null ? null : gradeStrength(row.grade)),
                color: C.onFill,
                fontSize: 50,
                fontWeight: 600,
              }}
            >
              {grade.value}
            </div>
            <div style={{ fontSize: 16, color: C.gray }}>{grade.sub || " "}</div>
          </div>
        </div>

        {headlines.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {headlines.map((headline) => (
              <Tile key={headline.key} headline={headline} width={tileWidth} />
            ))}
          </div>
        )}
        {nil && <div style={{ display: "flex", justifyContent: "center", fontSize: 18, color: C.gray }}>{nil}</div>}

        {columns.length > 0 && (
          <Section gap={10}>
            <div style={{ display: "flex", gap: 40 }}>
              {columns.map((blocks, at) => (
                <div key={at} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  {blocks.flatMap((block, i) => [
                    <div
                      key={`title-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        height: traitHeight,
                        paddingBottom: 4,
                        borderBottom: `1.5px solid ${C.rule}`,
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: 1.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {block.title ?? " "}
                    </div>,
                    ...block.names.map((name) => (
                      <TraitBar key={name} sport={sport} name={name} trait={player.traits.find((t) => t.trait === name)} height={traitHeight} size={traitSize} />
                    )),
                  ])}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 22, fontSize: 15, color: C.gray }}>
              {LEGEND.filter((item) => item.show(looks)).map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 22, height: 8, borderRadius: 2, background: item.color, opacity: item.opacity }} />
                  {item.label}
                </div>
              ))}
            </div>
          </Section>
        )}

        {stats && tiers.length > 0 && (
          <Section gap={6}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 24, fontSize: 17 }}>
              <div style={{ fontWeight: 600 }}>{`${stats.season} season stats`}</div>
              <div style={{ color: C.gray, fontSize: 15 }}>{stats.context}</div>
            </div>
            {tiers.map((tier) => (
              <Section key={tier.label} gap={6}>
                <div style={{ fontSize: 13, color: C.gray, letterSpacing: 1.5, textTransform: "uppercase" }}>{tier.label}</div>
                {tier.rows.map((row, at) => (
                  <div key={at} style={{ display: "flex", gap: 6 }}>
                    {row.map((stat) => (
                      <div
                        key={stat.label}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          height: STAT_HEIGHT,
                          border: `1.5px solid ${C.rule}`,
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ fontSize: 13, color: C.gray, whiteSpace: "nowrap" }}>{stat.label}</div>
                        <div style={{ fontSize: 21, fontWeight: 600 }}>{stat.value ?? EMPTY}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </Section>
            ))}
          </Section>
        )}
      </Section>
    ),
    footer: (
      <div style={{ display: "flex", maxWidth: 740, fontSize: 19, lineHeight: 1.3, color: C.gray }}>
        {`${context} | Bars are percentiles among ${SPORT_COPY[sport].pool} at the position`}
      </div>
    ),
  });
}
