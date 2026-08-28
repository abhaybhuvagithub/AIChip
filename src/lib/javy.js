// Javy — an autonomous operator for a chip company.
//
// WHAT THIS IS, PLAINLY. Javy is not a language model and there is none behind
// it. This site is static: no server, no API key, nothing to call. Javy is a
// deterministic policy engine that observes the company's state each quarter,
// applies a stated set of rules, and acts.
//
// That is a weaker claim than the marketing version and a stronger property.
// Every rule Javy follows is in POLICY below and is legible, auditable and
// reproducible — the same state always produces the same decision, with the
// same stated reason. You cannot say that of a language model, and for
// something running a factory that matters more than eloquence.
//
// Javy can also fail. It runs out of cash, it over-books capacity, it holds
// price too long. Those outcomes are left in rather than tuned away, because
// an operator that always wins teaches nothing about operating.

import { computeRun } from './fab.js'
import { d0AtQuarter, priceAtQuarter, rampVolume } from './business.js'
import { escapes as escapeModel } from './rigor.js'

/**
 * Markets, and what a defect costs in each.
 *
 * This exists because the quality gate was dead code without it. At a consumer
 * DPPM target the escape rate never breaches, so Javy's most important rule
 * never fired and could not be tested or learned from. In automotive the gate
 * binds hard and early — which is the real story of that market, and the point
 * at which holding the line becomes visibly expensive.
 */
export const MARKETS = [
  { id: 'consumer', name: 'Consumer', dppmTarget: 500, escapeUsd: 400, asp: 42,
    tolerance: 40000, cash: 120e6,
    note: 'A failure is a return and an annoyance. The gate rarely binds, and shipping marginal parts often does pay in the short run. That is uncomfortable and it is true.' },
  { id: 'industrial', name: 'Industrial', dppmTarget: 50, escapeUsd: 4000, asp: 70,
    tolerance: 2000, cash: 150e6,
    note: 'A failure stops a machine someone is paid to keep running, and they remember which supplier it was.' },
  { id: 'automotive', name: 'Automotive', dppmTarget: 1, escapeUsd: 40000, asp: 95,
    tolerance: 60, cash: 340e6,
    note: 'The stated ambition is zero defects. Javy will hold shipment for quarters rather than breach it — and a supplier that ships escapes here does not get a second programme.' },
]

/** The starting position. A funded fabless startup with one product. */
export function newCompany({
  cashUsd = null, node = '16 nm', dieX = 10.5, dieY = 10.5,
  waferCost = 6000, market = 'consumer', asp = null, seed = 7,
} = {}) {
  const m = MARKETS.find((x) => x.id === market) || MARKETS[0]
  return {
    quarter: 0, seed,
    cash: cashUsd ?? m.cash, raised: cashUsd ?? m.cash,
    tolerance: m.tolerance, standing: 1,
    node, dieX, dieY, waferCost, market, asp: asp ?? m.asp,
    dppmTarget: m.dppmTarget, escapeUsd: m.escapeUsd,
    d0: d0AtQuarter(0), capacity: 4000, booked: 4000, capacityPrice: waferCost,
    inventory: 0, backlog: 0, headcount: 220,
    // Cumulative, because yield learning is not undone by not spending. An
    // earlier version recomputed it from this quarter's spend, so defect
    // density snapped back the moment spending paused — a sawtooth that looked
    // like the model breathing.
    yieldCredit: 0,
    shipped: 0, revenue: 0, escapes: 0, dppm: 0,
    // Test coverage is the second lever on escape rate, and the one that makes
    // an automotive target reachable at all. An earlier version derived DPPM
    // from defect density alone, which made the 1 DPPM gate unreachable no
    // matter how long Javy held shipment — the gate could never open, so
    // holding it was always fatal. That was a broken model, not a hard lesson.
    testCoverage: 0.98, testSpend: 0,
    yieldSpend: 0, alive: true, endedWhy: null,
    log: [],
  }
}

/** Deterministic per-quarter noise, so a run is reproducible. */
function jitter(seed, q, span = 0.18) {
  const x = Math.sin((seed * 97 + q * 131) * 12.9898) * 43758.5453
  return 1 + ((x - Math.floor(x)) - 0.5) * 2 * span
}

/** Demand the market will absorb this quarter, in units. */
export function demandAt(q, { peakUnitsPerQ = 3.2e6, rampQuarters = 5, lifeQuarters = 18, seed = 7 }) {
  return Math.max(0, rampVolume(q, { peakUnitsPerQ, rampQuarters, lifeQuarters }) * jitter(seed, q))
}

/**
 * The rules. Written out because a policy you cannot read is not a policy,
 * it is a habit.
 *
 * Order matters: the quality gate is evaluated before anything commercial, so
 * no revenue consideration can reach past it. That ordering is the whole point
 * — see the Discipline tab. A gate that yields to pressure is not a gate.
 */
export const POLICY = [
  { id: 'gate', name: 'Quality gate first', icon: 'shield',
    rule: 'If escape rate exceeds the DPPM target for the market, hold shipment and spend on yield instead. No cash position overrides this.',
    why: 'Shipping known-marginal parts converts a yield problem into a field-failure problem, at roughly a hundred times the cost. It is also the point at which an operator stops being trustworthy.' },
  { id: 'runway', name: 'Never go below two quarters of runway', icon: 'money',
    rule: 'Project burn forward. If a commitment would take runway under two quarters, decline it.',
    why: 'Wafers are paid for months before the parts they become can be sold. Companies with working products have died exactly here.' },
  { id: 'capacity', name: 'Book to forecast, not to hope', icon: 'foundry',
    rule: 'Book next quarter at demand forecast times 1.15, capped by what cash covers. Booked capacity is take-or-pay.',
    why: 'Forecast high and you own inventory you paid for. Forecast low and you cannot supply a design win you fought for.' },
  { id: 'test', name: 'Screen what yield cannot fix', icon: 'tester',
    rule: 'Escape rate is defect density times what test misses. Where the target is tight, buy coverage as well as yield — neither alone reaches one part per million.',
    why: 'Yield decides how many parts are marginal; test decides how many of those reach a customer. An automotive target needs both, and treating them as one number is how a gate becomes unreachable.' },
  { id: 'yield', name: 'Buy yield while it is cheap', icon: 'wafer',
    rule: 'While defect density is above target and runway allows, spend on yield learning. Every improvement compounds over every wafer that follows.',
    why: 'Yield spend early is worth several times the same money spent late, because it applies to everything still to come.' },
  { id: 'price', name: 'Hold margin, then clear inventory', icon: 'chart',
    rule: 'Price at market. If inventory exceeds one quarter of demand, discount up to 20% to clear it — never below cost plus 15%.',
    why: 'Inventory is cash that has already been spent. Holding price on a part nobody is buying is a decision to lose the money slowly.' },
  { id: 'standing', name: 'Protect the socket above the quarter', icon: 'ipsec',
    rule: 'Track cumulative escapes against what the market tolerates. As standing falls, demand falls with it — permanently.',
    why: 'A field failure does not merely cost its warranty claim. It costs the design win, and in automotive it costs every future programme with that customer.' },
  { id: 'nextgen', name: 'Start the successor before you need it', icon: 'iplicense',
    rule: 'Once the product passes peak demand, commit to the next generation if cash covers the NRE with runway to spare.',
    why: 'A programme takes years. Waiting until revenue falls to start the replacement guarantees a gap with no product in it.' },
]

/**
 * One quarter. Observe, decide, act, record.
 * Returns a new state — the caller keeps the history.
 */
export function step(s, overrides = {}) {
  if (!s.alive) return s
  const q = s.quarter
  const n = { ...s, log: [...s.log] }
  const decisions = []
  const say = (id, what, why) => decisions.push({ id, what, why })

  // ---- observe -----------------------------------------------------------
  // Standing: escapes do not merely cost money, they cost the socket. A
  // supplier with field failures gets designed out, and in automotive that is
  // the end of the programme rather than a bad quarter. This is the mechanism
  // that makes the quality gate rational rather than merely principled — and
  // without it the model said shipping marginal parts was simply profitable.
  const demand = demandAt(q, { seed: s.seed }) * n.standing
  const run = computeRun({
    waferDia: 300, dieX: n.dieX, dieY: n.dieY, scribe: 0.08, edgeExclusion: 3,
    d0: n.d0, model: 'murphy', alpha: 2.5, lineYield: 0.98, testYield: 0.97,
    packageYield: 0.995, waferCost: n.waferCost, asp: n.asp, packageCost: 1.2,
  })
  const goodPerWafer = run.goodDies
  const unitCost = run.costPerGoodDie
  const marketPrice = priceAtQuarter(n.asp, q, 0.2)
  // Escape rate has two inputs and both must be good. Defect density sets how
  // many parts are marginal; test coverage sets how many of those get caught
  // before they leave. Automotive needs mature yield AND heavy screening —
  // neither alone reaches one part per million.
  const latentFraction = 0.02 * (n.d0 / 0.07)
  const dppm = Math.max(0.05, escapeModel({
    defectiveFraction: latentFraction, testCoverage: n.testCoverage, unitsShipped: 1,
  }).dppm)
  n.dppm = dppm

  // ---- decide ------------------------------------------------------------
  // 1. Quality gate. First, and nothing commercial reaches past it.
  const dppmTarget = n.dppmTarget
  const gated = dppm > dppmTarget && !overrides.shipAnyway
  if (gated) {
    say('gate', 'Hold shipment',
      `Escape rate ${dppm.toFixed(0)} DPPM is above the ${dppmTarget} target. Shipping is stopped and the quarter's spend goes to yield.`)
  }

  // 2. Runway.
  // Opex is the whole company, not just the people touching this product —
  // the next generation is being designed the entire time.
  const burn = n.headcount * 62500 + n.booked * n.capacityPrice * 0.25
  const runway = burn > 0 ? n.cash / burn : 99
  if (runway < 2 || (gated && runway < 5)) {
    // Holding the gate is only survivable if burn comes down with it. An
    // operator that holds shipment and keeps spending is not disciplined, it
    // is just slow.
    n.headcount = Math.max(70, Math.round(n.headcount * 0.85))
    say('runway', `Cut burn to ${n.headcount} heads`,
      `Runway is ${runway.toFixed(1)} quarters${gated ? ' and shipment is held' : ''}. Holding the gate is only survivable if spending comes down with it.`)
  }

  // 3. Wafer starts.
  const wafersNeeded = goodPerWafer > 0 ? Math.max(0, (demand - n.inventory) / goodPerWafer) : 0
  let starts = overrides.starts ?? Math.min(n.booked, Math.max(0, wafersNeeded))
  if (gated) starts = 0
  if (runway < 2) starts = Math.min(starts, n.booked * 0.5)
  say('starts', `Release ${Math.round(starts).toLocaleString()} wafers`,
    `Demand is ${(demand / 1e6).toFixed(2)}M units, inventory ${(n.inventory / 1e6).toFixed(2)}M, and each wafer yields ${goodPerWafer} good dies.`)

  // 4. Yield spend.
  // When the gate is what is holding shipment, yield spend is not
  // discretionary — it is the only route back to having a product.
  const wantYield = (gated || n.d0 > 0.045) && runway > 2
  const yieldSpend = overrides.yieldSpend ??
    (wantYield ? Math.min(n.cash * (gated ? 0.12 : 0.06), gated ? 18e6 : 9e6) : 0)
  if (yieldSpend > 0) {
    say('yield', `Spend ${(yieldSpend / 1e6).toFixed(1)}M on yield`,
      `Defect density is ${n.d0.toFixed(3)}/cm². Every improvement applies to every wafer that follows, so it is worth more now than later.`)
  }

  // 4b. Test coverage — the other half of the escape rate, and the only lever
  //     that reaches an automotive target.
  const coverageGap = dppmTarget < 50 ? 0.99995 : dppmTarget < 200 ? 0.9995 : 0.99
  const wantTest = n.testCoverage < coverageGap && (gated ? runway > 1 : runway > 2)
  const testSpend = overrides.testSpend ?? (wantTest ? Math.min(n.cash * 0.05, 7e6) : 0)
  if (testSpend > 0) {
    say('test', `Spend ${(testSpend / 1e6).toFixed(1)}M on test coverage`,
      `Coverage is ${(n.testCoverage * 100).toFixed(3)}% against a ${dppmTarget} DPPM target. Yield alone does not reach it — the marginal parts have to be screened out.`)
  }

  // 5. Price.
  let price = overrides.price ?? marketPrice
  const glut = n.inventory > demand
  if (glut && overrides.price === undefined) {
    price = Math.max(unitCost * 1.15, marketPrice * 0.8)
    say('price', `Discount to $${price.toFixed(0)}`,
      `Inventory of ${(n.inventory / 1e6).toFixed(2)}M exceeds a quarter of demand. Inventory is cash already spent.`)
  }

  // 6. Capacity booking for next quarter.
  const forecast = demandAt(q + 1, { seed: s.seed })
  const wantWafers = goodPerWafer > 0 ? (forecast / goodPerWafer) * 1.15 : 0
  const affordable = Math.max(0, (n.cash * 0.35) / n.capacityPrice)
  const book = overrides.book ?? Math.min(wantWafers, affordable, n.capacity * 1.6)
  say('capacity', `Book ${Math.round(book).toLocaleString()} wafers for next quarter`,
    `Forecast ${(forecast / 1e6).toFixed(2)}M units at 1.15× cover. Booking is take-or-pay, so it is capped at what cash supports.`)

  // ---- act ---------------------------------------------------------------
  const produced = Math.round(starts * goodPerWafer)
  const available = n.inventory + produced
  const sold = Math.min(available, demand)
  const revenue = sold * price
  const cogs = starts * n.waferCost + sold * 1.2
  const opex = n.headcount * 62500
  // Take-or-pay: a quarter of the wafer price is owed on booked capacity
  // whether or not it is used. This is what makes over-booking expensive.
  const bookingCost = Math.max(0, n.booked - starts) * n.capacityPrice * 0.25
  const escapes = Math.max(0, Math.round((sold * dppm) / 1e6))
  // What an escape costs depends entirely on where it fails. A returned phone
  // and a recalled car are not the same event.
  const escapeCost = escapes * n.escapeUsd

  n.cash += revenue - cogs - opex - yieldSpend - testSpend - bookingCost - escapeCost
  n.inventory = available - sold
  n.shipped += sold
  n.revenue += revenue
  n.escapes += escapes
  n.yieldSpend += yieldSpend
  n.testSpend += testSpend
  // Coverage improves toward the ceiling, with diminishing returns.
  if (testSpend > 0) {
    n.testCoverage = n.testCoverage + (0.99999 - n.testCoverage) * Math.min(0.55, testSpend / 9e6)
  }
  n.booked = book
  n.capacity = Math.max(n.capacity, book)
  // Yield learning: the natural curve, less everything ever bought. Credit
  // accumulates and is never given back.
  n.yieldCredit = s.yieldCredit + (yieldSpend > 0 ? 0.006 * (yieldSpend / 5e6) : 0)
  n.d0 = Math.max(0.022, d0AtQuarter(q + 1) - n.yieldCredit)
  n.quarter = q + 1

  n.standing = Math.max(0, 1 - Math.pow(n.escapes / n.tolerance, 1.5))

  if (n.cash < 0) { n.alive = false; n.endedWhy = 'Ran out of cash.' }
  else if (n.standing <= 0.02) { n.alive = false; n.endedWhy = 'Designed out. Field failures cost the socket.' }
  else if (q >= 19) { n.alive = false; n.endedWhy = 'Product reached end of life.' }

  n.log.push({
    q, demand, produced, sold, price, revenue, cash: n.cash, inventory: n.inventory,
    d0: s.d0, dppm, goodPerWafer, unitCost, starts, book, yieldSpend, escapes, gated,
    standing: n.standing, testSpend, coverage: n.testCoverage,
    decisions,
  })
  return n
}

/** Run to completion. */
export function runToEnd(initial, overridesByQuarter = {}) {
  let s = initial
  let guard = 0
  while (s.alive && guard++ < 40) s = step(s, overridesByQuarter[s.quarter] || {})
  return s
}
