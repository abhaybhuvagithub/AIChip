#!/usr/bin/env node
/**
 * Performance budget.
 *
 * This bundle grew from 206 kB to 331 kB across six feature passes without
 * anyone noticing, because nothing was watching. A budget turns "the site got
 * slower" from something you discover from a user into something that fails a
 * build.
 *
 * The limits below are deliberately set close to current size — a budget with
 * generous headroom is a budget that never fires. Raising them is fine; doing
 * it knowingly, in a commit that says why, is the point.
 *
 * Run: npm run budget
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// Gzip is what most CDNs actually serve, so budget on transfer size rather
// than the raw file — raw size punishes readable code for no user benefit.
// History, because a budget is only meaningful if raising it is deliberate:
//   115 kB  original
//   125 kB  discrete-event fab simulation (engine + live dashboard, ~9 kB)
//   138 kB  the science tab (physics library, two SVG plotters, ~6 kB)
//   148 kB  the clock tab and speed binning (frequency model, per-die Fmax,
//           histogram, and speed colouring on the wafer map, ~9 kB)
//   156 kB  the business tab (NRE build-up, break-even, ramp and cash-flow
//           model with a lifetime chart, ~7 kB)
//   166 kB  the detailed icon set (60 technical drawings replacing 30 outline
//           glyphs, rolled out across every tab, ~5 kB)
//   176 kB  the discipline tab and the glass sidebar (rigour maths, grouped
//           navigation, nine more nav icons, ~9 kB)
//   192 kB  five more science sections and the open-problems tab (transport,
//           short-channel, interconnect and wearout models, plus eighteen
//           documented problems, ~15 kB)
//   206 kB  the acronym glossary (172 entries, each with an expansion, a
//           written meaning and a cross-reference, ~7 kB)
//   220 kB  the trace graph, motion layer and teams tab (57-node causal graph,
//           view transitions, 25 role descriptions and a staffing model, ~14 kB)
//   234 kB  3D integration maths and the AI chips tab (bonding density, stack
//           yield, roofline model, KV cache and architecture taxonomy, ~12 kB)
//   248 kB  Run & Operate plus seven deep science sections (policy engine, MOS
//           capacitor, leakage paths, noise, matching, confinement, strain and
//           self-heating, ~14 kB)
// Each rise is a feature that bought the bytes, named in the commit.
// Route-level code splitting changed what this should measure. The total is
// now a poor proxy for what a reader waits for: they download the entry chunk
// plus the one tab they asked for, not all twenty-three. `initial.gzip` is the
// number that matters and is budgeted tightly; `js.gzip` is the whole site and
// is allowed to grow, because a new tab costs its own chunk and nothing else.
const BUDGET = {
  'initial.gzip': 118 * 1024,   // entry chunk — what every visitor pays
  'route.max.gzip': 20 * 1024,  // the largest single tab chunk
  'js.gzip': 290 * 1024,        // all chunks together (splitting adds a little per-chunk overhead)
  'css.gzip': 9 * 1024,
  'html.raw': 6 * 1024,
}

let fail = 0
const kb = (n) => `${(n / 1024).toFixed(1)} kB`

const assets = readdirSync(join(dist, 'assets'))
const sum = (ext) => assets.filter((f) => f.endsWith(ext))
  .reduce((n, f) => n + gzipSync(readFileSync(join(dist, 'assets', f))).length, 0)

const jsFiles = assets.filter((f) => f.endsWith('.js'))
const gz = (f) => gzipSync(readFileSync(join(dist, 'assets', f))).length
// The entry chunk is the one index.html actually references; every other JS
// asset is fetched only when its route is opened.
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const entryFiles = jsFiles.filter((f) => html.includes(f))
const initialGz = entryFiles.reduce((n, f) => n + gz(f), 0)
const routeGz = jsFiles.filter((f) => !entryFiles.includes(f)).map(gz)
const routeMax = routeGz.length ? Math.max(...routeGz) : 0

const jsGz = sum('.js')
const cssGz = sum('.css')
const htmlRaw = statSync(join(dist, 'index.html')).size

const check = (name, actual, limit) => {
  const pct = (actual / limit) * 100
  const mark = actual <= limit ? '✓' : '✗'
  if (actual > limit) fail++
  console.log(`  ${mark} ${name.padEnd(12)} ${kb(actual).padStart(10)} / ${kb(limit).padStart(10)}  (${pct.toFixed(0)}%)`)
}

console.log('\nBundle budget (gzipped unless noted)')
check('initial.gzip', initialGz, BUDGET['initial.gzip'])
check('route.max.gzip', routeMax, BUDGET['route.max.gzip'])
check('js.gzip', jsGz, BUDGET['js.gzip'])
check('css.gzip', cssGz, BUDGET['css.gzip'])
check('html.raw', htmlRaw, BUDGET['html.raw'])
console.log(`    routes       ${String(routeGz.length).padStart(10)}  chunks, ${kb(routeGz.reduce((a, b) => a + b, 0))} total`)

// Splitting is only real if it actually happened.
if (routeGz.length < 15) {
  console.error(`\n✗ budget: only ${routeGz.length} route chunks — code splitting has regressed.`)
  process.exit(1)
}

// Informational: brotli is what the browser usually negotiates, and the
// number people quote. Not budgeted, because CDN behaviour varies.
const jsBr = assets.filter((f) => f.endsWith('.js'))
  .reduce((n, f) => n + brotliCompressSync(readFileSync(join(dist, 'assets', f))).length, 0)
console.log(`    js.brotli    ${kb(jsBr).padStart(10)}  (informational)`)

if (fail > 0) {
  console.error(`\n✗ budget: ${fail} over limit.`)
  console.error('  If the growth is intentional, raise the limit in scripts/budget.mjs')
  console.error('  in the same commit, and say in the message what bought the bytes.')
  process.exit(1)
}
console.log('\n✓ budget: within limits')
