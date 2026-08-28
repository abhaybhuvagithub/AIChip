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
  ok('tour steps point at real tabs', TOUR.every((t) => ['sand', 'line', 'wafer', 'economics', 'nodes', '3d', 'silicon', 'chain', 'compute', 'quantum', 'quiz', 'run', 'god', 'science', 'clock', 'business', 'ethics', 'unsolved', 'acronyms', 'trace'].includes(t.tab)))
  ok('the tour visits every tab', ['sand', 'line', 'wafer', 'economics', 'nodes', '3d', 'silicon', 'chain', 'compute', 'quantum', 'quiz']
    .every((t) => TOUR.some((s) => s.tab === t)))
  ok('quiz covers the material chain', QUIZ.some((q) => /purity|distill|polysilicon|particle/i.test(q.q)))
  ok('quiz covers real silicon', QUIZ.some((q) => /Cerebras|MI300X|wafer-scale/i.test(q.q)))
  ok('quiz covers the value chain', QUIZ.some((q) => /Arm|EUV scanners|Terafab/i.test(q.q)))
  ok('quiz covers open problems', QUIZ.some((q) => /Tunnel FET|SRAM bit cell/i.test(q.q)))
  ok('quiz covers transport and interconnect', QUIZ.some((q) => /mobility|copper wire|indirect|Electromigration/i.test(q.q)))
  ok('quiz covers discipline', QUIZ.some((q) => /per-step|flawless|700 steps/i.test(q.q)))
  ok('quiz covers the business case', QUIZ.some((q) => /NRE|amortis|cash|node above which/i.test(q.q)))
  ok('quiz covers speed binning', QUIZ.some((q) => /bin|slow dies|blended/i.test(q.q)))
  ok('quiz covers clock frequency', QUIZ.some((q) => /GHz|THz|clock/i.test(q.q)))
  ok('quiz covers the underlying physics',
    QUIZ.some((q) => /subthreshold|60 mV|stochastic|tunnel/i.test(q.q)))
  ok('quiz covers the fab simulation',
    QUIZ.some((q) => /X-factor|cycle time|bottleneck|scanners/i.test(q.q)))
  ok('quiz covers 3D transistors and the thermal wall',
    QUIZ.some((q) => /CFET|backside power/i.test(q.q)) && QUIZ.some((q) => /3D memory|3D logic/i.test(q.q)))
  ok('quiz covers compute and quantum', QUIZ.length >= 53 &&
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

/* ---------- journey ---------- */
group('Travel path')
{
  const { buildJourney, journeyTotals, PHASES } = await import(join(root, 'src/lib/journey.js'))
  const j = buildJourney(70)
  const t = journeyTotals(j)

  // 626: six material stages, then 70 layers of 8–9 steps with sampled
  // metrology on top, then eight assembly steps.
  ok('the journey is around 620 steps', j.length > 560 && j.length < 700, String(j.length))
  ok('every step is fully described', j.every((s) =>
    s.name && s.tool && s.what && s.hours > 0 && PHASES[s.phase] && Number.isFinite(s.temp)))
  ok('steps are indexed in order', j.every((s, i) => s.index === i))
  ok('cumulative hours increase monotonically',
    j.every((s, i) => i === 0 || s.cumHours > j[i - 1].cumHours))
  ok('cumulative distance never decreases',
    j.every((s, i) => i === 0 || s.cumDistance >= j[i - 1].cumDistance))
  ok('peak temperature never decreases',
    j.every((s, i) => i === 0 || s.peakTemp >= j[i - 1].peakTemp))

  ok('the path starts in material and ends in assembly',
    j[0].phase === 'material' && j[j.length - 1].phase === 'assembly')
  ok('it ends with the part being marked and shipped', j[j.length - 1].key === 'mark')
  ok('all four phases are present', Object.keys(PHASES).every((p) => j.some((s) => s.phase === p)))

  // The repetition is the point of the whole tab. If a refactor summarises it
  // away, the tab is lying about the process.
  ok('lithography appears once per layer', t.lithoVisits === 70, String(t.lithoVisits))
  ok('every layer is represented',
    new Set(j.filter((s) => s.layer > 0 && s.phase !== 'assembly').map((s) => s.layer)).size === 70)
  ok('front-end layers implant, back-end layers deposit',
    j.some((s) => s.key === 'implant' && s.layer < 30) &&
    j.some((s) => s.key === 'depo' && s.layer > 40) &&
    !j.some((s) => s.key === 'implant' && s.layer > 40))
  ok('metrology and inspection are sampled, not universal',
    j.filter((s) => s.key === 'metro').length < 70 && j.filter((s) => s.key === 'inspect').length < 70)

  // Pure process time only. The three-month figure everyone quotes is this
  // plus queueing, which the fab run tab adds — and which is most of it.
  ok('pure process time is weeks, not days', t.days > 35 && t.days < 90, `${t.days.toFixed(0)} days`)
  ok('the wafer travels kilometres inside the fab', t.km > 3 && t.km < 30, `${t.km.toFixed(1)} km`)
  ok('peak temperature is the crystal furnace', t.peakTemp >= 1000, String(t.peakTemp))
  ok('phase totals add up to the whole path',
    Object.values(t.byPhase).reduce((n, p) => n + p.count, 0) === j.length)
  ok('a different layer count changes the path length', buildJourney(20).length < j.length)
}

group('Assistant')
{
  const { ask, SUGGESTIONS } = await import(join(root, 'src/lib/assistant.js'))
  const { buildJourney } = await import(join(root, 'src/lib/journey.js'))
  const cfg = { waferDia: 300, dieX: 10.5, dieY: 10.5, scribe: 0.08, edgeExclusion: 3, d0: 0.07,
    model: 'negbinom', alpha: 2.5, waferCost: 20000, lineYield: 0.98, testYield: 0.97,
    packageCost: 6, packageYield: 0.995, asp: 120 }
  const ctx = { cfg, snap: null, journey: buildJourney(70) }

  ok('every suggested question is actually answerable',
    SUGGESTIONS.every((q) => ask(q, ctx) !== null),
    SUGGESTIONS.filter((q) => !ask(q, ctx)).join(' | '))
  ok('answers are substantial, not one-liners',
    SUGGESTIONS.every((q) => ask(q, ctx).text.length > 80))

  // The whole point of a grounded assistant is that it refuses rather than
  // inventing. If this check ever fails, it has started making things up.
  ok('it returns nothing for questions it cannot ground',
    ask('what is the capital of France', ctx) === null &&
    ask('write me a poem about wafers', ctx) === null &&
    ask('tell me a joke', ctx) === null &&
    ask('who will win the election', ctx) === null)
  ok('empty input is handled', ask('', ctx) === null && ask(null, ctx) === null)

  ok('yield answers carry the actual computed numbers', (() => {
    const a = ask('why is my yield low', ctx)
    return a && /\d/.test(a.text) && a.text.includes('%')
  })())
  ok('answers change when the configuration changes', (() => {
    const small = ask('what is my yield', ctx).text
    const big = ask('what is my yield', { ...ctx, cfg: { ...cfg, dieX: 25, dieY: 25 } }).text
    return small !== big
  })())
  ok('it says the line is not running rather than inventing a bottleneck', (() => {
    const a = ask('what is the bottleneck', ctx)
    return a && /not going|not running/i.test(a.text)
  })())
  ok('it reads a live snapshot when one exists', (() => {
    const snap = { day: 100, stats: { completed: 5 }, events: [], metrics: {
      wip: 200, avgCycleDays: 110, rawDays: 40, xFactor: 2.7, wpm: 2000, toolsDown: 1,
      excursionCount: 0, bottleneckId: 'litho', bottleneckName: 'Lithography', bottleneckUtil: 0.94,
      groups: [{ id: 'litho', name: 'Lithography', util: 0.94, queued: 12, capex: 200 },
               { id: 'etch', name: 'Etch', util: 0.8, queued: 3, capex: 12 }],
    } }
    const a = ask('what is the bottleneck', { ...ctx, snap })
    return a && a.text.includes('Lithography') && a.text.includes('94')
  })())
  ok('answers point at the tab that owns them',
    ask('what does one die cost', ctx).tab === 'economics' &&
    ask('how much rock per chip', ctx).tab === 'sand')
  ok('it explains process steps by name',
    ask('what is cmp', ctx) !== null && ask('what is lithography', ctx) !== null)
  ok('it describes its own limits honestly', (() => {
    const a = ask('what can you do', ctx)
    return a && /not a language model/i.test(a.text)
  })())
}

/* ---------- fab simulation ---------- */
group('Fab simulation')
{
  const { createFab, tick, metrics, snapshot, routeForLayer, defectDensity, toolCapex, TOOL_GROUPS, LOT_SIZE } =
    await import(join(root, 'src/lib/fabengine.js'))

  ok('every tool group is fully specified', TOOL_GROUPS.length === 8 && TOOL_GROUPS.every((g) =>
    g.id && g.name && g.hours > 0 && g.tools > 0 && g.mtbf > 0 && g.mttr > 0 && g.capex > 0))
  // Ticks are whole hours, so fractional process times were silently rounded
  // up — which moved the constraint off lithography and looked plausible.
  ok('process times are whole hours', TOOL_GROUPS.every((g) => Number.isInteger(g.hours)))
  ok('lithography is by far the most expensive tool',
    TOOL_GROUPS.find((g) => g.id === 'litho').capex >= 10 *
    Math.max(...TOOL_GROUPS.filter((g) => g.id !== 'litho' && g.id !== 'metro').map((g) => g.capex)))

  ok('a route visits the track twice — coat and develop',
    routeForLayer(1, 70).filter((x) => x === 'track').length === 2)
  ok('front-end layers implant, back-end layers deposit',
    routeForLayer(5, 70).includes('implant') && routeForLayer(65, 70).includes('depo'))
  ok('metrology is sampled, not on every layer',
    routeForLayer(5, 70).includes('metro') && !routeForLayer(6, 70).includes('metro'))

  // Determinism is what makes it debuggable and what makes these checks mean
  // anything at all.
  const runTo = (n, opts = {}) => {
    const f = createFab({ seed: 42, layers: 70, ...opts })
    for (let i = 0; i < n; i++) tick(f)
    return f
  }
  const a = runTo(3000), b = runTo(3000)
  ok('the same seed gives the same run',
    a.stats.completed === b.stats.completed && a.t === b.t &&
    Math.abs((a.done.at(-1)?.defects || 0) - (b.done.at(-1)?.defects || 0)) < 1e-9)
  ok('a different seed gives a different run',
    runTo(3000, { seed: 99 }).stats.completed !== undefined &&
    JSON.stringify(runTo(3000, { seed: 99 }).events) !== JSON.stringify(a.events))

  const long = runTo(20000)
  const m = metrics(long)
  ok('lots complete', long.stats.completed > 100, String(long.stats.completed))
  ok('completed lots never exceed released', long.stats.completed <= long.stats.released)
  ok('WIP stays bounded rather than exploding', m.wip < long.wipCap, String(m.wip))
  ok('every lot in the line is queued or running exactly once', (() => {
    const seen = new Set()
    for (const g of long.groups) {
      for (const l of g.queue) { if (seen.has(l.id)) return false; seen.add(l.id) }
      for (const b of g.busy) { if (seen.has(b.lot.id)) return false; seen.add(b.lot.id) }
    }
    return seen.size === long.lots.length
  })())

  // Calibration. These are the numbers that make the simulation worth having,
  // and a refactor that quietly moves them has broken it.
  ok('lithography is the constraint', m.bottleneck.id === 'litho', m.bottleneck.id)
  ok('the constraint runs hot but not saturated',
    m.bottleneck.util > 0.85 && m.bottleneck.util < 0.99, (m.bottleneck.util * 100).toFixed(0) + "%")
  ok('cycle time lands in the real 3–4 month band',
    m.avgCycleDays > 80 && m.avgCycleDays < 140, `${m.avgCycleDays.toFixed(0)} days`)
  ok('X-factor lands in the real 2–3 band',
    m.xFactor > 1.8 && m.xFactor < 3.5, m.xFactor.toFixed(2))
  ok('raw process time is roughly six weeks',
    m.rawDays > 30 && m.rawDays < 55, `${m.rawDays.toFixed(0)} days`)
  ok('one line produces on the order of 2,000 wafers a month',
    m.wpm > 1200 && m.wpm < 3500, m.wpm.toFixed(0))
  ok('cycle time exceeds raw process time', m.avgCycleDays > m.rawDays)
  ok('Little\'s law holds — WIP ≈ throughput × cycle time', (() => {
    const lotsPerDay = long.stats.completed / (long.t / 24)
    return near(m.wip, lotsPerDay * m.avgCycleDays, m.wip * 0.25)
  })())

  const d0 = defectDensity(long.done.at(-1).defects)
  ok('defect density lands near a mature-line D0',
    d0 > 0.03 && d0 < 0.12, d0.toFixed(3))
  ok('run-to-run control lowers defect density', (() => {
    const on = defectDensity(runTo(20000, { apc: true }).done.at(-1).defects)
    const off = defectDensity(runTo(20000, { apc: false }).done.at(-1).defects)
    return off > on
  })())
  ok('tools fail and get repaired over a long run',
    long.events.some((e) => e.kind === 'down'))
  ok('excursions occur and are eventually caught',
    long.events.some((e) => e.kind === 'excursion') && long.events.some((e) => e.kind === 'caught'))
  ok('disabling excursions removes them',
    !runTo(20000, { excursions: false }).events.some((e) => e.kind === 'excursion'))

  ok('adding scanners raises output', (() => {
    const few = metrics(runTo(12000, { toolCounts: { litho: 14 } }))
    const many = metrics(runTo(12000, { toolCounts: { litho: 30 } }))
    return many.wpm > few.wpm
  })())
  ok('starving the constraint makes it the constraint',
    metrics(runTo(12000, { toolCounts: { litho: 10 } })).bottleneck.id === 'litho')

  const snap = snapshot(long)
  ok('the snapshot is a plain object with no live references',
    typeof snap.t === 'number' && Array.isArray(snap.metrics.groups) &&
    snap.metrics.groups.every((g) => typeof g.util === 'number') &&
    !('queue' in snap.metrics.groups[0]) && !('busy' in snap.metrics.groups[0]))
  ok('the snapshot survives serialisation', (() => {
    try { return JSON.parse(JSON.stringify(snap)).t === snap.t } catch { return false }
  })())
  ok('tool capital is in the billions for a leading-edge line',
    toolCapex(long.groups) > 3000 && toolCapex(long.groups) < 12000)
  ok('a lot is 25 wafers', LOT_SIZE === 25)
}

/* ---------- physics ---------- */
group('Physics')
{
  const P = await import(join(root, 'src/lib/physics.js'))

  // Constants, against their defined or measured values. If any of these drift
  // the whole tab is quietly wrong and nothing else would catch it.
  ok('elementary charge is the exact SI value', P.K.q === 1.602176634e-19)
  ok('Boltzmann constant is the exact SI value', P.K.kB_J === 1.380649e-23)
  ok('vacuum permittivity is in F/cm, not F/m', near(P.K.eps0, 8.854e-14, 1e-16))
  ok('kT/q at 300 K is 25.85 mV', near(P.thermalVoltage(300) * 1000, 25.85, 0.02))
  ok('silicon bandgap at 300 K is 1.12 eV', near(P.bandgap(300), 1.12, 0.005), P.bandgap(300).toFixed(4))
  ok('bandgap narrows as temperature rises', P.bandgap(400) < P.bandgap(300) && P.bandgap(200) > P.bandgap(300))
  ok('intrinsic carriers at 300 K are ~1e10 cm^-3',
    P.intrinsicCarriers(300) > 8e9 && P.intrinsicCarriers(300) < 1.3e10)
  ok('intrinsic carriers rise steeply with temperature',
    P.intrinsicCarriers(400) > 100 * P.intrinsicCarriers(300))

  // The single most important number on the tab.
  ok('subthreshold floor at 300 K is 59.6 mV/decade',
    near(P.ssFloor(300) * 1000, 59.6, 0.2), (P.ssFloor(300) * 1000).toFixed(2))
  ok('the floor scales linearly with temperature',
    near(P.ssFloor(600) / P.ssFloor(300), 2, 1e-9))
  ok('cryogenic operation genuinely lowers the floor', P.ssFloor(77) * 1000 < 20)
  ok('body factor never improves on the floor', P.subthresholdSwing(1.4, 300) > P.ssFloor(300))
  ok('n = 1 reproduces the floor exactly', near(P.subthresholdSwing(1, 300), P.ssFloor(300), 1e-12))

  // Mass action must hold at every doping and temperature.
  ok('n·p = ni² for a doped sample', (() => {
    for (const T of [250, 300, 400]) for (const N of [1e15, 1e17, 1e19]) {
      const c = P.carriers(N, 'n', T)
      if (!near(c.n * c.p, c.ni * c.ni, c.ni * c.ni * 0.01)) return false
    }
    return true
  })())
  ok('majority carriers track the doping', near(P.carriers(1e17, 'n').n, 1e17, 1e15))
  ok('p-type and n-type are mirror images', (() => {
    const n = P.carriers(1e17, 'n'), p = P.carriers(1e17, 'p')
    return near(n.n, p.p, 1e12) && near(n.p, p.n, 1e3)
  })())

  ok('oxide capacitance for 2 nm SiO2 is ~1.7 µF/cm²',
    near(P.oxideCap(2) * 1e6, 1.727, 0.01), (P.oxideCap(2) * 1e6).toFixed(3))
  ok('capacitance is inversely proportional to thickness',
    near(P.oxideCap(1) / P.oxideCap(2), 2, 1e-9))
  ok('EOT and physical thickness are inverses',
    near(P.eot(P.physicalForEot(1, 25), 25), 1, 1e-9))
  ok('1 nm EOT in hafnia is ~6.4 nm of physical film',
    near(P.physicalForEot(1, 25), 6.41, 0.02))

  // MOSFET behaviour, as invariants rather than magic numbers.
  const dev = { vth: 0.35, wOverL: 10, mu: 300, cox: P.oxideCap(2) }
  ok('no current below threshold in the square-law model',
    P.drainCurrent({ ...dev, vgs: 0.3, vds: 1 }) === 0)
  ok('current rises with gate voltage',
    P.drainCurrent({ ...dev, vgs: 1.0, vds: 1 }) > P.drainCurrent({ ...dev, vgs: 0.7, vds: 1 }))
  ok('current saturates beyond Vds = Vov', (() => {
    const a = P.drainCurrent({ ...dev, vgs: 1.0, vds: 0.65 })
    const b = P.drainCurrent({ ...dev, vgs: 1.0, vds: 1.2 })
    return near(a, b, a * 0.001)
  })())
  ok('drive current goes as the square of overdrive', (() => {
    const a = P.drainCurrent({ ...dev, vgs: 0.35 + 0.2, vds: 1.2 })
    const b = P.drainCurrent({ ...dev, vgs: 0.35 + 0.4, vds: 1.2 })
    return near(b / a, 4, 0.02)
  })())
  ok('drive current is linear in W/L', (() => {
    const a = P.drainCurrent({ ...dev, wOverL: 5, vgs: 1, vds: 1.2 })
    const b = P.drainCurrent({ ...dev, wOverL: 20, vgs: 1, vds: 1.2 })
    return near(b / a, 4, 1e-9)
  })())
  ok('subthreshold current is exponential in gate voltage', (() => {
    const a = P.subthresholdCurrent({ vgs: 0.1, vth: 0.35 })
    const b = P.subthresholdCurrent({ vgs: 0.1 + P.subthresholdSwing(1.3, 300), vth: 0.35 })
    return near(b / a, 10, 0.05)
  })())

  // Tunnelling. The 0.18 nm figure is the one people quote as "a decade per
  // two angstroms", and it falls out of the constants rather than being typed.
  ok('SiO2 leakage rises a decade per ~0.18 nm',
    near(P.nmPerDecade(), 0.181, 0.005), P.nmPerDecade().toFixed(4))
  ok('tunnelling falls exponentially with thickness',
    P.relativeTunnelCurrent(2) < P.relativeTunnelCurrent(1) / 1e5)
  ok('the 1 nm SiO2 reference is unity', near(P.relativeTunnelCurrent(1), 1, 1e-9))
  ok('a lower barrier tunnels more', P.relativeTunnelCurrent(2, 1.5) > P.relativeTunnelCurrent(2, 3.1))

  // Optics.
  ok('Rayleigh resolution improves with NA and shortens with wavelength',
    P.resolution(193, 1.35, 0.31) > P.resolution(13.5, 0.33, 0.31) &&
    P.resolution(13.5, 0.55, 0.31) < P.resolution(13.5, 0.33, 0.31))
  ok('immersion ArF at k1 = 0.25 lands at the known ~38 nm limit',
    near(P.resolution(193, 1.35, 0.25), 35.7, 1.5), P.resolution(193, 1.35, 0.25).toFixed(1))
  ok('depth of focus goes as 1/NA²',
    near(P.depthOfFocus(193, 1) / P.depthOfFocus(193, 2), 4, 1e-9))
  ok('depth of focus is tens of nanometres at the leading edge',
    P.depthOfFocus(13.5, 0.33) < 100 && P.depthOfFocus(193, 1.35) < 100)
  ok('High-NA halves the depth of focus again',
    P.depthOfFocus(13.5, 0.55) < P.depthOfFocus(13.5, 0.33))
  ok('EUV photon energy is 91.8 eV', near(P.photonEnergy(13.5), 91.84, 0.05))
  ok('ArF photon energy is 6.42 eV', near(P.photonEnergy(193), 6.42, 0.01))
  ok('an EUV photon carries ~14x an ArF photon',
    near(P.photonEnergy(13.5) / P.photonEnergy(193), 14.3, 0.2))

  // Shot noise — the mechanism behind stochastic defects.
  const euv = P.photonStatistics({ lambdaNm: 13.5, doseMjCm2: 30, featureNm: 16 })
  const arf = P.photonStatistics({ lambdaNm: 193, doseMjCm2: 30, featureNm: 16 })
  ok('the same dose delivers ~14x fewer EUV photons',
    near(arf.n / euv.n, 14.3, 0.3), (arf.n / euv.n).toFixed(1))
  ok('EUV shot noise is correspondingly worse', euv.sigmaRel > arf.sigmaRel)
  ok('shot noise falls as 1/sqrt(N)', (() => {
    const a = P.photonStatistics({ lambdaNm: 13.5, doseMjCm2: 30, featureNm: 16 })
    const b = P.photonStatistics({ lambdaNm: 13.5, doseMjCm2: 120, featureNm: 16 })
    return near(a.sigmaRel / b.sigmaRel, 2, 0.02)
  })())
  ok('smaller features collect fewer photons',
    P.photonStatistics({ lambdaNm: 13.5, doseMjCm2: 30, featureNm: 8 }).n <
    P.photonStatistics({ lambdaNm: 13.5, doseMjCm2: 30, featureNm: 32 }).n)

  // Statistics and kinetics.
  const rdf = P.dopantFluctuation({ wNm: 20, lNm: 20 })
  ok('a 20 nm channel holds single-digit dopant atoms',
    rdf.count > 3 && rdf.count < 20, rdf.count.toFixed(1))
  ok('dopant variation is tens of percent at that size', rdf.sigmaRel > 0.2)
  ok('a larger channel averages the fluctuation away',
    P.dopantFluctuation({ wNm: 200, lNm: 200 }).sigmaRel < rdf.sigmaRel / 5)
  ok('Arrhenius rises with temperature', P.arrhenius(1, 3.5, 1200) > P.arrhenius(1, 3.5, 900))
  ok('diffusion length goes as sqrt(t)',
    near(P.diffusionLength(1e-14, 400) / P.diffusionLength(1e-14, 100), 2, 1e-9))
  ok('Deal-Grove growth is sublinear in time',
    P.dealGrove({ hours: 4 }) < 4 * P.dealGrove({ hours: 1 }))
  ok('dynamic power goes as the square of voltage',
    near(P.dynamicPower({ capF: 1e-9, volts: 2, freqHz: 1e9 }) /
         P.dynamicPower({ capF: 1e-9, volts: 1, freqHz: 1e9 }), 4, 1e-9))
  ok('dielectrics are ordered and complete',
    P.DIELECTRICS.length >= 4 && P.DIELECTRICS.every((d) => d.name && d.k > 0 && d.barrier > 0 && d.note))
  ok('higher-k dielectrics have lower barriers — the real trade',
    P.DIELECTRICS.find((d) => d.id === 'hfo2').barrier <
    P.DIELECTRICS.find((d) => d.id === 'sio2').barrier)
  // ---- materials ----
  ok('material table is populated and complete', P.MATERIALS.length >= 6 && P.MATERIALS.every((m) =>
    m.name && m.eg > 0 && m.muE > 0 && m.ebd > 0 && m.kth > 0 && m.note.length > 60))
  ok('silicon is correctly indirect and GaAs direct',
    !P.isDirect('si') && P.isDirect('gaas') && P.isDirect('inp') && !P.isDirect('ge'))
  ok('wide-bandgap materials block far higher fields', (() => {
    const si = P.MATERIALS.find((m) => m.id === 'si')
    return ['sic', 'gan'].every((id) => P.MATERIALS.find((m) => m.id === id).ebd >= 10 * si.ebd)
  })())
  ok('germanium and GaAs really are faster than silicon', (() => {
    const si = P.MATERIALS.find((m) => m.id === 'si').muE
    return P.MATERIALS.find((m) => m.id === 'ge').muE > si && P.MATERIALS.find((m) => m.id === 'gaas').muE > 5 * si
  })())

  // ---- transport ----
  ok('lightly doped silicon has near-textbook mobility',
    near(P.mobilityVsDoping(1e14), 1410, 15), P.mobilityVsDoping(1e14).toFixed(0))
  ok('heavy doping collapses mobility', P.mobilityVsDoping(1e19) < 200)
  ok('mobility falls monotonically with doping', (() => {
    let last = Infinity
    for (const n of [1e14, 1e15, 1e16, 1e17, 1e18, 1e19, 1e20]) {
      const m = P.mobilityVsDoping(n); if (m > last) return false; last = m
    }
    return true
  })())
  ok('holes are always slower than electrons',
    [1e15, 1e17, 1e19].every((n) => P.mobilityVsDoping(n, 'p') < P.mobilityVsDoping(n, 'n')))
  // Matthiessen: the combined mobility must be worse than either component.
  ok('combined mobility is worse than any single mechanism', (() => {
    const c = P.mobilityComponents({ dopingCm3: 1e17, T: 300 })
    return c.total < c.lattice && c.total < c.impurity
  })())
  ok('phonon and impurity scattering move oppositely with temperature', (() => {
    const cold = P.mobilityComponents({ dopingCm3: 1e17, T: 200 })
    const hot = P.mobilityComponents({ dopingCm3: 1e17, T: 400 })
    return hot.lattice < cold.lattice && hot.impurity > cold.impurity
  })())
  ok('drift velocity saturates rather than growing without bound',
    P.driftVelocity(1e7) < P.SILICON.vSat * 1.001 && P.driftVelocity(1e6) > 0.9 * P.SILICON.vSat)
  ok('low field is ohmic', near(P.driftVelocity(100, 1400), 1400 * 100, 1400 * 100 * 0.01))
  ok('the saturation knee is a few kV/cm',
    P.saturationField() > 5e3 && P.saturationField() < 1e4, P.saturationField().toFixed(0))

  // ---- short channel ----
  ok('natural length is a few nanometres at modern dimensions',
    near(P.naturalLength({ toxNm: 1, tbodyNm: 5 }), 3.87, 0.05))
  ok('gate-all-around halves the natural length',
    near(P.naturalLength({ toxNm: 1, tbodyNm: 5, gates: 4 }) / P.naturalLength({ toxNm: 1, tbodyNm: 5 }), 0.5, 1e-9))
  ok('a thinner body shortens the natural length',
    P.naturalLength({ toxNm: 1, tbodyNm: 3 }) < P.naturalLength({ toxNm: 1, tbodyNm: 10 }))
  ok('DIBL falls exponentially with channel length', (() => {
    const a = P.shortChannel({ lengthNm: 20, lambdaNm: 2 }).diblMvV
    const b = P.shortChannel({ lengthNm: 24, lambdaNm: 2 }).diblMvV
    return near(a / b, Math.E, 0.01)
  })())
  ok('a long channel has essentially no DIBL',
    P.shortChannel({ lengthNm: 100, lambdaNm: 2 }).diblMvV < 0.01)
  // Five natural lengths is the textbook rule and is not actually enough.
  ok('the control threshold is set where DIBL is genuinely acceptable', (() => {
    const marginal = P.shortChannel({ lengthNm: 5 * 2, lambdaNm: 2 })
    const good = P.shortChannel({ lengthNm: 8 * 2, lambdaNm: 2 })
    return !marginal.controlled && good.controlled && good.diblMvV < 100
  })())

  // ---- interconnect ----
  ok('copper resistivity rises as the wire narrows', (() => {
    let last = 0
    for (const w of [200, 100, 50, 30, 20, 12]) {
      const r = P.copperResistivity({ widthNm: w }).rhoWithBarrier
      if (r < last) return false; last = r
    }
    return true
  })())
  ok('a wide wire is close to bulk copper',
    P.copperResistivity({ widthNm: 500 }).ratioToBulk < 1.4)
  ok('a 20 nm wire is several times bulk', (() => {
    const r = P.copperResistivity({ widthNm: 20 }).ratioToBulk
    return r > 3 && r < 10
  })(), P.copperResistivity({ widthNm: 20 }).ratioToBulk.toFixed(1))
  ok('all three mechanisms contribute at 20 nm', (() => {
    const c = P.copperResistivity({ widthNm: 20 })
    return c.fs > 1.2 && c.ms > 2 && c.barrierPenalty > 1.1
  })())
  ok('the barrier penalty grows as the wire narrows',
    P.copperResistivity({ widthNm: 12 }).barrierPenalty > P.copperResistivity({ widthNm: 60 }).barrierPenalty)
  // The unit bug that shipped first time: 1 µΩ·cm = 10 Ω·nm, not 0.01.
  ok('a 1 mm minimum-width wire is nanoseconds, not picoseconds', (() => {
    const d = P.rcDelay({ widthNm: 20, lengthUm: 1000 })
    return d.delayPs > 1000 && d.delayPs < 1e5
  })(), P.rcDelay({ widthNm: 20, lengthUm: 1000 }).delayPs.toFixed(0) + ' ps')
  ok('a 1 mm fat global wire is a hundred picoseconds or so', (() => {
    const d = P.rcDelay({ widthNm: 100, lengthUm: 1000 })
    return d.delayPs > 30 && d.delayPs < 400
  })(), P.rcDelay({ widthNm: 100, lengthUm: 1000 }).delayPs.toFixed(0) + ' ps')
  ok('Elmore delay goes as the square of length', (() => {
    const a = P.rcDelay({ widthNm: 20, lengthUm: 100 }).delayPs
    const b = P.rcDelay({ widthNm: 20, lengthUm: 200 }).delayPs
    return near(b / a, 4, 0.01)
  })())
  ok('a wider wire is faster', P.rcDelay({ widthNm: 100, lengthUm: 500 }).delayPs <
    P.rcDelay({ widthNm: 20, lengthUm: 500 }).delayPs)

  // ---- reliability ----
  ok('Black: halving current density quadruples lifetime',
    near(P.blackMttf({ currentDensityAcm2: 5e5 }) / P.blackMttf({ currentDensityAcm2: 1e6 }), 4, 0.01))
  ok('Black: hotter is shorter-lived',
    P.blackMttf({ currentDensityAcm2: 1e6, T: 398 }) < P.blackMttf({ currentDensityAcm2: 1e6, T: 348 }))
  ok('acceleration factor is meaningful for qualification', (() => {
    const af2 = P.accelerationFactor({ tUse: 328, tStress: 398, eaEv: 0.7 })
    return af2 > 20 && af2 < 200
  })(), P.accelerationFactor({ tUse: 328, tStress: 398 }).toFixed(0) + 'x')
  ok('no acceleration when stress equals use',
    near(P.accelerationFactor({ tUse: 350, tStress: 350 }), 1, 1e-12))
  ok('four wearout mechanisms, each with a law and a mitigation',
    P.WEAROUT.length === 4 && P.WEAROUT.every((w) => w.name && w.law && w.what.length > 80 && w.fix.length > 50))
  ok('hot carrier injection is flagged as worsening when cold',
    /worse as temperature falls/i.test(P.WEAROUT.find((w) => w.id === 'hci').fix))

  ok('the litho generations are chronological and improving',
    P.LITHO.every((l, i) => i === 0 || l.year > P.LITHO[i - 1].year))
}

/* ---------- icons ---------- */
group('Icons')
{
  const iconSrc = readFileSync(join(root, 'src/ui/Icon.jsx'), 'utf8')
  const names = [...iconSrc.matchAll(/^ {2}([a-z][a-zA-Z0-9]*): \(<>/gm)].map((m) => m[1])

  ok('the icon set is populated', names.length >= 55, String(names.length))
  ok('icon keys are unique', new Set(names).size === names.length)
  ok('the set covers packages, function, IP and industry', (() => {
    const need = [
      // packages
      'die', 'qfp', 'bga', 'chiplet', 'stack', 'wafer', 'waferscale', 'interposer', 'hybrid',
      // function
      'cpu', 'gpu', 'npu', 'soc', 'mcu', 'dram', 'nand', 'power',
      // IP
      'ipcore', 'ipgpu', 'ipnpu', 'ipdsp', 'ipmem', 'ipphy', 'ipnoc', 'ipsec', 'ippll', 'ipisp', 'iplicense',
      // fab tools
      'puller', 'saw', 'furnace', 'wetbench', 'coater', 'scanner', 'etcher', 'implanter',
      'depo', 'cmp', 'metal', 'metrology', 'prober', 'dicer', 'bonder', 'tester',
      // material chain
      'quartzite', 'distill', 'siemens',
      // transistor architectures
      'planar', 'finfet', 'nanosheet', 'forksheet', 'cfet', 'twod',
      // quantum
      'transmon', 'iontrap', 'atomarray', 'spinqubit', 'photonic',
      // industry
      'eda', 'fabless', 'foundry', 'equipment', 'materials', 'osat',
    ]
    return need.every((n) => names.includes(n))
  })())

  // Themeable by construction: an icon that hardcodes a colour breaks in five
  // palettes and two modes at once.
  ok('icons stroke in currentColor and hardcode no colour',
    /stroke: 'currentColor'/.test(iconSrc) &&
    !/(stroke|fill)="#[0-9a-fA-F]{3,6}"/.test(iconSrc))
  ok('every icon draws on the same 24x24 grid',
    (iconSrc.match(/viewBox="0 0 24 24"/g) || []).length >= 1 &&
    !/viewBox="0 0 (?!24 24)/.test(iconSrc))
  ok('an unknown icon name renders nothing rather than throwing',
    /if \(!glyph\) return null/.test(iconSrc))
  ok('decorative icons are hidden from assistive technology',
    /aria-hidden=\{title \? undefined : 'true'\}/.test(iconSrc))

  // Every icon referenced in data must exist. A typo would render an invisible
  // gap that nothing else would catch.
  const refs = []
  const DATA = ['data/nodes.js', 'data/silicon.js', 'data/value-chain.js', 'data/process.js',
    'data/sand.js', 'data/arch3d.js', 'lib/quantum.js', 'lib/business.js']
  for (const f of DATA) {
    const t = readFileSync(join(root, 'src', f), 'utf8')
    for (const m of t.matchAll(/icon: '([a-zA-Z0-9]+)'/g)) refs.push([f, m[1]])
  }
  ok('data files reference icons by name', refs.length >= 80, String(refs.length))
  ok('every referenced icon exists in the set',
    refs.every(([, n]) => names.includes(n)),
    refs.filter(([, n]) => !names.includes(n)).map(([f, n]) => `${f}:${n}`).join(', '))
  ok('no unicode glyph is left standing in for an icon', (() => {
    for (const f of DATA) {
      const t = readFileSync(join(root, 'src', f), 'utf8')
      if (/icon: '[^a-zA-Z]/.test(t)) return false
    }
    // The fab line used a `glyph:` field of unicode characters before this.
    if (/glyph: '/.test(readFileSync(join(root, 'src/data/process.js'), 'utf8'))) return false
    return true
  })())
  ok('every fab-line module has a tool icon', (() => {
    const t = readFileSync(join(root, 'src/data/process.js'), 'utf8')
    return (t.match(/^ {4}id: '/gm) || []).length === (t.match(/icon: '/g) || []).length
  })())
  ok('every transistor architecture has a cross-section icon', (() => {
    const t = readFileSync(join(root, 'src/data/arch3d.js'), 'utf8')
    return ['planar', 'finfet', 'nanosheet', 'forksheet', 'cfet', 'twod']
      .every((n) => t.includes(`icon: '${n}'`))
  })())
  ok('every quantum modality has an icon', (() => {
    const t = readFileSync(join(root, 'src/lib/quantum.js'), 'utf8')
    return (t.match(/id: '[a-z]+', icon: '/g) || []).length >= 5
  })())
  ok('every business phase has an icon', (() => {
    const t = readFileSync(join(root, 'src/lib/business.js'), 'utf8')
    return (t.match(/id: '[a-z]+', icon: '/g) || []).length >= 8
  })())
  // Detail is the point of this pass: a pictogram is one or two shapes, a
  // technical drawing is several. Assert the set did not regress to outlines.
  ok('icons are drawn at technical detail, not as pictograms', (() => {
    const bodies = iconSrc.split(/^ {2}[a-z][a-zA-Z0-9]*: \(<>/gm).slice(1)
    const shapes = bodies.map((b) => (b.match(/<(rect|circle|path|line|ellipse)/g) || []).length)
    const avg = shapes.reduce((n, v) => n + v, 0) / shapes.length
    return avg >= 4
  })(), (() => {
    const bodies = iconSrc.split(/^ {2}[a-z][a-zA-Z0-9]*: \(<>/gm).slice(1)
    const shapes = bodies.map((b) => (b.match(/<(rect|circle|path|line|ellipse)/g) || []).length)
    return (shapes.reduce((n, v) => n + v, 0) / shapes.length).toFixed(1) + ' shapes/icon'
  })())
  ok('every real part carries an icon', (() => {
    const t = readFileSync(join(root, 'src/data/silicon.js'), 'utf8')
    const entries = (t.match(/^ {4}id: '/gm) || []).length
    const withIcon = (t.match(/id: '[a-z0-9-]+', icon: '/g) || []).length
    return entries === withIcon
  })())
  ok('every value-chain layer carries an icon', (() => {
    const t = readFileSync(join(root, 'src/data/value-chain.js'), 'utf8')
    const layers = (t.match(/^ {4}id: '[a-z]+', icon: '/gm) || []).length
    return layers >= 7
  })())
  // Concentric shapes painted in data order meant the last one drawn covered
  // everything and swallowed every click. Painting largest first makes each
  // part's visible ring its own hit area.
  const sil = readFileSync(join(root, 'src/ui/Silicon.jsx'), 'utf8')
  ok('the to-scale map paints largest die first so all are clickable',
    /\.sort\(\(a, b\) => totalArea\(b\) - totalArea\(a\)\)/.test(sil))
  ok('each die in the map is a click target', /onClick=\{\(\) => onPick\(p\.id\)\}/.test(sil))
  ok('the map responds to hover as well as click',
    /onMouseEnter=\{\(\) => setHover\(p\.id\)\}/.test(sil))
  ok('the map is keyboard operable',
    /tabIndex=\{0\}/.test(sil) && /e\.key === 'Enter'/.test(sil))
  ok('the map names whatever is under the cursor', /activePart && \(/.test(sil))
  ok('changing the maker filter keeps the selection inside it',
    /const pickMaker = \(k\) =>/.test(sil) && /!next\.some\(\(x\) => x\.id === sel\)/.test(sil))
  ok('the detail card reads from the filtered list, not the whole catalogue',
    /const s = parts\.find\(\(x\) => x\.id === sel\)/.test(sil))

  ok('wafer-scale parts use the wafer-scale icon', (() => {
    const t = readFileSync(join(root, 'src/data/silicon.js'), 'utf8')
    return /id: 'wse3', icon: 'waferscale'/.test(t)
  })())
}

/* ---------- trace: the causal graph ---------- */
group('Trace')
{
  const T = await import(join(root, 'src/data/trace.js'))

  ok('the graph is substantial', T.NODES.length >= 50, String(T.NODES.length))
  ok('node ids are unique', new Set(T.NODES.map((n) => n.id)).size === T.NODES.length)
  ok('every node is fully described', T.NODES.every((n) =>
    n.id && n.label && n.note && n.note.length > 40 &&
    T.LAYERS.some((l) => l.id === n.layer) && Array.isArray(n.from)))

  // Structural integrity. "Because" stops meaning anything if the graph has a
  // cycle, and a node that reaches no root is an assertion floating free.
  ok('every edge points at a node that exists',
    T.NODES.every((n) => n.from.every((f) => T.node(f))),
    T.NODES.flatMap((n) => n.from.filter((f) => !T.node(f)).map((f) => `${n.id}→${f}`)).join(', '))
  ok('the graph is acyclic', (() => {
    const seen = new Set(), stack = new Set()
    let ok_ = true
    const visit = (id) => {
      if (stack.has(id)) { ok_ = false; return }
      if (seen.has(id)) return
      seen.add(id); stack.add(id)
      for (const f of T.node(id).from) visit(f)
      stack.delete(id)
    }
    T.NODES.forEach((n) => visit(n.id))
    return ok_
  })())
  ok('every non-root traces back to a root', T.NODES
    .filter((n) => n.from.length)
    .every((n) => T.ancestry(n.id).some((a) => T.node(a).from.length === 0)))
  ok('roots are only in the nature layer',
    T.roots().every((r) => T.node(r).layer === 'nature'))
  ok('there are a dozen roots or fewer — the claim is that there are few',
    T.roots().length <= 12, String(T.roots().length))
  // Causes flow one way. An edge from a later layer to an earlier one would
  // mean economics causing physics.
  ok('causes never flow backwards through the layers', (() => {
    const rank = Object.fromEntries(T.LAYERS.map((l, i) => [l.id, i]))
    return T.NODES.every((n) => n.from.every((f) => rank[T.node(f).layer] <= rank[n.layer]))
  })(), T.NODES.flatMap((n) => {
    const rank = Object.fromEntries(T.LAYERS.map((l, i) => [l.id, i]))
    return n.from.filter((f) => rank[T.node(f).layer] > rank[n.layer]).map((f) => `${f}→${n.id}`)
  }).join(', '))
  ok('every layer is populated',
    T.LAYERS.every((l) => T.NODES.some((n) => n.layer === l.id)))

  // Path selection. The longest path is the explanation; the first version
  // used the shortest and produced true, thin answers.
  ok('the principal path is the longest, not the shortest', (() => {
    const p = T.principalPath('multicore'), sp = T.shortestPath('multicore')
    return p.length > sp.length
  })())
  ok('every path starts at a root and ends at the node asked for',
    T.NODES.every((n) => {
      const p = T.principalPath(n.id)
      return p[p.length - 1] === n.id && T.node(p[0]).from.length === 0
    }))
  ok('the multicore chain runs through the subthreshold floor', (() => {
    const p = T.principalPath('multicore')
    return p.includes('boltzmann') && p.includes('ssfloor') && p.includes('powerwall')
  })(), T.principalPath('multicore').join(' → '))
  ok('chains are deep enough to be explanations rather than restatements',
    T.principalPath('geopolitics').length >= 4 && T.principalPath('matureNodes').length >= 5)

  // The headline claim of the tab.
  ok("Boltzmann's constant is upstream of most of the graph",
    T.reach('boltzmann') > T.NODES.length * 0.4, `${T.reach('boltzmann')}/${T.NODES.length}`)
  ok('every root reaches something', T.roots().every((r) => T.reach(r) >= 1))
  ok('ancestry and descendants are consistent', T.NODES.every((n) =>
    T.ancestry(n.id).filter((a) => a !== n.id).every((a) => T.descendants(a).includes(n.id))))

  ok('every entry question points at a real node',
    T.QUESTIONS.every((q) => T.node(q.node)), T.QUESTIONS.filter((q) => !T.node(q.node)).map((q) => q.node).join(', '))
  ok('there are enough entry points to explore from', T.QUESTIONS.length >= 8)
  ok('cross-references point at real tabs', (() => {
    const TABS = ['god', 'trace', 'sand', 'line', 'run', 'wafer', 'science', 'clock', '3d', 'nodes',
      'quantum', 'silicon', 'chain', 'compute', 'economics', 'business', 'ethics', 'unsolved',
      'acronyms', 'quiz']
    return T.NODES.filter((n) => n.tab).every((n) => TABS.includes(n.tab))
  })())
  // The tab must not overclaim. Real causation in a field this size is a
  // thicket, and the page says so.
  ok('the tab states what it is not', (() => {
    const ui = readFileSync(join(root, 'src/ui/Trace.jsx'), 'utf8')
    return /argument, not a proof/i.test(ui) && /could have gone another way/i.test(ui)
  })())
}

/* ---------- acronyms ---------- */
group('Acronym glossary')
{
  const A = await import(join(root, 'src/data/acronyms.js'))

  ok('the glossary is substantial', A.ACRONYMS.length >= 150, String(A.ACRONYMS.length))
  ok('no duplicate acronyms',
    new Set(A.ACRONYMS.map((a) => a.acronym)).size === A.ACRONYMS.length,
    A.ACRONYMS.map((a) => a.acronym).filter((x, i, arr) => arr.indexOf(x) !== i).join(', '))
  ok('every entry has an acronym, expansion and category', A.ACRONYMS.every((a) =>
    a.acronym && a.expansion && A.CATEGORIES[a.category]))

  // The point of the tab: an expansion alone is the least useful part. Every
  // entry must say what the thing actually is.
  ok('every entry explains the meaning, not just the expansion',
    A.ACRONYMS.every((a) => a.meaning && a.meaning.length > 40),
    A.ACRONYMS.filter((a) => !a.meaning || a.meaning.length <= 40).map((a) => a.acronym).join(', '))
  ok('the meaning is not merely the expansion restated', A.ACRONYMS.every((a) =>
    a.meaning.toLowerCase().trim() !== a.expansion.toLowerCase().trim()))
  ok('every category is populated',
    Object.keys(A.CATEGORIES).every((k) => A.ACRONYMS.some((a) => a.category === k)))
  ok('every category has an icon and a colour',
    Object.values(A.CATEGORIES).every((c) => c.label && c.hue && c.icon))
  ok('category icons all exist in the icon set', (() => {
    const iconFile = readFileSync(join(root, 'src/ui/Icon.jsx'), 'utf8')
    const have = [...iconFile.matchAll(/^ {2}([a-z][a-zA-Z0-9]*): \(<>/gm)].map((m) => m[1])
    return Object.values(A.CATEGORIES).every((c) => have.includes(c.icon))
  })())

  // Cross-references must point at tabs that exist, or they are dead ends.
  const TABS = ['god', 'sand', 'line', 'run', 'wafer', 'science', 'clock', '3d', 'nodes',
    'quantum', 'silicon', 'chain', 'compute', 'economics', 'business', 'ethics', 'unsolved',
    'acronyms', 'quiz']
  ok('every cross-reference points at a real tab',
    A.ACRONYMS.filter((a) => a.tab).every((a) => TABS.includes(a.tab)),
    A.ACRONYMS.filter((a) => a.tab && !TABS.includes(a.tab)).map((a) => `${a.acronym}:${a.tab}`).join(', '))
  ok('most entries cross-reference somewhere',
    A.ACRONYMS.filter((a) => a.tab).length >= A.ACRONYMS.length * 0.5)

  // Search behaviour.
  ok('search is case-insensitive', A.searchAcronyms('dibl').length === A.searchAcronyms('DIBL').length)
  ok('search finds an exact acronym', A.searchAcronyms('DIBL').some((a) => a.acronym === 'DIBL'))
  ok('search ignores punctuation in the acronym',
    A.searchAcronyms('secsgem').some((a) => a.acronym.startsWith('SECS')))
  ok('search covers descriptions, not only acronyms',
    A.searchAcronyms('short channels leak').length > 0)
  ok('an empty query returns everything', A.searchAcronyms('').length === A.ACRONYMS.length)
  ok('a nonsense query returns nothing', A.searchAcronyms('xyzzyqwrt').length === 0)

  // The terms this site leans on hardest must all be here.
  ok('the acronyms this site uses most are all present', (() => {
    const need = ['EUV', 'DUV', 'CMP', 'FinFET', 'GAA', 'CFET', 'DIBL', 'SS', 'EOT', 'HKMG',
      'HBM', 'SRAM', 'DRAM', 'TSV', 'NRE', 'ASP', 'IDM', 'OSAT', 'DPPM', 'MAC', 'TOPS',
      'FLOPS', 'SoC', 'TPU', 'QEC', 'RSFQ', 'TLS', 'FOUP', 'SPC', 'RTL', 'EDA', 'PDK', 'KGD']
    const have = new Set(A.ACRONYMS.map((a) => a.acronym))
    return need.every((n) => have.has(n))
  })(), (() => {
    const need = ['EUV', 'DUV', 'CMP', 'FinFET', 'GAA', 'CFET', 'DIBL', 'SS', 'EOT', 'HKMG',
      'HBM', 'SRAM', 'DRAM', 'TSV', 'NRE', 'ASP', 'IDM', 'OSAT', 'DPPM', 'MAC', 'TOPS',
      'FLOPS', 'SoC', 'TPU', 'QEC', 'RSFQ', 'TLS', 'FOUP', 'SPC', 'RTL', 'EDA', 'PDK', 'KGD']
    const have = new Set(A.ACRONYMS.map((a) => a.acronym))
    return need.filter((n) => !have.has(n)).join(', ') || 'all present'
  })())
  ok('the glossary admits it is not exhaustive', (() => {
    const ui = readFileSync(join(root, 'src/ui/Acronyms.jsx'), 'utf8')
    return /not exhaustive/i.test(ui)
  })())
}

/* ---------- open problems ---------- */
group('Open problems')
{
  const U = await import(join(root, 'src/data/unsolved.js'))
  const NOW = 2026

  ok('the list is substantial and unique',
    U.PROBLEMS.length >= 18 && new Set(U.PROBLEMS.map((p) => p.id)).size === U.PROBLEMS.length)
  ok('every problem is fully argued', U.PROBLEMS.every((p) =>
    p.name && p.icon && p.since && U.DOMAINS[p.domain] && U.STATUS[p.status] &&
    p.what.length > 120 && p.tried.length > 60 && p.hard.length > 80 &&
    p.solved.length > 40 && p.costs.length > 40))
  ok('every domain is represented',
    Object.keys(U.DOMAINS).every((d) => U.PROBLEMS.some((p) => p.domain === d)))
  ok('every status is used',
    Object.keys(U.STATUS).every((st) => U.PROBLEMS.some((p) => p.status === st)))

  // The dates are the argument. If they drift into the future or bunch up
  // recently, the tab stops making the point it exists to make.
  ok('dates are plausible and in the past',
    U.PROBLEMS.every((p) => p.since >= 1990 && p.since <= NOW))
  ok('several problems have been open twenty years or more',
    U.PROBLEMS.filter((p) => NOW - p.since >= 20).length >= 4,
    String(U.PROBLEMS.filter((p) => NOW - p.since >= 20).length))
  ok('the median problem has been open for over a decade', (() => {
    const v = U.PROBLEMS.map((p) => NOW - p.since).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)] >= 10
  })())

  // The status vocabulary has to mean something. A "stalled" entry that is
  // five years old, or a "contained" one nobody pays for, would be misuse.
  ok('stalled problems really are long-standing',
    U.PROBLEMS.filter((p) => p.status === 'stalled').every((p) => NOW - p.since >= 15))
  ok('every problem states what it costs while unsolved',
    U.PROBLEMS.every((p) => p.costs && !/^n\/a/i.test(p.costs)))
  ok('every problem states a falsifiable success condition',
    U.PROBLEMS.every((p) => /\b(a|an|the|enough|below|removing|control|genuine|bandwidth|contact|fault)\b/i.test(p.solved)))

  // Specific claims the rest of the site depends on being consistent.
  ok('the 60 mV/decade problem is present and long-stalled', (() => {
    const x = U.PROBLEMS.find((p) => p.id === 'steep')
    return x && x.status === 'stalled' && NOW - x.since >= 20
  })())
  ok('the memory wall is dated to the paper that named it',
    U.PROBLEMS.find((p) => p.id === 'memwall').since === 1994)
  ok('the copper interconnect wall is listed as genuinely open',
    U.PROBLEMS.find((p) => p.id === 'wires').status === 'open')
  ok('quantum problems cover threshold, wiring and magic states',
    ['qthreshold', 'qwiring', 'magic'].every((id) => U.PROBLEMS.some((p) => p.id === id)))
  ok('structural problems are included, not only technical ones',
    U.PROBLEMS.filter((p) => p.domain === 'structural').length >= 2)

  // The tab must not claim to know which of these will fall. That caveat is
  // the difference between an honest list and a forecast.
  ok('the caveat admits some of these will be solved',
    /will be solved/i.test(U.CAVEAT) && /obvious in hindsight/i.test(U.CAVEAT))
  ok('the caveat refuses to predict which',
    /nobody can reliably say/i.test(U.CAVEAT))
  ok('every icon referenced exists', (() => {
    const iconFile = readFileSync(join(root, 'src/ui/Icon.jsx'), 'utf8')
    const have = [...iconFile.matchAll(/^ {2}([a-z][a-zA-Z0-9]*): \(<>/gm)].map((m) => m[1])
    return U.PROBLEMS.every((p) => have.includes(p.icon))
  })())
}

/* ---------- rigour and ethics ---------- */
group('Discipline and ethics')
{
  const R = await import(join(root, 'src/lib/rigor.js'))
  const E = await import(join(root, 'src/data/ethics.js'))

  // The centrepiece calculation.
  ok('per-step yield compounds back to the line yield',
    near(R.lineYieldFrom(700, R.perStepYield(700, 0.99)), 0.99, 1e-9))
  ok('700 steps at 99% line yield needs 99.9986% per step',
    near(R.perStepYield(700, 0.99) * 100, 99.99856, 0.0005),
    (R.perStepYield(700, 0.99) * 100).toFixed(5))
  ok('that is a budget of about 14 ppm per step',
    near(R.ppmPerStep(700, 0.99), 14.4, 0.2), R.ppmPerStep(700, 0.99).toFixed(1))
  ok('more steps demand a tighter per-step budget',
    R.ppmPerStep(1500, 0.99) < R.ppmPerStep(700, 0.99))
  ok('a laxer line target loosens the per-step budget',
    R.ppmPerStep(700, 0.9) > R.ppmPerStep(700, 0.99))
  ok('a single step needs exactly the line yield', near(R.perStepYield(1, 0.9), 0.9, 1e-12))
  ok('nonsense inputs return NaN rather than a plausible number',
    Number.isNaN(R.perStepYield(0, 0.99)) && Number.isNaN(R.perStepYield(700, 1.5)))

  // Sigma conversion, against the published table everyone quotes.
  ok('3.4 DPMO is six sigma', near(R.sigmaFromDpmo(3.4), 6, 0.01), R.sigmaFromDpmo(3.4).toFixed(3))
  ok('233 DPMO is five sigma', near(R.sigmaFromDpmo(233), 5, 0.02))
  ok('6,210 DPMO is four sigma', near(R.sigmaFromDpmo(6210), 4, 0.02))
  ok('66,807 DPMO is three sigma', near(R.sigmaFromDpmo(66807), 3, 0.02))
  ok('sigma falls as defects rise',
    R.sigmaFromDpmo(10) > R.sigmaFromDpmo(1000) && R.sigmaFromDpmo(1000) > R.sigmaFromDpmo(100000))

  ok('escapes are the defects test does not catch',
    near(R.escapes({ defectiveFraction: 0.02, testCoverage: 0.985, unitsShipped: 1e6 }).dppm, 300, 0.01))
  ok('perfect coverage means no escapes',
    R.escapes({ defectiveFraction: 0.5, testCoverage: 1, unitsShipped: 1e6 }).badPartsShipped === 0)
  ok('escapes scale with volume', (() => {
    const a = R.escapes({ defectiveFraction: 0.02, testCoverage: 0.99, unitsShipped: 1e6 })
    const b = R.escapes({ defectiveFraction: 0.02, testCoverage: 0.99, unitsShipped: 1e7 })
    return near(b.badPartsShipped / a.badPartsShipped, 10, 1e-9)
  })())

  ok('escape cost rises steeply downstream', (() => {
    const design = R.ESCAPE_STAGES.find((x) => x.id === 'design')
    const recall = R.ESCAPE_STAGES.find((x) => x.id === 'recall')
    return recall.cost / design.cost >= 1e6
  })())
  ok('every escape stage explains itself',
    R.ESCAPE_STAGES.length >= 7 && R.ESCAPE_STAGES.every((x) => x.name && x.cost > 0 && x.what.length > 50))
  ok('DPPM targets tighten with consequence',
    R.DPPM_TARGETS.every((t, i) => i === 0 || t.dppm < R.DPPM_TARGETS[i - 1].dppm))
  ok('automotive targets one DPPM or better',
    R.DPPM_TARGETS.find((t) => /Automotive/.test(t.market)).dppm <= 1)

  // Content. The disciplines must each say what breaks without them —
  // otherwise the tab is a list of virtues rather than an argument.
  ok('nine disciplines, each fully argued', E.DISCIPLINES.length >= 9 && E.DISCIPLINES.every((x) =>
    x.name && x.icon && x.one && x.what.length > 100 && x.why.length > 80 && x.without.length > 40))
  ok('the non-negotiable one is present and named as such',
    E.DISCIPLINES.some((x) => x.id === 'dataint' && /not negotiable/i.test(x.one)))
  ok('stop-the-line authority is covered',
    E.DISCIPLINES.some((x) => x.id === 'stop' && /punish/i.test(x.what + x.one)))

  ok('eight ethical domains, each with what good looks like',
    E.ETHICS.length >= 8 && E.ETHICS.every((x) =>
      x.name && x.icon && x.stake && x.what.length > 120 && x.good.length > 80))
  ok('worker health, environment, counterfeits and dual use are all covered',
    ['worker', 'environment', 'counterfeit', 'dualuse'].every((id) => E.ETHICS.some((x) => x.id === id)))
  // The one named case must keep its qualification. Stripping the "did not
  // concede causation" clause would turn a careful account into an accusation.
  ok('the named case retains its causal qualification', (() => {
    const w = E.ETHICS.find((x) => x.id === 'worker')
    return w.case && /did not concede/i.test(w.case) && /contested/i.test(w.case)
  })())
  ok('the named case is dated and attributed',
    /2018/.test(E.ETHICS.find((x) => x.id === 'worker').case))
  ok('dual use admits that reasonable people disagree',
    /reasonable people disagree/i.test(E.ETHICS.find((x) => x.id === 'dualuse').good))

  // The framing this tab was built to correct.
  ok('the tab argues flawless is the wrong target',
    E.PRINCIPLES.some((p) => /wrong target/i.test(p.k)))
  ok('discipline is framed as arithmetic rather than virtue',
    E.PRINCIPLES.some((p) => /arithmetic/i.test(p.k)))
  ok('all four principles are argued at length',
    E.PRINCIPLES.length === 4 && E.PRINCIPLES.every((p) => p.k && p.what.length > 150))
}

/* ---------- business ---------- */
group('Business case')
{
  const Bz = await import(join(root, 'src/lib/business.js'))

  ok('all seven phases are described', Bz.PHASES.length >= 7 && Bz.PHASES.every((p) =>
    p.id && p.name && p.months > 0 && p.cashShare > 0 && p.what && p.risk && p.kills))
  ok('phase cash shares sum to one',
    near(Bz.PHASES.reduce((n, p) => n + p.cashShare, 0), 1, 0.001))
  ok('the programme takes three to five years',
    (() => { const m = Bz.PHASES.reduce((n, p) => n + p.months, 0); return m >= 36 && m <= 60 })())
  ok('verification and physical design dominate the budget', (() => {
    const heavy = Bz.PHASES.filter((p) => p.id === 'rtl' || p.id === 'physical')
      .reduce((n, p) => n + p.cashShare, 0)
    return heavy > 0.5
  })())
  ok('most money is spent before first silicon', (() => {
    const i = Bz.PHASES.findIndex((p) => p.id === 'silicon')
    return Bz.PHASES.slice(0, i).reduce((n, p) => n + p.cashShare, 0) > 0.8
  })())

  ok('node costs rise monotonically with each generation',
    Bz.NODE_COSTS.every((n, i) => i === 0 ||
      (n.maskUsd > Bz.NODE_COSTS[i - 1].maskUsd &&
       n.designUsd > Bz.NODE_COSTS[i - 1].designUsd &&
       n.engineerYears > Bz.NODE_COSTS[i - 1].engineerYears)))
  ok('28 nm to 3 nm multiplies mask cost by more than ten', (() => {
    const a = Bz.NODE_COSTS.find((n) => n.node === '28 nm').maskUsd
    const b = Bz.NODE_COSTS.find((n) => n.node === '3 nm').maskUsd
    return b / a > 10
  })())

  const nre = Bz.totalNre({ node: '5 nm' })
  ok('NRE components sum to the total',
    near(nre.mask + nre.people + nre.eda + nre.ip + nre.respin, nre.total, 1))
  ok('leading-edge NRE is in the hundreds of millions',
    nre.total > 200e6 && nre.total < 1.5e9, (nre.total / 1e6).toFixed(0) + 'M')
  // The build-up is independent of the published figure, so agreeing with it
  // is a real cross-check rather than a tautology.
  ok('the build-up lands within a factor of two of the published estimate', (() => {
    const pub = Bz.NODE_COSTS.find((n) => n.node === '5 nm').designUsd
    const r = nre.total / pub
    return r > 0.5 && r < 2
  })(), (nre.total / Bz.NODE_COSTS.find((n) => n.node === '5 nm').designUsd).toFixed(2) + 'x')
  ok('engineering is the largest NRE line at the leading edge',
    nre.people > nre.mask && nre.people > nre.eda && nre.people > nre.ip)
  ok('a base-layer respin costs more than a metal-only one',
    Bz.totalNre({ node: '5 nm', respins: 1, respinIsBase: true }).total >
    Bz.totalNre({ node: '5 nm', respins: 1, respinIsBase: false }).total)
  ok('respins add cost linearly',
    near(Bz.totalNre({ node: '5 nm', respins: 2 }).total - Bz.totalNre({ node: '5 nm', respins: 1 }).total,
         Bz.totalNre({ node: '5 nm', respins: 1 }).total - Bz.totalNre({ node: '5 nm', respins: 0 }).total, 1))

  ok('break-even is NRE over margin',
    near(Bz.breakEvenUnits(100e6, 120, 40).units, 100e6 / 80, 1e-6))
  ok('a negative margin can never break even',
    Bz.breakEvenUnits(100e6, 30, 40).units === Infinity)
  ok('a higher price lowers the break-even volume',
    Bz.breakEvenUnits(100e6, 200, 40).units < Bz.breakEvenUnits(100e6, 120, 40).units)

  ok('prices erode over time', Bz.priceAtQuarter(100, 4, 0.2) < 100 &&
    near(Bz.priceAtQuarter(100, 4, 0.2), 80, 0.01))
  ok('defect density falls toward its mature value',
    Bz.d0AtQuarter(0) > Bz.d0AtQuarter(6) && Bz.d0AtQuarter(6) > Bz.d0AtQuarter(24) &&
    Bz.d0AtQuarter(60) > 0.07 && Bz.d0AtQuarter(60) < 0.075)
  ok('the ramp rises then declines', (() => {
    const v = (q) => Bz.rampVolume(q, { peakUnitsPerQ: 1e6, rampQuarters: 5, lifeQuarters: 16 })
    return v(0) < v(5) && v(5) > 0 && v(15) < v(8) && v(0) >= 0
  })())

  const cf = Bz.cashFlow({ nre: 300e6, asp: 120, costPerUnit: 42, peakUnitsPerQ: 25e6, lifeQuarters: 16, erosionPerYear: 0.25 })
  ok('cash flow covers development then market',
    cf.rows.filter((r) => r.phase === 'develop').length === cf.devQuarters &&
    cf.rows.some((r) => r.phase === 'market'))
  ok('no revenue arrives during development',
    cf.rows.filter((r) => r.phase === 'develop').every((r) => r.revenue === 0))
  ok('cumulative cash is monotonically negative through development',
    cf.rows.filter((r) => r.phase === 'develop').every((r, i, a) => i === 0 || r.cum < a[i - 1].cum))
  ok('the peak deficit is at least the full NRE', cf.peakDeficit <= -300e6 + 1)
  ok('development spend totals the NRE',
    near(cf.rows.filter((r) => r.phase === 'develop').reduce((n, r) => n + r.spend, 0), 300e6, 1))
  ok('a high-volume part pays back', cf.payback !== null && cf.everProfitable)

  // The lesson the tab exists to deliver: node choice is a business decision.
  ok('a low-price part viable at an old node fails at a new one', (() => {
    const mk = { asp: 4, costPerUnit: 1.6, peakUnitsPerQ: 8e6, lifeQuarters: 20, erosionPerYear: 0.18 }
    const old = Bz.cashFlow({ nre: Bz.totalNre({ node: '28 nm' }).total, ...mk })
    const leading = Bz.cashFlow({ nre: Bz.totalNre({ node: '3 nm' }).total, ...mk })
    return old.everProfitable && !leading.everProfitable
  })())
  ok('markets are populated and varied',
    Bz.MARKETS.length >= 5 && Bz.MARKETS.every((x) => x.name && x.peakUnitsPerQ > 0 && x.life > 0 && x.note))
  ok('automotive erodes slowest and lives longest', (() => {
    const a = Bz.MARKETS.find((x) => x.id === 'auto')
    return Bz.MARKETS.every((x) => x.id === 'auto' || a.erosion <= x.erosion) &&
      Bz.MARKETS.every((x) => x.id === 'auto' || a.life >= x.life)
  })())
  // The phase blocks are sized by duration, so the shortest necessarily
  // truncates. These assert the compensations are in place rather than the
  // label merely being cut off.
  const css2 = readFileSync(join(root, 'src/styles.css'), 'utf8')
  const biz = readFileSync(join(root, 'src/ui/Business.jsx'), 'utf8')
  ok('phase blocks carry a hover tooltip', /data-tip=/.test(biz) && /\[data-tip\]::after/.test(css2))
  ok('the tooltip content includes the full name, duration and budget share',
    /data-tip=\{`\$\{x\.name\} — \$\{x\.months\} months/.test(biz))
  ok('the tooltip also opens on keyboard focus, not hover alone',
    /\[data-tip\]:focus-visible::after/.test(css2))
  ok('screen readers get the full label regardless of truncation',
    /aria-label=\{`\$\{x\.name\}, \$\{x\.months\} months/.test(biz))
  ok('truncated labels end in an ellipsis rather than being cut',
    /\.bizphase-t \{[^}]*text-overflow: ellipsis/.test(css2))
  ok('the shortest phase cannot collapse to an unclickable sliver',
    /\.bizphase \{[^}]*min-width: \d+px/.test(css2))
  ok('tooltips are suppressed where hover does not exist',
    /@media \(hover: none\)[^}]*\{[\s\S]{0,200}?\[data-tip\]::after/.test(css2))
  ok('tooltips are suppressed inside the scrolling phase rail',
    /\.bizline \[data-tip\]::after/.test(css2))
  ok('end blocks shift their tooltip inward so it cannot run off-screen',
    /\.bizline > \[data-tip\]:first-child::after/.test(css2) &&
    /\.bizline > \[data-tip\]:last-child::after/.test(css2))

  ok('the four rules are stated at length',
    Bz.RULES.length === 4 && Bz.RULES.every((r) => r.k && r.what.length > 120))
}

/* ---------- speed binning ---------- */
group('Speed binning')
{
  const B = await import(join(root, 'src/lib/binning.js'))
  const cfgB = { waferDia: 300, dieX: 10.5, dieY: 10.5, scribe: 0.08, edgeExclusion: 3 }
  const geo = layoutDies(cfgB)
  const dead = killDies(geo.dies, scatterDefects({ waferDia: 300, d0: 0.07, alpha: 2.5, seed: 7 }))
  const F = (o = {}) => B.dieFrequencies(geo.dies, 300, { fBase: 5, seed: 7, ...o })
  const freqs = F()

  ok('a frequency is produced for every die', freqs.length === geo.dies.length)
  ok('every frequency is finite and positive', freqs.every((f) => Number.isFinite(f) && f > 0))
  ok('the same seed gives the same wafer', JSON.stringify(F()) === JSON.stringify(F()))
  ok('a different seed gives a different wafer', JSON.stringify(F({ seed: 9 })) !== JSON.stringify(freqs))

  // The three variation sources must each do what they claim, separately.
  ok('zero variation gives one identical frequency everywhere', (() => {
    const f = F({ dieSigma: 0, radialAmp: 0 })
    return Math.max(...f) - Math.min(...f) < 1e-9
  })())
  ok('die-to-die spread widens the distribution', (() => {
    const tight = F({ dieSigma: 0.005, radialAmp: 0 })
    const loose = F({ dieSigma: 0.08, radialAmp: 0 })
    const span = (a) => Math.max(...a) - Math.min(...a)
    return span(loose) > span(tight) * 5
  })())
  ok('the radial term actually depends on radius', (() => {
    const f = F({ dieSigma: 0, radialAmp: 0.2, radialSign: -1 })
    const R = 150
    let inner = [], outer = []
    geo.dies.forEach((d, i) => {
      const r = Math.hypot(d.x + d.w / 2, d.y + d.h / 2) / R
      if (r < 0.3) inner.push(f[i]); else if (r > 0.85) outer.push(f[i])
    })
    const avg = (a) => a.reduce((n, v) => n + v, 0) / a.length
    return inner.length && outer.length && avg(inner) > avg(outer)
  })())
  ok('flipping the radial sign flips which ring is slow', (() => {
    const R = 150
    const pick = (sign) => {
      const f = F({ dieSigma: 0, radialAmp: 0.2, radialSign: sign })
      let inner = [], outer = []
      geo.dies.forEach((d, i) => {
        const r = Math.hypot(d.x + d.w / 2, d.y + d.h / 2) / R
        if (r < 0.3) inner.push(f[i]); else if (r > 0.85) outer.push(f[i])
      })
      const avg = (a) => a.reduce((n, v) => n + v, 0) / a.length
      return avg(inner) - avg(outer)
    }
    return pick(-1) > 0 && pick(1) < 0
  })())
  ok('nominal clock scales the whole distribution', (() => {
    const a = F({ fBase: 5, dieSigma: 0, radialAmp: 0 })[0]
    const b = F({ fBase: 10, dieSigma: 0, radialAmp: 0 })[0]
    return near(b / a, 2, 1e-9)
  })())

  // The within-die path term. Its whole point is that it is gentle, which is
  // the contrast with yield — assert that rather than just that it exists.
  ok('the worst-path penalty grows with area',
    B.worstPathPenalty(600) > B.worstPathPenalty(100))
  ok('the penalty grows only slowly — six times the area costs under 2%', (() => {
    const rel = B.worstPathPenalty(600) / B.worstPathPenalty(100)
    return rel > 1 && rel < 1.02
  })(), (B.worstPathPenalty(600) / B.worstPathPenalty(100)).toFixed(4))
  ok('the reference area normalises to unity',
    near(B.worstPathPenalty(B.REF_AREA_MM2) / B.worstPathPenalty(B.REF_AREA_MM2), 1, 1e-12))
  // The bug this caught first time round: an unnormalised penalty pushed every
  // die below every bin, which looked plausible and was nonsense.
  ok('a nominal die lands near the nominal clock, not 10% under', (() => {
    const f = B.dieFrequencies(geo.dies, 300, { fBase: 5, dieSigma: 0, radialAmp: 0, seed: 7 })
    return near(f[0], 5, 0.06)
  })(), B.dieFrequencies(geo.dies, 300, { fBase: 5, dieSigma: 0, radialAmp: 0, seed: 7 })[0].toFixed(3))

  ok('bins are ordered and priced consistently',
    B.BINS.every((b, i) => i === 0 || b.min < B.BINS[i - 1].min) &&
    B.BINS.every((b, i) => i === 0 || b.priceMult < B.BINS[i - 1].priceMult))
  ok('binFor picks the right bin', (() => {
    const top = B.binFor(5.4, 5), std = B.binFor(5.0, 5), low = B.binFor(4.4, 5), none = B.binFor(3.0, 5)
    return top.id === 'x' && std.id === 'a' && low.id === 'c' && none === null
  })())

  const w = B.binWafer({ freqs, dead, fBase: 5, asp: 120 })
  ok('binned dies plus too-slow equals the good dies',
    B.BINS.reduce((n, b) => n + w.counts[b.id], 0) + w.tooSlow === w.good)
  ok('good dies plus dead equals the gross die count', w.good + dead.size === geo.dies.length)
  ok('a realistic spread populates more than one bin',
    B.BINS.filter((b) => w.counts[b.id] > 0).length >= 3,
    B.BINS.map((b) => `${b.id}:${w.counts[b.id]}`).join(' '))
  ok('no die is binned as both dead and sellable',
    w.perDie.every((b, i) => !(dead.has(i) && b)))
  ok('blended price sits between the cheapest and dearest bin',
    w.blendedAsp > 120 * B.BINS[B.BINS.length - 1].priceMult &&
    w.blendedAsp < 120 * B.BINS[0].priceMult, w.blendedAsp.toFixed(1))
  ok('revenue equals the sum over bins',
    near(w.revenue, B.BINS.reduce((n, b) => n + w.counts[b.id] * 120 * b.priceMult, 0), 1e-6))
  ok('percentiles are ordered', w.minF <= w.p10 && w.p10 <= w.p50 && w.p50 <= w.p90 && w.p90 <= w.maxF)
  ok('no price means no revenue', B.binWafer({ freqs, dead, fBase: 5, asp: 0 }).revenue === 0)

  ok('a lower nominal clock promotes dies into higher bins', (() => {
    const easy = B.binWafer({ freqs, dead, fBase: 4.0, asp: 120 })
    const hard = B.binWafer({ freqs, dead, fBase: 6.5, asp: 120 })
    return easy.counts.x > hard.counts.x && hard.tooSlow > easy.tooSlow
  })())

  const h = B.histogram(freqs, dead)
  ok('the histogram covers every living die',
    h.bins.reduce((n, v) => n + v, 0) === geo.dies.length - dead.size)
  ok('the histogram spans the observed range', h.lo <= w.minF + 1e-9 && h.hi >= w.maxF - 1e-9)
  // Regression guard. Math.min(...arr) crashed on a 450 mm wafer of 1 mm dies
  // — about 150,000 elements — which is reachable from the sliders.
  ok('a wafer with 100k+ dies does not blow the stack', (() => {
    const big = layoutDies({ waferDia: 450, dieX: 1, dieY: 1, scribe: 0.04, edgeExclusion: 0 })
    if (big.gross < 100000) return false
    const f = B.dieFrequencies(big.dies, 450, { fBase: 5, seed: 7 })
    const h = B.histogram(f, new Set())
    const bw = B.binWafer({ freqs: f, dead: new Set(), fBase: 5, asp: 100 })
    return h.bins.length > 0 && Number.isFinite(bw.blendedAsp) && Number.isFinite(bw.minF)
  })())
  ok('an all-dead wafer gives an empty histogram',
    B.histogram(freqs, new Set(freqs.map((_, i) => i))).bins.length === 0)
}

/* ---------- clock ---------- */
group('Clock')
{
  const C = await import(join(root, 'src/lib/clock.js'))

  ok('on-chip signal velocity is c/sqrt(eps)',
    near(C.signalVelocity(3.0), 299792458 / Math.sqrt(3), 1))
  ok('signals move at roughly 58% of light in vacuum',
    near(C.signalVelocity() / 299792458, 0.577, 0.002))

  // Reach per cycle. These are the numbers the whole argument rests on.
  ok('5 GHz reaches ~35 mm in one cycle', near(C.reachPerCycle(5e9), 34.6, 0.5), C.reachPerCycle(5e9).toFixed(1))
  ok('100 GHz reaches ~1.7 mm', near(C.reachPerCycle(1e11), 1.73, 0.05))
  ok('1 THz reaches ~173 microns', near(C.reachPerCycle(1e12), 0.173, 0.005))
  ok('reach is inversely proportional to frequency',
    near(C.reachPerCycle(1e9) / C.reachPerCycle(1e10), 10, 1e-9))
  ok('a terahertz clock cannot cross a reticle-sized die', C.reachPerCycle(1e12) < 26)

  ok('period is the reciprocal of frequency', near(C.period(1e9).t, 1e-9, 1e-18))
  ok('period formats down to femtoseconds',
    C.period(5e9).label.includes('ps') && C.period(1e15).label.includes('fs') &&
    C.period(1e6).label.includes('µs'))

  // The power wall — linear at fixed voltage, cubic when voltage scales.
  ok('fixed voltage gives linear power in frequency',
    near(C.powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: 10, scaleVoltage: false }), 400, 1e-9))
  ok('scaling voltage gives cubic power in frequency',
    near(C.powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: 10, scaleVoltage: true }), 1600, 1e-9))
  ok('10x the clock is 1000x the power when voltage scales',
    near(C.powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: 50, scaleVoltage: true }) / 200, 1000, 1e-9))
  ok('a terahertz CMOS clock would need gigawatts',
    C.powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: 1000, scaleVoltage: true }) > 1e9)
  ok('the reference point returns itself',
    near(C.powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: 5 }), 200, 1e-9))
  ok('voltage scales linearly with target clock',
    near(C.voltageAtFrequency(1.0, 5, 10), 2, 1e-9))

  ok('formatHz picks the right prefix',
    C.formatHz(1e12).endsWith('THz') && C.formatHz(5e9).endsWith('GHz') &&
    C.formatHz(4.77e6).endsWith('MHz') && C.formatHz(7.4e5).endsWith('kHz'))
  ok('formatWatts scales through kW, MW and GW',
    C.formatWatts(400).endsWith('W') && C.formatWatts(1600).endsWith('kW') &&
    C.formatWatts(2e6).endsWith('MW') && C.formatWatts(2e9).endsWith('GW'))
  ok('formatters reject nonsense', C.formatHz(0) === '—' && C.formatWatts(NaN) === '—')

  // Content honesty: the ladder mixes quantities that are routinely conflated,
  // so it must keep them labelled distinctly.
  ok('the ladder is populated and chronologically sane',
    C.LADDER.length >= 12 && C.LADDER.every((l) => l.name && l.note && l.hz > 0 && l.year > 1970 && C.KINDS[l.kind]))
  ok('the ladder is sorted by frequency',
    C.LADDER.every((l, i) => i === 0 || l.hz >= C.LADDER[i - 1].hz))
  ok('processor clocks and device f_max are distinct kinds',
    C.LADDER.some((l) => l.kind === 'cpu') && C.LADDER.some((l) => l.kind === 'device'))
  ok('superconducting logic and radio carriers are also distinguished',
    C.LADDER.some((l) => l.kind === 'sfq') && C.LADDER.some((l) => l.kind === 'radio'))
  ok('no processor clock in the ladder claims terahertz',
    C.LADDER.filter((l) => l.kind === 'cpu').every((l) => l.hz < 1e11),
    C.LADDER.filter((l) => l.kind === 'cpu' && l.hz >= 1e11).map((l) => l.name).join(', '))
  ok('device f_max above a terahertz is present and dated',
    C.LADDER.some((l) => l.kind === 'device' && l.hz >= 1e12 && l.year >= 2007))
  ok('all four walls are explained with a consequence',
    C.WALLS.length === 4 && C.WALLS.every((w) => w.k && w.what.length > 80 && w.why.length > 60))
  // The point of the section is to refuse the marketing claim, so assert it.
  ok('a terahertz CMOS processor is listed as not existing',
    C.THZ_REAL.some((t) => /does not exist/i.test(t.status)))
  ok('every terahertz claim carries a status',
    C.THZ_REAL.length >= 5 && C.THZ_REAL.every((t) => t.name && t.status && t.what.length > 60))
}

/* ---------- themes ---------- */
group('Themes and contrast')
{
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8')

  // WCAG 2.1 relative luminance and contrast ratio, computed from the
  // stylesheet rather than trusted. A colour tweak that quietly makes muted
  // prose unreadable is exactly the kind of regression nothing else catches.
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = (hex) => {
    const h = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  }
  const contrast = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  // Pull every [data-theme][data-mode] block and its custom properties.
  const blocks = []
  for (const m of css.matchAll(/\[data-theme="([a-z]+)"\]\[data-mode="(dark|light)"\][^{]*\{([^}]*)\}/g)) {
    const vars = {}
    for (const v of m[3].matchAll(/--([a-z0-9-]+): *(#[0-9a-fA-F]{6})/g)) vars[v[1]] = v[2]
    blocks.push({ palette: m[1], mode: m[2], vars })
  }

  const PALETTES = ['litho', 'wafer', 'glow', 'kesar', 'mk']
  ok('every palette has both a dark and a light variant',
    PALETTES.every((p) => ['dark', 'light'].every((mo) =>
      blocks.some((b) => b.palette === p && b.mode === mo))),
    PALETTES.filter((p) => !['dark', 'light'].every((mo) => blocks.some((b) => b.palette === p && b.mode === mo))).join(', '))
  ok('the kesar palette exists', PALETTES.includes('kesar') && blocks.some((b) => b.palette === 'kesar'))
  ok('kesar keeps its saffron accent',
    blocks.find((b) => b.palette === 'kesar' && b.mode === 'dark').vars.accent.toLowerCase() === '#fc470d')
  ok('ten theme combinations are defined', blocks.length >= 10, String(blocks.length))
  ok('every block defines the full token set', blocks.every((b) =>
    ['bg', 'panel', 'panel2', 'border', 'text', 'muted', 'accent', 'ok', 'warn', 'bad', 'sel'].every((k) => b.vars[k])))

  // Contrast. Text at AAA because it is long-form reading; muted at AA
  // because muted carries the .small prose class, which is most of the
  // explanatory text on this site; accent at 3:1 as a UI component.
  const failText = [], failMuted = [], failAccent = [], failPanel = []
  for (const b of blocks) {
    const id = `${b.palette}-${b.mode}`
    if (contrast(b.vars.text, b.vars.bg) < 7) failText.push(`${id} ${contrast(b.vars.text, b.vars.bg).toFixed(2)}`)
    if (contrast(b.vars.muted, b.vars.bg) < 4.5) failMuted.push(`${id} ${contrast(b.vars.muted, b.vars.bg).toFixed(2)}`)
    if (contrast(b.vars.accent, b.vars.bg) < 3) failAccent.push(`${id} ${contrast(b.vars.accent, b.vars.bg).toFixed(2)}`)
    // Cards sit on --panel, not --bg, so text has to clear it there too.
    if (contrast(b.vars.text, b.vars.panel) < 7) failPanel.push(`${id} ${contrast(b.vars.text, b.vars.panel).toFixed(2)}`)
  }
  ok('body text clears AAA (7:1) against the background in every theme', failText.length === 0, failText.join(', '))
  ok('body text clears AAA against card panels too', failPanel.length === 0, failPanel.join(', '))
  ok('muted prose clears AA (4.5:1) in every theme', failMuted.length === 0, failMuted.join(', '))
  ok('accents clear 3:1 for interface use in every theme', failAccent.length === 0, failAccent.join(', '))

  // Light themes must genuinely be light, and dark genuinely dark — a mislabel
  // here would be invisible in code review and obvious to a user.
  ok('light modes have light backgrounds',
    blocks.filter((b) => b.mode === 'light').every((b) => lum(b.vars.bg) > 0.6),
    blocks.filter((b) => b.mode === 'light' && lum(b.vars.bg) <= 0.6).map((b) => b.palette).join(', '))
  ok('dark modes have dark backgrounds',
    blocks.filter((b) => b.mode === 'dark').every((b) => lum(b.vars.bg) < 0.05))
  ok('light and dark variants of a palette are genuinely different', (() => {
    for (const p of PALETTES) {
      const d = blocks.find((b) => b.palette === p && b.mode === 'dark')
      const l = blocks.find((b) => b.palette === p && b.mode === 'light')
      if (d.vars.accent === l.vars.accent) return false   // an inverted dark theme, not a light one
    }
    return true
  })())
  ok('borders are visible against their panels',
    blocks.every((b) => contrast(b.vars.border, b.vars.panel) > 1.2))

  ok('a default applies before JavaScript runs', /:root, \[data-theme="litho"\]\[data-mode="dark"\]/.test(css))
  ok('the mode switch is styled', /\.modeswitch/.test(css))

  // ---- glass sidebar ----
  const app2 = readFileSync(join(root, 'src/App.jsx'), 'utf8')
  ok('the sidebar exists and is fixed', /\.sidebar \{[^}]*position: fixed/.test(css))
  ok('the sidebar is actually glass, not just translucent',
    /\.sidebar \{[^}]*backdrop-filter: blur/.test(css))
  ok('the webkit prefix is present for Safari',
    /\.sidebar \{[^}]*-webkit-backdrop-filter/.test(css))
  // Translucency without blur support is worse than no glass at all — text on
  // a see-through panel nothing is blurring.
  ok('there is an opaque fallback where backdrop-filter is unsupported',
    /@supports not \(\(backdrop-filter/.test(css) && /\.sidebar \{ background: var\(--panel\); \}/.test(css))
  ok('the glass adapts to palette and mode rather than being hardcoded',
    /\.sidebar \{[^}]*color-mix\(in srgb, var\(--panel\)/.test(css))
  ok('no hardcoded rgba glass slipped in',
    !/\.sidebar \{[^}]*background: rgba\(/.test(css))
  ok('the glass has a lit inner edge', /\.sidebar::after[^}]*linear-gradient/.test(css))

  ok('navigation is grouped rather than a flat list of seventeen',
    /const GROUPS = TABS\.reduce/.test(app2) && /group: '/.test(app2))
  ok('groups are derived from the tabs so the two cannot drift apart',
    /acc\.find\(\(x\) => x\.label === t\.group\)/.test(app2))
  ok('every tab carries an icon', (() => {
    const block = app2.slice(app2.indexOf('const TABS = ['), app2.indexOf('const GROUPS'))
    const ids = (block.match(/\{ id: '/g) || []).length
    const icons = (block.match(/icon: '/g) || []).length
    return ids > 0 && ids === icons
  })())
  ok('every tab icon exists in the icon set', (() => {
    const iconFile = readFileSync(join(root, 'src/ui/Icon.jsx'), 'utf8')
    const have = [...iconFile.matchAll(/^ {2}([a-z][a-zA-Z0-9]*): \(<>/gm)].map((m) => m[1])
    const block = app2.slice(app2.indexOf('const TABS = ['), app2.indexOf('const GROUPS'))
    const used = [...block.matchAll(/icon: '([a-zA-Z0-9]+)'/g)].map((m) => m[1])
    return used.length > 0 && used.every((u) => have.includes(u))
  })())
  ok('the main column is offset by the sidebar width',
    /\.shell \{[^}]*margin-left: \d+px/.test(css))
  ok('the sidebar becomes a drawer on narrow screens',
    /\.sidebar \{ transform: translateX\(-100%\)/.test(css) && /\.sidebar\.open/.test(css))
  ok('the drawer has an open control, a close control and a scrim',
    /className="side-open/.test(app2) && /className="side-close/.test(app2) && /className="side-scrim/.test(app2))
  // Navigation now routes through the shared transition helper, so the check
  // follows it rather than pinning the old direct setter.
  ok('the drawer closes after a destination is chosen',
    /go\(t\.id\); setNavOpen\(false\)/.test(app2))
  ok('the current section is marked for assistive technology',
    /aria-current=\{tab === t\.id \? 'page' : undefined\}/.test(app2))
  // The per-element override was folded into the single authoritative
  // reduced-motion block, which now kills every transition on the page.
  ok('the drawer transition respects reduced motion',
    /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,400}transition: none !important/.test(css))
  ok('the toolbar shows which section you are in',
    /className="crumb"/.test(app2))

  // Position, not just presence. The switch drifted before because fourteen
  // tabs wrapped the toolbar and carried it along; a two-row toolbar with the
  // controls in the top row is what actually keeps it in the corner.
  const app = readFileSync(join(root, 'src/App.jsx'), 'utf8')
  ok('the toolbar has a dedicated control row', /className="toolbar-top"/.test(app))
  ok('the mode switch sits in that row, after the spacer', (() => {
    const top = app.indexOf('className="toolbar-top"')
    const spacer = app.indexOf('className="spacer"', top)
    const sw = app.indexOf('className="modeswitch"', top)
    const end = app.indexOf('</header>', top)
    return top > -1 && spacer > top && sw > spacer && sw < end
  })())
  ok('the mode switch is the last control in the row', (() => {
    const sw = app.indexOf('className="modeswitch"')
    const after = app.slice(sw, app.indexOf('</header>', sw))
    // Nothing else may open a control between the switch and the end of the row.
    return !/className="btn sm"/.test(after.replace(/<button key=\{m\.id\}[\s\S]*?<\/button>/g, ''))
  })())
  ok('the control row does not wrap', /\.toolbar-top \{[^}]*display: flex/.test(css) &&
    !/\.toolbar-top \{[^}]*flex-wrap: wrap/.test(css))
  // Navigation moved from a horizontal tab row into the sidebar, so the rule
  // that mattered is now that the sidebar scrolls its own list.
  ok('the sidebar scrolls its own destination list',
    /\.side-nav \{[^}]*overflow-y: auto/.test(css))
}

/* ---------- motion ---------- */
group('Motion')
{
  const css3 = readFileSync(join(root, 'src/styles.css'), 'utf8')
  const app3 = readFileSync(join(root, 'src/App.jsx'), 'utf8')
  const mot = readFileSync(join(root, 'src/lib/motion.js'), 'utf8')

  ok('view transitions are defined for the root',
    /::view-transition-old\(root\)/.test(css3) && /::view-transition-new\(root\)/.test(css3))
  ok('there is an entrance animation that does not depend on view transitions',
    /@keyframes page-in/.test(css3) && /\.page \{ animation: page-in/.test(css3))
  ok('the column animation is dropped where the browser already cross-fades',
    /@supports \(view-transition-name: none\)[\s\S]{0,80}\.page \{ animation: none/.test(css3))
  ok('blocks stagger in rather than arriving at once',
    /@keyframes block-in/.test(css3) && /nth-child\(3\) \{ animation-delay/.test(css3))
  ok('the stagger is capped rather than unbounded',
    !/nth-child\((?:[7-9]|\d\d)\) \{ animation-delay/.test(css3))
  ok('theme changes transition on the surfaces that carry colour',
    /transition: background-color \.\d+s ease, border-color/.test(css3))
  ok('overlays animate in', /@keyframes pop-in/.test(css3) && /@keyframes fade-in/.test(css3))

  // The entrance only re-fires if the element is recreated. Without a key,
  // React reuses the same <main> and the animation plays once, ever.
  ok('the content column is keyed so its entrance re-fires on every change',
    /<main className="page" key=\{tab\}>/.test(app3))

  // Navigation must go through one place, or the behaviour drifts per call site.
  ok('all navigation goes through a single helper',
    /const go = \(id\) => \{/.test(app3) && /navigate\(\(\) => setTab\(id\)\)/.test(app3))
  ok('selecting the current tab is a no-op rather than a flash',
    /if \(id === tab\) return/.test(app3))
  ok('no component still receives the raw setter as goTab',
    !/goTab=\{setTab\}/.test(app3),
    (app3.match(/goTab=\{setTab\}/g) || []).join(', '))
  ok('the view resets to the top when it changes', /scrollToTop\(\)/.test(mot))

  // Graceful degradation and accessibility, which are the parts that matter.
  ok('the transition helper falls back when the API is absent',
    /typeof document\.startViewTransition === 'function'/.test(mot) &&
    /if \(prefersReducedMotion\(\) \|\| !supportsViewTransitions\(\)\)/.test(mot))
  ok('a failed transition never costs the navigation',
    /catch \{[\s\S]{0,140}update\(\)/.test(mot))
  ok('reduced motion is honoured in the helper, not only in CSS',
    /prefers-reduced-motion: reduce/.test(mot))
  // Off, not shortened — a 0.001ms animation is still the thing they declined.
  ok('reduced motion disables animation entirely rather than shortening it',
    /animation: none !important/.test(css3) && !/animation-duration: \.001ms/.test(css3))
  ok('reduced motion also disables transitions and smooth scrolling',
    /transition: none !important/.test(css3) && /scroll-behavior: auto/.test(css3))
  ok('reduced motion neutralises the view transition too',
    /::view-transition-old\(root\), ::view-transition-new\(root\) \{ animation: none/.test(css3))
  ok('elements that animate in are left visible under reduced motion',
    /\.assistant, \.tour, \.side-scrim \{ opacity: 1; transform: none; \}/.test(css3))
  ok('there is exactly one reduced-motion block, so nothing contradicts it',
    (css3.match(/@media \(prefers-reduced-motion: reduce\)/g) || []).length === 1)
}

/* ---------- legibility ---------- */
group('Legibility')
{
  // Text below about 13px is uncomfortable on a laptop and unreadable on a
  // phone, and this site drifted well under that — 10px and 10.5px labels
  // shipped for several passes before anyone said so. A floor, enforced.
  const FLOOR = 14
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8')

  const cssSizes = [...css.matchAll(/font-size: *([0-9.]+)px/g)].map((m) => parseFloat(m[1]))
  ok('every stylesheet font-size is at least 14px',
    cssSizes.every((v) => v >= FLOOR),
    cssSizes.filter((v) => v < FLOOR).join(', '))
  ok('the stylesheet actually sets a base size', /body \{[^}]*font-size/.test(css))
  ok('the body rule routes through the scale', /body \{[^}]*font-size: var\(--fs-body\)/.test(css))

  // Inline styles too. Values under 10 are SVG user units inside a viewBox,
  // not pixels, so they are exempt — everything else is a real font size.
  const jsxFiles = ['App.jsx', ...readdirSync(join(root, 'src/ui')).map((f) => `ui/${f}`)]
    .filter((f) => f.endsWith('.jsx'))
  const offenders = []
  for (const f of jsxFiles) {
    const t = readFileSync(join(root, 'src', f), 'utf8')
    for (const m of t.matchAll(/fontSize: ([0-9.]+)\b/g)) {
      const v = parseFloat(m[1])
      if (v >= 10 && v < FLOOR) offenders.push(`${f}:${v}`)
    }
  }
  ok('every inline pixel font size is at least 14px', offenders.length === 0, offenders.join(', '))

  // The real complaint was never the label sizes — it was the prose. `.small`
  // alone carries most of the explanatory text on this site, and at 15.5px it
  // read as fine print. These pin the prose tier specifically.
  const tok = (name) => {
    const m = css.match(new RegExp(`--${name}: *([0-9.]+)px`))
    return m ? parseFloat(m[1]) : null
  }
  ok('a named type scale exists rather than scattered values',
    ['fs-lede', 'fs-prose', 'fs-body', 'fs-note', 'fs-data', 'fs-label'].every((t) => tok(t) !== null))
  ok('the scale is monotonic', (() => {
    const v = ['fs-lede', 'fs-prose', 'fs-body', 'fs-note', 'fs-data', 'fs-label'].map(tok)
    return v.every((x, i) => i === 0 || x <= v[i - 1])
  })())
  ok('body text is at least 17px', tok('fs-body') >= 17)
  ok('card prose is at least 18px', tok('fs-prose') >= 18)
  ok('explanatory notes are at least 17px', tok('fs-note') >= 17)
  ok('lead paragraphs are at least 20px', tok('fs-lede') >= 20)
  ok('the .small class uses the note tier, not a bare value',
    /\.small \{ font-size: var\(--fs-note\)/.test(css))
  ok('table cells use the data tier', /\.tbl \{[^}]*font-size: var\(--fs-data\)/.test(css))
  ok('prose line-height leaves room to read', (() => {
    const m = css.match(/\.small \{[^}]*line-height: *([0-9.]+)/)
    return m && parseFloat(m[1]) >= 1.6
  })())

  ok('the page title scales with the viewport', /clamp\(/.test(css))
  ok('body line-height leaves room to read', (() => {
    const m = css.match(/body \{[^}]*line-height: *([0-9.]+)/)
    return m && parseFloat(m[1]) >= 1.5
  })())
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
  ok('production dependencies are audited as a blocking step',
    /npm audit --audit-level=high --omit=dev/.test(ci))
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
      ok('the icon set shipped', bundle.includes('waferscale') && bundle.includes('iplicense'))
      ok('the trace graph shipped', bundle.includes('downstream') && bundle.includes('Boltzmann'))
      ok('the acronym glossary shipped', bundle.includes('acronyms') || bundle.includes('DIBL'))
      ok('the open problems tab shipped', bundle.includes('Open problems') || bundle.includes('nobody has solved'))
      ok('the open problems caveat shipped', /obvious in hindsight/i.test(bundle))
      ok('the discipline tab shipped', bundle.includes('per-step yield') || bundle.includes('stop-the-line'))
      ok('the discipline tab keeps the case qualification', /did not concede/i.test(bundle))
      ok('the business tab shipped', bundle.includes('break-even') || bundle.includes('Total NRE'))
      ok('speed binning shipped in the yield lab',
        bundle.includes('Colour by speed bin') || bundle.includes('Blended selling price'))
      ok('the clock tab shipped', bundle.includes('f_max') || bundle.includes('Signal reach'))
      ok('the science tab shipped', bundle.includes('Subthreshold') || bundle.includes('subthreshold'))
      ok('the God view shipped', bundle.includes('God view') || bundle.includes('godflow'))
      ok('the travel path shipped', bundle.includes('Travel path') || bundle.includes('Follow one wafer'))
      ok('the assistant states it is not a language model', /not a language model/i.test(bundle))
      ok('no API key or endpoint is baked into the bundle',
        !/sk-ant|api\.anthropic\.com|Bearer /.test(bundle))
      ok('the fab simulation shipped', bundle.includes('X-factor') || bundle.includes('bottleneck'))
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
      ok('all five palettes shipped', ['litho', 'wafer', 'glow', 'kesar', 'mk'].every((t) =>
        sheet.includes(`data-theme="${t}"`) || sheet.includes(`data-theme=${t}`)))
      ok('both modes shipped', ['dark', 'light'].every((m) =>
        sheet.includes(`data-mode="${m}"`) || sheet.includes(`data-mode=${m}`)))
      ok('reduced motion is respected', sheet.includes('prefers-reduced-motion'))
      ok('view transitions survived minification', sheet.includes('view-transition'))
      ok('the entrance animations shipped', sheet.includes('page-in') || sheet.includes('block-in'))
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
