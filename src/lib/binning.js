// Speed binning: why two dies off the same wafer are different products.
//
// The yield lab already answers "does this die work". This answers the
// question a fab actually asks next: "how fast does it work". Every die on a
// wafer sees slightly different processing, so every die has a different
// maximum clock — and the spread is wide enough that one design ships as three
// or four SKUs at three or four prices.
//
// Three effects set a die's Fmax, and they behave differently from each other:
//
//   1. SYSTEMATIC, ACROSS THE WAFER. Anneal temperature, CMP removal rate and
//      litho focus all vary with radius. The result is a smooth radial
//      gradient — centre and edge clock differently, reproducibly, on every
//      wafer from that tool.
//
//   2. RANDOM, DIE TO DIE. Ordinary process noise, roughly Gaussian.
//
//   3. WITHIN-DIE, AND THIS ONE IS COUNTERINTUITIVE. A die's clock is set by
//      its SLOWEST critical path, not its average one. With N paths drawn from
//      a distribution, the worst of them sits about √(2·ln N) standard
//      deviations out — so more paths means a slower die. But √(ln N) grows
//      very slowly, which is why doubling die area costs far less Fmax than
//      it costs yield. Area punishes you twice on yield and only gently here.
//
// This is a model, calibrated to produce realistic-looking spreads. Real Fmax
// distributions come from silicon and are among the most closely held numbers
// a company has.

/** Critical paths per mm² of logic. Order of magnitude, not a measurement. */
export const PATH_DENSITY = 12000

/**
 * Reference die area for the path-count term.
 *
 * The worst-path penalty is meaningless as an absolute number — it depends on
 * a path count nobody publishes. What is meaningful is how it CHANGES with
 * area, so it is normalised against a reference die. fBase is then "what a
 * nominal die of about this size achieves", which is a figure a person can
 * actually reason about, and area shows up as a relative effect.
 *
 * Getting this wrong the first time pushed every die below every bin: the
 * penalty was shifting the whole distribution down 10% instead of tilting it.
 */
export const REF_AREA_MM2 = 100

/**
 * How much slower the worst path is than the average one, as a multiplier.
 * Extreme-value approximation for the maximum of N Gaussian samples.
 */
export function worstPathPenalty(areaMm2, pathSigma = 0.02, density = PATH_DENSITY) {
  const n = Math.max(2, areaMm2 * density)
  return 1 + pathSigma * Math.sqrt(2 * Math.log(n))
}

/** Seeded generator, so a wafer stays put while a slider moves. */
function rng(seed) {
  let s = (seed >>> 0) || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
/** Box–Muller, for the die-to-die term. */
function gauss(rand) {
  const u = Math.max(1e-9, rand()), v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Maximum clock for every die on the wafer.
 *
 * @param dies      laid-out dies from layoutDies
 * @param waferDia  mm
 * @param cfg       { fBase, dieSigma, radialAmp, radialSign, pathSigma, seed }
 */
export function dieFrequencies(dies, waferDia, cfg = {}) {
  const {
    fBase = 5.0,        // GHz at nominal process, before any variation
    dieSigma = 0.035,   // random die-to-die spread, fraction
    radialAmp = 0.06,   // systematic centre-to-edge spread, fraction
    radialSign = -1,    // -1: edge slower (the usual case). +1: centre slower.
    pathSigma = 0.02,   // within-die path-to-path spread
    seed = 7,
  } = cfg

  const R = waferDia / 2
  const rand = rng(seed)
  const out = new Array(dies.length)

  for (let i = 0; i < dies.length; i++) {
    const d = dies[i]
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2
    const r = Math.hypot(cx, cy) / R

    // Systematic radial term. Quadratic because the underlying causes —
    // thermal profile, slurry flow, focus — are, near enough.
    const radial = 1 + radialSign * radialAmp * (r * r)
    const random = 1 + gauss(rand) * dieSigma
    // Relative to the reference die, not absolute. A six-times-larger die
    // loses well under one percent here — √(ln N) grows very slowly — which
    // is the honest answer, and a useful contrast with yield, where the same
    // area change is catastrophic.
    const penalty = worstPathPenalty(d.w * d.h, pathSigma) / worstPathPenalty(REF_AREA_MM2, pathSigma)

    out[i] = Math.max(0, (fBase * radial * random) / penalty)
  }
  return out
}

/**
 * Speed bins, as fractions of nominal. Prices are relative multipliers.
 *
 * A die below the lowest bin is not scrap in the defect sense — it works — it
 * simply misses the slowest SKU's timing and cannot be sold as that product.
 * That is a distinct loss from a defect kill, and the UI keeps them apart.
 */
export const BINS = [
  { id: 'x', label: 'Top bin', min: 1.06, priceMult: 2.2, hue: '#31c48d' },
  { id: 'a', label: 'Standard', min: 1.00, priceMult: 1.0, hue: '#4dd6e8' },
  { id: 'b', label: 'Value', min: 0.94, priceMult: 0.62, hue: '#ffb020' },
  { id: 'c', label: 'Entry', min: 0.87, priceMult: 0.38, hue: '#a679ff' },
]

export function binFor(freqGhz, fBase) {
  const ratio = freqGhz / fBase
  for (const b of BINS) if (ratio >= b.min) return b
  return null   // below every bin: works, but too slow to sell
}

/**
 * Full binning result: counts, share, revenue and blended selling price.
 *
 * @param freqs   per-die Fmax
 * @param dead    Set of die indices killed by defects
 */
export function binWafer({ freqs, dead, fBase, asp = 0 }) {
  const counts = Object.fromEntries(BINS.map((b) => [b.id, 0]))
  const perDie = new Array(freqs.length)
  let tooSlow = 0, good = 0, sumF = 0

  for (let i = 0; i < freqs.length; i++) {
    if (dead && dead.has(i)) { perDie[i] = null; continue }
    good++
    sumF += freqs[i]
    const b = binFor(freqs[i], fBase)
    perDie[i] = b
    if (b) counts[b.id]++
    else tooSlow++
  }

  const sellable = good - tooSlow
  const revenue = asp > 0
    ? BINS.reduce((n, b) => n + counts[b.id] * asp * b.priceMult, 0)
    : 0
  const blendedAsp = sellable > 0 && asp > 0 ? revenue / sellable : 0

  // Spread, reported the way a process engineer would: mean and the range the
  // middle of the distribution occupies.
  const alive = freqs.filter((_, i) => !dead || !dead.has(i)).sort((a, b) => a - b)
  const q = (p) => (alive.length ? alive[Math.floor(p * (alive.length - 1))] : 0)
  const [aLo, aHi] = alive.length ? [alive[0], alive[alive.length - 1]] : [0, 0]

  return {
    counts, perDie, tooSlow, good, sellable, revenue, blendedAsp,
    meanF: good > 0 ? sumF / good : 0,
    minF: aLo, maxF: aHi,
    p10: q(0.10), p50: q(0.50), p90: q(0.90),
    binYield: good > 0 ? sellable / good : 0,
  }
}

/**
 * Min and max by iteration, not by spread.
 *
 * `Math.min(...array)` passes every element as a separate argument and blows
 * the call stack somewhere north of 100,000. A 450 mm wafer of 1 mm dies has
 * about 150,000 of them, so this was a real crash reachable from the sliders —
 * caught by the smoke test's deliberate extremes case, not by anything a
 * normal configuration would exercise.
 */
function minMax(arr) {
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < lo) lo = arr[i]
    if (arr[i] > hi) hi = arr[i]
  }
  return [lo, hi]
}

/** Histogram of Fmax for the plot. */
export function histogram(freqs, dead, buckets = 26) {
  const alive = freqs.filter((_, i) => !dead || !dead.has(i))
  if (!alive.length) return { bins: [], lo: 0, hi: 0, peak: 0 }
  const [lo, hi] = minMax(alive)
  const span = hi - lo || 1
  const bins = new Array(buckets).fill(0)
  for (const f of alive) {
    const k = Math.min(buckets - 1, Math.floor(((f - lo) / span) * buckets))
    bins[k]++
  }
  return { bins, lo, hi, peak: minMax(bins)[1] }
}
