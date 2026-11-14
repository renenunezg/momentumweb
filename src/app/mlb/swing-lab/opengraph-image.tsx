import { renderShareFrame, SHARE_CARD_CONTENT_TYPE, SHARE_CARD_SIZE, SHARE_COLORS as C } from "@/components/share-card";
import { fetchCarry } from "@/lib/mlb-carry";
import { changerEffect, labCarry, signedRate } from "@/lib/mlb-carry-format";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { armLine, BAT_KNOB, BAT_LENGTH, CONTACT, hoopArc, hoopPoint, projector, sceneLines, STROKE, type Vec } from "@/lib/swing-hoop-geometry";
import { formatSigned as signed } from "@/lib/utils";

export const alt = "MLB Swing Lab: change a hitter's swing plane and see his carry and season line move | René Núñez";
export const size = SHARE_CARD_SIZE;
export const contentType = SHARE_CARD_CONTENT_TYPE;
// The study's reads are webhook-covered, as on the page.
export const revalidate = 604800;

const QUALIFIED = 80;
// The lab's natural-change limit: few hitters move their swing plane more in a year.
const CHANGE = 3;
const STEEP = "#8fa8ff";
const BAT = "#c98f55";
const HOOP_W = 440;
const HOOP_H = 400;
// The lab's camera frames the whole field; the card crops to the hitter and his hoops.
const CANVAS = 1000;

export default async function OpenGraphImage() {
  const { study, hitters } = await fetchCarry();
  // The season's home run leader among hitters the lab covers: the name a reader most wants to tinker with.
  const hitter = study
    ? hitters
        .filter((h) => h.season === study.season && h.n_air >= QUALIFIED && h.lab_carry?.length && h.tilt != null && h.attack != null)
        .sort((a, b) => b.hr - a.hr)[0]
    : undefined;
  if (!study || !hitter?.lab_carry || hitter.tilt == null || hitter.attack == null) throw new Error("swing lab card: no lab hitter");

  const coefs = study.changers.coefficients;
  // Only the plane moves, so the attack-angle by whiff term is zero and the hitter's whiff rate drops out.
  const effect = (outcome: "hr600" | "ops", d: number) => changerEffect(coefs, outcome, d, 0, 0);
  // A season-line change is shaded only when the lab's one-standard-error range clears zero.
  const shade = ({ estimate, se }: { estimate: number; se: number }) => (Math.abs(estimate) > se ? estimate : null);
  const rows = [
    { label: `${CHANGE}° flatter`, d: -CHANGE, color: C.green },
    { label: `${CHANGE}° steeper`, d: CHANGE, color: STEEP },
  ].map((r) => ({
    ...r,
    carry: labCarry(hitter.lab_carry!, study.lab.steps, r.d, 0, true),
    hr: effect("hr600", r.d),
    ops: effect("ops", r.d),
  }));
  const [first, last] = hitter.player_name.split(/ (.*)/);

  return renderShareFrame({
    eyebrow: "MLB Swing Lab",
    body: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 360 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 600 }}>
          <div style={{ fontSize: 50, fontWeight: 600, lineHeight: 1.05 }}>{`What if ${last ?? first} changed his swing?`}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
            <img src={mlbPlayerHeadshotUrl(hitter.player_id)} width={52} height={52} alt="" style={{ borderRadius: 26, background: C.rule, objectFit: "cover" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{`${hitter.player_name}${hitter.team ? `, ${hitter.team}` : ""}`}</div>
              <div style={{ fontSize: 20, color: C.gray }}>
                {`${hitter.hr} HR in ${study.season} | ${hitter.tilt.toFixed(0)}° swing path tilt | ${hitter.attack.toFixed(0)}° attack angle`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
            <Row cells={["Swing plane", "Carry", "HR per 600", "OPS"]} header />
            {rows.map((r) => (
              <Row
                key={r.label}
                swatch={r.color}
                cells={[r.label, `${signed(r.carry)} ft`, signed(r.hr.estimate), signedRate(r.ops.estimate)]}
                fills={[r.carry, shade(r.hr), shade(r.ops)]}
              />
            ))}
          </div>
        </div>
        <Hoops tilt={hitter.tilt} rows={rows} />
      </div>
    ),
    footer: (
      <div style={{ display: "flex", flexDirection: "column", fontSize: 18, color: C.gray, width: 780, lineHeight: 1.3 }}>
        <div>{`Carry: flight physics rerun on his own ${study.season} batted balls.`}</div>
        <div>Season line: what followed when hitters changed their swing. Unshaded is within noise.</div>
      </div>
    ),
  });
}

const WIDTHS = [190, 130, 140, 140];

// A fill of null leaves a value cell unshaded.
function Row({ cells, header, swatch, fills }: { cells: string[]; header?: boolean; swatch?: string; fills?: (number | null)[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", height: header ? 34 : 50, borderTop: header ? "none" : `1.5px solid ${C.rule}` }}>
      {cells.map((cell, i) => {
        const v = i > 0 && fills ? fills[i - 1] : undefined;
        const shaded = v != null && v !== 0;
        return (
          <div key={i} style={{ display: "flex", width: WIDTHS[i], justifyContent: i ? "flex-end" : "flex-start", alignItems: "center", gap: 10 }}>
            {i === 0 && swatch && <div style={{ width: 22, height: 5, borderRadius: 3, background: swatch }} />}
            <div
              style={{
                display: "flex",
                fontSize: header ? 17 : 24,
                fontWeight: header || i === 0 ? 400 : 600,
                color: header ? C.gray : shaded ? C.onFill : C.white,
                letterSpacing: header ? 1.5 : 0,
                textTransform: header ? "uppercase" : "none",
                padding: v === undefined ? 0 : "3px 12px",
                borderRadius: 6,
                background: !shaded ? "transparent" : v > 0 ? C.better : C.worse,
              }}
            >
              {cell}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The lab's 3/4 view: his current plane dashed, the two changed planes solid, the bat at contact on the flatter one.
function Hoops({ tilt, rows }: { tilt: number; rows: { d: number; color: string }[] }) {
  const project = projector(34, 22, CANVAS, CANVAS);
  const d = (pts: Vec[]) => pts.map((p, i) => `${i ? "L" : "M"}${project(p).map((n) => n.toFixed(1)).join(" ")}`).join(" ");
  const scene = sceneLines();
  const swing = tilt + rows[0].d;
  const contactAngle = 0;
  const [hx, hy] = project(scene.head);
  const [cx, cy] = project(CONTACT);
  const bat = (from: number, to: number) => d([hoopPoint(swing, contactAngle, BAT_KNOB + from * BAT_LENGTH), hoopPoint(swing, contactAngle, BAT_KNOB + to * BAT_LENGTH)]);
  const planes = [{ t: tilt, color: C.white, dashed: true }, ...rows.map((r) => ({ t: tilt + r.d, color: r.color, dashed: false }))];
  const framed = [...planes.flatMap((p) => hoopArc(p.t, 0, 360, 10)), ...scene.legs, scene.head, ...scene.plate].map(project);
  const xs = framed.map(([x]) => x);
  const ys = framed.map(([, y]) => y);
  const pad = 24;
  const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  // Widen the tighter side so the crop keeps the panel's aspect without stretching.
  const zoom = Math.max((x1 - x0) / HOOP_W, (y1 - y0) / HOOP_H);
  const [vw, vh] = [HOOP_W * zoom, HOOP_H * zoom];
  const viewBox = [(x0 + x1 - vw) / 2, (y0 + y1 - vh) / 2, vw, vh].map((n) => n.toFixed(1)).join(" ");
  return (
    <svg width={HOOP_W} height={HOOP_H} viewBox={viewBox}>
      {scene.grid.map((line, i) => (
        <path key={i} d={d(line)} stroke={C.rule} strokeWidth={1.2 * zoom} fill="none" />
      ))}
      <path d={`${d(scene.plate)} Z`} stroke={C.gray} strokeWidth={1.5 * zoom} fill={C.carbon} />
      <path d={d(scene.zone)} stroke={C.gray} strokeWidth={1.2 * zoom} strokeDasharray={`${5 * zoom} ${4 * zoom}`} fill="none" />
      {planes.map((p) => (
        <path key={`full-${p.t}`} d={d(hoopArc(p.t, 0, 360, 4))} stroke={p.color} strokeOpacity={0.35} strokeWidth={1.2 * zoom} strokeDasharray={`${3 * zoom} ${5 * zoom}`} fill="none" />
      ))}
      {planes.map((p) => (
        <path key={`arc-${p.t}`} d={d(hoopArc(p.t, STROKE[0], STROKE[1], 3))} stroke={p.color} strokeWidth={4 * zoom} strokeDasharray={p.dashed ? `${9 * zoom} ${7 * zoom}` : undefined} strokeLinecap="round" fill="none" />
      ))}
      <path d={d(scene.legs)} stroke={C.gray} strokeWidth={5 * zoom} strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <path d={d(scene.torso)} stroke={C.gray} strokeWidth={8 * zoom} strokeLinecap="round" fill="none" />
      <circle cx={hx} cy={hy} r={9 * zoom} fill={C.gray} />
      <path d={d(armLine(swing, contactAngle, scene.shoulder))} stroke={C.gray} strokeWidth={4 * zoom} strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <path d={bat(0, 0.45)} stroke={BAT} strokeWidth={6 * zoom} strokeLinecap="round" fill="none" />
      <path d={bat(0.45, 1)} stroke={BAT} strokeWidth={11 * zoom} strokeLinecap="round" fill="none" />
      <circle cx={cx} cy={cy} r={8 * zoom} fill={C.white} />
    </svg>
  );
}
