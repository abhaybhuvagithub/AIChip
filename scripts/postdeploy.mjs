#!/usr/bin/env node
/**
 * Confirm the live site is actually serving the build we just made.
 *
 * A green deploy job means the push succeeded, not that the bytes are being
 * served. The failure this guards against is real and has happened on a sister
 * repo: dist/ was tracked on the deploy branch, `git checkout` silently
 * replaced the fresh build with the previous one, and every deploy shipped the
 * build before the one you thought you were shipping — for weeks, with green
 * checks the whole time.
 *
 * So: read the asset filename out of the local build, then poll the live URL
 * until index.html references that same filename. Content-hashed names make
 * this an exact test rather than a guess.
 *
 * Run: node scripts/postdeploy.mjs [url] [--expect=index-XXXX.js]
 *
 * --expect lets CI pin the filename before it publishes, so this does not
 * depend on dist/ still being present after the branch dance.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const expectArg = args.find((a) => a.startsWith('--expect='))?.split('=')[1]
const URL_ = args.find((a) => !a.startsWith('--')) || 'https://abhaybhuvagithub.github.io/AIChip/'
const TIMEOUT_MS = 5 * 60 * 1000
const INTERVAL_MS = 15 * 1000

let expectJs = expectArg
let expectCss = null
if (!expectJs) {
  const local = readFileSync(join(root, 'dist/index.html'), 'utf8')
  expectJs = local.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
  expectCss = local.match(/assets\/(index-[A-Za-z0-9_-]+\.css)/)?.[1]
}

if (!expectJs) {
  console.error('✗ no hashed JS asset to look for — pass --expect= or run a build first.')
  process.exit(1)
}
console.log(`Expecting ${expectJs}`)
console.log(`Polling   ${URL_}`)

const started = Date.now()
let attempt = 0

while (Date.now() - started < TIMEOUT_MS) {
  attempt++
  try {
    // Cache-bust: GitHub Pages sits behind a CDN, and a cached copy of the
    // previous index.html would make this check pass or fail for the wrong
    // reason.
    const res = await fetch(`${URL_}?cb=${Date.now()}`, { headers: { 'cache-control': 'no-cache' } })
    if (res.ok) {
      const html = await res.text()
      if (html.includes(expectJs)) {
        const okCss = !expectCss || html.includes(expectCss)
        console.log(`✓ live site is serving ${expectJs}${okCss ? '' : ' (CSS hash differs — check the build)'}`)
        if (!okCss) process.exit(1)

        // The HTML can be right while the asset itself 404s, which is exactly
        // what a partial deploy looks like.
        const asset = await fetch(new URL(`assets/${expectJs}`, URL_).href)
        if (!asset.ok) {
          console.error(`✗ index.html references ${expectJs} but the asset returns ${asset.status}`)
          process.exit(1)
        }
        const body = await asset.text()
        if (!body.includes('FabSim') && body.length < 10000) {
          console.error('✗ asset served but looks empty or wrong')
          process.exit(1)
        }
        console.log(`✓ asset served, ${(body.length / 1024).toFixed(0)} kB`)
        process.exit(0)
      }
      const served = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1] || 'none'
      console.log(`  attempt ${attempt}: still serving ${served}`)
    } else {
      console.log(`  attempt ${attempt}: HTTP ${res.status}`)
    }
  } catch (e) {
    console.log(`  attempt ${attempt}: ${e.message}`)
  }
  await new Promise((r) => setTimeout(r, INTERVAL_MS))
}

console.error(`\n✗ ${expectJs} never appeared on the live site within ${TIMEOUT_MS / 60000} minutes.`)
console.error('  The push may have succeeded while Pages served a stale build.')
process.exit(1)
