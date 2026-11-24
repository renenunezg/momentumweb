import type { ReactNode } from "react";
import { renderShareFrame, ShareLogo, SHARE_COLORS as C } from "@/components/share-card";
import type { TeamLogoSource } from "@/components/team-logo";
import { cfbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { formatGrade, type GradeTeam, type PlayerIndexRow, type PositionGrades } from "@/lib/position-grades";
import { POSITION_LABELS, POSITION_ORDER, isUnitRow } from "@/lib/position-traits";
import { heatIntensity, ratingScale, sharedExtent } from "@/lib/rating-heatmap";
import { formatNumber, formatSigned } from "@/lib/utils";

// The downloadable ratings and grades graphics: the share card's frame at the
// 4:5 portrait size a post's photo shows whole in the X timeline.
export const POSTER_SIZE = { width: 1080, height: 1350 };

// The file is saved and re-downloaded after each publish, so a browser must
// not keep the year-long copy an ImageResponse asks for by default.
export const POSTER_HEADERS = { "Cache-Control": "public, max-age=0, must-revalidate" };

export const NOT_FOUND = () => new Response("Not found", { status: 404 });

function hexChannels(hex: string): number[] {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
}

// The site's heat fill, blended here because Satori has no color-mix: a share
// of the better or worse color over the neutral cell.
export function heatFill(strength: number | null): string {
  if (strength == null) return C.cellNeutral;
  const share = heatIntensity(strength);
  const from = hexChannels(C.cellNeutral);
  const to = hexChannels(strength >= 0 ? C.better : C.worse);
  return `rgb(${from.map((channel, i) => Math.round(channel + (to[i] - channel) * share)).join(", ")})`;
}

function HeatCell({ strength, width, fontSize, children }: { strength: number | null; width: number; fontSize: number; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        justifyContent: "center",
        padding: "4px 0",
        borderRadius: 6,
        background: heatFill(strength),
        color: C.onFill,
        fontSize,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function PosterTitle({ title, context }: { title: string; context: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 58, fontWeight: 600, lineHeight: 1.05, ...ELLIPSIS }}>{title}</div>
      <div style={{ fontSize: 24, color: C.gray, letterSpacing: 2, textTransform: "uppercase" }}>{context}</div>
    </div>
  );
}

export const ELLIPSIS = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

// A column of the ratings image: a heat-filled value as on the site's tables,
// a change colored by its sign, or plain supporting text.
export interface PosterColumn {
  label: string;
  kind: "heat" | "change" | "plain";
  // The column the rows are ranked by.
  primary?: boolean;
}

export interface PosterRow {
  key: string;
  rank: number;
  team: string;
  logo: TeamLogoSource | undefined;
  // One per column, formatted as the ratings page shows it. `strength` is a
  // heat column's place on the page's scale, from -1 to 1.
  cells: { text: string; strength?: number | null }[];
}

export interface PosterBlock {
  title?: string;
  rows: PosterRow[];
}

type PointsRating = {
  team: string;
  power_rating: number;
  offense_points: number | null;
  defense_points: number | null;
  market_rating: number | null;
};

// The football ratings table as poster columns and rows: model rating, market
// rating where the sport shows one, offense, defense, weekly change and the gap
// to the market. Every points column shares one heat scale spanning `all`, as
// on the table, and rows are ranked within the slice passed in.
export function pointsTable<T extends PointsRating>(
  all: T[],
  {
    identity,
    notes = [],
    showMarket,
    before,
    gap,
  }: {
    identity: (row: T) => Pick<PosterRow, "key" | "team" | "logo">;
    notes?: { label: string; text: (row: T) => string }[];
    showMarket: boolean;
    // A team's rating a week earlier, or null when there is no earlier week.
    before: ((row: T) => number | undefined) | null;
    gap: (row: T) => number | null;
  },
) {
  const model = all.map((row) => row.power_rating);
  const market = all.map((row) => row.market_rating);
  const extent = sharedExtent(showMarket ? [model, market] : [model], 0.85);
  const scale = ratingScale(model, { center: 0, extent });
  const heat = (value: number | null) => ({ text: formatNumber(value), strength: scale(value) });
  const showGap = market.some((value) => value != null);
  const columns: PosterColumn[] = [
    ...notes.map(({ label }) => ({ label, kind: "plain" as const })),
    { label: showMarket ? "Model" : "Rating", kind: "heat", primary: true },
    ...(showMarket ? [{ label: "Market", kind: "heat" as const }] : []),
    { label: "Off", kind: "heat" },
    { label: "Def", kind: "heat" },
    ...(before ? [{ label: "Chg", kind: "change" as const }] : []),
    ...(showGap ? [{ label: "Gap", kind: "plain" as const }] : []),
  ];
  const rows = (slice: T[]): PosterRow[] =>
    slice.map((row, i) => {
      const prior = before?.(row);
      return {
        ...identity(row),
        rank: i + 1,
        cells: [
          ...notes.map(({ text }) => ({ text: text(row) })),
          heat(row.power_rating),
          ...(showMarket ? [heat(row.market_rating)] : []),
          heat(row.offense_points),
          heat(row.defense_points),
          ...(before ? [{ text: formatSigned(prior == null ? null : row.power_rating - prior) }] : []),
          ...(showGap ? [{ text: formatSigned(gap(row)) }] : []),
        ],
      };
    });
  return { columns, rows };
}

// Every unit as a heat column, with the teams ranked by one of them. Each
// unit's scale spans `all`, as on the units table.
export function unitTable<K extends string, U extends Record<K, number | null>>(
  all: U[],
  units: readonly { key: K; label: string }[],
  sortKey: K,
  identity: (unit: U) => Pick<PosterRow, "key" | "team" | "logo">,
) {
  const scales = units.map(({ key }) => ratingScale(all.map((unit) => unit[key]), { center: 0 }));
  const columns: PosterColumn[] = units.map(({ key, label }) => ({ label, kind: "heat", primary: key === sortKey }));
  const rows = (shown: U[], count = shown.length): PosterRow[] =>
    [...shown]
      .sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity))
      .slice(0, count)
      .map((unit, i) => ({
        ...identity(unit),
        rank: i + 1,
        cells: units.map(({ key }, at) => ({ text: formatSigned(unit[key]), strength: scales[at](unit[key]) })),
      }));
  return { columns, rows };
}

const UNIT_LEADERS = 5;

// The best teams of each unit, a unit to a block, over two columns.
export function unitLeaders<K extends string, U extends Record<K, number | null>>(
  all: U[],
  shown: U[],
  units: readonly { key: K; name: string }[],
  identity: (unit: U) => Pick<PosterRow, "key" | "team" | "logo">,
): { columns: PosterColumn[]; layout: PosterBlock[][] } {
  const blocks = units.map(({ key, name }) => ({
    title: name,
    rows: unitTable(all, [{ key, label: name }], key, identity).rows(shown, UNIT_LEADERS),
  }));
  const half = Math.ceil(blocks.length / 2);
  return {
    columns: [{ label: "Rating", kind: "heat", primary: true }],
    layout: [blocks.slice(0, half), blocks.slice(half)],
  };
}

const TABLE_HEIGHT = 925;
// A block's title takes this share of a team row.
const TITLE_SHARE = 0.8;

const LABEL_SPACING = 1;
const TABLE_GAP = 24;
// The share frame's side padding.
const FRAME_PADDING = 72;

// Barlow's digits and capitals run a little over half the type size wide.
const textWidth = (chars: number, size: number) => Math.ceil(chars * size * 0.58);

// Ranked teams with every column of the ratings table, in one wide column or
// side by side, each a stack of optionally titled blocks. Type and logos scale
// to the rows, so a 32-team league and a 9-team conference both fill the frame.
export function renderRatingsPoster({
  league,
  title,
  context,
  note,
  columns,
  layout,
}: {
  league: string;
  title: string;
  context: string;
  // The footer line: what the numbers measure.
  note: string;
  columns: PosterColumn[];
  layout: PosterBlock[][];
}) {
  const rows = layout.flat().flatMap((block) => block.rows);
  if (rows.length === 0) return NOT_FOUND();
  const wide = layout.length === 1;
  const lines = Math.max(
    ...layout.map((blocks) => blocks.reduce((sum, block) => sum + block.rows.length + (block.title ? TITLE_SHARE : 0), 0)),
  );
  const rowHeight = Math.min(64, Math.floor(TABLE_HEIGHT / lines));
  // Type follows the row height, capped lower where several columns or a
  // second table share the width.
  const size = Math.max(17, Math.min(wide ? (columns.length > 4 ? 24 : 28) : 20, Math.round(rowHeight * 0.6)));
  const gap = wide ? Math.round(size * 0.5) : 6;
  const logo = Math.min(44, rowHeight - 6, Math.round(size * 1.6));
  const labelSize = wide ? 15 : 14;
  const rankWidth = textWidth(2, size);
  // A cell is as wide as its longest value or its spaced-out label.
  const cells = columns.map((column, at) => {
    const chars = Math.max(...rows.map((row) => row.cells[at].text.length));
    const label = textWidth(column.label.length, labelSize) + column.label.length * LABEL_SPACING + 4;
    return Math.max(label, column.kind === "heat" ? textWidth(chars, size) + 18 : textWidth(chars, size - 2));
  });
  // Width the longest team name leaves over is shared among the columns, so a
  // short table spreads across the frame instead of leaving one gap after the
  // names. A cell sits centered in its share and a heat fill grows partway.
  const tableWidth = (POSTER_SIZE.width - FRAME_PADDING * 2 - TABLE_GAP * (layout.length - 1)) / layout.length;
  const nameWidth = textWidth(Math.max(...rows.map((row) => row.team.length)), size) + 8;
  const taken = rankWidth + logo + nameWidth + gap * (columns.length + 2) + cells.reduce((sum, width) => sum + width, 0);
  const spare = Math.max(0, Math.floor((tableWidth - taken) / columns.length));
  const slots = cells.map((width) => width + Math.min(spare, Math.round(width * 1.2)));
  const widths = cells.map((width, at) => (columns[at].kind === "heat" ? Math.min(slots[at], Math.round(width * 1.4)) : width));
  return renderShareFrame({
    eyebrow: league,
    size: POSTER_SIZE,
    headers: POSTER_HEADERS,
    body: (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <PosterTitle title={title} context={context} />
        <div style={{ display: "flex", gap: TABLE_GAP }}>
          {layout.map((blocks, at) => (
            <div key={at} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap, height: 30 }}>
                <div style={{ display: "flex", flex: 1 }} />
                {columns.map((column, i) => (
                  <div
                    key={column.label}
                    style={{
                      display: "flex",
                      width: slots[i],
                      justifyContent: "center",
                      fontSize: labelSize,
                      letterSpacing: LABEL_SPACING,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      color: column.primary ? C.white : C.gray,
                      fontWeight: column.primary ? 600 : 400,
                    }}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
              {blocks.flatMap((block) => [
                block.title && (
                  <div
                    key={block.title}
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      height: Math.round(rowHeight * TITLE_SHARE),
                      paddingBottom: 6,
                      borderTop: `1.5px solid ${C.rule}`,
                      fontSize: 17,
                      fontWeight: 600,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {block.title}
                  </div>
                ),
                ...block.rows.map((row) => (
                  <div
                    key={`${block.title}-${row.key}`}
                    style={{ display: "flex", alignItems: "center", gap, height: rowHeight, borderTop: `1.5px solid ${C.rule}` }}
                  >
                    <div style={{ display: "flex", width: rankWidth, fontSize: size - 3, color: C.gray, justifyContent: "flex-end" }}>
                      {row.rank}
                    </div>
                    <ShareLogo team={row.logo} name={row.team} size={logo} />
                    <div style={{ flex: 1, fontSize: size, fontWeight: 600, ...ELLIPSIS }}>{row.team}</div>
                    {columns.map((column, i) => {
                      const cell = row.cells[i];
                      const tone =
                        column.kind === "plain" ? C.gray : cell.text.startsWith("+") ? C.better : cell.text.startsWith("-") ? C.worse : C.gray;
                      return (
                        <div key={column.label} style={{ display: "flex", width: slots[i], justifyContent: "center" }}>
                          {column.kind === "heat" ? (
                            <div
                              style={{
                                display: "flex",
                                width: widths[i],
                                height: Math.min(rowHeight - 6, Math.round(size * 1.6)),
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 5,
                                background: heatFill(cell.strength ?? null),
                                color: C.onFill,
                                fontSize: size - 1,
                                fontWeight: column.primary ? 600 : 400,
                              }}
                            >
                              {cell.text}
                            </div>
                          ) : (
                            <div style={{ display: "flex", width: widths[i], justifyContent: "flex-end", fontSize: size - 2, color: tone, whiteSpace: "nowrap" }}>
                              {cell.text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )),
              ])}
            </div>
          ))}
        </div>
      </div>
    ),
    footer: <div style={{ display: "flex", maxWidth: 740, fontSize: 19, lineHeight: 1.3, color: C.gray }}>{note}</div>,
  });
}

const GRADE_ROWS = 10;
const PORTRAIT = 68;

// Satori has no fallback for an image that fails to load, and college
// portraits are often missing, so each is fetched here and a miss shows the
// team logo instead.
export async function loadPortrait(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const type = res.headers.get("content-type");
    if (!res.ok || !type?.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

// A grade's place on the 20 to 80 scale, which stops 30 points either side of
// the average of 50.
export const gradeStrength = (grade: number) => Math.max(-1, Math.min(1, (grade - 50) / 30));

// The leaders of one position as the player grades page lists them. The
// position comes from the URL, so one the sport does not grade is a 404.
export async function renderGradesPoster({
  league,
  position,
  context,
  grades,
  teams,
}: {
  league: string;
  position: string;
  context: string;
  grades: PositionGrades;
  teams: GradeTeam[];
}) {
  const group = POSITION_ORDER.find((key) => key.toLowerCase() === position.toLowerCase());
  // The index is ranked best grade first.
  const rows = grades.index.filter((row) => row.positionGroup === group && row.grade != null).slice(0, GRADE_ROWS);
  if (!group || rows.length === 0) return NOT_FOUND();
  const logoOf = new Map(teams.map((t) => [t.team, t]));
  const portraits = await Promise.all(
    rows.map((row) => (isUnitRow(row.athleteId) ? null : loadPortrait(row.headshotUrl ?? cfbPlayerHeadshotUrl(row.athleteId, 160)))),
  );
  return renderShareFrame({
    eyebrow: league,
    size: POSTER_SIZE,
    headers: POSTER_HEADERS,
    body: (
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <PosterTitle title={`${league} Player Grades | ${POSITION_LABELS[group] ?? group}`} context={context} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((row, i) => (
            <GradeRow key={row.athleteId} rank={i + 1} row={row} logo={logoOf.get(row.team)} portrait={portraits[i]} />
          ))}
        </div>
      </div>
    ),
    footer: (
      <div style={{ display: "flex", fontSize: 20, color: C.gray }}>
        {`Top ${rows.length} by grade on a 20 to 80 scale; 50 is average`}
      </div>
    ),
  });
}

function GradeRow({
  rank,
  row,
  logo,
  portrait,
}: {
  rank: number;
  row: PlayerIndexRow;
  logo: TeamLogoSource | undefined;
  portrait: string | null;
}) {
  const unit = isUnitRow(row.athleteId);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, height: 90, borderTop: `1.5px solid ${C.rule}` }}>
      <div style={{ display: "flex", width: 34, fontSize: 26, color: C.gray, justifyContent: "flex-end" }}>{rank}</div>
      {portrait ? (
        <div
          style={{
            display: "flex",
            width: PORTRAIT,
            height: PORTRAIT,
            borderRadius: PORTRAIT / 2,
            overflow: "hidden",
            background: C.rule,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws only <img>; next/image cannot render in an ImageResponse */}
          <img src={portrait} width={PORTRAIT} height={PORTRAIT} alt="" style={{ objectFit: "contain" }} />
        </div>
      ) : (
        <ShareLogo team={logo} name={row.team} size={PORTRAIT} />
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 2 }}>
        <div style={{ fontSize: 32, fontWeight: 600, ...ELLIPSIS }}>{unit ? `${row.team} offensive line` : row.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 21, color: C.gray }}>
          {!unit && portrait && <ShareLogo team={logo} name={row.team} size={24} />}
          {`${unit ? "Unit" : row.team} · ${formatNumber(row.games, 0)} games`}
        </div>
      </div>
      <HeatCell strength={gradeStrength(row.grade!)} width={116} fontSize={32}>
        {formatGrade(row.grade)}
      </HeatCell>
    </div>
  );
}
