"use client";

import { useMemo, useState } from "react";
import { SwingHoop } from "@/components/mlb-swing-hoop";
import { PlayerCell } from "@/components/player-cell";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { useChartTheme } from "@/lib/chart-theme";
import {
  changerEffect,
  labCarry,
  slashLine,
  swingType,
  type CarryHitterRow,
  type CarryOutcome,
  type LabStudy,
} from "@/lib/mlb-carry";

const GENERIC = "generic";
const PROFILES = [
  { key: "average", label: "Average contact", z: 0 },
  { key: "contact", label: "High contact (low whiff)", z: -1 },
  { key: "power", label: "Low contact (high whiff)", z: 1 },
] as const;
const NATURAL_CHANGE = 3;
const STATS: { key: CarryOutcome; label: string; rate: boolean }[] = [
  { key: "ba", label: "BA", rate: true },
  { key: "obp", label: "OBP", rate: true },
  { key: "slg", label: "SLG", rate: true },
  { key: "ops", label: "OPS", rate: true },
  { key: "hr600", label: "HR per 600 PA", rate: false },
  { key: "so600", label: "K per 600 PA", rate: false },
];

const rate = (v: number) => v.toFixed(3).replace(/^0/, "").replace(/^-0/, "-");
const signedRate = (v: number) => `${v >= 0 ? "+" : "-"}${rate(Math.abs(v))}`;
const signed = (v: number, d = 1) => `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(d)}`;

function Slider({ label, value, onChange, base }: { label: string; value: number; onChange: (v: number) => void; base: number | null }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">
          {base != null ? `${base.toFixed(0)}° → ${(base + value).toFixed(0)}°` : `${value > 0 ? "+" : ""}${value}°`}
        </span>
      </span>
      <input type="range" min={-6} max={6} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </label>
  );
}

export function SwingLab({ study, hitters }: { study: LabStudy; hitters: CarryHitterRow[] }) {
  const theme = useChartTheme();
  const options = useMemo(
    () => hitters.filter((h) => h.lab_carry?.length).sort((a, b) => a.player_name.localeCompare(b.player_name)),
    [hitters],
  );
  const [pick, setPick] = useState<string>(GENERIC);
  const [profile, setProfile] = useState<(typeof PROFILES)[number]["key"]>("average");
  const [dTilt, setDTilt] = useState(0);
  const [dAttack, setDAttack] = useState(0);

  const hitter = options.find((h) => String(h.player_id) === pick) ?? null;
  const coefs = study.changers.coefficients;
  const line = hitter ? slashLine(hitter) : null;
  const whiffZ = hitter
    ? line?.whiff != null ? (line.whiff - coefs.whiff_mean) / coefs.whiff_sd : 0
    : PROFILES.find((p) => p.key === profile)!.z;
  const grid = hitter?.lab_carry ?? study.lab.generic;
  const carry = labCarry(grid, study.lab.steps, dTilt, dAttack, hitter != null);
  const baseTilt = hitter?.tilt ?? null;
  const baseAttack = hitter?.attack ?? null;
  const extrapolating = Math.abs(dTilt) > NATURAL_CHANGE || Math.abs(dAttack) > NATURAL_CHANGE;
  const typeNow = hitter
    ? [swingType(study.swing_types.tilt, hitter.tilt), swingType(study.swing_types.attack, hitter.attack)].filter(Boolean).join(", ")
    : null;
  const typeNew = hitter && baseTilt != null && baseAttack != null
    ? [swingType(study.swing_types.tilt, baseTilt + dTilt), swingType(study.swing_types.attack, baseAttack + dAttack)].join(", ")
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Hitter</span>
          <select
            value={pick}
            onChange={(e) => {
              setPick(e.target.value);
              setDTilt(0);
              setDAttack(0);
            }}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value={GENERIC}>Generic hitter</option>
            {options.map((h) => (
              <option key={h.player_id} value={h.player_id}>
                {h.player_name}{h.team ? ` (${h.team})` : ""}
              </option>
            ))}
          </select>
        </label>
        {hitter && (
          <PlayerCell athleteId={String(hitter.player_id)} headshotUrl={mlbPlayerHeadshotUrl(hitter.player_id)} name={hitter.player_name}
            team={hitter.team ?? "–"} position={line ? `${line.ops.toFixed(3).replace(/^0/, "")} OPS, ${hitter.hr} HR` : null}
            logo={mlbTeamIdentity(hitter.team)} />
        )}
        {!hitter && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Generic hitter's contact">
            {PROFILES.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={profile === p.key}
                onClick={() => setProfile(p.key)}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground aria-pressed:border-foreground/50 aria-pressed:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <Slider label="Swing path tilt (+ steeper)" value={dTilt} onChange={setDTilt} base={baseTilt} />
        <Slider label="Attack angle (+ more uppercut)" value={dAttack} onChange={setDAttack} base={baseAttack} />
        {typeNow && (
          <p className="text-xs text-muted-foreground">
            Swing type: {typeNow}{typeNew && typeNew !== typeNow ? ` → ${typeNew}` : ""}
          </p>
        )}
        <SwingHoop
          height={260}
          label={`Swing plane at ${(baseTilt ?? 32).toFixed(0)} degrees and adjusted to ${((baseTilt ?? 32) + dTilt).toFixed(0)} degrees`}
          hoops={[
            { tilt: baseTilt ?? 32, color: theme["muted-foreground"], dashed: true },
            { tilt: (baseTilt ?? 32) + dTilt, color: theme["brand-highlight"] },
          ]}
        />
      </div>

      <div className="space-y-4">
        <div className="border-y border-rule-strong py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Carry change</p>
          <p className="font-mono text-2xl tabular-nums">{signed(carry)} ft</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Per ball in the air, from rerunning the collision and flight physics on {hitter ? "his own" : "the league's"} {study.season} batted balls
            with every ball&apos;s exit velocity and launch angle held fixed. It is what the same contact would carry with the spin the new swing
            puts on it, not a forecast of the contact a new swing would make; the season line below is the observed version.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-normal">Season line</th>
              {line && <th className="py-1 text-right font-normal">{study.season}</th>}
              <th className="py-1 text-right font-normal">Change</th>
              {line && <th className="py-1 text-right font-normal">With the swing change</th>}
            </tr>
          </thead>
          <tbody>
            {STATS.map((s) => {
              const fx = changerEffect(coefs, s.key, dTilt, dAttack, whiffZ);
              const now = line ? line[s.key as keyof typeof line] as number : null;
              const fmt = s.rate ? signedRate : (v: number) => signed(v);
              const lo = fx.estimate - fx.se;
              const hi = fx.estimate + fx.se;
              return (
                <tr key={s.key} className="border-t border-border">
                  <td className="py-1.5">{s.label}</td>
                  {now != null && <td className="py-1.5 text-right font-mono tabular-nums">{s.rate ? rate(now) : now.toFixed(0)}</td>}
                  <td className="py-1.5 text-right font-mono tabular-nums">
                    {fmt(fx.estimate)}
                    <span className="ml-1 text-xs text-muted-foreground">({fmt(lo)} to {fmt(hi)})</span>
                  </td>
                  {now != null && (
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {s.rate ? rate(now + fx.estimate) : (now + fx.estimate).toFixed(0)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {extrapolating && (
          <p className="text-xs text-negative">
            Beyond ±{NATURAL_CHANGE}°: few hitters have changed this much in a year, so these numbers extend the observed pattern rather than measure it.
          </p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Season-line changes come from {coefs.n} hitters whose swings changed between seasons (bat speed held constant), shown with a
          one-standard-error range that carries the fitted coefficients&apos; correlation.
          Those swings changed naturally, so the numbers describe what tended to follow a change, not what a change guarantees.
        </p>
      </div>
    </div>
  );
}
