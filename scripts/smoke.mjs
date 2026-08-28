#!/usr/bin/env node
/**
 * Render every tab through react-dom/server.
 *
 * The verify suite checks the maths and the data. The build checks that the
 * code compiles. Neither catches a component that throws on first render —
 * a bad destructure, a missing prop, a null map. That ships green and shows
 * the error boundary to every visitor.
 *
 * This was a throwaway script run by hand for several sessions before being
 * committed, which is exactly the wrong place for a check to live. It runs in
 * CI now.
 *
 * Run: npm run smoke   (vite-node, so JSX resolves as it does in the build)
 */
import React from 'react'
import { renderToString } from 'react-dom/server'

// Minimal browser globals. Components read localStorage for the theme and
// window.location for the shareable-URL state, and jsdom would be a heavy
// dependency for what amounts to four stubs.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  location: { hash: '', href: 'https://abhaybhuvagithub.github.io/AIChip/' },
  history: { replaceState: () => {} },
  addEventListener: () => {}, removeEventListener: () => {},
}
globalThis.document = { documentElement: { setAttribute: () => {} } }
globalThis.performance = globalThis.performance || { now: () => 0 }
globalThis.requestAnimationFrame = () => 0
globalThis.cancelAnimationFrame = () => {}
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} } }, configurable: true,
})

// Static imports: this runs under vite-node so JSX and the project's aliases
// resolve exactly as they do in the real build. Dynamic imports built from a
// variable cannot be statically analysed and fail here.
const { default: SandToSilicon } = await import('../src/ui/SandToSilicon.jsx')
const { default: FabLine } = await import('../src/ui/FabLine.jsx')
const { default: FabRun } = await import('../src/ui/FabRun.jsx')
const { default: YieldLab } = await import('../src/ui/YieldLab.jsx')
const { default: Economics } = await import('../src/ui/Economics.jsx')
const { default: Nodes } = await import('../src/ui/Nodes.jsx')
const { default: Beyond3D } = await import('../src/ui/Beyond3D.jsx')
const { default: Silicon } = await import('../src/ui/Silicon.jsx')
const { default: ValueChain } = await import('../src/ui/ValueChain.jsx')
const { default: Compute } = await import('../src/ui/Compute.jsx')
const { default: Quantum } = await import('../src/ui/Quantum.jsx')
const { default: Quiz } = await import('../src/ui/Quiz.jsx')
const { default: Science } = await import('../src/ui/Science.jsx')
const { default: ClockTab } = await import('../src/ui/Clock.jsx')
const { default: Business } = await import('../src/ui/Business.jsx')
const { default: Ethics } = await import('../src/ui/Ethics.jsx')
const { default: Unsolved } = await import('../src/ui/Unsolved.jsx')
const { default: Acronyms } = await import('../src/ui/Acronyms.jsx')
const { default: Trace } = await import('../src/ui/Trace.jsx')
const { default: Teams } = await import('../src/ui/Teams.jsx')
const { default: AIChips } = await import('../src/ui/AIChips.jsx')
const { default: GodView } = await import('../src/ui/GodView.jsx')
const { default: Journey } = await import('../src/ui/Journey.jsx')
const { default: Assistant } = await import('../src/ui/Assistant.jsx')
const { default: App } = await import('../src/App.jsx')
const { default: ErrorBoundary } = await import('../src/ErrorBoundary.jsx')

// A configuration every tab must survive, plus the edge cases that have
// actually broken things before.
const BASE = {
  waferDia: 300, dieX: 10.5, dieY: 10.5, scribe: 0.08, edgeExclusion: 3,
  d0: 0.07, model: 'negbinom', alpha: 2.5, layers: 78,
  waferCost: 20000, lineYield: 0.98, testYield: 0.97,
  packageCost: 6, packageYield: 0.995, asp: 120,
}

const CASES = [
  ['default', BASE],
  // A die too large to make: every downstream figure goes Infinity or NaN.
  ['unmakeable die', { ...BASE, dieX: 300, dieY: 300 }],
  // Defect density so high nothing yields.
  ['zero yield', { ...BASE, d0: 5 }],
  // Smallest sensible die, largest wafer.
  ['extremes', { ...BASE, dieX: 1, dieY: 1, waferDia: 450, edgeExclusion: 0 }],
  // No price set — margin is null, and null formatting has bitten before.
  ['no price', { ...BASE, asp: 0 }],
]

const TABS = [
  ['SandToSilicon', SandToSilicon], ['FabLine', FabLine], ['FabRun', FabRun], ['YieldLab', YieldLab],
  ['Economics', Economics], ['Nodes', Nodes], ['Beyond3D', Beyond3D],
  ['Silicon', Silicon], ['ValueChain', ValueChain], ['Compute', Compute],
  ['Quantum', Quantum], ['Quiz', Quiz], ['GodView', GodView], ['Journey', Journey], ['Science', Science], ['Clock', ClockTab], ['Business', Business], ['Ethics', Ethics], ['Teams', Teams], ['AIChips', AIChips], ['Unsolved', Unsolved], ['Acronyms', Acronyms], ['Trace', Trace],
]

let pass = 0, fail = 0
const noop = () => {}

for (const [caseName, cfg] of CASES) {
  for (const [name, C] of TABS) {
    try {
      const html = renderToString(React.createElement(C, {
        cfg, patch: noop, goTab: noop, onSnapshot: noop,
        snap: null, journey: [], narrate: false, setNarrate: noop,
      }))
      if (typeof html !== 'string' || html.length < 400) {
        fail++; console.error(`  ✗ ${name} [${caseName}] rendered only ${html.length} chars`)
      } else if (/NaN|undefined|\[object Object\]/.test(html)) {
        // Renders fine, reads as broken. Worse than a crash, because nothing
        // alerts on it.
        const bad = html.match(/NaN|undefined|\[object Object\]/)[0]
        fail++; console.error(`  ✗ ${name} [${caseName}] leaked "${bad}" into the output`)
      } else pass++
    } catch (e) {
      fail++; console.error(`  ✗ ${name} [${caseName}] threw: ${e.message}`)
    }
  }
}

// The assistant closed (a button) and open (a panel), since both render.
for (const open of [false, true]) {
  try {
    const html = renderToString(React.createElement(Assistant, {
      cfg: BASE, snap: null, journey: [], goTab: noop, open, setOpen: noop,
    }))
    if (html.length > 20) pass++
    else { fail++; console.error(`  ✗ Assistant [open=${open}] rendered nothing`) }
  } catch (e) { fail++; console.error(`  ✗ Assistant [open=${open}] threw: ${e.message}`) }
}

// The shell itself, and the error boundary's own failure path.
try {
  const html = renderToString(React.createElement(App))
  if (html.includes('FabSim') && html.length > 1000) pass++
  else { fail++; console.error('  ✗ App shell rendered without its own name in it') }
} catch (e) { fail++; console.error(`  ✗ App shell threw: ${e.message}`) }

try {
  const Boom = () => { throw new Error('deliberate') }
  const html = renderToString(
    React.createElement(ErrorBoundary, null, React.createElement(Boom))
  )
  // react-dom/server does not run error boundaries, so a throw here is the
  // expected outcome — what we are asserting is that it throws rather than
  // silently producing a blank page.
  fail++; console.error(`  ✗ ErrorBoundary swallowed a throw during SSR: ${html.slice(0, 40)}`)
} catch { pass++ }

console.log(`\n${fail === 0 ? '✓' : '✗'} smoke: ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
