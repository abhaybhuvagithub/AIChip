// From nothing to a product on sale.
//
// The rest of this site answers whether a chip can be made. This answers
// whether it should be — which is a different question and usually the one
// that kills a program. A design that yields beautifully and costs eleven
// dollars a die is still a bad idea if you spent six hundred million to get
// there and can only sell four million of them.
//
// The whole tab hangs off one calculation:
//
//     break-even units = NRE ÷ (price − cost per unit)
//
// Everything else is decoration on that. It is a brutal piece of arithmetic
// because NRE at the leading edge is enormous and fixed before a single part
// ships, while the margin per unit is small and erodes every year.
//
// SOURCING: cost figures here are widely-cited industry estimates, chiefly of
// the kind published by analyst houses, and they vary by a factor of two or
// more between sources and between companies. They are the right order of
// magnitude and no more. Nobody publishes their real mask bill.

/** Design and mask cost by node. All figures are estimates; see above. */
export const NODE_COSTS_SOURCE = 'ibs'
export const NODE_COSTS = [
  { node: '180 nm', maskUsd: 0.12e6, designUsd: 5e6, engineerYears: 25, waferUsd: 800 },
  { node: '90 nm', maskUsd: 0.8e6, designUsd: 20e6, engineerYears: 80, waferUsd: 1600 },
  { node: '65 nm', maskUsd: 1.5e6, designUsd: 30e6, engineerYears: 120, waferUsd: 2000 },
  { node: '40 nm', maskUsd: 2.0e6, designUsd: 40e6, engineerYears: 155, waferUsd: 2500 },
  { node: '28 nm', maskUsd: 2.5e6, designUsd: 50e6, engineerYears: 190, waferUsd: 3000 },
  { node: '16 nm', maskUsd: 6e6, designUsd: 100e6, engineerYears: 360, waferUsd: 6000 },
  { node: '7 nm', maskUsd: 12e6, designUsd: 300e6, engineerYears: 900, waferUsd: 10000 },
  { node: '5 nm', maskUsd: 18e6, designUsd: 540e6, engineerYears: 1400, waferUsd: 17000 },
  { node: '3 nm', maskUsd: 28e6, designUsd: 700e6, engineerYears: 1800, waferUsd: 20000 },
  { node: '2 nm', maskUsd: 38e6, designUsd: 900e6, engineerYears: 2200, waferUsd: 25000 },
]

/**
 * The phases, in order, with the money and time each consumes.
 *
 * `cashShare` is the fraction of total NRE spent in that phase — useful
 * because the shape of the spend matters as much as the total. Most of it
 * goes out before anyone knows whether the silicon works.
 */
export const PHASES = [
  {
    id: 'concept', icon: 'iplicense', name: 'Concept and funding', months: 3, cashShare: 0.02,
    what: 'Someone decides a chip should exist. Market sizing, a rough architecture, and enough of a story to raise money or win internal approval.',
    risk: 'The market you sized takes three to four years to reach. You are forecasting demand for a product that does not exist against competitors who have not announced yet.',
    kills: 'Most ideas die here, and cheaply, which is the one mercy in the whole process.',
  },
  {
    id: 'spec', icon: 'eda', name: 'Specification and architecture', months: 6, cashShare: 0.06,
    what: 'Performance modelling, power budgets, the memory hierarchy, the interfaces. Which IP to license and which to build — Arm cores, memory PHYs, SerDes, controllers.',
    risk: 'Architecture decisions here are effectively irreversible by month eighteen. Getting the memory bandwidth ratio wrong is not fixable in software.',
    kills: 'Rare, but a competitor announcing something better can end a program at this stage.',
  },
  {
    id: 'rtl', icon: 'eda', name: 'RTL design and verification', months: 14, cashShare: 0.42,
    what: 'Writing the logic, and then proving it. Verification is the majority of the effort and the majority of the headcount — simulation, formal methods, emulation on dedicated hardware.',
    risk: 'A functional bug that escapes to silicon costs a respin. Verification is never finished, only stopped.',
    kills: 'Schedule slips here compound: the foundry slot, the customer design-in window and the product launch are all downstream.',
  },
  {
    id: 'physical', icon: 'fabless', name: 'Physical design and signoff', months: 8, cashShare: 0.22,
    what: 'Floorplanning, place and route, clock tree synthesis, timing closure across process corners, then design rule and layout-versus-schematic signoff against the foundry deck.',
    risk: 'Timing closure at the leading edge is an iterative grind with no guaranteed end date, and every corner you must close for multiplies the runs.',
    kills: 'Programs have been cancelled for failing to close timing at the frequency the product was sold on.',
  },
  {
    id: 'tapeout', icon: 'wafer', name: 'Tapeout and mask set', months: 1, cashShare: 0.14,
    what: 'The database goes to the foundry and the mask set is written — sixty to eighty reticles, each a precision object in its own right. This is a single, enormous, non-refundable payment.',
    risk: 'The mask bill is the most irreversible cheque in the process. Once written, a design change means writing it again.',
    kills: 'Nothing dies here. This is where dying becomes expensive.',
  },
  {
    id: 'silicon', icon: 'prober', name: 'First silicon and bring-up', months: 4, cashShare: 0.06,
    what: 'Three months after tapeout, wafers come back. The lab powers up the first part, and finds out what verification missed. Debug, characterisation, and the decision on whether a respin is needed.',
    risk: 'A metal-only respin touches a few layers and is comparatively cheap. A base-layer respin is the full mask cost and three more months.',
    kills: 'This is where a program discovers whether it is a product or an expensive lesson.',
  },
  {
    id: 'qual', icon: 'tester', name: 'Qualification', months: 6, cashShare: 0.05,
    what: 'Reliability testing to standard: high-temperature operating life, temperature cycling, humidity stress, ESD and latch-up. Automotive adds AEC-Q100 and roughly another year.',
    risk: 'A failure at qual can mean a design change after you have already committed to volume.',
    kills: 'Rarely fatal, frequently late.',
  },
  {
    id: 'ramp', icon: 'foundry', name: 'Production ramp', months: 6, cashShare: 0.03,
    what: 'Yield learning, capacity booking, and the point where working capital hurts most: wafers are paid for three to four months before the parts they become can be sold.',
    risk: 'Booked capacity is take-or-pay. Forecast high and you own inventory; forecast low and you cannot supply a design win you fought for.',
    kills: 'Cash. Companies with a working product have failed at exactly this step.',
  },
]

/** Yield improves over quarters, which is why launch pricing is what it is. */
export function d0AtQuarter(q, d0Mature = 0.07, startMultiple = 4, halfLifeQ = 3) {
  return d0Mature * (1 + (startMultiple - 1) * Math.pow(0.5, q / halfLifeQ))
}

/** Volume ramp: an S-curve to peak, then decline as the product ages. */
export function rampVolume(q, { peakUnitsPerQ, rampQuarters = 5, lifeQuarters = 16 }) {
  if (q < 0) return 0
  const up = 1 / (1 + Math.exp(-(q - rampQuarters * 0.55) * (5 / rampQuarters)))
  const decline = q > lifeQuarters * 0.55
    ? Math.max(0, 1 - (q - lifeQuarters * 0.55) / (lifeQuarters * 0.55))
    : 1
  return peakUnitsPerQ * up * decline
}

/** Prices fall. Assuming they do not is the most common modelling error here. */
export const priceAtQuarter = (asp, q, erosionPerYear = 0.22) =>
  asp * Math.pow(1 - erosionPerYear, q / 4)

export function totalNre({ node, engineerCostUsd = 250000, edaPerYearUsd = 4e6, ipUsd = 8e6, respins = 0, respinIsBase = true }) {
  const n = NODE_COSTS.find((x) => x.node === node) || NODE_COSTS[5]
  const years = PHASES.reduce((m, p) => m + p.months, 0) / 12
  const people = n.engineerYears * engineerCostUsd
  const eda = edaPerYearUsd * years
  // A metal-only respin re-writes a handful of layers; a base-layer respin is
  // effectively a second mask set.
  const respinCost = respins * (respinIsBase ? n.maskUsd : n.maskUsd * 0.25)
  return {
    mask: n.maskUsd, people, eda, ip: ipUsd, respin: respinCost,
    total: n.maskUsd + people + eda + ipUsd + respinCost,
    engineerYears: n.engineerYears, years, node: n,
  }
}

/** Units you must sell before the programme has paid for itself. */
export function breakEvenUnits(nreUsd, asp, costPerUnit) {
  const margin = asp - costPerUnit
  if (!(margin > 0)) return { units: Infinity, margin }
  return { units: nreUsd / margin, margin }
}

/**
 * Quarter-by-quarter cash flow across the product's life.
 *
 * NRE goes out over the development phases, revenue arrives afterwards, and
 * the gap between them is what a chip company is actually financing.
 */
export function cashFlow({
  nre, phases = PHASES, asp, costPerUnit, peakUnitsPerQ,
  rampQuarters = 5, lifeQuarters = 16, erosionPerYear = 0.22, costLearningPerYear = 0.12,
}) {
  const devQuarters = Math.ceil(phases.reduce((m, p) => m + p.months, 0) / 3)
  const rows = []
  let cum = 0

  // Development: money out, nothing in.
  let spent = 0
  for (let q = 0; q < devQuarters; q++) {
    const frac = (q + 1) / devQuarters
    const target = nre * frac
    const spend = target - spent
    spent = target
    cum -= spend
    rows.push({ q, phase: 'develop', spend, revenue: 0, units: 0, net: -spend, cum })
  }

  // Market: money in, unit cost falling as yield learns, price falling faster.
  for (let q = 0; q < lifeQuarters; q++) {
    const units = rampVolume(q, { peakUnitsPerQ, rampQuarters, lifeQuarters })
    const price = priceAtQuarter(asp, q, erosionPerYear)
    const cost = costPerUnit * Math.pow(1 - costLearningPerYear, q / 4)
    const revenue = units * price
    const cogs = units * cost
    const net = revenue - cogs
    cum += net
    rows.push({ q: devQuarters + q, phase: 'market', spend: cogs, revenue, units, net, cum, price, cost })
  }

  const payback = rows.find((r) => r.cum >= 0)
  const peakDeficit = Math.min(...rows.map((r) => r.cum))
  const totalUnits = rows.reduce((n, r) => n + r.units, 0)
  const totalRevenue = rows.reduce((n, r) => n + r.revenue, 0)

  return {
    rows, devQuarters, payback: payback ? payback.q : null,
    peakDeficit, totalUnits, totalRevenue, finalCum: rows[rows.length - 1].cum,
    everProfitable: rows[rows.length - 1].cum > 0,
  }
}

export const MARKETS = [
  { id: 'phone', name: 'Flagship phone SoC', peakUnitsPerQ: 25e6, life: 8, erosion: 0.25, note: 'Enormous volume, short life, one customer who can walk.' },
  { id: 'ai', name: 'AI accelerator', peakUnitsPerQ: 150e3, life: 10, erosion: 0.15, note: 'Tiny volume, extraordinary price. NRE is a rounding error against one quarter of revenue.' },
  { id: 'auto', name: 'Automotive MCU', peakUnitsPerQ: 12e6, life: 40, erosion: 0.06, note: 'Ten-year supply commitments and glacial price erosion. Qualification adds a year before you sell one.' },
  { id: 'iot', name: 'IoT / edge SoC', peakUnitsPerQ: 8e6, life: 20, erosion: 0.18, note: 'Low price, decent life, brutal competition. The node choice decides everything.' },
  { id: 'net', name: 'Networking ASIC', peakUnitsPerQ: 120e3, life: 24, erosion: 0.10, note: 'Few customers, long design-in, long life. Winning a socket is a multi-year annuity.' },
]

export const RULES = [
  {
    k: 'The node is a business decision, not an engineering one',
    what: 'Moving from 28 nm to 3 nm multiplies mask cost by more than ten and total design cost by more than ten again. If your volume cannot amortise that, the older node is simply the better chip — and most of the world\'s silicon is made on nodes nobody writes articles about.',
  },
  {
    k: 'NRE is spent before you learn anything',
    what: 'The mask bill lands before first silicon exists. By the time you know whether the design works, essentially all of the money is gone. This is why verification headcount looks absurd until you price a respin.',
  },
  {
    k: 'Working capital kills companies with good products',
    what: 'Wafers are paid for three to four months before the parts they become can be sold, and foundry capacity is take-or-pay. A company can be profitable on paper and insolvent in practice.',
  },
  {
    k: 'Price erodes, cost improves, and they race',
    what: 'Selling prices fall every year while unit cost falls as yield learns. If price falls faster than cost, the margin window closes — which is why a launch slip of two quarters can be fatal rather than merely annoying.',
  },
]
