// Your case.
//
// This site has a dozen independently verified models — yield, cost per good
// die, non-recurring engineering, staffing, wafer economics, quality gates,
// disruption recovery — and every tab points one or two of them at an example.
// None of them lets you point all of them at YOUR product, which is the thing
// somebody with a real decision actually wants.
//
// So this composes them. You describe a part once and every model answers
// about that part. Nothing here is a new model; if a number is wrong it is
// wrong on the tab it came from too, which is the point of building it this way
// rather than writing a thirteenth model that agrees with nobody.
//
// THE OUTPUT THAT MATTERS IS NOT THE COST. It is which constraint binds. Most
// chip ideas do not fail on the thing their authors were worried about.

import { computeRun, layoutDies } from './fab.js'
import { totalNre, breakEvenUnits, NODE_COSTS } from './business.js'
import { staffing, teamCost } from './staffing.js'
import { escapes, DPPM_TARGETS } from './rigor.js'

/** Starting points, so nobody faces an empty form. */
export const ARCHETYPES = [
  { id: 'sensor', name: 'Industrial sensor', icon: 'ipisp',
    dieX: 3, dieY: 3, node: '40 nm', unitsPerYear: 20e6, priceUsd: 1.8, market: 'industrial', packageCost: 0.12, testCoverage: 0.995,
    project: 'mcu',
    note: 'Tiny die on a mature node, sold by the tens of millions at a couple of dollars. The economics are all about volume and test cost.' },
  { id: 'automotive', name: 'Automotive controller', icon: 'mcu',
    dieX: 6, dieY: 6, node: '28 nm', unitsPerYear: 8e6, priceUsd: 9, market: 'automotive', packageCost: 0.4, testCoverage: 0.9999,
    project: 'mcu',
    note: 'Qualification and defect escapes dominate. One part per million is the target, and the gate is not negotiable.' },
  { id: 'consumer', name: 'Consumer SoC', icon: 'soc',
    dieX: 9, dieY: 9, node: '5 nm', unitsPerYear: 30e6, priceUsd: 55, market: 'consumer', packageCost: 3, testCoverage: 0.99,
    project: 'midsoc',
    note: 'Leading-edge economics with a short product life. Getting to market late is worse than getting there expensive.' },
  { id: 'accelerator', name: 'AI accelerator', icon: 'npu',
    dieX: 24, dieY: 26, node: '3 nm', unitsPerYear: 200e3, priceUsd: 18000, market: 'industrial', packageCost: 180, testCoverage: 0.998,
    project: 'ai',
    note: 'A huge die at low volume and enormous price. Yield is brutal and almost nothing else matters.' },
]

/**
 * DPPM_TARGETS identifies a market by its display name, not by a slug, so a
 * lookup on `.id` silently matched nothing and fell back to consumer — which
 * meant the automotive gate could never fail. Derive a stable key instead of
 * editing the shared table, so the discipline tab keeps rendering as it was.
 */
export const marketKey = (m) => m.market.toLowerCase().split(/[^a-z]/)[0]
export const MARKETS = DPPM_TARGETS

/**
 * Run every model against one product description.
 *
 * `cfgBase` supplies the wafer-level defaults the yield model needs; the
 * per-node figures come from the same table the business tab uses.
 */
export function evaluate({
  dieX, dieY, node, unitsPerYear, priceUsd, market = 'consumer', packageCost,
  project = 'midsoc', testCoverage = 0.999, lifeYears = 4, cfgBase = {},
}) {
  const nodeRow = NODE_COSTS.find((n) => n.node === node) || NODE_COSTS[NODE_COSTS.length - 1]

  const cfg = {
    waferDia: 300, scribe: 0.08, edgeExclusion: 3, model: 'negbinom', alpha: 2.5,
    lineYield: 0.98, testYield: 0.97, packageYield: 0.995, clustered: true, seed: 7,
    d0: nodeRow.d0 ?? 0.07, waferCost: nodeRow.waferUsd ?? 6000, packageCost: 2,
    ...cfgBase, dieX, dieY, asp: priceUsd,
    ...(packageCost !== undefined ? { packageCost } : {}),
  }

  const run = computeRun(cfg)
  const geo = layoutDies(cfg)
  const goodPerWafer = Math.max(0, run.goodDies)
  const wafersPerYear = goodPerWafer > 0 ? unitsPerYear / goodPerWafer : Infinity
  const wspmNeeded = wafersPerYear / 12

  const costPerDie = run.costPerGoodDie
  const grossPerUnit = priceUsd - costPerDie
  const grossMargin = priceUsd > 0 ? grossPerUnit / priceUsd : 0

  const nre = totalNre({ node })
  const breakEvenRaw = breakEvenUnits(nre.total, priceUsd, costPerDie)
  const breakEven = breakEvenRaw.units
  const lifetimeUnits = unitsPerYear * lifeYears
  const team = staffing(project)
  const peopleCost = teamCost(nre.engineerYears)

  // Feeding yield loss into the escape model was wrong, and wrong in a way that
  // made every market unreachable. A die that fails wafer test is discarded: it
  // never ships and so can never escape. What escapes is the much smaller
  // population that PASSES test and carries a latent defect - marginal parts,
  // assembly damage, failures only under conditions the tester did not
  // reproduce. That is a few per cent of the visible yield loss, not all of it.
  const LATENT_RATIO = 0.03
  const latentFraction = Math.max(0, 1 - run.dieYield) * LATENT_RATIO
  const esc = escapes({ defectiveFraction: latentFraction, testCoverage, unitsShipped: unitsPerYear })
  const marketRow = MARKETS.find((m) => marketKey(m) === market) || MARKETS[0]
  const dppm = esc.dppm
  const gatePasses = dppm <= marketRow.dppm

  // A fab's worth of capacity, for scale.
  const fabShare = wspmNeeded / 50000

  return {
    cfg, run, geo, nodeRow, marketRow,
    goodPerWafer, wafersPerYear, wspmNeeded, fabShare,
    costPerDie, grossPerUnit, grossMargin,
    nre, breakEven, lifetimeUnits, team, peopleCost,
    dppm, gatePasses, testCoverage,
    lifetimeGrossUsd: grossPerUnit * lifetimeUnits,
    lifetimeProfitUsd: grossPerUnit * lifetimeUnits - nre.total,
    viable: grossPerUnit > 0 && breakEven < lifetimeUnits && gatePasses,
  }
}

/**
 * Which constraint actually binds.
 *
 * The useful output, and usually not the one the reader came in worried about.
 * Ordered so the first failure returned is the one that kills the product
 * soonest — a negative margin is not something better testing fixes.
 */
export function bindingConstraint(r) {
  if (r.goodPerWafer < 1) {
    return { id: 'yield', k: 'The die does not yield',
      what: `At ${r.cfg.dieX} × ${r.cfg.dieY} mm and D₀ of ${r.cfg.d0}, fewer than one die per wafer survives. The part cannot be built at this size on this process.`,
      fix: 'Shrink the die, split it into chiplets, or wait for the defect density to mature.' }
  }
  const area = r.cfg.dieX * r.cfg.dieY
  if (area > 858) {
    return { id: 'reticle', k: 'The die will not fit in one exposure',
      what: `${area.toFixed(0)} mm² is past the 858 mm² reticle field. A scanner cannot print this in one shot, so it cannot be one die.`,
      fix: 'Split it into chiplets, or stitch exposures the way wafer-scale parts do and accept what that costs.' }
  }
  if (r.grossPerUnit <= 0) {
    return { id: 'margin', k: 'Every unit loses money',
      what: `Cost per good die is $${r.costPerDie.toFixed(2)} against a price of $${r.cfg.asp.toFixed(2)}. Volume makes this worse, not better.`,
      fix: 'Raise the price, shrink the die, or move to a cheaper node. No amount of scale rescues a negative unit margin.' }
  }
  if (!r.gatePasses) {
    return { id: 'quality', k: 'It cannot meet the quality bar',
      what: `Escapes land at ${r.dppm.toFixed(1)} DPPM against a ${r.marketRow.name} target of ${r.marketRow.dppm}. At ${(r.testCoverage * 100).toFixed(0)}% test coverage the arithmetic does not reach the target.`,
      fix: 'More test coverage, better yield, or a market with a looser requirement. For automotive you generally need both of the first two.' }
  }
  if (r.breakEven > r.lifetimeUnits) {
    return { id: 'volume', k: 'It never earns back the NRE',
      what: `Break-even is ${(r.breakEven / 1e6).toFixed(1)}M units and the whole product life is ${(r.lifetimeUnits / 1e6).toFixed(1)}M. The design costs more than the part will ever return.`,
      fix: 'A cheaper node, a longer life, higher volume, or amortise the design across more products.' }
  }
  if (r.fabShare > 0.5) {
    return { id: 'capacity', k: 'Capacity is the constraint',
      what: `This needs ${Math.round(r.wspmNeeded).toLocaleString()} wafer starts a month — ${(r.fabShare * 100).toFixed(0)}% of a large fab. That is a supply negotiation, not a purchase order.`,
      fix: 'Long-term capacity commitments, prepayment, or a second source. Start years early.' }
  }
  return { id: 'none', k: 'Nothing obvious binds',
    what: `Margin is ${(r.grossMargin * 100).toFixed(0)}%, break-even arrives at ${(r.breakEven / 1e6).toFixed(1)}M units against ${(r.lifetimeUnits / 1e6).toFixed(1)}M of life, and the quality target is reachable.`,
    fix: 'Which means the risk is in the things this model does not cover — schedule, competition, and whether anyone wants it.' }
}

/** Everything the reader should sanity-check before believing any of it. */
export const ASSUMPTIONS = [
  'Defect density is the mature figure for the node, so a part designed today at a new node will yield worse than this for its first year or two.',
  'One mask set and no respins. A single respin adds months and a large fraction of the mask cost again.',
  'Price is held flat across the life. Real prices erode, and the business tab models that erosion separately.',
  'Package and test costs are rough per-unit figures, not quotes.',
  'No capacity constraint is enforced — the model will happily tell you to build four fabs.',
  'Nothing here models competition, schedule slip, or whether the product is any good.',
]

// ============================================ THE OTHER SIDE ============
//
// Everything above models a company that SELLS A PART. Most of the
// semiconductor industry does not. Design services firms sell engineer-years:
// RTL design, verification, FPGA work, post-silicon validation. They carry no
// mask cost, no wafer cost and no inventory, and none of the arithmetic above
// describes them.
//
// This matters for the site as a whole, because the NRE figure on the business
// tab — six hundred engineer-years for a leading-edge design — is not a cost
// from the services firm's point of view. It is the market.
//
// The discipline split below follows the service lines a working design
// services company actually organises around. Verification dominating design
// is the well-established rule of thumb in this industry, not a claim about
// any particular firm.

export const SERVICE_LINES = [
  { id: 'rtl', name: 'RTL design', share: 0.22, icon: 'ipcore',
    what: 'Architecture and micro-architecture, Verilog and VHDL, clock and reset domain crossing, linting, logical equivalence and synthesis.',
    why: 'The part everyone pictures when they think of chip design, and the smaller half of the effort.' },
  { id: 'dv', name: 'Design verification', share: 0.48, icon: 'metrology',
    what: 'Testbenches, constrained-random stimulus, coverage closure, formal property checking, IP and subsystem and full-SoC verification.',
    why: 'The largest single line by some distance. Roughly two engineers verify for every one that designs, because a bug found after tapeout costs a mask set and a quarter.' },
  { id: 'fpga', name: 'FPGA design and prototyping', share: 0.15, icon: 'ipnoc',
    what: 'Mapping the design into programmable logic so software and system integration can start before silicon exists.',
    why: 'Buys schedule rather than silicon. On a four-year programme, software that starts a year early is a year of calendar nobody had to pay for twice.' },
  { id: 'psv', name: 'Post-silicon validation', share: 0.15, icon: 'prober',
    what: 'Bring-up and characterisation of manufactured parts: does it work, at what voltage and temperature, and where are the corners it fails.',
    why: 'The only stage that tests the real thing. Everything before it tests a model of it, and section 20 of the science tab is a list of ways a model and a die disagree.' },
]

/**
 * What a chip programme is worth as engineering work.
 *
 * Takes the same node-based engineer-year figure the business tab uses for
 * NRE, and reads it from the supplier's side rather than the buyer's.
 */
export function servicesView({ node, ratePerEngineerYearUsd = 120000, durationYears = 2.5 }) {
  const nre = totalNre({ node })
  const years = nre.engineerYears
  const lines = SERVICE_LINES.map((l) => ({
    ...l,
    engineerYears: years * l.share,
    valueUsd: years * l.share * ratePerEngineerYearUsd,
    headcount: (years * l.share) / durationYears,
  }))
  return {
    node, engineerYears: years, durationYears,
    lines,
    totalValueUsd: years * ratePerEngineerYearUsd,
    peakHeadcount: years / durationYears,
    verificationShare: SERVICE_LINES.find((l) => l.id === 'dv').share,
  }
}
