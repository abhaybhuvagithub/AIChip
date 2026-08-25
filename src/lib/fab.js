// The numbers behind the whole studio. Every figure the UI shows comes from
// here, so this file is the one place a wrong constant can do damage — the
// verify suite pins the outputs against hand-checked reference cases.

export const WAFERS = {
  200: { dia: 200, area: 31416, label: '200 mm (8")', note: 'Legacy / analog, power, MEMS. Still ~1/3 of world capacity by wafer count.' },
  300: { dia: 300, area: 70686, label: '300 mm (12")', note: 'The workhorse. 2.25x the area of 200 mm for roughly 1.3x the process cost.' },
  450: { dia: 450, area: 159043, label: '450 mm (18")', note: 'Repeatedly proposed, never ramped. The tool economics never closed.' },
}

// Reticle field on a modern scanner: 26 x 33 mm. Nothing monolithic gets
// bigger than this without stitching — which is why huge parts go chiplet.
export const RETICLE = { x: 26, y: 33, area: 858 }
export const HIGH_NA_RETICLE = { x: 26, y: 16.5, area: 429 }

/**
 * Lay real rectangles on a real circle and count them.
 *
 * Closed-form approximations (De Vries, the classic
 * `pi*r^2/S - pi*d/sqrt(2S)`) are fine for a spreadsheet but they disagree
 * with the wafer map we draw next to the number, and a reader will trust
 * their eyes over our arithmetic. So we place the grid and count.
 */
export function layoutDies({ waferDia = 300, dieX = 10, dieY = 10, scribe = 0.08, edgeExclusion = 3, centered = true }) {
  const pitchX = dieX + scribe
  const pitchY = dieY + scribe
  const R = waferDia / 2
  const usableR = Math.max(0, R - edgeExclusion)
  const dies = []
  if (pitchX <= 0 || pitchY <= 0 || usableR <= 0) return { dies, gross: 0, partial: 0, pitchX, pitchY, usableR }

  const nx = Math.ceil((2 * R) / pitchX) + 2
  const ny = Math.ceil((2 * R) / pitchY) + 2
  // A die centred on the wafer origin wastes the middle of the circle; most
  // real shot maps offset by half a field. Both are offered because the
  // difference is worth a few dies and engineers argue about it.
  const offX = centered ? -(nx * pitchX) / 2 : -(nx * pitchX) / 2 + pitchX / 2
  const offY = centered ? -(ny * pitchY) / 2 : -(ny * pitchY) / 2 + pitchY / 2

  let partial = 0
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = offX + ix * pitchX
      const y = offY + iy * pitchY
      const corners = [[x, y], [x + dieX, y], [x, y + dieY], [x + dieX, y + dieY]]
      const inside = corners.filter(([cx, cy]) => Math.hypot(cx, cy) <= usableR).length
      if (inside === 4) dies.push({ x, y, w: dieX, h: dieY, full: true })
      else if (inside > 0) partial++
    }
  }
  return { dies, gross: dies.length, partial, pitchX, pitchY, usableR }
}

/**
 * Yield models, in the order the industry adopted them.
 * A = die area in cm^2, D0 = defect density in defects/cm^2.
 */
export const YIELD_MODELS = {
  poisson: {
    label: 'Poisson',
    formula: 'Y = e^(−A·D₀)',
    note: 'Assumes defects fall independently and uniformly. Honest for small dies, brutally pessimistic for large ones — real defects cluster.',
    fn: (A, D0) => Math.exp(-A * D0),
  },
  murphy: {
    label: 'Murphy',
    formula: 'Y = ((1 − e^(−A·D₀)) / (A·D₀))²',
    note: "Murphy's triangular density. The long-time industry default and still a reasonable first answer.",
    fn: (A, D0) => { const x = A * D0; return x === 0 ? 1 : Math.pow((1 - Math.exp(-x)) / x, 2) },
  },
  seeds: {
    label: 'Seeds',
    formula: 'Y = 1 / (1 + A·D₀)',
    note: 'Exponential defect density. Optimistic; useful as an upper bound on a clustered process.',
    fn: (A, D0) => 1 / (1 + A * D0),
  },
  negbinom: {
    label: 'Negative binomial',
    formula: 'Y = 1 / (1 + A·D₀/α)^α',
    note: 'Clustering parameter α. α≈2 is a heavily clustered mature line, α→∞ collapses back to Poisson. This is what most fabs actually fit.',
    fn: (A, D0, alpha = 2) => Math.pow(1 + (A * D0) / alpha, -alpha),
  },
}

/** Full economics for one wafer of one product. */
export function computeRun(cfg) {
  const {
    waferDia = 300, dieX = 10, dieY = 10, scribe = 0.08, edgeExclusion = 3,
    d0 = 0.1, model = 'murphy', alpha = 2, layers = 60,
    waferCost = 17000, lineYield = 0.98, testYield = 0.97, packageCost = 4, packageYield = 0.995,
    asp = 0,
  } = cfg

  const geo = layoutDies({ waferDia, dieX, dieY, scribe, edgeExclusion })
  const areaMm = dieX * dieY
  const areaCm = areaMm / 100
  const m = YIELD_MODELS[model] || YIELD_MODELS.murphy
  const randomYield = Math.max(0, Math.min(1, m.fn(areaCm, d0, alpha)))

  // Line yield (wafers that survive the fab at all) x random defect yield
  // x parametric/test yield. Packaging takes its own cut afterwards.
  const dieYield = randomYield * lineYield * testYield
  const goodDies = geo.gross * dieYield
  const packagedGood = goodDies * packageYield

  const costPerWafer = waferCost
  const costPerGoodDie = packagedGood > 0 ? costPerWafer / packagedGood + packageCost : Infinity
  const revenue = asp * packagedGood
  const margin = asp > 0 ? (revenue - (costPerWafer + packagedGood * packageCost)) / revenue : null

  const reticleFit = areaMm <= RETICLE.area
  const utilisation = (geo.gross * areaMm) / (Math.PI * Math.pow(waferDia / 2, 2))

  return {
    geo, areaMm, areaCm, randomYield, dieYield, goodDies, packagedGood,
    costPerGoodDie, costPerWafer, revenue, margin, reticleFit, utilisation,
    lossToDefects: geo.gross - goodDies,
    modelMeta: m, layers,
  }
}

/**
 * Scatter defects for the wafer map. Seeded so the picture is stable while
 * you drag a slider — a map that reshuffles on every render is unreadable.
 */
export function scatterDefects({ waferDia, d0, alpha, clustered = true, seed = 7 }) {
  const areaCm2 = (Math.PI * Math.pow(waferDia / 2, 2)) / 100
  const count = Math.round(areaCm2 * d0)
  let s = seed
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
  const R = waferDia / 2
  const pts = []
  // Clustered mode drops defects around a handful of centres, which is what a
  // real particle excursion or an edge-ring signature looks like.
  const centres = clustered
    ? Array.from({ length: Math.max(1, Math.round(count / Math.max(1, alpha * 6))) }, () => {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R
        return [Math.cos(a) * r, Math.sin(a) * r]
      })
    : []
  for (let i = 0; i < count; i++) {
    if (clustered && centres.length && rnd() < 0.7) {
      const [cx, cy] = centres[Math.floor(rnd() * centres.length)]
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R * 0.12
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
      if (Math.hypot(x, y) <= R) pts.push([x, y])
    } else {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
    }
  }
  return pts
}

/** Which laid-out dies contain at least one defect. */
export function killDies(dies, defects) {
  const dead = new Set()
  for (const [dx, dy] of defects) {
    for (let i = 0; i < dies.length; i++) {
      const d = dies[i]
      if (dx >= d.x && dx <= d.x + d.w && dy >= d.y && dy <= d.y + d.h) { dead.add(i); break }
    }
  }
  return dead
}

export const fmt = {
  n: (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'),
  pct: (v, d = 1) => (Number.isFinite(v) ? (v * 100).toFixed(d) + '%' : '—'),
  usd: (v) => (Number.isFinite(v) ? '$' + v.toLocaleString('en-US', { maximumFractionDigits: v < 10 ? 2 : 0 }) : '—'),
}
