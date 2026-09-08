// Reproduces how the football pick policies turn a Student-t projection and a
// priced offer into win, push and break-even probabilities, so the methodology
// example can be drawn from a stored recommendation row alone.

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];

function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i + 1);
  const t = z + LANCZOS.length - 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}

// Continued fraction for the regularized incomplete beta (Numerical Recipes).
function betaContinuedFraction(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return h;
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

export function studentTCdf(t: number, df: number): number {
  if (!Number.isFinite(t)) return t > 0 ? 1 : 0;
  const x = df / (df + t * t);
  const tail = 0.5 * regularizedIncompleteBeta(df / 2, 0.5, x);
  return t >= 0 ? 1 - tail : tail;
}

// Published sd columns are standard deviations; the Student-t scale is smaller.
export function studentTScale(sd: number, df: number): number {
  return sd * Math.sqrt((df - 2) / df);
}

export interface IntegerBin {
  value: number;
  probability: number;
}

// Probability mass on each integer outcome from lo to hi, with the tails
// folded into the endpoint bins. Weights, when given, are the NFL key-number
// multipliers indexed by margin from -100 to 100.
export function integerBins(
  mean: number,
  sd: number,
  df: number,
  lo: number,
  hi: number,
  weights: number[] | null = null,
): IntegerBin[] {
  const scale = studentTScale(sd, df);
  const bins: IntegerBin[] = [];
  let previous = 0;
  for (let v = lo; v <= hi; v++) {
    const upper = v === hi ? 1 : studentTCdf((v + 0.5 - mean) / scale, df);
    let mass = upper - previous;
    previous = upper;
    if (weights) {
      const index = v + 100;
      if (index < 0 || index >= weights.length) {
        throw new Error("Margin outside the calibrated key-number range");
      }
      mass *= weights[index];
    }
    bins.push({ value: v, probability: mass });
  }
  if (weights) {
    const total = bins.reduce((sum, bin) => sum + bin.probability, 0);
    for (const bin of bins) bin.probability /= total;
  }
  return bins;
}

export type PickRegion = "win" | "push" | "loss";

export interface PickOffer {
  market: "h2h" | "spreads" | "totals";
  side: "home" | "away" | "over" | "under";
  point: number | null;
}

// Region of an outcome bin for the pick: sides are judged on the home margin
// against the home spread, totals against the posted total. Half-point lines
// never push; integer lines push on the line itself.
export function pickRegion(offer: PickOffer, outcome: number): PickRegion {
  if (offer.market === "totals") {
    const line = offer.point ?? 0;
    if (outcome === line) return "push";
    const over = outcome > line;
    return over === (offer.side === "over") ? "win" : "loss";
  }
  const point = offer.market === "h2h" ? 0 : (offer.point ?? 0);
  const homeSpread = offer.side === "home" ? point : -point;
  const edge = outcome + homeSpread;
  if (Math.abs(edge) < 1e-9) return "push";
  const homeCovers = edge > 0;
  return homeCovers === (offer.side === "home") ? "win" : "loss";
}

export interface PickProbabilities {
  win: number;
  push: number;
  loss: number;
}

// Sides: NFL passes the key-number weights over margins -100..100; CFB passes
// none and gets the plain Student-t, which the integer bins reproduce exactly
// at half-point and integer lines. Totals are the same for both sports.
export function pickProbabilities(
  offer: PickOffer,
  mean: number,
  sd: number,
  df: number,
  weights: number[] | null,
): PickProbabilities {
  // CFB moneylines have no tie: the policy prices them on the plain CDF at
  // zero rather than reserving the zero-margin bin the NFL weights carry.
  if (offer.market === "h2h" && !weights) {
    const signed = offer.side === "home" ? mean : -mean;
    const win = studentTCdf(signed / studentTScale(sd, df), df);
    return { win, push: 0, loss: 1 - win };
  }
  const [lo, hi] = offer.market === "totals" ? [0, 200] : [-100, 100];
  const bins = integerBins(mean, sd, df, lo, hi, weights);
  const out = { win: 0, push: 0, loss: 0 };
  for (const bin of bins) out[pickRegion(offer, bin.value)] += bin.probability;
  return out;
}

// Implied probability of an American price, vig included.
export function breakEvenProbability(price: number): number {
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

export function americanProfit(price: number): number {
  return price > 0 ? price / 100 : 100 / -price;
}
