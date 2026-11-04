import { ImageResponse } from "next/og";
import { MomentumWordmark } from "@/components/momentum-wordmark";
import { monogram } from "@/components/team-logo";
import type { LeagueRatings } from "@/lib/home-research.server";
import { formatNumber } from "@/lib/utils";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };
export const SHARE_CARD_CONTENT_TYPE = "image/png";

export type ShareCardProps = {
  // Small label opposite the wordmark, e.g. the sport.
  eyebrow: string;
  title: string;
  subtitle: string;
  // Short proof points rendered as pills along the bottom edge.
  chips: readonly string[];
  // The league's current leaders. Without them (MLB, or a league between
  // seasons) the card shows the unlabeled ratings glyph.
  league?: { name: string; ratings: LeagueRatings | null };
};

// The brand book's carbon social layout: white wordmark over a hairline rule,
// white title, gray copy. Hex values are the dark theme tokens in globals.css.
const CARBON = "#101114";
const WHITE = "#f0f2ee";
const GRAY = "#b0b5b0";
const RULE = "#33363b";
const GREEN = "#36b098";
// The dark theme's --better heat fill and the --on-fill type on it.
const BETTER = "#2aa575";
const ON_FILL = "#07150d";

// One renderer behind every opengraph-image route: link previews on X and
// Reddit are the main referral channel, and a bare URL gets no clicks. Satori
// needs display:flex on every multi-child box.
export async function renderShareCard({ eyebrow, title, subtitle, chips, league }: ShareCardProps) {
  const [regular, semibold] = await Promise.all([loadBarlow(400), loadBarlow(600)]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          background: CARBON,
          color: WHITE,
          fontFamily: "Barlow",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 28,
            borderBottom: `1.5px solid ${RULE}`,
          }}
        >
          <div style={{ display: "flex", color: WHITE }}>
            <MomentumWordmark className="" height={44} />
          </div>
          <div style={{ fontSize: 24, color: GRAY, letterSpacing: 3, textTransform: "uppercase" }}>
            {eyebrow}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.05 }}>{title}</div>
            <div style={{ fontSize: 28, color: GRAY, lineHeight: 1.3 }}>{subtitle}</div>
          </div>
          {league?.ratings ? <LeagueTable name={league.name} league={league.ratings} /> : <RatingsGlyph />}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  fontSize: 22,
                  color: WHITE,
                  padding: "8px 18px",
                  border: `1.5px solid ${RULE}`,
                  borderRadius: 999,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: GREEN }}>renenunez.dev</div>
        </div>
      </div>
    ),
    {
      ...SHARE_CARD_SIZE,
      fonts: [
        { name: "Barlow", data: regular, weight: 400, style: "normal" },
        { name: "Barlow", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}

const CARD_ROWS = 5;

// The leaders as the home page lists them, dated so a card saved with an old
// post still says which week it shows. Every leader sits near the top of the
// scale, so the value cells take the full --better fill.
function LeagueTable({ name, league }: { name: string; league: LeagueRatings }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 480 }}>
      <div style={{ display: "flex", fontSize: 20, color: GRAY, letterSpacing: 2, textTransform: "uppercase", paddingBottom: 10 }}>
        {`${name} power ratings | ${league.asOf}`}
      </div>
      {league.teams.slice(0, CARD_ROWS).map((t, i) => {
        const logo = t.logo?.logo_dark ?? t.logo?.logo_light;
        return (
          <div
            key={t.key}
            style={{ display: "flex", alignItems: "center", gap: 14, height: 54, borderTop: `1.5px solid ${RULE}` }}
          >
            <div style={{ display: "flex", width: 22, fontSize: 20, color: GRAY, justifyContent: "flex-end" }}>{i + 1}</div>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Satori draws only <img>; next/image cannot render in an ImageResponse
              <img src={logo} width={36} height={36} alt="" style={{ objectFit: "contain" }} />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: RULE,
                  color: GRAY,
                  fontSize: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {monogram(t.team)}
              </div>
            )}
            <div style={{ flex: 1, fontSize: 25, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t.team}
            </div>
            <div
              style={{
                display: "flex",
                minWidth: 86,
                justifyContent: "center",
                padding: "3px 12px",
                borderRadius: 6,
                background: BETTER,
                color: ON_FILL,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {formatNumber(t.rating, league.digits)}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", fontSize: 17, color: GRAY, paddingTop: 10, borderTop: `1.5px solid ${RULE}` }}>{league.measure}</div>
    </div>
  );
}

// A ranked table in the site's heat-cell and bar style, with no teams or
// values, for cards that have no current ratings to show.
const GLYPH_ROWS = [0.94, 0.82, 0.7, 0.57, 0.44];

function RatingsGlyph() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 340 }}>
      {GLYPH_ROWS.map((share, i) => (
        <div key={share} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: GREEN,
              opacity: 1 - i * 0.17,
            }}
          />
          <div style={{ display: "flex", flex: 1, height: 18, borderRadius: 4, background: RULE }}>
            <div style={{ width: `${share * 100}%`, height: "100%", borderRadius: 4, background: GREEN }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Satori cannot read the woff2 that next/font ships, so the card takes a static
// TTF from Google Fonts, which serves that format to a client with no browser
// user agent. The opengraph-image routes are prerendered, so this runs at build.
async function loadBarlow(weight: 400 | 600): Promise<ArrayBuffer> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Barlow:wght@${weight}`).then((res) => res.text());
  const url = css.match(/src: url\(([^)]+)\) format\('truetype'\)/)?.[1];
  if (!url) throw new Error(`Google Fonts returned no TTF for Barlow ${weight}`);
  return fetch(url).then((res) => res.arrayBuffer());
}
