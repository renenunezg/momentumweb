import { Axis, Dot, Gridlines } from "@/components/home-figures";
import { PageSection } from "@/components/page-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BATTING_PARTS, BATTING_PART_LABELS, COUNT_SPLITS, DIRECTION_SPLITS, battingSplitLabel, formatCorrelation, leadSide,
  type BattingMeasure, type BattingValueStudy, type Interval, type LeadSide,
} from "@/lib/mlb-batting-value";
import { cn, describeGap, formatSigned } from "@/lib/utils";

// The validation the study row publishes: the total against next season's batting runs, then how well the parts and
// the listed splits repeat. Every verdict in the prose is read off the published intervals, so a refreshed study
// cannot leave a claim standing that its numbers no longer support.

const SIDE_WORDS: Record<LeadSide | "mixed", string> = {
  ahead: "ahead of",
  level: "level with",
  behind: "behind",
  mixed: "not consistently ahead of or behind",
};
// One verdict across the sample cuts, or "mixed" when they disagree.
function agreed(leads: Interval[]): LeadSide | "mixed" {
  const sides = new Set(leads.map(leadSide));
  return sides.size === 1 ? [...sides][0] : "mixed";
}
const list = (items: (string | number)[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
const gap = ([diff, low, high]: Interval) => describeGap(diff, low, high).text;

// Correlations here run from a little under zero to one, so every plot shares one track and can be compared by eye.
const LOW = -0.2;
const TICKS = [0, 0.5, 1];
const at = (v: number) => (100 * (Math.max(LOW, v) - LOW)) / (1 - LOW);
const ROW = "grid grid-cols-[5.75rem_minmax(0,1fr)_6.25rem] items-stretch gap-x-3";

interface PlotRow {
  key: string;
  label: string;
  // A reference number, not part of this stat.
  reference?: boolean;
  interval: Interval;
}

// One correlation per row with its 95% interval. A filled point is one whose interval clears zero.
function IntervalPlot({ title, rows }: { title: string; rows: PlotRow[] }) {
  return (
    <div className="min-w-0">
      <p className="type-eyebrow mb-1 text-muted-foreground">{title}</p>
      {rows.map(({ key, label, reference, interval: [value, low, high] }) => {
        const clear = low > 0 || high < 0;
        return (
          <div key={key} className={ROW}>
            <span className={cn("flex min-w-0 items-center gap-1.5 type-label", reference ? "text-muted-foreground" : "font-semibold")}>
              <span className="truncate">{label}</span>
            </span>
            <span className="relative h-7">
              <Gridlines ticks={TICKS} at={at} zero />
              <span
                aria-hidden="true"
                className={cn("absolute top-1/2 h-0.5 -translate-y-1/2", clear ? "bg-chart-primary" : "bg-chart-comparison")}
                style={{ left: `${at(low)}%`, width: `${at(high) - at(low)}%` }}
              />
              <Dot left={at(value)} filled={clear} />
            </span>
            <span className="self-center whitespace-nowrap text-right tabular-nums">
              <span className="type-label font-semibold">{formatCorrelation(value)}</span>{" "}
              <span className="type-meta text-muted-foreground">
                {formatCorrelation(low)} to {formatCorrelation(high)}
              </span>
            </span>
          </div>
        );
      })}
      <div className={ROW}>
        <span />
        <Axis ticks={TICKS} at={at} format={(v) => String(v).replace(/^0\./, ".")} />
        <span />
      </div>
    </div>
  );
}

const MEASURES: { key: BattingMeasure; label: string; reference?: boolean }[] = [
  { key: "total", label: "Total" },
  ...BATTING_PARTS.map((key) => ({ key, label: BATTING_PART_LABELS[key] })),
  { key: "call", label: "Calls" },
  { key: "xwoba", label: "xwOBA", reference: true },
  { key: "woba", label: "wOBA", reference: true },
];

const HEAD = "type-eyebrow text-right text-muted-foreground";
const NUM = "text-right tabular-nums";

export function BattingValueStudySection({ study, pitchTypes }: { study: BattingValueStudy; pitchTypes: string[] }) {
  const cuts = study.validation;
  const kept = study.held_back;
  const firstSeason = study.seasons[0];
  const lastSeason = study.seasons[study.seasons.length - 1];
  const addsNothing = cuts.every((cut) => leadSide(cut.grade.partial) === "level");
  const keptAhead = kept.filter((cut) => leadSide(cut.lead.woba) === "ahead").map((cut) => cut.pa);
  const clearOfZero = keptAhead.length === kept.length ? "at every cut" : keptAhead.length > 0 ? `only at ${list(keptAhead)}` : "at none of them";

  const measure = (field: "repeat" | "next_runs"): PlotRow[] =>
    MEASURES.map(({ key, label, reference }) => ({
      key, label, reference,
      interval: study.parts.measures[key][field],
    }));
  const listed = [
    ...COUNT_SPLITS.filter((code) => study.counts.values[code]).map((code) => [code, study.counts.values[code]] as const),
    ...pitchTypes.map((code) => [code, study.pitch_types.values[code]] as const),
    ...DIRECTION_SPLITS.flatMap((code) => {
      const found = study.directions?.values[code];
      return found ? [[code, found] as const] : [];
    }),
  ];
  const split = (field: "repeat" | "vs_rest"): PlotRow[] =>
    listed.map(([code, found]) => ({ key: code, label: battingSplitLabel(code), interval: found[field] }));
  // Splits whose gap to the hitter's other pitches has an interval that reaches zero.
  const generalLevel = listed.filter(([, found]) => found.vs_rest[1] <= 0).map(([code]) => battingSplitLabel(code));

  return (
    <>
      <PageSection className="border-t border-rule-strong pt-6">
        <p className="type-eyebrow text-muted-foreground">Does it mean anything?</p>
        <h2 className="type-section">Against next season&apos;s batting runs</h2>
        <p className="max-w-3xl text-sm leading-relaxed">
          At saying what a hitter&apos;s batting runs will be next season, one season&apos;s total is{" "}
          {SIDE_WORDS[agreed(cuts.map((cut) => cut.lead.woba))]} wOBA, {SIDE_WORDS[agreed(cuts.map((cut) => cut.lead.xwoba))]} xwOBA
          and {SIDE_WORDS[agreed(cuts.map((cut) => cut.grade.lead))]} the site&apos;s hitter grade.
          {addsNothing && " Once the grade is known, the total is not shown to add anything."} The grade is the forecast; this is
          the breakdown behind a season.
        </p>
        <Table density="compact" className="max-w-4xl">
          <TableHeader>
            <TableRow>
              <TableHead className="type-eyebrow text-muted-foreground">PA<span className="max-sm:hidden">, both seasons</span></TableHead>
              <TableHead className={cn(HEAD, "hidden sm:table-cell")}>Pairs</TableHead>
              <TableHead className={HEAD}>wOBA</TableHead>
              <TableHead className={HEAD}>xwOBA</TableHead>
              <TableHead className={HEAD}><span className="max-sm:hidden">Batting </span>value</TableHead>
              <TableHead className={cn(HEAD, "hidden md:table-cell")}>Lead over wOBA</TableHead>
              <TableHead className={cn(HEAD, "hidden md:table-cell")}>Lead over xwOBA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuts.map((cut) => (
              <TableRow key={cut.pa}>
                <TableCell>{cut.pa}+</TableCell>
                <TableCell className={cn(NUM, "hidden sm:table-cell")}>{cut.pairs.toLocaleString("en-US")}</TableCell>
                <TableCell className={NUM}>{formatCorrelation(cut.r.woba)}</TableCell>
                <TableCell className={NUM}>{formatCorrelation(cut.r.xwoba)}</TableCell>
                <TableCell className={NUM}>{formatCorrelation(cut.r.value)}</TableCell>
                <TableCell className={cn(NUM, "hidden md:table-cell")}>{gap(cut.lead.woba)}</TableCell>
                <TableCell className={cn(NUM, "hidden md:table-cell")}>{gap(cut.lead.xwoba)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Table density="compact" className="max-w-4xl">
          <TableHeader>
            <TableRow>
              <TableHead className="type-eyebrow text-muted-foreground">PA<span className="max-sm:hidden">, graded pairs</span></TableHead>
              <TableHead className={cn(HEAD, "hidden sm:table-cell")}>Pairs</TableHead>
              <TableHead className={HEAD}>Hitter grade</TableHead>
              <TableHead className={HEAD}><span className="max-sm:hidden">Batting </span>value</TableHead>
              <TableHead className={cn(HEAD, "hidden md:table-cell")}>Lead over the grade</TableHead>
              <TableHead className={cn(HEAD, "hidden md:table-cell")}>Added to the grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuts.map((cut) => (
              <TableRow key={cut.pa}>
                <TableCell>{cut.pa}+</TableCell>
                <TableCell className={cn(NUM, "hidden sm:table-cell")}>{cut.grade.pairs.toLocaleString("en-US")}</TableCell>
                <TableCell className={NUM}>{formatCorrelation(cut.grade.r)}</TableCell>
                <TableCell className={NUM}>{formatCorrelation(cut.grade.value)}</TableCell>
                <TableCell className={cn(NUM, "hidden md:table-cell")}>{gap(cut.grade.lead)}</TableCell>
                <TableCell className={cn(NUM, "hidden md:table-cell")}>{gap(cut.grade.partial)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Correlation of each first-season number, per plate appearance, with batting runs per plate appearance the next season,{" "}
          {firstSeason} to {lastSeason}. The grade is the preseason grade for the second season, fitted on nothing after the
          first, so it covers fewer pairs and has its own table.
          <span className="max-md:hidden">
            {" "}A lead is batting value minus the other number, with a 95% interval from resampling hitters. Added to the grade
            is the partial correlation of the total with next season&apos;s runs once the grade is known.
          </span>{" "}
          The method was designed on the earlier pairs. On the latest pairs, kept back to check it, the lead over xwOBA
          was {list(kept.map((cut) => formatSigned(cut.lead.xwoba[0], 2)))} and the lead over wOBA{" "}
          {list(kept.map((cut) => formatSigned(cut.lead.woba[0], 2)))} at {list(kept.map((cut) => cut.pa))} plate
          appearances, the second clear of zero {clearOfZero}.
        </p>
      </PageSection>

      <PageSection className="border-t border-rule-strong pt-6">
        <h2 className="type-section">What lasts</h2>
        <p className="max-w-3xl text-sm leading-relaxed">
          Each part repeats from one season to the next at least as well as the total, but only Quality says much about the
          season ahead. Making more contact than the pitch calls for has no positive link to next season&apos;s runs, because
          contact hitters tend to hit the ball less hard, so Contact reads as a hitting style.
        </p>
        <div className="grid gap-x-10 gap-y-6 pt-2 lg:grid-cols-2">
          <IntervalPlot title="Repeats the next season" rows={measure("repeat")} />
          <IntervalPlot title="Link to next season's batting runs" rows={measure("next_runs")} />
        </div>
        <p className="max-w-3xl text-sm leading-relaxed">
          A count, a pitch type or a direction is a fraction of a hitter&apos;s pitches, so it repeats less than his season does.
          {generalLevel.length > 0 &&
            ` ${list(generalLevel)} ${generalLevel.length > 1 ? "values mostly reflect" : "value mostly reflects"} a hitter's general level: his gap to his other pitches is not shown to repeat.`}
        </p>
        <div className="grid gap-x-10 gap-y-6 pt-2 lg:grid-cols-2">
          <IntervalPlot title="Runs per 100 repeat the next season" rows={split("repeat")} />
          <IntervalPlot title="Gap to his other pitches repeats" rows={split("vs_rest")} />
        </div>
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Correlations with 95% intervals from resampling hitters; a hollow point is one whose interval reaches zero. Parts:
          hitters with {study.parts.pa} or more plate appearances in both seasons, {study.parts.pairs.toLocaleString("en-US")} pairs.
          Splits: {study.counts.pitches} or more pitches in the count{study.directions ? " or the direction" : ""}, or{" "}
          {study.pitch_types.pitches} or more of the pitch type, in both seasons.
        </p>
      </PageSection>
    </>
  );
}
