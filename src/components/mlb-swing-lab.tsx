"use client";

import { useMemo, useState } from "react";
import { HowGraded } from "@/components/how-graded";
import { SwingHoop } from "@/components/mlb-swing-hoop";
import { PlayerCell } from "@/components/player-cell";
import { mlbTeamIdentity } from "@/lib/mlb-teams";
import { mlbPlayerHeadshotUrl } from "@/lib/player-headshots";
import { useChartTheme } from "@/lib/chart-theme";
import { foldSearch, formatSigned as signed } from "@/lib/utils";
import type { CarryHitterRow, CarryOutcome, LabStudy } from "@/lib/mlb-carry";
import { changerEffect, labCarry, signedRate, slashLine, swingType } from "@/lib/mlb-carry-format";

const GENERIC = "generic";
const PROFILES = [
  { key: "average", label: "Average contact", z: 0 },
  { key: "contact", label: "High contact (low whiff)", z: -1 },
  { key: "power", label: "Low contact (high whiff)", z: 1 },
] as const;
const NATURAL_CHANGE = 3;
const MATCHES = 8;
const STATS: { key: CarryOutcome; label: string; rate: boolean }[] = [
  { key: "ba", label: "BA", rate: true },
  { key: "obp", label: "OBP", rate: true },
  { key: "slg", label: "SLG", rate: true },
  { key: "ops", label: "OPS", rate: true },
  { key: "hr600", label: "HR per 600 PA", rate: false },
  { key: "so600", label: "K per 600 PA", rate: false },
];

const rate = (v: number) => v.toFixed(3).replace(/^0/, "").replace(/^-0/, "-");

function Slider({ label, value, onChange, base }: { label: string; value: number; onChange: (v: number) => void; base: number | null }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">
          {base != null ? `${base.toFixed(0)}° → ${(base + value).toFixed(0)}°` : `${signed(value, 0)}°`}
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
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<(typeof PROFILES)[number]["key"]>("average");
  const [dTilt, setDTilt] = useState(0);
  const [dAttack, setDAttack] = useState(0);

  const needle = foldSearch(query.trim());
  const matches = useMemo(
    () => (needle ? options.filter((h) => foldSearch(h.player_name).includes(needle)).slice(0, MATCHES) : []),
    [options, needle],
  );
  const choose = (id: string) => {
    setPick(id);
    setQuery("");
    setDTilt(0);
    setDAttack(0);
  };

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
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) choose(String(matches[0].player_id));
            }}
            placeholder={hitter ? "Switch hitter" : "Search any MLB hitter, or use a generic profile"}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {matches.length > 0 && (
          <ul role="listbox" aria-label="Matching hitters" className="divide-y divide-border rounded-md border border-border text-sm">
            {matches.map((h) => (
              <li key={h.player_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={String(h.player_id) === pick}
                  onClick={() => choose(String(h.player_id))}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span>{h.player_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{h.team ?? ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {needle && matches.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No match. Includes {options.length} hitters with {study.lab.min_balls}+ tracked air balls in {study.season}.
          </p>
        )}
        {hitter && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PlayerCell athleteId={String(hitter.player_id)} headshotUrl={mlbPlayerHeadshotUrl(hitter.player_id)} name={hitter.player_name}
              team={hitter.team ?? "–"} position={line ? `${line.ops.toFixed(3).replace(/^0/, "")} OPS, ${hitter.hr} HR` : null}
              logo={mlbTeamIdentity(hitter.team)} />
            <button type="button" onClick={() => choose(GENERIC)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Reset to generic hitter
            </button>
          </div>
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
            { tilt: (baseTilt ?? 32) + dTilt, color: theme.highlight },
          ]}
        />
      </div>

      <div className="space-y-4">
        <div className="border-y border-rule-strong py-3">
          <p className="type-eyebrow text-muted-foreground">Carry change</p>
          <p className="font-mono text-2xl tabular-nums">{signed(carry)} ft</p>
          <p className="text-xs text-muted-foreground">
            Per ball in the air, keeping exit velocity and launch angle the same and changing only the spin from the new swing.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-normal">Season line</th>
              {line && <th className="py-1 text-right font-normal">{study.season}</th>}
              <th className="py-1 text-right font-normal">Typical shift</th>
              {line && <th className="py-1 text-right font-normal">New line</th>}
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
            Beyond ±{NATURAL_CHANGE}°: few MLB hitters change this much from one season to the next, so these numbers go past what we have seen in real games.
          </p>
        )}
        <HowGraded label="How this works"
          lead={<>Carry comes from ball-flight physics. The batting line comes from MLB hitters who actually changed their swing.</>}
        >
          <p>
            To estimate carry, we take {hitter ? `${hitter.player_name}'s` : "the league's"} {study.season} fly balls and liners, keep the
            exit velocity and launch angle the same, and recalculate how much backspin and sidespin the new swing plane would put on the ball.
            That isolates how much farther or shorter the exact same contact would fly.
          </p>
          <p>
            To estimate the batting line, we look at {coefs.n} year-to-year swing changes by {coefs.n_hitters} MLB hitters (2023 to {study.season}),
            holding bat speed and the prior season&apos;s stats steady so a normal bounce-back year is not credited to the swing. The range in
            parentheses is the typical margin of error (±1 standard error, grouped by hitter). Because these were real-life swing changes rather than
            controlled experiments, they show what tended to follow on average.
          </p>
        </HowGraded>
      </div>
    </div>
  );
}
