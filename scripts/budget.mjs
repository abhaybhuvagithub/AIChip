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
// Each rise is a feature that bought the bytes, named in the commit.
const BUDGET = {
  'js.gzip': 148 * 1024,
  'css.gzip': 7 * 1024,
  'html.raw': 6 * 1024,
  'total.gzip': 156 * 1024,
}

let fail = 0
const kb = (n) => `${(n / 1024).toFixed(1)} kB`

const assets = readdirSync(join(dist, 'assets'))
const sum = (ext) => assets.filter((f) => f.endsWith(ext))
  .reduce((n, f) => n + gzipSync(readFileSync(join(dist, 'assets', f))).length, 0)

const jsGz = sum('.js')
const cssGz = sum('.css')
const htmlRaw = statSync(join(dist, 'index.html')).size
const totalGz = jsGz + cssGz

const check = (name, actual, limit) => {
  const pct = (actual / limit) * 100
  const mark = actual <= limit ? '✓' : '✗'
  if (actual > limit) fail++
  console.log(`  ${mark} ${name.padEnd(12)} ${kb(actual).padStart(10)} / ${kb(limit).padStart(10)}  (${pct.toFixed(0)}%)`)
}

console.log('\nBundle budget (gzipped unless noted)')
check('js.gzip', jsGz, BUDGET['js.gzip'])
check('css.gzip', cssGz, BUDGET['css.gzip'])
check('html.raw', htmlRaw, BUDGET['html.raw'])
check('total.gzip', totalGz, BUDGET['total.gzip'])

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
