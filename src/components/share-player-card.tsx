import type { ReactNode } from "react";
import { renderShareFrame, ShareLogo, SHARE_COLORS as C } from "@/components/share-card";
import { ELLIPSIS, NOT_FOUND, POSTER_HEADERS, POSTER_SIZE, gradeStrength, heatFill, loadPortrait } from "@/components/share-poster";
import { footballSeasonStats } from "@/lib/football-season-stats";
import { hockeySeasonStats } from "@/lib/hockey-season-stats";
import {
  barLook,
  cardHeadlines,
  compareHeadlines,
  nilLine,
  rankByPosition,
  traitLines,
  traitSections,
  type CardHeadline,
} from "@/lib/player-card";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import type { GradedPlayer, GradedPlayerTrait, GradeTeam, PlayerIndexRow, PositionGrades } from "@/lib/position-grades";
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
// A section title keeps this height however tight its rows are, so it never
// sits on the row above it.
const SECTION_TITLE_HEIGHT = 30;
const MAX_TILES_PER_ROW = 5;
// The footer note wraps to a second line past about this many characters.
const FOOTER_LINE_CHARS = 92;
const FOOTER_LINE_HEIGHT = 26;

const footerNote = (context: string, sport: GradeSport) => `${context} | Among ${SPORT_COPY[sport].pool} at the position`;

const PERCENTILE_NOTE_HEIGHT = 24;

// How to read a bar, said once above them. The model repos publish every
// lower-is-better stat (sacks, interceptions, fumbles) flipped, so a longer bar
// is the better result on all but the style and role sections.
function PercentileNote({ sport, centered = false }: { sport: GradeSport; centered?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: centered ? "center" : "flex-start", gap: 8, height: PERCENTILE_NOTE_HEIGHT, fontSize: 17 }}>
      <div style={{ fontWeight: 600, color: C.green }}>Bars are percentiles.</div>
      <div style={{ color: C.gray }}>
        {sport === "nhl" ? "Longer is better on every stat." : "Longer is better, and on sacks or turnovers longer means fewer."}
      </div>
    </div>
  );
}

// A section's heading. Style and role bars measure how much a player does
// something, so their heading says how to read them.
function sectionTitle(kind: string | null): string {
  if (!kind) return "Attributes";
  const { label } = TRAIT_SECTION_LABELS[kind as keyof typeof TRAIT_SECTION_LABELS];
  return kind === "style" || kind === "role" ? `${label} (longer means more)` : label;
}
const footerExtra = (note: string) => (note.length > FOOTER_LINE_CHARS ? FOOTER_LINE_HEIGHT : 0);

// A name in one line: the type steps down for a long one.
const nameSize = (name: string, width: number, max: number, min: number) =>
  Math.max(min, Math.min(max, Math.floor(width / (name.length * 0.54))));
const MAX_STATS_PER_ROW = 8;
const MAX_STAT_ROWS = 3;

const TONES: Record<string, string> = { "text-positive": C.positive, "text-destructive": C.negative };

function Tile({ headline }: { headline: CardHeadline }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 2,
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
  // A single trait takes the full width; half a card would cut its label short
  // beside an empty column.
  if (blocks.length === 1 && blocks[0].names.length === 1) return [blocks];
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

interface CardSource {
  league: string;
  sport: GradeSport;
  position: string;
  context: string;
  grades: PositionGrades;
  teams: GradeTeam[];
  // Full card rows for players the page's own read did not carry.
  loadPlayers: (season: number, athleteIds: string[]) => Promise<Record<string, GradedPlayer>>;
}

// Each requested player's index row and full rows, in order; a player who is
// not graded at the position comes back undefined.
async function findPlayers(
  { position, grades, loadPlayers }: Pick<CardSource, "position" | "grades" | "loadPlayers">,
  athleteIds: string[],
): Promise<({ row: PlayerIndexRow; player: GradedPlayer } | undefined)[]> {
  const rows = athleteIds.map((athleteId) => {
    const id = decodeURIComponent(athleteId);
    return grades.index.find((r) => r.athleteId === id && r.positionGroup.toLowerCase() === position.toLowerCase());
  });
  const missing = rows.flatMap((row) => (row && !grades.details[row.athleteId] ? [row.athleteId] : []));
  const loaded = grades.season != null && missing.length ? await loadPlayers(grades.season, missing) : {};
  return rows.map((row) => {
    const player = row && (grades.details[row.athleteId] ?? loaded[row.athleteId]);
    return row && player ? { row, player } : undefined;
  });
}

// A unit has no face, and a player's may be missing from the CDN.
function loadFace(row: PlayerIndexRow): Promise<string | null> {
  return isUnitRow(row.athleteId) ? Promise.resolve(null) : loadPortrait(row.headshotUrl ?? cfbPlayerHeadshotUrl(row.athleteId, 320));
}

const positionName = (group: string) => POSITION_LABELS[group as keyof typeof POSITION_LABELS] ?? group;
const displayName = (row: PlayerIndexRow) => (isUnitRow(row.athleteId) ? `${row.team} offensive line` : row.name);

export async function renderPlayerCard({
  league,
  sport,
  position,
  athleteId,
  context,
  grades,
  teams,
  loadPlayers,
}: CardSource & { athleteId: string }) {
  const [found] = await findPlayers({ position, grades, loadPlayers }, [athleteId]);
  if (!found) return NOT_FOUND();
  const { row, player } = found;
  const id = row.athleteId;

  const unit = isUnitRow(id);
  const logo = teams.find((t) => t.team === row.team);
  const portrait = await loadFace(row);
  const [grade, ...headlines] = cardHeadlines({
    sport,
    row,
    player,
    positionRank: sport === "nfl" ? rankByPosition(grades.index).get(id) : undefined,
  });
  const nil = sport === "cfb" && player.nilPrice != null ? nilLine(player) : null;

  // Headlines in even rows, each row filling the width.
  const tileRows = Math.ceil(headlines.length / MAX_TILES_PER_ROW);
  const perRow = tileRows ? Math.ceil(headlines.length / tileRows) : 1;
  const tiles = Array.from({ length: tileRows }, (_, at) => headlines.slice(at * perRow, (at + 1) * perRow));
  const note = footerNote(context, sport);

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
    ? traitColumns(traitSections(lines), sectionTitle)
    : [];
  // Rows and titles of the taller column; an untitled block still holds its
  // title's space so the two columns stay level.
  const traitRows = Math.max(1, ...columns.map((blocks) => blocks.reduce((sum, block) => sum + block.names.length, 0)));
  const titlesHeight = Math.max(0, ...columns.map((blocks) => blocks.length)) * SECTION_TITLE_HEIGHT;
  const used =
    PORTRAIT + tileRows * (GAP + TILE_HEIGHT) + (nil ? 34 : 0) + (statsHeight ? GAP + statsHeight : 0) + GAP + 34 + PERCENTILE_NOTE_HEIGHT + 10 + titlesHeight;
  const traitHeight = Math.max(20, Math.min(TRAIT_HEIGHT, Math.floor((BODY_HEIGHT - used) / traitRows)));
  // A card with few traits is a shorter image, so nothing floats in empty space.
  const size = {
    width: POSTER_SIZE.width,
    height: Math.min(POSTER_SIZE.height, CHROME_HEIGHT + footerExtra(note) + used + traitRows * traitHeight),
  };
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
            <div style={{ fontSize: nameSize(displayName(row), 590, 54, 34), fontWeight: 600, lineHeight: 1.05, ...ELLIPSIS }}>
              {displayName(row)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, color: C.gray }}>
              {!unit && portrait && <ShareLogo team={logo} name={row.team} size={30} />}
              {`${unit ? "Unit" : row.team} · ${positionName(row.positionGroup)} · ${formatNumber(row.games, 0)} games`}
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

        {tiles.map((row, at) => (
          <div key={at} style={{ display: "flex", gap: 12 }}>
            {row.map((headline) => (
              <Tile key={headline.key} headline={headline} />
            ))}
          </div>
        ))}
        {nil && <div style={{ display: "flex", justifyContent: "center", fontSize: 18, color: C.gray }}>{nil}</div>}

        {columns.length > 0 && (
          <Section gap={10}>
            <PercentileNote sport={sport} />
            <div style={{ display: "flex", gap: 40 }}>
              {columns.map((blocks, at) => (
                <div key={at} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  {blocks.flatMap((block, i) => [
                    <div
                      key={`title-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        height: SECTION_TITLE_HEIGHT,
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
        {note}
      </div>
    ),
  });
}

const FACE = 104;
// What a name has beside its portrait, with "vs" between the two players.
const COMPARE_NAME_WIDTH = 290;
const HEADLINE_ROW = 46;
const COMPARE_TRAIT_HEIGHT = 34;
const COMPARE_STAT_ROW = 28;
const COMPARE_STAT_TITLE = 30;
// A pair carries two players' rows, each stat on a row of its own, so its
// image may run taller than the 4:5 poster before the rows are squeezed.
const COMPARE_BODY_HEIGHT = 1740 - CHROME_HEIGHT;
// Trait rows at least this tall leave room for a further tier of stats.
const ROOMY_TRAIT_HEIGHT = 20;
const SIDE_COLORS = [C.green, C.blue];

function CompareIdentity({
  row,
  logo,
  portrait,
  side,
  size,
}: {
  row: PlayerIndexRow;
  logo: GradeTeam | undefined;
  portrait: string | null;
  side: 0 | 1;
  // The name's type size, shared by both players so the header stays even.
  size: number;
}) {
  const right = side === 1;
  const unit = isUnitRow(row.athleteId);
  return (
    <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "center", gap: 18, flex: 1 }}>
      {portrait ? (
        <div
          style={{
            display: "flex",
            width: FACE,
            height: FACE,
            borderRadius: FACE / 2,
            overflow: "hidden",
            background: C.rule,
            border: `3px solid ${SIDE_COLORS[side]}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws only <img>; next/image cannot render in an ImageResponse */}
          <img src={portrait} width={FACE - 6} height={FACE - 6} alt="" style={{ objectFit: "contain" }} />
        </div>
      ) : (
        <ShareLogo team={logo} name={row.team} size={FACE - 12} />
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6, alignItems: right ? "flex-end" : "flex-start" }}>
        <div style={{ maxWidth: COMPARE_NAME_WIDTH, fontSize: size, fontWeight: 600, lineHeight: 1.05, ...ELLIPSIS }}>
          {displayName(row)}
        </div>
        <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "center", gap: 8, fontSize: 20, color: C.gray }}>
          {!unit && portrait && <ShareLogo team={logo} name={row.team} size={24} />}
          {`${unit ? "Unit" : row.team} · ${formatNumber(row.games, 0)} games`}
        </div>
      </div>
    </div>
  );
}

// Two players of one position side by side, as the comparison on the player
// grades page: each headline number across one row, and each trait as a bar
// growing out from the middle, the first player's to the left.
export async function renderComparisonCard({
  league,
  sport,
  position,
  athleteIds,
  context,
  grades,
  teams,
  loadPlayers,
}: CardSource & { athleteIds: [string, string] }) {
  const [first, second] = await findPlayers({ position, grades, loadPlayers }, athleteIds);
  if (!first || !second || first.row.athleteId === second.row.athleteId) return NOT_FOUND();
  const sides = [first, second];
  const portraits = await Promise.all(sides.map(({ row }) => loadFace(row)));

  const headlines = sides.map(({ row, player }) => compareHeadlines({ sport, row, player }));
  // One row per headline either player has, in card order.
  const labels = [...new Set(headlines.flatMap((items) => items.map((item) => item.label)))];
  const sections = traitSections(traitLines(sport, sides.map(({ player }) => player)));
  const traitRows = Math.max(1, sections.reduce((sum, section) => sum + section.names.length, 0));
  const titlesHeight = sections.filter((section) => section.kind).length * SECTION_TITLE_HEIGHT;

  // Each tier of the season line with both players' values, matched by stat.
  const seasons = sides.map(({ player }) =>
    sport === "nhl" ? hockeySeasonStats(player.seasonStats) : footballSeasonStats(sport, player.seasonStats),
  );
  const statTiers = [...new Set(seasons.flatMap((season) => season?.tiers.map((tier) => tier.label) ?? []))]
    .map((label) => {
      const lists = seasons.map((season) => season?.tiers.find((tier) => tier.label === label)?.stats ?? []);
      const names = [...new Set(lists.flatMap((list) => list.map((stat) => stat.label)))];
      return { label, rows: names.map((name) => ({ name, values: lists.map((list) => list.find((stat) => stat.label === name)?.value ?? null) })) };
    })
    .filter((tier) => tier.rows.length > 0);
  // The box score always shows; a further tier only while the trait rows keep
  // a comfortable height.
  let used = FACE + GAP + labels.length * HEADLINE_ROW + GAP + PERCENTILE_NOTE_HEIGHT + titlesHeight;
  const tiers: typeof statTiers = [];
  for (const tier of statTiers) {
    const height = (tiers.length ? 0 : GAP) + COMPARE_STAT_TITLE + tier.rows.length * COMPARE_STAT_ROW;
    if (tiers.length && (COMPARE_BODY_HEIGHT - used - height) / traitRows < ROOMY_TRAIT_HEIGHT) break;
    tiers.push(tier);
    used += height;
  }
  const season = seasons.find(Boolean)?.season;
  // A quarterback pair runs to some forty rows, so the rows may sit closer
  // here than on a single card.
  const traitHeight = Math.max(17, Math.min(COMPARE_TRAIT_HEIGHT, Math.floor((COMPARE_BODY_HEIGHT - used) / traitRows)));
  const traitSize = Math.max(15, Math.min(20, Math.round(traitHeight * 0.6)));
  const note = footerNote(context, sport);
  const size = {
    width: POSTER_SIZE.width,
    height: CHROME_HEIGHT + footerExtra(note) + Math.min(COMPARE_BODY_HEIGHT, used + traitRows * traitHeight),
  };
  const trait = (side: number, name: string) => sides[side].player.traits.find((t) => t.trait === name);
  const faceName = Math.min(...sides.map(({ row }) => nameSize(displayName(row), COMPARE_NAME_WIDTH, 36, 22)));

  return renderShareFrame({
    eyebrow: `${league} · ${positionName(first.row.positionGroup)}`,
    size,
    headers: POSTER_HEADERS,
    body: (
      <Section gap={GAP}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, height: FACE }}>
          <CompareIdentity row={first.row} logo={teams.find((t) => t.team === first.row.team)} portrait={portraits[0]} side={0} size={faceName} />
          <div style={{ fontSize: 20, color: C.gray, letterSpacing: 2, textTransform: "uppercase" }}>vs</div>
          <CompareIdentity row={second.row} logo={teams.find((t) => t.team === second.row.team)} portrait={portraits[1]} side={1} size={faceName} />
        </div>

        <Section>
          {labels.map((label) => {
            const cell = (side: number) => {
              const item = headlines[side].find((entry) => entry.label === label);
              const right = side === 1;
              return (
                <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "baseline", gap: 10, flex: 1 }}>
                  <div style={{ fontSize: 26, fontWeight: 600, color: (item?.tone && TONES[item.tone]) || C.white }}>{item?.value ?? EMPTY}</div>
                  <div style={{ maxWidth: 250, fontSize: 14, color: C.gray, ...ELLIPSIS }}>{item?.sub || " "}</div>
                </div>
              );
            };
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", height: HEADLINE_ROW, borderTop: `1.5px solid ${C.rule}` }}>
                {cell(0)}
                <div style={{ display: "flex", justifyContent: "center", width: 200, fontSize: 15, color: C.gray, letterSpacing: 1.5, textTransform: "uppercase" }}>
                  {label}
                </div>
                {cell(1)}
              </div>
            );
          })}
        </Section>

        <Section>
          <PercentileNote sport={sport} centered />
          {sections.flatMap((section) => [
            section.kind && (
              <div
                key={`title-${section.kind}`}
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  height: SECTION_TITLE_HEIGHT,
                  paddingBottom: 4,
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {sectionTitle(section.kind)}
              </div>
            ),
            ...section.names.map((name) => {
              const look = barLook(trait(0, name) ?? trait(1, name));
              const { label, short = label } = traitLabel(name, sport);
              const side = (at: number) => {
                const pct = trait(at, name)?.percentile ?? null;
                const number = (
                  <div style={{ display: "flex", width: 34, justifyContent: at === 0 ? "flex-start" : "flex-end", fontSize: traitSize - 2, color: C.gray }}>
                    {pct == null ? EMPTY : Math.round(pct)}
                  </div>
                );
                const bar = (
                  <div style={{ display: "flex", flex: 1, height: 8, borderRadius: 2, background: C.grid, justifyContent: at === 0 ? "flex-end" : "flex-start" }}>
                    <div
                      style={{
                        width: `${pct ?? 0}%`,
                        height: "100%",
                        borderRadius: 2,
                        background: look.style ? C.gray : SIDE_COLORS[at],
                        opacity: look.dimmed ? 0.4 : 1,
                      }}
                    />
                  </div>
                );
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    {at === 0 ? number : bar}
                    {at === 0 ? bar : number}
                  </div>
                );
              };
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 14, height: traitHeight, color: look.dimmed ? C.gray : C.white }}>
                  {side(0)}
                  <div style={{ display: "flex", justifyContent: "center", width: 270, fontSize: traitSize, ...ELLIPSIS }}>{short}</div>
                  {side(1)}
                </div>
              );
            }),
          ])}
        </Section>

        {tiers.length > 0 && (
          <Section>
            {/* One table, each player's value on his own side as in the headline rows above. */}
            {tiers.flatMap((tier) => [
              <div
                key={`title-${tier.label}`}
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  height: COMPARE_STAT_TITLE,
                  paddingBottom: 6,
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {`${season} ${tier.label}`}
              </div>,
              ...tier.rows.map((stat) => (
                <div
                  key={`${tier.label}-${stat.name}`}
                  style={{ display: "flex", alignItems: "center", height: COMPARE_STAT_ROW, borderTop: `1.5px solid ${C.rule}` }}
                >
                  <div style={{ display: "flex", flex: 1, fontSize: 19, fontWeight: 600 }}>{stat.values[0] ?? EMPTY}</div>
                  <div style={{ display: "flex", justifyContent: "center", width: 240, fontSize: 15, color: C.gray, whiteSpace: "nowrap" }}>{stat.name}</div>
                  <div style={{ display: "flex", flex: 1, justifyContent: "flex-end", fontSize: 19, fontWeight: 600 }}>{stat.values[1] ?? EMPTY}</div>
                </div>
              )),
            ])}
          </Section>
        )}
      </Section>
    ),
    footer: (
      <div style={{ display: "flex", maxWidth: 740, fontSize: 19, lineHeight: 1.3, color: C.gray }}>
        {note}
      </div>
    ),
  });
}
