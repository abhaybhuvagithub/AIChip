// From silicon to operations per second.
//
// This is a first-order model, and it is calibrated rather than derived. The
// honest way to write it would be to count multiply-accumulate lanes and the
// transistors in each — but a tensor MAC lane is only a few thousand
// transistors, and a real accelerator spends the overwhelming majority of its
// die on SRAM, scheduling, interconnect and memory PHY that those lanes
// cannot run without.
//
// So the model divides *total* transistors by an amortised
// transistors-per-MAC figure. Calibration point: a well-known 814 mm² 4 nm
// accelerator carries about 80 billion transistors and roughly 280,000 tensor
// MAC lanes at ~1.75 GHz, which lands near 1,000 TFLOPS at FP16. That ratio,
// ~250,000 transistors per delivered MAC lane, is the default below.

export const PRECISIONS = [
  { id: 'fp64', label: 'FP64', mult: 1 / 16, use: 'Climate, CFD, structural analysis. The only place double precision is not negotiable.' },
  { id: 'fp32', label: 'FP32 / TF32', mult: 1 / 4, use: 'Classical scientific computing and the training default before mixed precision took over.' },
  { id: 'fp16', label: 'FP16 / BF16', mult: 1, use: 'The mixed-precision training baseline. BF16 trades mantissa for exponent range and mostly won.' },
  { id: 'fp8', label: 'FP8', mult: 2, use: 'Training at the frontier and most serving. Two operations for the silicon of one.' },
  { id: 'int8', label: 'INT8', mult: 2, use: 'Quantised inference. Same throughput as FP8, cheaper hardware, more calibration work.' },
  { id: 'fp4', label: 'FP4 / INT4', mult: 4, use: 'Aggressive inference quantisation. Four times the headline number for identical transistors.' },
]

// Where the operations actually live once you leave the die.
export const LADDER = [
  { id: 'die', label: 'One die', mult: 1, note: 'A single piece of silicon, bounded by the reticle field.' },
  { id: 'package', label: 'Package', mult: 2, note: 'Two or more compute chiplets on an interposer with stacked memory beside them.' },
  { id: 'board', label: 'Server (8-way)', mult: 16, note: 'Eight accelerators on one baseboard, linked by a coherent fabric.' },
  { id: 'rack', label: 'Rack', mult: 144, note: 'A liquid-cooled rack, roughly 70 accelerators, treated by the scheduler as one machine.' },
  { id: 'pod', label: 'Pod (32 racks)', mult: 4608, note: 'The unit a large training run is actually scheduled on.' },
  { id: 'cluster', label: 'Cluster (100k dies)', mult: 100000, note: 'A frontier training cluster. Power, not silicon, is the binding constraint at this size.' },
]

export const SCALE_NAMES = [
  { exp: 12, prefix: 'tera', unit: 'TOPS', what: 'A trillion operations a second. A phone does this today.' },
  { exp: 15, prefix: 'peta', unit: 'POPS', what: 'A quadrillion. One modern accelerator package, at low precision.' },
  { exp: 18, prefix: 'exa', unit: 'EOPS', what: 'A quintillion. The exascale threshold, crossed for FP64 in 2022.' },
  { exp: 21, prefix: 'zetta', unit: 'ZOPS', what: 'A sextillion. Reached only at low precision, across a whole datacentre.' },
]

export const DEFAULT_COMPUTE = {
  density: 135,        // million transistors per mm² — see the node table
  trPerMac: 250000,    // amortised across the whole die, calibrated above
  clockGHz: 1.8,
  precision: 'fp8',
  sparsity: 1,
  utilisation: 0.4,    // achieved fraction of peak on a real workload
  wattsPerDie: 700,
  scale: 'die',
}

/**
 * @param cfg  die geometry and cost, from the yield lab
 * @param c    compute parameters above
 */
export function computeThroughput(cfg, c, yieldResult) {
  const areaMm = cfg.dieX * cfg.dieY
  const transistors = areaMm * c.density * 1e6
  const macs = c.trPerMac > 0 ? transistors / c.trPerMac : 0
  const prec = PRECISIONS.find((p) => p.id === c.precision) || PRECISIONS[2]

  // Two operations per multiply-accumulate. Structured sparsity skips half
  // the multiplies and vendors count the skipped ones, which is why headline
  // figures are usually quoted "with sparsity".
  const opsPerDie = macs * 2 * c.clockGHz * 1e9 * prec.mult * c.sparsity
  const achieved = opsPerDie * c.utilisation

  const rung = LADDER.find((l) => l.id === c.scale) || LADDER[0]
  const peakAtScale = opsPerDie * rung.mult
  const achievedAtScale = achieved * rung.mult

  const opsPerWatt = c.wattsPerDie > 0 ? opsPerDie / c.wattsPerDie : 0
  const goodDies = yieldResult?.goodDies || 0
  const opsPerWafer = opsPerDie * goodDies
  const costPerDie = yieldResult?.costPerGoodDie
  const opsPerDollar = Number.isFinite(costPerDie) && costPerDie > 0 ? opsPerDie / costPerDie : 0

  const powerAtScale = c.wattsPerDie * rung.mult

  return {
    areaMm, transistors, macs, prec, rung,
    opsPerDie, achieved, peakAtScale, achievedAtScale,
    opsPerWatt, opsPerWafer, opsPerDollar, powerAtScale, goodDies,
  }
}

/** Render an ops/second figure with the right SI prefix. */
export function ops(v, digits = 1) {
  if (!Number.isFinite(v) || v <= 0) return '—'
  const units = [
    [1e21, 'ZOPS'], [1e18, 'EOPS'], [1e15, 'POPS'], [1e12, 'TOPS'],
    [1e9, 'GOPS'], [1e6, 'MOPS'], [1e3, 'kOPS'],
  ]
  for (const [d, u] of units) if (v >= d) return `${(v / d).toFixed(digits)} ${u}`
  return `${v.toFixed(0)} OPS`
}

export function watts(w) {
  if (!Number.isFinite(w) || w <= 0) return '—'
  if (w >= 1e6) return `${(w / 1e6).toFixed(1)} MW`
  if (w >= 1e3) return `${(w / 1e3).toFixed(1)} kW`
  return `${w.toFixed(0)} W`
}
