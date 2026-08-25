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
const { ARCH, STATUS, BACKSIDE, STACKING, BEYOND_CMOS, THERMAL_LIMITS } =
  await import(join(root, 'src/data/arch3d.js'))
const { cellArea, areaReduction, stackThermal, coolingFor } = await import(join(root, 'src/lib/thermal.js'))
const { LAYERS, ARM, MODELS, FAB_TIERS, TERAFAB } = await import(join(root, 'src/data/value-chain.js'))
const { SILICON, MAKERS, CATEGORIES, COUNTED } = await import(join(root, 'src/data/silicon.js'))
const { CHAIN, AUTOMATION, WHY_NO_HUMANS } = await import(join(root, 'src/data/sand.js'))
const { traceBack, waferMass, nines, impurityPpb, grams, SI_DENSITY } =
  await import(join(root, 'src/lib/chain.js'))
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
  ok('tour steps point at real tabs', TOUR.every((t) => ['sand', 'line', 'wafer', 'economics', 'nodes', '3d', 'silicon', 'chain', 'compute', 'quantum', 'quiz'].includes(t.tab)))
  ok('the tour visits every tab', ['sand', 'line', 'wafer', 'economics', 'nodes', '3d', 'silicon', 'chain', 'compute', 'quantum', 'quiz']
    .every((t) => TOUR.some((s) => s.tab === t)))
  ok('quiz covers the material chain', QUIZ.some((q) => /purity|distill|polysilicon|particle/i.test(q.q)))
  ok('quiz covers real silicon', QUIZ.some((q) => /Cerebras|MI300X|wafer-scale/i.test(q.q)))
  ok('quiz covers the value chain', QUIZ.some((q) => /Arm|EUV scanners|Terafab/i.test(q.q)))
  ok('quiz covers 3D transistors and the thermal wall',
    QUIZ.some((q) => /CFET|backside power/i.test(q.q)) && QUIZ.some((q) => /3D memory|3D logic/i.test(q.q)))
  ok('quiz covers compute and quantum', QUIZ.length >= 30 &&
    QUIZ.some((q) => /FP4|sparsity|precision/i.test(q.q)) &&
    QUIZ.some((q) => /qubit|surface code|threshold/i.test(q.q)))
}

/* ---------- 3D and beyond ---------- */
group('3D and beyond')
{
  ok('all six architectures are populated', ARCH.length === 6 && ARCH.every((a) =>
    a.id && a.name && a.era && a.one && a.what && a.why && a.cost && a.node &&
    STATUS[a.status] && a.gated >= 1 && a.cellArea > 0))
  ok('architecture ids are unique', new Set(ARCH.map((a) => a.id)).size === ARCH.length)
  ok('the ladder runs planar to 2D material',
    ARCH[0].id === 'planar' && ARCH[ARCH.length - 1].id === '2d')
  ok('gated faces increase then saturate at four',
    ARCH.every((a, i) => i === 0 || a.gated >= ARCH[i - 1].gated) && ARCH.every((a) => a.gated <= 4))
  ok('planar gates one face, FinFET three, nanosheet four',
    ARCH.find((a) => a.id === 'planar').gated === 1 &&
    ARCH.find((a) => a.id === 'finfet').gated === 3 &&
    ARCH.find((a) => a.id === 'nanosheet').gated === 4)
  ok('cell footprint shrinks monotonically down the ladder',
    ARCH.every((a, i) => i === 0 || a.cellArea < ARCH[i - 1].cellArea))
  ok('planar is the footprint baseline', ARCH[0].cellArea === 1)
  ok('CFET roughly halves the cell against nanosheet',
    (() => { const r = areaReduction('nanosheet', 'cfet'); return r > 0.35 && r < 0.6 })())
  ok('cellArea() resolves known ids and defaults safely',
    cellArea('cfet') === ARCH.find((a) => a.id === 'cfet').cellArea && cellArea('nonsense') === 1)

  // The status discipline: shipping and lab-demonstrated must not blur.
  ok('every status maps to a defined badge', ARCH.every((a) => STATUS[a.status]))
  ok('production architectures are exactly the three that ship',
    ARCH.filter((a) => a.status === 'production').map((a) => a.id).join() === 'planar,finfet,nanosheet')
  ok('forksheet and CFET are demonstrated, not claimed as production',
    ARCH.find((a) => a.id === 'forksheet').status === 'demonstrated' &&
    ARCH.find((a) => a.id === 'cfet').status === 'demonstrated')
  ok('2D-material channels are marked research', ARCH.find((a) => a.id === '2d').status === 'research')

  ok('backside power section is complete',
    BACKSIDE.what && BACKSIDE.how && BACKSIDE.cost && BACKSIDE.where && BACKSIDE.gains.length >= 3)
  ok('backside power names who actually ships it',
    /Intel|PowerVia/.test(BACKSIDE.where) && /TSMC|Super Power Rail/.test(BACKSIDE.where))
  ok('the cost of backside power is stated, not glossed',
    /thinning|bonding|fragile/i.test(BACKSIDE.cost))

  ok('stacking approaches are ordered by connection density',
    STACKING.length >= 4 && STACKING.every((s) => s.name && s.what && s.pitch && STATUS[s.status] && s.note))
  ok('hybrid bonding is present and in production',
    STACKING.find((s) => s.id === 'hybrid')?.status === 'production')
  ok('sequential 3D is marked research and names the thermal budget',
    STACKING.find((s) => s.id === 'sequential')?.status === 'research' &&
    /thermal budget|°C/.test(STACKING.find((s) => s.id === 'sequential').note))

  ok('beyond-CMOS entries each carry an honest limitation',
    BEYOND_CMOS.length >= 4 && BEYOND_CMOS.every((b) => b.name && b.idea && b.why && b.honest.length > 40))
  ok('no beyond-CMOS option is claimed as production',
    BEYOND_CMOS.every((b) => b.status === 'research'))
}

group('Thermal wall')
{
  ok('cooling limits are ordered and positive',
    THERMAL_LIMITS.every((l, i) => l.wPerMm2 > 0 && (i === 0 || l.wPerMm2 > THERMAL_LIMITS[i - 1].wPerMm2)))

  const base = { areaMm2: 800, wattsTier: 700 }
  const one = stackThermal({ ...base, tiers: 1, activity: 1 })
  ok('a single tier gives power over area', near(one.density, 700 / 800, 1e-9))
  ok('a single tier needs no stacking allowance', one.activeTiers === 1)

  const four = stackThermal({ ...base, tiers: 4, activity: 1 })
  ok('four tiers at full activity quadruple power density', near(four.density, one.density * 4, 1e-9))
  ok('density gain equals the tier count regardless of activity',
    stackThermal({ ...base, tiers: 4, activity: 0.2 }).densityGain === 4)
  // The whole point: low activity is the escape, and memory takes it.
  ok('lower simultaneous activity lowers density but not density gain', (() => {
    const idle = stackThermal({ ...base, tiers: 4, activity: 0.1 })
    return idle.density < four.density && idle.densityGain === four.densityGain
  })())
  ok('stacking never reduces power density',
    stackThermal({ ...base, tiers: 6, activity: 0.5 }).density >= one.density)

  ok('an extreme stack exceeds every listed cooling approach', (() => {
    const hot = stackThermal({ areaMm2: 100, wattsTier: 700, tiers: 8, activity: 1 })
    return hot.beyondAll === true && hot.needed === null
  })())
  ok('a modest die finds a cooling approach with headroom', (() => {
    const cool = stackThermal({ areaMm2: 800, wattsTier: 100, tiers: 1, activity: 1 })
    return cool.needed !== null && cool.headroom > 1 && cool.beyondAll === false
  })())
  ok('coolingFor picks the cheapest sufficient approach',
    coolingFor(0.1).id === 'passive' && coolingFor(1.0).id === 'cold' && coolingFor(100) === null)
  ok('zero area is refused rather than producing Infinity',
    stackThermal({ areaMm2: 0, wattsTier: 700, tiers: 2 }).ok === false)
  ok('density is finite across a wide sweep', (() => {
    for (const t of [1, 2, 4, 8]) for (const act of [0.05, 0.5, 1]) {
      const r = stackThermal({ areaMm2: 500, wattsTier: 300, tiers: t, activity: act })
      if (!Number.isFinite(r.density) || r.density <= 0) return false
    }
    return true
  })())
}

/* ---------- value chain ---------- */
group('Value chain')
{
  ok('all seven layers are populated', LAYERS.length >= 7 && LAYERS.every((l) =>
    l.id && l.name && l.what && l.capture && l.concentration && Array.isArray(l.who) && l.who.length >= 3))
  ok('layer ids are unique', new Set(LAYERS.map((l) => l.id)).size === LAYERS.length)
  ok('the chain runs IP through assembly',
    LAYERS[0].id === 'isa' && LAYERS[LAYERS.length - 1].id === 'osat')
  ok('the foundry and equipment layers are both present',
    LAYERS.some((l) => l.id === 'foundry') && LAYERS.some((l) => l.id === 'equipment'))
  ok('Arm appears in the IP layer', LAYERS.find((l) => l.id === 'isa').who.some((w) => /Arm/.test(w)))
  ok('RISC-V appears as the alternative', LAYERS.find((l) => l.id === 'isa').who.some((w) => /RISC-V/.test(w)))
  ok('ASML appears in the equipment layer', LAYERS.find((l) => l.id === 'equipment').who.some((w) => /ASML/.test(w)))
  ok('TSMC appears in the foundry layer', LAYERS.find((l) => l.id === 'foundry').who.some((w) => /TSMC/.test(w)))

  ok('Arm section is complete', ARM.what && ARM.ownSilicon && ARM.tension && ARM.licences.length >= 4)
  ok('both licence types are explained',
    ARM.licences.some((x) => /Core licence/i.test(x.k)) &&
    ARM.licences.some((x) => /Architecture licence/i.test(x.k)))
  ok('CSS and CSA are both covered',
    ARM.licences.some((x) => /CSS/.test(x.k)) && ARM.licences.some((x) => /CSA/.test(x.k)))
  ok('the licensor-becomes-supplier tension is stated, not glossed',
    /compete/i.test(ARM.tension) && /RISC-V/.test(ARM.tension))
  ok('RISC-V share claims are hedged rather than asserted as fact',
    /vary|estimate/i.test(ARM.tension))

  ok('three business models, each argued both ways', MODELS.length === 3 &&
    MODELS.every((m) => m.name && m.who && m.how && m.pro && m.con))
  ok('IDM, fabless and vertical are all represented',
    ['idm', 'fabless', 'vertical'].every((id) => MODELS.some((m) => m.id === id)))

  ok('fab tiers are ordered by capacity',
    FAB_TIERS.every((t, i) => i === 0 || t.wpm > FAB_TIERS[i - 1].wpm))
  ok('every fab tier has a wafer-start figure and a note',
    FAB_TIERS.every((t) => t.wpm > 0 && t.note && typeof t.real === 'boolean'))
  ok('the megafab band matches the published shorthand',
    FAB_TIERS.find((t) => t.id === 'megafab').wpm >= 30000 &&
    FAB_TIERS.find((t) => t.id === 'megafab').wpm <= 100000)
  ok('gigafab is above 100k wafer starts', FAB_TIERS.find((t) => t.id === 'gigafab').wpm > 100000)
  // The honesty rule: a proposed tier must not masquerade as an operating one.
  ok('terafab is flagged as not real', FAB_TIERS.find((t) => t.id === 'terafab').real === false)
  ok('every tier except terafab is flagged as real',
    FAB_TIERS.filter((t) => t.id !== 'terafab').every((t) => t.real === true))
  ok('the illustrative wafer-start figure is labelled as such',
    /illustrative|what-if|no such number/i.test(FAB_TIERS.find((t) => t.id === 'terafab').note))

  ok('Terafab status says it is not operating', /not operating/i.test(TERAFAB.status))
  ok('Terafab separates commitments from ambitions',
    TERAFAB.confirmed.length >= 5 && TERAFAB.ambitions.length >= 3 &&
    TERAFAB.confirmed.every((r) => r.length === 2) && TERAFAB.ambitions.every((r) => r.length === 2))
  ok('the capital figure and site are in the confirmed column',
    TERAFAB.confirmed.some(([, v]) => /16\.8/.test(v)) &&
    TERAFAB.confirmed.some(([, v]) => /Grimes/.test(v)))
  ok('the terawatt claim sits in ambitions, not commitments',
    TERAFAB.ambitions.some(([, v]) => /terawatt/i.test(v)) &&
    !TERAFAB.confirmed.some(([, v]) => /terawatt/i.test(v)))
  ok('the terawatt metric is explicitly flagged as contested',
    TERAFAB.ambitions.some(([, v]) => /does not come from the chip industry|critics/i.test(v)))
  ok('the case against is stated at length, not as a token caveat',
    TERAFAB.against.length > 200 && TERAFAB.why.length > 150)
}

/* ---------- real silicon ---------- */
group('Real silicon')
{
  ok('the catalogue is populated and unique',
    SILICON.length >= 18 && new Set(SILICON.map((s) => s.id)).size === SILICON.length)
  ok('every part is fully described', SILICON.every((s) =>
    s.name && s.year && s.foundry && s.node && s.what && s.notable &&
    MAKERS[s.maker] && CATEGORIES[s.cat] && (s.dies || 1) >= 1))
  ok('every maker in the legend has at least one part',
    Object.keys(MAKERS).every((m) => SILICON.some((s) => s.maker === m)))
  ok('every category is used',
    Object.keys(CATEGORIES).every((c) => SILICON.some((s) => s.cat === c)))
  ok('years are plausible', SILICON.every((s) => s.year >= 2015 && s.year <= 2027))
  ok('Apple, Google, NVIDIA, AMD and Cerebras are all represented',
    ['apple', 'google', 'nvidia', 'amd', 'cerebras'].every((m) => SILICON.some((s) => s.maker === m)))

  // The honesty rules this file exists to enforce.
  ok('undisclosed areas are flagged, not guessed',
    SILICON.every((s) => s.areaKnown === false ? s.areaMm2 === 0 : s.areaMm2 >= 0))
  ok('every part with a nonzero area has areaKnown unset or true',
    SILICON.every((s) => !(s.areaMm2 > 0 && s.areaKnown === false)))
  ok('at least one part declines to state its die area',
    SILICON.some((s) => s.areaKnown === false))
  ok('Apple areas are all marked as estimates',
    SILICON.filter((s) => s.maker === 'apple' && s.areaMm2 > 0).every((s) => s.est === true))
  ok('COUNTED holds exactly the parts with a transistor count',
    COUNTED.length === SILICON.filter((s) => s.transistors > 0).length &&
    COUNTED.every((c) => c.transistors > 0))
  ok('COUNTED is non-empty and spans several orders of magnitude', (() => {
    const lo = Math.min(...COUNTED.map((c) => c.transistors))
    const hi = Math.max(...COUNTED.map((c) => c.transistors))
    return COUNTED.length >= 10 && hi / lo > 100
  })())

  // Spot-checks against published figures. If a refactor or a careless edit
  // moves one of these, it is a factual error, not a style change.
  const by = (id) => SILICON.find((s) => s.id === id)
  ok('H100: 80B transistors on 814 mm²', by('h100').transistors === 80e9 && by('h100').areaMm2 === 814)
  ok('WSE-3: 4 trillion transistors on 46,225 mm²',
    by('wse3').transistors === 4e12 && by('wse3').areaMm2 === 46225)
  ok('WSE-3 is 215 mm square', near(Math.sqrt(by('wse3').areaMm2), 215, 0.1))
  ok('Rubin: 336B transistors across two dies',
    by('rubin').transistors === 336e9 && by('rubin').dies === 2)
  ok('Blackwell: 208B transistors across two dies',
    by('b200').transistors === 208e9 && by('b200').dies === 2)
  ok('TPU v1: 331 mm² at 28 nm', by('tpuv1').areaMm2 === 331 && by('tpuv1').node === '28 nm')
  ok('M1 Ultra is two dies', by('m1ultra').dies === 2)
  ok('MI300X is a multi-die part', by('mi300x').dies > 2)
  ok('every Apple and Google part is fabbed at TSMC',
    SILICON.filter((s) => s.maker === 'apple' || s.maker === 'google').every((s) => s.foundry === 'TSMC'))

  // Derived figures the UI shows.
  const dens = (s) => s.transistors / 1e6 / (s.areaMm2 * (s.dies || 1))
  ok('computed densities are physically plausible',
    SILICON.filter((s) => s.transistors > 0 && s.areaMm2 > 0)
      .every((s) => dens(s) > 5 && dens(s) < 400))
  ok('H100 density lands near the value the compute model is calibrated on',
    near(dens(by('h100')), 98, 4), dens(by('h100')).toFixed(1))
  ok('newer nodes are denser than older ones', dens(by('rubin')) > dens(by('tpuv1')) || by('tpuv1').transistors === 0)
  ok('parts above the reticle field are all multi-die or stitched',
    SILICON.filter((s) => s.areaMm2 > RETICLE.area).every((s) => s.dies > 1 || s.maker === 'cerebras'))
  ok('every loadable part yields at least one die on a 300 mm wafer',
    SILICON.filter((s) => s.areaKnown !== false && s.areaMm2 > 0 && s.areaMm2 < 60000)
      .every((s) => {
        const side = Math.sqrt(s.areaMm2)
        const g = layoutDies({ waferDia: 300, dieX: side, dieY: side, scribe: 0.08, edgeExclusion: 3 })
        return s.areaMm2 > 40000 ? g.gross === 0 : g.gross >= 1
      }))
}

/* ---------- sand to silicon ---------- */
group('Sand to silicon')
{
  // Hand-check: pi * 15cm^2 * 0.0775cm * 2.329 g/cm^3 = 127.6 g
  ok('300 mm wafer mass is ~127 g', near(waferMass(300), 127.6, 0.6), waferMass(300).toFixed(1))
  ok('200 mm wafer mass is ~56.7 g', near(waferMass(200), 56.7, 0.4), waferMass(200).toFixed(1))
  ok('wafer mass scales with the square of diameter', near(waferMass(300) / waferMass(200), 2.25, 0.01))
  ok('a thinner wafer weighs proportionally less', near(waferMass(300, 387.5) / waferMass(300), 0.5, 0.001))
  ok('silicon density is the physical value', near(SI_DENSITY, 2.329, 0.001))

  const die = { waferDia: 300, dieX: 10.5, dieY: 10.5, scribe: 0.08, edgeExclusion: 3, d0: 0.07,
    model: 'negbinom', alpha: 2.5, waferCost: 20000, lineYield: 0.98, testYield: 0.97,
    packageCost: 6, packageYield: 0.995, asp: 0 }
  const y = computeRun(die)
  const t = traceBack(die, y)

  ok('the trace resolves for a shippable die', t.ok)
  ok('the trace covers every stage in the chain', t.stages.length === CHAIN.length)
  ok('mass increases monotonically going backwards up the chain',
    t.stages.every((st, n) => n === 0 || st.massG <= t.stages[n - 1].massG + 1e-12))
  ok('die mass is wafer mass divided over good dies', near(t.dieMass, t.wafer / y.goodDies, 1e-9))
  ok('a phone-sized die is a fraction of a gram', t.dieMass > 0.05 && t.dieMass < 1, t.dieMass.toFixed(3))
  // Compounded loss factors: 2.5 x 1.2 x 1.4 x 1.2 x 1.6 x 1.02 x 1 ~= 8.2
  ok('rock-to-silicon mass ratio lands near 8x', near(t.quartzite / t.dieMass, 8.2, 1), (t.quartzite / t.dieMass).toFixed(2))
  ok('quartzite per phone die is a few grams', t.quartzite > 0.3 && t.quartzite < 20, grams(t.quartzite))
  ok('energy per die is positive and plausible', t.energy > 0.1 && t.energy < 50, `${t.energy.toFixed(2)} kWh`)
  ok('energy per wafer is in the right order for leading edge',
    t.energy * y.goodDies > 200 && t.energy * y.goodDies < 3000, `${(t.energy * y.goodDies).toFixed(0)} kWh`)
  ok('a bigger die needs more rock', (() => {
    const big = traceBack({ ...die, dieX: 24, dieY: 25 }, computeRun({ ...die, dieX: 24, dieY: 25 }))
    return big.ok && big.quartzite > t.quartzite
  })())
  ok('worse yield raises the rock per shipped die', (() => {
    const bad = { ...die, d0: 0.5 }
    const b = traceBack(bad, computeRun(bad))
    return b.ok && b.quartzite > t.quartzite
  })())
  ok('a die that cannot be made returns a refusal, not NaN', (() => {
    const z = traceBack({ ...die, dieX: 400, dieY: 400 }, computeRun({ ...die, dieX: 400, dieY: 400 }))
    return z.ok === false && z.stages.length === 0
  })())

  ok('purity never decreases along the chain',
    CHAIN.every((c, n) => n === 0 || c.purity >= CHAIN[n - 1].purity))
  ok('the chain starts at 2N and reaches 9N',
    near(CHAIN[0].purity, 0.99, 1e-9) && CHAIN.some((c) => near(c.purity, 0.999999999, 1e-12)))
  ok('nines() reads purity the way the industry says it',
    nines(0.99) === '2N' && nines(0.999999) === '6N' && nines(0.999999999) === '9N')
  ok('impurityPpb matches the purity figure',
    near(impurityPpb(0.999999999), 1, 1e-6) && near(impurityPpb(0.99), 1e7, 1))
  ok('grams() scales from micrograms to tonnes',
    grams(0.0000005).endsWith('µg') && grams(0.005).endsWith('mg') && grams(5).endsWith('g') &&
    grams(5000).endsWith('kg') && grams(5e6).endsWith('t'))
  ok('grams() handles zero and nonsense', grams(0) === '—' && grams(NaN) === '—')

  ok('every chain stage is fully populated', CHAIN.every((c) =>
    c.id && c.name && c.formula && c.one && c.what && c.chem && c.autonomy && c.temp && c.stat &&
    c.purity > 0 && c.purity <= 1 && c.lossFactor >= 1 && c.energyKwhPerKg >= 0))
  ok('chain ids are unique', new Set(CHAIN.map((c) => c.id)).size === CHAIN.length)
  ok('the chain runs from quartzite to die',
    CHAIN[0].id === 'quartzite' && CHAIN[CHAIN.length - 1].id === 'die')
  ok('every stage explains how it runs unattended',
    CHAIN.every((c) => c.autonomy.length > 40))
  ok('automation glossary is populated',
    AUTOMATION.length >= 6 && AUTOMATION.every((a) => a.k && a.name && a.what.length > 40))
  ok('the reasons people are excluded are stated',
    WHY_NO_HUMANS.length >= 4 && WHY_NO_HUMANS.every((w) => w.length > 40))
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

/* ---------- pipeline ---------- */
group('Pipeline')
{
  const read = (f) => existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : null
  const pkg = JSON.parse(read('package.json'))

  ok('lockfile is committed', existsSync(join(root, 'package-lock.json')))
  ok('node version is pinned for CI', existsSync(join(root, '.nvmrc')))
  ok('engines declares a minimum node', /\d/.test(pkg.engines?.node || ''))

  const gate = pkg.scripts?.test || ''
  ok('npm test is the whole gate',
    ['lint', 'build', 'verify', 'smoke', 'budget'].every((s) => gate.includes(s)), gate)
  ok('lint runs before build in the gate', gate.indexOf('lint') < gate.indexOf('build'))
  ok('every gate script exists',
    ['lint', 'build', 'verify', 'smoke', 'budget'].every((s) => pkg.scripts[s]))
  ok('the check scripts are committed',
    ['scripts/verify.mjs', 'scripts/smoke.mjs', 'scripts/budget.mjs', 'scripts/postdeploy.mjs']
      .every((f) => existsSync(join(root, f))))
  ok('eslint config is committed', existsSync(join(root, 'eslint.config.js')))

  const ci = read('.github/workflows/ci.yml')
  const dep = read('.github/workflows/deploy.yml')
  ok('CI workflow exists', !!ci)
  ok('deploy workflow exists', !!dep)
  ok('CI runs on pull requests', /pull_request/.test(ci))
  ok('CI is callable as a gate', /workflow_call/.test(ci))
  ok('CI runs every check', ['lint', 'build', 'verify', 'smoke', 'budget'].every((s) => ci.includes(`npm run ${s}`)))
  ok('CI installs from the lockfile', /npm ci/.test(ci))
  ok('CI reads the pinned node version', /node-version-file/.test(ci))
  ok('workflows declare least-privilege permissions', /permissions:/.test(ci) && /permissions:/.test(dep))
  ok('CI is read-only', /permissions:\s*\n\s*contents: read/.test(ci))
  ok('jobs have timeouts so a hang cannot burn an hour',
    /timeout-minutes/.test(ci) && /timeout-minutes/.test(dep))
  ok('deploy is gated on CI', /needs: gate/.test(dep) && /uses: \.\/\.github\/workflows\/ci\.yml/.test(dep))
  ok('deploy only runs from main', /branches: \[main\]/.test(dep))
  ok('deploy does not cancel itself mid-push', /cancel-in-progress: false/.test(dep))
  ok('deploy re-verifies the artifact it ships', /npm run verify/.test(dep))
  ok('deploy confirms the live site afterwards', /postdeploy\.mjs/.test(dep))
  ok('dependabot is configured', existsSync(join(root, '.github/dependabot.yml')))
  ok('a PR template exists', existsSync(join(root, '.github/pull_request_template.md')))
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
      // The provenance note is a claim the repo makes to its readers, so it
      // is checked like any other shipped content rather than trusted to
      // survive refactors.
      ok('the curator credit shipped', bundle.includes('Curated by') && bundle.includes('linkedin.com/in/abhaybhuva'))
      ok('external links carry rel=noopener', !/target:"_blank"/.test(bundle) || bundle.includes('noopener'))
      ok('author meta tag shipped', html.includes('name="author"') && html.includes('Abhay Bhuva'))
      ok('the provenance note shipped', bundle.includes('Anthropic') && bundle.includes('publicly available'))
      ok('the no-confidential-data statement shipped', /confidential/i.test(bundle))
      ok('the 3D architecture ladder shipped', bundle.includes('CFET') && bundle.includes('Forksheet'))
      ok('backside power shipped', bundle.includes('PowerVia') || bundle.includes('Backside power'))
      ok('no stray non-latin characters in the copy', !/[\u4e00-\u9fff\u3040-\u30ff]/.test(bundle))
      ok('the value chain shipped', bundle.includes('Terafab') && bundle.includes('Neoverse'))
      ok('the silicon catalogue shipped', bundle.includes('Cerebras') && bundle.includes('Ironwood'))
      ok('the sand-to-silicon chain shipped', bundle.includes('Czochralski') && bundle.includes('Siemens'))
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
    const readme = readFileSync(join(root, 'README.md'), 'utf8')
    ok('README states how the project was built', /Claude/.test(readme) && /Anthropic/.test(readme))
    ok('README states that no confidential data was used', /No confidential/i.test(readme))
    ok('README credits the curator with both links',
      /Curated by/.test(readme) && /linkedin\.com\/in\/abhaybhuva/.test(readme) &&
      /github\.com\/abhaybhuvagithub/.test(readme))
    ok('robots.txt was copied', existsSync(join(dist, 'robots.txt')))
    ok('sitemap.xml was copied', existsSync(join(dist, 'sitemap.xml')))
    ok('.nojekyll was copied', existsSync(join(dist, '.nojekyll')))
  }
}

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
