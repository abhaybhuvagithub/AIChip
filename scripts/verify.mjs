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
  ok('tour steps point at real tabs', TOUR.every((t) => ['line', 'wafer', 'economics', 'nodes', 'quiz'].includes(t.tab)))
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
      ok('no stray console.log in the bundle', !/console\.log\(/.test(bundle))
    }
    if (css.length) {
      const sheet = readFileSync(join(dist, 'assets', css[0]), 'utf8')
      // The minifier drops the quotes in attribute selectors, so accept both.
      ok('all four themes shipped', ['litho', 'wafer', 'glow', 'cleanroom'].every((t) =>
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
