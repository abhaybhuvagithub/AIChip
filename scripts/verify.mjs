#!/usr/bin/env node
/**
 * Regression protection. The wafer picture and the yield number come from the
 * same code, so a wrong constant is invisible in the UI — it just looks
 * plausible. These checks pin the arithmetic against hand-worked cases and
 * confirm the shipped bundle actually contains the app.
 *
 * Run: npm run verify   (or npm test, which builds first)
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { layoutDies, computeRun, YIELD_MODELS, scatterDefects, killDies, RETICLE, WAFERS } =
  await import(join(root, 'src/lib/fab.js'))
const { PROCESS, STAGES } = await import(join(root, 'src/data/process.js'))
const { NODES, PRODUCTS, ARCHITECTURES, FOUNDRIES } = await import(join(root, 'src/data/nodes.js'))
const { QUIZ, TOUR } = await import(join(root, 'src/data/learn.js'))
const { computeThroughput, ops, watts, PRECISIONS, LADDER, SCALE_NAMES, DEFAULT_COMPUTE } =
  await import(join(root, 'src/lib/compute.js'))
const { physicalPerLogical, logicalErrorRate, requiredDistance, estimateResources, THRESHOLD, ALGORITHMS, MODALITIES, FAB_DIFFERENCES, SHARED } =
  await import(join(root, 'src/lib/quantum.js'))

let pass = 0, fail = 0
const ok = (name, cond, detail = '') => {
  if (cond) { pass++ } else { fail++; console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`) }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol
const group = (n) => console.log(`\n${n}`)

/* ---------- geometry ---------- */
group('Wafer geometry')
{
  const g = layoutDies({ waferDia: 300, dieX: 10, dieY: 10, scribe: 0.08, edgeExclusion: 3 })
  // Sanity band, not a magic number: a 10x10 die on 300 mm lands in the low
  // 600s on every published calculator. Anything outside this is a bug.
  ok('300mm / 10x10mm die lands in the expected band', g.gross > 550 && g.gross < 680, `got ${g.gross}`)
  ok('every counted die is fully inside the usable radius', g.dies.every((d) =>
    [[d.x, d.y], [d.x + d.w, d.y], [d.x, d.y + d.h], [d.x + d.w, d.y + d.h]]
      .every(([x, y]) => Math.hypot(x, y) <= g.usableR + 1e-9)))
  ok('partial dies are counted separately and are non-zero', g.partial > 0)
  ok('no die overlaps another', (() => {
    for (let i = 0; i < g.dies.length; i++) for (let j = i + 1; j < g.dies.length; j++) {
      const a = g.dies[i], b = g.dies[j]
      if (a.x < b.x + b.w - 1e-9 && a.x + a.w > b.x + 1e-9 && a.y < b.y + b.h - 1e-9 && a.y + a.h > b.y + 1e-9) return false
    }
    return true
  })())

  const small = layoutDies({ waferDia: 300, dieX: 5, dieY: 5, scribe: 0.08, edgeExclusion: 3 })
  ok('halving the die on both axes gives roughly 4x the dies', small.gross > g.gross * 3.4 && small.gross < g.gross * 4.6, `${g.gross} → ${small.gross}`)

  const w200 = layoutDies({ waferDia: 200, dieX: 10, dieY: 10, scribe: 0.08, edgeExclusion: 3 })
  ok('300mm yields more dies than 200mm', w200.gross < g.gross)
  ok('300mm / 200mm die ratio tracks the area ratio (~2.25x)', near(g.gross / w200.gross, 2.25, 0.5), `${(g.gross / w200.gross).toFixed(2)}x`)

  ok('bigger edge exclusion never increases die count', (() => {
    let last = Infinity
    for (const e of [0, 2, 4, 6, 8, 10]) {
      const n = layoutDies({ waferDia: 300, dieX: 8, dieY: 8, scribe: 0.08, edgeExclusion: e }).gross
      if (n > last) return false
      last = n
    }
    return true
  })())
  ok('a die larger than the wafer yields nothing', layoutDies({ waferDia: 300, dieX: 400, dieY: 400, scribe: 0.08, edgeExclusion: 3 }).gross === 0)
  ok('zero usable radius yields nothing', layoutDies({ waferDia: 300, dieX: 5, dieY: 5, scribe: 0.08, edgeExclusion: 200 }).gross === 0)
  ok('wafer area constants match pi*r^2', Object.values(WAFERS).every((w) => near(w.area, Math.PI * (w.dia / 2) ** 2, 3)))
  ok('reticle area matches its dimensions', RETICLE.area === RETICLE.x * RETICLE.y)
}

/* ---------- yield models ---------- */
group('Yield models')
{
  for (const [k, m] of Object.entries(YIELD_MODELS)) {
    ok(`${k}: zero defect density gives 100% yield`, near(m.fn(1, 0, 2), 1, 1e-9))
    ok(`${k}: yield stays within [0,1] across a wide sweep`, (() => {
      for (const A of [0.01, 0.5, 1, 6, 20]) for (const D of [0, 0.05, 0.5, 5]) {
        const y = m.fn(A, D, 2)
        if (!(y >= 0 && y <= 1 + 1e-12) || Number.isNaN(y)) return false
      }
      return true
    })())
    ok(`${k}: yield falls monotonically as area grows`, (() => {
      let last = Infinity
      for (const A of [0.1, 0.5, 1, 2, 4, 8]) { const y = m.fn(A, 0.1, 2); if (y > last + 1e-12) return false; last = y }
      return true
    })())
  }
  // Hand-checked: Poisson at A=1 cm^2, D0=0.5 -> e^-0.5 = 0.60653
  ok('Poisson matches e^(-A·D0)', near(YIELD_MODELS.poisson.fn(1, 0.5), Math.exp(-0.5), 1e-12))
  // Seeds at A=1, D0=0.5 -> 1/1.5 = 0.6667
  ok('Seeds matches 1/(1+A·D0)', near(YIELD_MODELS.seeds.fn(1, 0.5), 2 / 3, 1e-12))
  // Negative binomial with alpha=2 at A=1, D0=0.5 -> (1+0.25)^-2 = 0.64
  ok('Negative binomial matches (1+A·D0/α)^-α', near(YIELD_MODELS.negbinom.fn(1, 0.5, 2), 0.64, 1e-12))
  ok('Murphy sits between Poisson and Seeds at moderate area', (() => {
    const A = 2, D = 0.2
    return YIELD_MODELS.poisson.fn(A, D) < YIELD_MODELS.murphy.fn(A, D) &&
      YIELD_MODELS.murphy.fn(A, D) < YIELD_MODELS.seeds.fn(A, D)
  })())
  ok('clustering (low α) beats Poisson on a large die', YIELD_MODELS.negbinom.fn(6, 0.1, 2) > YIELD_MODELS.poisson.fn(6, 0.1))
  ok('high α converges toward Poisson', near(YIELD_MODELS.negbinom.fn(2, 0.1, 400), YIELD_MODELS.poisson.fn(2, 0.1), 0.002))
}

/* ---------- economics ---------- */
group('Economics')
{
  const r = computeRun({ waferDia: 300, dieX: 10, dieY: 10, d0: 0.1, model: 'murphy', waferCost: 17000, packageCost: 4, asp: 200 })
  ok('good dies never exceed gross dies', r.goodDies <= r.geo.gross)
  ok('cost per good die is finite and positive', Number.isFinite(r.costPerGoodDie) && r.costPerGoodDie > 0)
  ok('cost per good die exceeds wafer cost / gross dies', r.costPerGoodDie > r.costPerWafer / r.geo.gross)
  ok('utilisation is a sane fraction', r.utilisation > 0.4 && r.utilisation < 1)
  ok('margin is computed when a price is set', r.margin !== null && r.margin < 1)
  ok('no price means no margin', computeRun({ dieX: 5, dieY: 5, asp: 0 }).margin === null)
  ok('zero good dies gives infinite cost, not NaN', (() => {
    const z = computeRun({ dieX: 400, dieY: 400, d0: 0.1 })
    return z.costPerGoodDie === Infinity
  })())
  ok('reticle flag trips above 858 mm²', computeRun({ dieX: 26, dieY: 34 }).reticleFit === false)
  ok('reticle flag holds at exactly the field size', computeRun({ dieX: 26, dieY: 33 }).reticleFit === true)
  ok('doubling area cuts good dies by more than half', (() => {
    const a = computeRun({ dieX: 10, dieY: 10, d0: 0.1, model: 'murphy' })
    const b = computeRun({ dieX: 10, dieY: 20, d0: 0.1, model: 'murphy' })
    return b.goodDies < a.goodDies / 2
  })())
  ok('every product preset produces at least one good die', PRODUCTS.every((p) => {
    const pr = computeRun({ waferDia: 300, scribe: 0.08, edgeExclusion: 3, model: 'negbinom', alpha: 2, ...p })
    return pr.goodDies >= 1 && Number.isFinite(pr.costPerGoodDie)
  }))
  ok('every product preset has a plausible gross margin', PRODUCTS.every((p) => {
    const pr = computeRun({ waferDia: 300, scribe: 0.08, edgeExclusion: 3, model: 'negbinom', alpha: 2, ...p })
    return pr.margin === null || (pr.margin > -3 && pr.margin < 1)
  }))
}

/* ---------- defect scatter ---------- */
group('Defect scatter')
{
  const a = scatterDefects({ waferDia: 300, d0: 0.1, alpha: 2, seed: 7 })
  const b = scatterDefects({ waferDia: 300, d0: 0.1, alpha: 2, seed: 7 })
  ok('the same seed gives the same wafer', JSON.stringify(a) === JSON.stringify(b))
  ok('a different seed gives a different wafer', JSON.stringify(a) !== JSON.stringify(scatterDefects({ waferDia: 300, d0: 0.1, alpha: 2, seed: 8 })))
  ok('every defect lands on the wafer', a.every(([x, y]) => Math.hypot(x, y) <= 150.001))
  ok('defect count scales with defect density', scatterDefects({ waferDia: 300, d0: 0.4, alpha: 2, seed: 7 }).length > a.length * 2)
  ok('zero defect density gives an empty wafer', scatterDefects({ waferDia: 300, d0: 0, alpha: 2, seed: 7 }).length === 0)
  const g = layoutDies({ waferDia: 300, dieX: 10, dieY: 10, scribe: 0.08, edgeExclusion: 3 })
  const dead = killDies(g.dies, a)
  ok('killed dies never exceed the die count', dead.size <= g.dies.length)
  ok('killed dies never exceed the defect count', dead.size <= a.length)
  ok('an empty defect list kills nothing', killDies(g.dies, []).size === 0)
}

/* ---------- content ---------- */
group('Content')
{
  ok('process line has every module populated', PROCESS.length >= 17 && PROCESS.every((s) =>
    s.id && s.name && s.one && s.what && s.physics && s.time && s.stat &&
    Array.isArray(s.tools) && s.tools.length && Array.isArray(s.defects) && s.defects.length))
  ok('process step ids are unique', new Set(PROCESS.map((s) => s.id)).size === PROCESS.length)
  ok('every process step maps to a known stage', PROCESS.every((s) => STAGES[s.stage]))
  ok('every stage is actually used', Object.keys(STAGES).every((k) => PROCESS.some((s) => s.stage === k)))
  ok('node table is chronological', NODES.every((n, i) => i === 0 || n.year >= NODES[i - 1].year))
  ok('node density increases monotonically', NODES.every((n, i) => i === 0 || n.mtr > NODES[i - 1].mtr))
  ok('architectures cover 1, 3 and 4 gate sides', [1, 3, 4].every((s) => ARCHITECTURES.some((a) => a.gateSides === s)))
  ok('foundry list is populated', FOUNDRIES.length >= 5 && FOUNDRIES.every((f) => f.name && f.note))
  ok('product presets are unique and complete', new Set(PRODUCTS.map((p) => p.id)).size === PRODUCTS.length &&
    PRODUCTS.every((p) => p.dieX > 0 && p.dieY > 0 && p.d0 > 0 && p.waferCost > 0 && p.blurb))
  ok('quiz answers all point at a real option', QUIZ.every((q) => q.opts[q.a] !== undefined))
  ok('every quiz question explains itself', QUIZ.every((q) => q.why && q.why.length > 40))
  ok('quiz options are distinct', QUIZ.every((q) => new Set(q.opts).size === q.opts.length))
  ok('tour steps point at real tabs', TOUR.every((t) => ['line', 'wafer', 'economics', 'nodes', 'compute', 'quantum', 'quiz'].includes(t.tab)))
  ok('the tour visits every tab', ['line', 'wafer', 'economics', 'nodes', 'compute', 'quantum', 'quiz']
    .every((t) => TOUR.some((s) => s.tab === t)))
  ok('quiz covers compute and quantum', QUIZ.length >= 18 &&
    QUIZ.some((q) => /FP4|sparsity|precision/i.test(q.q)) &&
    QUIZ.some((q) => /qubit|surface code|threshold/i.test(q.q)))
}

/* ---------- compute throughput ---------- */
group('Compute throughput')
{
  const die = { dieX: 26, dieY: 31.3, waferDia: 300, scribe: 0.08, edgeExclusion: 3, d0: 0.08, model: 'negbinom', alpha: 2, waferCost: 20000, packageCost: 20, lineYield: 0.98, testYield: 0.95, packageYield: 0.98, asp: 0 }
  const c = { ...DEFAULT_COMPUTE, density: 98, trPerMac: 250000, clockGHz: 1.755, precision: 'fp16', sparsity: 1 }
  const y = computeRun(die)
  const r = computeThroughput(die, c, y)

  // The model is calibrated, so this is the check that matters: a ~814 mm²
  // die at ~98 MTr/mm² and 1.755 GHz should land near 1,000 TFLOPS at FP16.
  // If a refactor moves this, the calibration has silently broken.
  ok('calibration: reference accelerator lands near 1 POPS at FP16',
    r.opsPerDie > 0.8e15 && r.opsPerDie < 1.5e15, ops(r.opsPerDie))
  ok('MAC count is total transistors over transistors-per-MAC',
    near(r.macs, (die.dieX * die.dieY * c.density * 1e6) / c.trPerMac, 1))
  ok('achieved throughput never exceeds peak', r.achieved <= r.opsPerDie)
  ok('sparsity doubles the headline figure',
    near(computeThroughput(die, { ...c, sparsity: 2 }, y).opsPerDie, r.opsPerDie * 2, 1e6))

  ok('FP4 is 64x FP64 on identical silicon', (() => {
    const lo = computeThroughput(die, { ...c, precision: 'fp64' }, y).opsPerDie
    const hi = computeThroughput(die, { ...c, precision: 'fp4' }, y).opsPerDie
    return near(hi / lo, 64, 0.001)
  })())
  ok('precision multipliers are ordered from FP64 up to FP4',
    PRECISIONS.every((p, i) => i === 0 || p.mult >= PRECISIONS[i - 1].mult))
  ok('every precision has a stated use', PRECISIONS.every((p) => p.label && p.use && p.mult > 0))

  ok('the scale ladder is monotonic', LADDER.every((l, i) => i === 0 || l.mult > LADDER[i - 1].mult))
  ok('scale multiplies throughput and power together', (() => {
    const rack = computeThroughput(die, { ...c, scale: 'rack' }, y)
    return near(rack.peakAtScale, r.opsPerDie * 144, 1e6) && near(rack.powerAtScale, c.wattsPerDie * 144, 0.01)
  })())
  ok('a cluster of this die clears an exaop at FP8',
    computeThroughput(die, { ...c, precision: 'fp8', scale: 'cluster' }, y).peakAtScale > 1e18)

  ok('per-wafer throughput tracks good dies', near(r.opsPerWafer, r.opsPerDie * y.goodDies, 1e6))
  ok('ops per dollar is finite for a shippable die', Number.isFinite(r.opsPerDollar) && r.opsPerDollar > 0)
  ok('zero-transistor die produces no ops', computeThroughput({ dieX: 0, dieY: 0 }, c, y).opsPerDie === 0)
  ok('zero transistors-per-MAC does not divide by zero',
    computeThroughput(die, { ...c, trPerMac: 0 }, y).opsPerDie === 0)
  ok('zero power does not divide by zero',
    computeThroughput(die, { ...c, wattsPerDie: 0 }, y).opsPerWatt === 0)

  ok('ops() picks the right SI prefix', ops(1.5e12).endsWith('TOPS') && ops(1.5e15).endsWith('POPS') &&
    ops(1.5e18).endsWith('EOPS') && ops(1.5e21).endsWith('ZOPS'))
  ok('ops() handles zero and nonsense', ops(0) === '—' && ops(NaN) === '—' && ops(-5) === '—')
  ok('watts() scales through kW and MW', watts(500) === '500 W' && watts(1500).endsWith('kW') && watts(2e6).endsWith('MW'))
  ok('scale names are the standard powers of ten', SCALE_NAMES.map((s) => s.exp).join() === '12,15,18,21')
}

/* ---------- quantum ---------- */
group('Quantum error correction')
{
  // Rotated surface code: d^2 data + (d^2-1) measure.
  ok('physical qubits per logical is 2d²−1',
    physicalPerLogical(3) === 17 && physicalPerLogical(5) === 49 && physicalPerLogical(11) === 241)

  ok('logical error falls as distance grows', (() => {
    let last = Infinity
    for (const d of [3, 5, 7, 9, 11, 13]) { const e = logicalErrorRate(0.001, d); if (e >= last) return false; last = e }
    return true
  })())
  ok('two more distance steps buy roughly an order of magnitude',
    (() => { const r = logicalErrorRate(0.001, 11) / logicalErrorRate(0.001, 13); return r > 5 && r < 20 })())
  ok('logical error rises as physical error rises',
    logicalErrorRate(0.005, 11) > logicalErrorRate(0.0005, 11))
  ok('at threshold the code stops helping', logicalErrorRate(THRESHOLD, 21) === 1)
  ok('above threshold the code stops helping', logicalErrorRate(0.02, 51) === 1)
  ok('hand-check: p=0.001, d=11 gives A·(0.1)^6', near(logicalErrorRate(0.001, 11), 0.1 * Math.pow(0.1, 6), 1e-18))

  ok('required distance is always odd', [0.0001, 0.0005, 0.001, 0.005].every((p) => {
    const d = requiredDistance(p, 1e-12); return d !== null && d % 2 === 1
  }))
  ok('a worse physical error rate never needs a shorter code', (() => {
    let last = 0
    for (const p of [0.0001, 0.0005, 0.001, 0.003, 0.006]) {
      const d = requiredDistance(p, 1e-12); if (d === null || d < last) return false; last = d
    }
    return true
  })())
  ok('above threshold there is no workable distance', requiredDistance(0.015, 1e-12) === null)

  const shor = ALGORITHMS.find((a) => a.id === 'shor')
  const est = estimateResources({ p: 0.001, logicalQubits: shor.logical, tGates: shor.t, factoryOverhead: 1.5, cycleUs: 1 })
  ok('Shor at 0.1% error is estimated in the millions of qubits',
    est.ok && est.totalQubits > 1e6 && est.totalQubits < 1e8, est.ok ? String(est.totalQubits) : 'failed')
  ok('the estimate meets the error target it set', est.ok && est.achievedPL <= est.targetPL)
  ok('total qubits equal logical × per-logical × factory overhead',
    est.ok && near(est.totalQubits, Math.ceil(shor.logical * est.perLogical * 1.5), 1))
  ok('factory overhead scales the footprint linearly', (() => {
    const a = estimateResources({ p: 0.001, logicalQubits: 100, tGates: 1e9, factoryOverhead: 1 })
    const b = estimateResources({ p: 0.001, logicalQubits: 100, tGates: 1e9, factoryOverhead: 4 })
    return a.ok && b.ok && near(b.totalQubits / a.totalQubits, 4, 0.02)
  })())
  ok('a slower correction cycle lengthens runtime proportionally', (() => {
    const a = estimateResources({ p: 0.001, logicalQubits: 100, tGates: 1e6, cycleUs: 1 })
    const b = estimateResources({ p: 0.001, logicalQubits: 100, tGates: 1e6, cycleUs: 100 })
    return a.ok && b.ok && near(b.seconds / a.seconds, 100, 0.01)
  })())
  ok('a bigger algorithm never needs fewer qubits', (() => {
    const a = estimateResources({ p: 0.001, logicalQubits: 100, tGates: 1e6 })
    const b = estimateResources({ p: 0.001, logicalQubits: 100, tGates: 1e15 })
    return a.ok && b.ok && b.totalQubits >= a.totalQubits
  })())
  ok('above threshold the estimate refuses rather than returning a number', (() => {
    const e = estimateResources({ p: 0.02, logicalQubits: 100, tGates: 1e6 })
    return e.ok === false && e.reason === 'above-threshold'
  })())
  ok('every algorithm preset resolves at a realistic error rate',
    ALGORITHMS.every((a) => estimateResources({ p: 0.0005, logicalQubits: a.logical, tGates: a.t }).ok))
  ok('algorithm presets are complete and unique',
    new Set(ALGORITHMS.map((a) => a.id)).size === ALGORITHMS.length &&
    ALGORITHMS.every((a) => a.name && a.logical > 0 && a.t > 0 && a.note))
}

group('Quantum content')
{
  ok('five modalities, each fully described', MODALITIES.length === 5 && MODALITIES.every((m) =>
    m.name && m.temp && m.gate && m.coherence && m.fab && m.hard && m.pro && m.con))
  ok('modality ids are unique', new Set(MODALITIES.map((m) => m.id)).size === MODALITIES.length)
  ok('the fab comparison covers both sides on every row',
    FAB_DIFFERENCES.length >= 6 && FAB_DIFFERENCES.every((f) => f.k && f.classical && f.quantum && f.why))
  ok('shared-process list is populated', SHARED.length >= 5 && SHARED.every((s) => typeof s === 'string' && s.length > 10))
  ok('threshold is the conventional 1%', THRESHOLD === 0.01)
}

/* ---------- build output ---------- */
group('Build output')
{
  const dist = join(root, 'dist')
  if (!existsSync(dist)) {
    console.log('  (skipped — no dist/, run `npm run build` first)')
  } else {
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    ok('built index.html exists and mounts the app', html.includes('id="root"'))
    ok('asset paths are prefixed for the AIChip Pages path', html.includes('/AIChip/assets/'))
    ok('canonical URL points at the live site', html.includes('abhaybhuvagithub.github.io/AIChip'))
    ok('noscript fallback survives the build', html.includes('<noscript>'))
    const assets = readdirSync(join(dist, 'assets'))
    const js = assets.filter((f) => f.endsWith('.js'))
    const css = assets.filter((f) => f.endsWith('.css'))
    ok('a JS bundle was emitted', js.length > 0)
    ok('a CSS bundle was emitted', css.length > 0)
    if (js.length) {
      const bundle = readFileSync(join(dist, 'assets', js[0]), 'utf8')
      ok('the fab line content shipped', bundle.includes('Czochralski'))
      ok('the yield models shipped', bundle.includes('Negative binomial') || bundle.includes('negbinom'))
      ok('the compute tab shipped', bundle.includes('TOPS') || bundle.includes('EOPS'))
      ok('the quantum tab shipped', bundle.includes('transmon') || bundle.includes('surface code') || bundle.includes('Millikelvin'))
      ok('no stray console.log in the bundle', !/console\.log\(/.test(bundle))
    }
    if (css.length) {
      const sheet = readFileSync(join(dist, 'assets', css[0]), 'utf8')
      // The minifier drops the quotes in attribute selectors, so accept both.
      ok('all five themes shipped', ['litho', 'wafer', 'glow', 'mk', 'cleanroom'].every((t) =>
        sheet.includes(`data-theme="${t}"`) || sheet.includes(`data-theme=${t}`)))
      ok('reduced motion is respected', sheet.includes('prefers-reduced-motion'))
    }
    ok('robots.txt was copied', existsSync(join(dist, 'robots.txt')))
    ok('sitemap.xml was copied', existsSync(join(dist, 'sitemap.xml')))
    ok('.nojekyll was copied', existsSync(join(dist, '.nojekyll')))
  }
}

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
