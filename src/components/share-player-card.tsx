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
} from "@/lib/player-card";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import type { TeamLogoSource } from "@/components/team-logo";
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
function BarNote({ lead, rest, centered = false }: { lead: string; rest: string; centered?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: centered ? "center" : "flex-start", gap: 8, height: PERCENTILE_NOTE_HEIGHT, fontSize: 17 }}>
      <div style={{ fontWeight: 600, color: C.green }}>{lead}</div>
      <div style={{ color: C.gray }}>{rest}</div>
    </div>
  );
}

function PercentileNote({ sport, centered = false }: { sport: GradeSport; centered?: boolean }) {
  return (
    <BarNote
      lead="Bars are percentiles."
      rest={sport === "nhl" ? "Longer is better on every stat." : "Longer is better, and on sacks or turnovers longer means fewer."}
      centered={centered}
    />
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

const TONES: Record<string, string> = {
  "text-positive": C.positive,
  "text-destructive": C.negative,
  "text-primary": C.green,
  "text-muted-foreground": C.gray,
};

function Tile({ headline }: { headline: { label: string; value: string; sub: string; tone?: string } }) {
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

// The top of a single-player card: his face or club mark, name, the line
// under it, and his grade in a heat tile.
function ProfileHeader({
  name,
  sub,
  team,
  logo,
  portrait,
  grade,
}: {
  name: string;
  sub: string;
  team: string;
  logo: TeamLogoSource | undefined;
  portrait: string | null;
  grade: { label: string; text: string; sub: string; value: number | null };
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, height: PORTRAIT }}>
      {portrait ? (
        <div style={{ display: "flex", width: PORTRAIT, height: PORTRAIT, borderRadius: PORTRAIT / 2, overflow: "hidden", background: C.rule }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws only <img>; next/image cannot render in an ImageResponse */}
          <img src={portrait} width={PORTRAIT} height={PORTRAIT} alt="" style={{ objectFit: "contain" }} />
        </div>
      ) : (
        <ShareLogo team={logo} name={team} size={PORTRAIT - 16} />
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
        <div style={{ fontSize: nameSize(name, 590, 54, 34), fontWeight: 600, lineHeight: 1.05, ...ELLIPSIS }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, color: C.gray }}>
          {portrait && <ShareLogo team={logo} name={team} size={30} />}
          {sub}
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
            background: heatFill(grade.value == null ? null : gradeStrength(grade.value)),
            color: C.onFill,
            fontSize: 50,
            fontWeight: 600,
          }}
        >
          {grade.text}
        </div>
        <div style={{ fontSize: 16, color: C.gray }}>{grade.sub || " "}</div>
      </div>
    </div>
  );
}

type StatTier = { label: string; rows: SeasonStat[][] };

// Whole tiers of a stat block, while they fit in a few rows; a tier too long
// for one row splits evenly. Also the height the block takes.
function statTiers(all: { label: string; stats: SeasonStat[] }[]): { tiers: StatTier[]; height: number } {
  const tiers: StatTier[] = [];
  let statRows = 0;
  for (const tier of all) {
    const rows = Math.ceil(tier.stats.length / MAX_STATS_PER_ROW);
    if (rows === 0 || statRows + rows > MAX_STAT_ROWS) break;
    const per = Math.ceil(tier.stats.length / rows);
    tiers.push({ label: tier.label, rows: Array.from({ length: rows }, (_, at) => tier.stats.slice(at * per, (at + 1) * per)) });
    statRows += rows;
  }
  return { tiers, height: tiers.length ? 30 + tiers.length * 24 + statRows * (STAT_HEIGHT + 6) : 0 };
}

function StatTiers({ title, context, tiers }: { title: string; context: string; tiers: StatTier[] }) {
  return (
    <Section gap={6}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 24, fontSize: 17 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ color: C.gray, fontSize: 15 }}>{context}</div>
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
  );
}

// One measure of a single-player card: its name, a bar and the number beside it.
function BarLine({
  label,
  share,
  text,
  color,
  dimmed,
  height,
  size,
}: {
  label: string;
  share: number;
  text: string;
  color: string;
  dimmed: boolean;
  height: number;
  size: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height, color: dimmed ? C.gray : C.white }}>
      <div style={{ flex: 1, fontSize: size, ...ELLIPSIS }}>{label}</div>
      <div style={{ display: "flex", width: 150, height: 8, borderRadius: 2, background: C.grid }}>
        <div style={{ width: `${Math.max(0, Math.min(100, share))}%`, height: "100%", borderRadius: 2, background: color, opacity: dimmed ? 0.4 : 1 }} />
      </div>
      <div style={{ display: "flex", width: 32, justifyContent: "flex-end", fontSize: size - 2, color: C.gray }}>{text}</div>
    </div>
  );
}

function BlockTitle({ children, aside }: { children: string; aside?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: SECTION_TITLE_HEIGHT,
        paddingBottom: 4,
        borderBottom: `1.5px solid ${C.rule}`,
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: 1.5,
        textTransform: "uppercase",
      }}
    >
      {children}
      {aside && <div style={{ color: C.gray }}>{aside}</div>}
    </div>
  );
}

function barColor(trait: GradedPlayerTrait | undefined): string {
  const look = barLook(trait);
  return look.inferred ? C.blue : look.style ? C.gray : C.green;
}

function TraitBar({ sport, name, trait, height, size }: { sport: GradeSport; name: string; trait: GradedPlayerTrait | undefined; height: number; size: number }) {
  const { label, short = label } = traitLabel(name, sport);
  const pct = trait?.percentile ?? null;
  return (
    <BarLine
      label={short}
      share={pct ?? 0}
      text={pct == null ? EMPTY : String(Math.round(pct))}
      color={barColor(trait)}
      dimmed={barLook(trait).dimmed}
      height={height}
      size={size}
    />
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
  const { tiers, height: statsHeight } = statTiers(stats?.tiers ?? []);

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
        <ProfileHeader
          name={displayName(row)}
          sub={`${unit ? "Unit" : row.team} · ${positionName(row.positionGroup)} · ${formatNumber(row.games, 0)} games`}
          team={row.team}
          logo={logo}
          portrait={portrait}
          grade={{ label: grade.label, text: grade.value, sub: grade.sub, value: row.grade }}
        />

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

        {stats && tiers.length > 0 && <StatTiers title={`${stats.season} season stats`} context={stats.context} tiers={tiers} />}
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

const pairOf = <T,>(make: (at: 0 | 1) => T): [T, T] => [make(0), make(1)];

// One player of a comparison header: his face or club mark, name and the line
// under it.
interface CompareFace {
  name: string;
  sub: string;
  team: string;
  logo: TeamLogoSource | undefined;
  portrait: string | null;
}

function CompareIdentity({
  face,
  side,
  size,
}: {
  face: CompareFace;
  side: 0 | 1;
  // The name's type size, shared by both players so the header stays even.
  size: number;
}) {
  const right = side === 1;
  return (
    <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "center", gap: 18, flex: 1 }}>
      {face.portrait ? (
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
          <img src={face.portrait} width={FACE - 6} height={FACE - 6} alt="" style={{ objectFit: "contain" }} />
        </div>
      ) : (
        <ShareLogo team={face.logo} name={face.team} size={FACE - 12} />
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6, alignItems: right ? "flex-end" : "flex-start" }}>
        <div style={{ maxWidth: COMPARE_NAME_WIDTH, fontSize: size, fontWeight: 600, lineHeight: 1.05, ...ELLIPSIS }}>{face.name}</div>
        <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "center", gap: 8, fontSize: 20, color: C.gray }}>
          {face.portrait && <ShareLogo team={face.logo} name={face.team} size={24} />}
          {face.sub}
        </div>
      </div>
    </div>
  );
}

function CompareHeader({ faces }: { faces: [CompareFace, CompareFace] }) {
  const size = Math.min(...faces.map((face) => nameSize(face.name, COMPARE_NAME_WIDTH, 36, 22)));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, height: FACE }}>
      <CompareIdentity face={faces[0]} side={0} size={size} />
      <div style={{ fontSize: 20, color: C.gray, letterSpacing: 2, textTransform: "uppercase" }}>vs</div>
      <CompareIdentity face={faces[1]} side={1} size={size} />
    </div>
  );
}

// A value for each player either side of its label.
function CompareValueRow({ label, values, subs, tones }: { label: string; values: [string, string]; subs?: [string, string]; tones?: [string | undefined, string | undefined] }) {
  const cell = (side: 0 | 1) => (
    <div style={{ display: "flex", flexDirection: side === 1 ? "row-reverse" : "row", alignItems: "baseline", gap: 10, flex: 1 }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: (tones?.[side] && TONES[tones[side]!]) || C.white }}>{values[side]}</div>
      {subs && <div style={{ maxWidth: 250, fontSize: 14, color: C.gray, ...ELLIPSIS }}>{subs[side] || " "}</div>}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", height: HEADLINE_ROW, borderTop: `1.5px solid ${C.rule}` }}>
      {cell(0)}
      <div style={{ display: "flex", justifyContent: "center", width: 200, fontSize: 15, color: C.gray, letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {label}
      </div>
      {cell(1)}
    </div>
  );
}

// One measure as a pair of bars growing out from its label, the first player's
// to the left. `shares` are each bar's fill from 0 to 100.
function MirrorRow({
  label,
  texts,
  shares,
  height,
  size,
  neutral = false,
  dimmed = false,
}: {
  label: string;
  texts: [string, string];
  shares: [number, number];
  height: number;
  size: number;
  // A bar that says how much, drawn in gray on both sides.
  neutral?: boolean;
  dimmed?: boolean;
}) {
  const side = (at: 0 | 1) => {
    const number = (
      <div style={{ display: "flex", width: 34, justifyContent: at === 0 ? "flex-start" : "flex-end", fontSize: size - 2, color: C.gray }}>{texts[at]}</div>
    );
    const bar = (
      <div style={{ display: "flex", flex: 1, height: 8, borderRadius: 2, background: C.grid, justifyContent: at === 0 ? "flex-end" : "flex-start" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, shares[at]))}%`,
            height: "100%",
            borderRadius: 2,
            background: neutral ? C.gray : SIDE_COLORS[at],
            opacity: dimmed ? 0.4 : 1,
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
    <div style={{ display: "flex", alignItems: "center", gap: 14, height, color: dimmed ? C.gray : C.white }}>
      {side(0)}
      <div style={{ display: "flex", justifyContent: "center", width: 270, fontSize: size, ...ELLIPSIS }}>{label}</div>
      {side(1)}
    </div>
  );
}

function CompareSectionTitle({ children }: { children: string }) {
  return (
    <div
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
      {children}
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

  return renderShareFrame({
    eyebrow: `${league} · ${positionName(first.row.positionGroup)}`,
    size,
    headers: POSTER_HEADERS,
    body: (
      <Section gap={GAP}>
        <CompareHeader
          faces={pairOf((at) => {
            const { row } = sides[at];
            const unit = isUnitRow(row.athleteId);
            return {
              name: displayName(row),
              sub: `${unit ? "Unit" : row.team} · ${formatNumber(row.games, 0)} games`,
              team: row.team,
              logo: teams.find((t) => t.team === row.team),
              portrait: portraits[at],
            };
          })}
        />

        <Section>
          {labels.map((label) => {
            const items = [0, 1].map((at) => headlines[at].find((entry) => entry.label === label));
            return (
              <CompareValueRow
                key={label}
                label={label}
                values={[items[0]?.value ?? EMPTY, items[1]?.value ?? EMPTY]}
                subs={[items[0]?.sub ?? "", items[1]?.sub ?? ""]}
                tones={[items[0]?.tone, items[1]?.tone]}
              />
            );
          })}
        </Section>

        <Section>
          <PercentileNote sport={sport} centered />
          {sections.flatMap((section) => [
            section.kind && <CompareSectionTitle key={`title-${section.kind}`}>{sectionTitle(section.kind)}</CompareSectionTitle>,
            ...section.names.map((name) => {
              const look = barLook(trait(0, name) ?? trait(1, name));
              const { label, short = label } = traitLabel(name, sport);
              const pct = [0, 1].map((at) => trait(at, name)?.percentile ?? null);
              return (
                <MirrorRow
                  key={name}
                  label={short}
                  texts={[pct[0] == null ? EMPTY : String(Math.round(pct[0])), pct[1] == null ? EMPTY : String(Math.round(pct[1]))]}
                  shares={[pct[0] ?? 0, pct[1] ?? 0]}
                  height={traitHeight}
                  size={traitSize}
                  neutral={look.style}
                  dimmed={look.dimmed}
                />
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

export interface ComparisonPlayer {
  name: string;
  sub: string;
  team: string;
  logo: TeamLogoSource | undefined;
  portraitUrl: string | null;
}

// Two players side by side from rows of values, as the baseball comparisons
// show them, with trait grades as mirrored bars on the 20 to 80 scale where
// the league publishes them.
export async function renderMetricsComparison({
  league,
  context,
  players,
  metrics,
  grades = [],
}: {
  league: string;
  context: string;
  players: [ComparisonPlayer, ComparisonPlayer];
  metrics: { label: string; values: [string, string] }[];
  grades?: { label: string; values: [number | null, number | null] }[];
}) {
  const portraits = await Promise.all(players.map((player) => (player.portraitUrl ? loadPortrait(player.portraitUrl) : null)));
  const gradesHeight = grades.length ? GAP + PERCENTILE_NOTE_HEIGHT + SECTION_TITLE_HEIGHT : 0;
  const used = FACE + GAP + metrics.length * HEADLINE_ROW + gradesHeight;
  const rowHeight = Math.max(20, Math.min(COMPARE_TRAIT_HEIGHT, Math.floor((COMPARE_BODY_HEIGHT - used) / Math.max(1, grades.length))));
  const size = { width: POSTER_SIZE.width, height: CHROME_HEIGHT + Math.min(COMPARE_BODY_HEIGHT, used + grades.length * rowHeight) };
  return renderShareFrame({
    eyebrow: league,
    size,
    headers: POSTER_HEADERS,
    body: (
      <Section gap={GAP}>
        <CompareHeader
          faces={pairOf((at) => ({ ...players[at], portrait: portraits[at] }))}
        />
        <Section>
          {metrics.map((metric) => (
            <CompareValueRow key={metric.label} label={metric.label} values={metric.values} />
          ))}
        </Section>
        {grades.length > 0 && (
          <Section>
            <BarNote lead="Bars are grades." rest="20 to 80 at the position; 50 is average." centered />
            <CompareSectionTitle>Trait grades</CompareSectionTitle>
            {grades.map((grade) => (
              <MirrorRow
                key={grade.label}
                label={grade.label}
                texts={[formatNumber(grade.values[0], 0), formatNumber(grade.values[1], 0)]}
                shares={[gradeShare(grade.values[0]), gradeShare(grade.values[1])]}
                height={rowHeight}
                size={Math.max(15, Math.min(20, Math.round(rowHeight * 0.6)))}
              />
            ))}
          </Section>
        )}
      </Section>
    ),
    footer: <div style={{ display: "flex", maxWidth: 740, fontSize: 19, lineHeight: 1.3, color: C.gray }}>{context}</div>,
  });
}

// A grade's fill on the 20 to 80 scale.
const gradeShare = (grade: number | null) => (grade == null ? 0 : ((grade - 20) / 60) * 100);

const OUTLOOK_HEIGHT = 96;
const MAX_OUTLOOK = 6;
const FACTS_HEIGHT = 26;

export interface ProfilePanel {
  title: string;
  // The panel's own grade, where it has one.
  grade?: string;
  rows: { label: string; share: number; text: string; physical: boolean; dimmed: boolean }[];
}

// One baseball player's opened card: his grade, the facts line, headline
// tiles, trait panels where the league grades them, his stat block and the
// control-year outlook.
export async function renderProfileCard({
  league,
  context,
  player,
  grade,
  facts,
  headlines,
  panels = [],
  stats,
  outlook = [],
}: {
  league: string;
  context: string;
  player: ComparisonPlayer;
  grade: { text: string; sub: string; value: number | null };
  facts: string[];
  headlines: { label: string; value: string; sub: string; tone?: string }[];
  panels?: ProfilePanel[];
  stats?: { title: string; context: string; tiers: { label: string; stats: SeasonStat[] }[] } | null;
  outlook?: { head: string; war: string; salary: string; surplus: string; faded: boolean; positive: boolean }[];
}) {
  const portrait = player.portraitUrl ? await loadPortrait(player.portraitUrl) : null;
  const { tiers, height: statsHeight } = statTiers(stats?.tiers ?? []);
  const years = outlook.slice(0, MAX_OUTLOOK);
  // Panels down two columns, split where the two come out most even.
  const size = (list: ProfilePanel[]) => list.reduce((sum, panel) => sum + panel.rows.length + 1, 0);
  let cut = Math.min(1, panels.length);
  for (let at = 1; at < panels.length; at++) {
    const gap = (i: number) => Math.abs(size(panels.slice(0, i)) - size(panels.slice(i)));
    if (gap(at) < gap(cut)) cut = at;
  }
  const columns = panels.length > 1 ? [panels.slice(0, cut), panels.slice(cut)] : panels.length ? [panels] : [];
  const traitRows = Math.max(0, ...columns.map((list) => list.reduce((sum, panel) => sum + panel.rows.length, 0)));
  const titlesHeight = Math.max(0, ...columns.map((list) => list.length)) * SECTION_TITLE_HEIGHT;
  const used =
    PORTRAIT +
    (facts.length ? GAP + FACTS_HEIGHT : 0) +
    GAP + TILE_HEIGHT +
    (columns.length ? GAP + PERCENTILE_NOTE_HEIGHT + 10 + titlesHeight + 10 + 24 : 0) +
    (statsHeight ? GAP + statsHeight : 0) +
    (years.length ? GAP + 24 + 6 + OUTLOOK_HEIGHT : 0);
  const rowHeight = Math.max(20, Math.min(TRAIT_HEIGHT, Math.floor((BODY_HEIGHT - used) / Math.max(1, traitRows))));
  const rowSize = Math.max(15, Math.min(21, Math.round(rowHeight * 0.62)));
  const looks = panels.flatMap((panel) => panel.rows);
  return renderShareFrame({
    eyebrow: league,
    size: { width: POSTER_SIZE.width, height: Math.min(POSTER_SIZE.height, CHROME_HEIGHT + used + traitRows * rowHeight) },
    headers: POSTER_HEADERS,
    body: (
      <Section gap={GAP}>
        <ProfileHeader name={player.name} sub={player.sub} team={player.team} logo={player.logo} portrait={portrait} grade={{ label: "Grade", ...grade }} />
        {facts.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", height: FACTS_HEIGHT, fontSize: 18, color: C.gray, ...ELLIPSIS }}>{facts.join(" · ")}</div>
        )}
        <div style={{ display: "flex", gap: 12 }}>
          {headlines.map((headline) => (
            <Tile key={headline.label} headline={headline} />
          ))}
        </div>

        {columns.length > 0 && (
          <Section gap={10}>
            <BarNote lead="Bars are percentiles." rest="The number beside each is his grade, 20 to 80 with 50 average." />
            <div style={{ display: "flex", gap: 40 }}>
              {columns.map((list, at) => (
                <div key={at} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  {list.flatMap((panel) => [
                    <BlockTitle key={`title-${panel.title}`} aside={panel.grade}>
                      {panel.title}
                    </BlockTitle>,
                    ...panel.rows.map((row) => (
                      <BarLine
                        key={`${panel.title}-${row.label}`}
                        label={row.label}
                        share={row.share}
                        text={row.text}
                        color={row.physical ? C.blue : C.green}
                        dimmed={row.dimmed}
                        height={rowHeight}
                        size={rowSize}
                      />
                    )),
                  ])}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 22, height: 24, alignItems: "center", fontSize: 15, color: C.gray }}>
              {[
                { label: "Counted from his plays", color: C.green, opacity: 1, show: true },
                { label: "Physical measurement", color: C.blue, opacity: 1, show: looks.some((row) => row.physical) },
                { label: "Not graded", color: C.green, opacity: 0.4, show: looks.some((row) => row.dimmed) },
              ]
                .filter((item) => item.show)
                .map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 8, borderRadius: 2, background: item.color, opacity: item.opacity }} />
                    {item.label}
                  </div>
                ))}
            </div>
          </Section>
        )}

        {stats && tiers.length > 0 && <StatTiers title={stats.title} context={stats.context} tiers={tiers} />}

        {years.length > 0 && (
          <Section gap={6}>
            <div style={{ display: "flex", alignItems: "flex-end", height: 24, fontSize: 17, fontWeight: 600 }}>Control-year outlook</div>
            <div style={{ display: "flex", gap: 6 }}>
              {years.map((year) => (
                <div
                  key={year.head}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    height: OUTLOOK_HEIGHT,
                    border: `1.5px solid ${C.rule}`,
                    borderRadius: 6,
                    opacity: year.faded ? 0.45 : 1,
                    fontSize: 15,
                  }}
                >
                  <div style={{ color: C.gray }}>{year.head}</div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: C.green }}>{year.war}</div>
                  <div style={{ color: C.gray }}>{year.salary}</div>
                  <div style={{ fontWeight: 600, color: year.positive ? C.positive : C.negative }}>{year.surplus}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </Section>
    ),
    footer: <div style={{ display: "flex", maxWidth: 740, fontSize: 19, lineHeight: 1.3, color: C.gray }}>{context}</div>,
  });
}
