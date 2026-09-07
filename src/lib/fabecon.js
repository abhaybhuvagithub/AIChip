// Fab economics: where a wafer price actually comes from.
//
// The economics tab took `waferCost` as an input, which is the tell that gives
// an educational site away to anyone who has run a fab. A wafer price is not a
// number you look up. It is an output of four things — capital, capacity,
// utilisation and yield — and the first three of those are fixed once the
// building exists. That is why this industry behaves the way it does.
//
// THE ONE FACT THIS FILE EXISTS TO SHOW: depreciation dominates, and
// depreciation is fixed. A fab that fills its capacity spreads twenty billion
// dollars over fifty thousand wafers a month. A fab at sixty per cent spreads
// the same twenty billion over thirty thousand. Nothing about the process
// changed and the cost per wafer went up by half. Every capacity decision, every
// take-or-pay contract, every prepayment and most of the industry's cyclicality
// follows from that one sentence.
//
// Figures are calibrated to published estimates: roughly $20B for a 3 nm fab at
// about 50,000 wafer starts per month, rising to about $28B at 2 nm for the same
// capacity, with N3 wafers around $20,000 and N2 around $30,000 [ibs]. The
// model is validated below against a real reported breakeven — see BREAKEVEN_CHECK.

/** Straight-line depreciation is the convention; tool life is 5–7 years. */
export const DEPRECIATION_YEARS = 5

// Variable cost and fixed operating cost both fall steeply at older nodes:
// fewer layers, no EUV, cheaper chemistry, fewer staff per wafer. Using
// leading-edge figures for a mature fab produced a 73% loss on every wafer,
// which is not a finding about mature nodes — it is a modelling error.
export const FAB_PRESETS = [
  { id: 'n2', name: '2 nm fab', capexUsd: 28e9, wspm: 50000, waferPriceUsd: 30000,
    variablePerWaferUsd: 2400, fixedOpexPerWaferOfCapacity: 1500, ageYears: 0,
    note: 'The most expensive object most companies will ever build, for the same wafer output as the node before it.' },
  { id: 'n3', name: '3 nm fab', capexUsd: 20e9, wspm: 50000, waferPriceUsd: 20000,
    variablePerWaferUsd: 1900, fixedOpexPerWaferOfCapacity: 1300, ageYears: 0,
    note: 'The current volume leading edge. Capex works out at roughly $400,000 per wafer of monthly capacity.' },
  { id: 'n7', name: '7 nm fab', capexUsd: 12e9, wspm: 50000, waferPriceUsd: 10000,
    variablePerWaferUsd: 1200, fixedOpexPerWaferOfCapacity: 900, ageYears: 3,
    note: 'Leading-edge economics without the EUV tool count that dominates the newer nodes.' },
  { id: 'mature', name: 'Mature-node fab', capexUsd: 4e9, wspm: 40000, waferPriceUsd: 3000,
    variablePerWaferUsd: 700, fixedOpexPerWaferOfCapacity: 400, ageYears: 8,
    note: 'Where most of the world\'s chips are actually made — and fully depreciated, which is the entire reason it can compete on price.' },
]

/**
 * Cost per wafer, built up the way a fab controller builds it.
 *
 * Fixed costs do not care how many wafers you run; variable costs are per
 * wafer. Divide the fixed pool by however many wafers you actually started and
 * you get the number that moves the whole industry.
 */
export function costPerWafer({
  capexUsd, wspm, utilisation,
  depreciationYears = DEPRECIATION_YEARS,
  ageYears = 0,
  fixedOpexPerMonthUsd = null,
  fixedOpexPerWaferOfCapacity = 1300,
  variablePerWaferUsd = 1900,
}) {
  const wafers = wspm * utilisation
  // Once the tools are written off the capital charge simply stops. This is
  // the first question anyone asks about a fab's economics and the model had
  // no way to express it: a fully depreciated fab and a new one running the
  // identical process have completely different cost structures, which is why
  // mature nodes compete on price and why a node's margin climbs for years
  // after the process stops changing.
  const depreciating = ageYears < depreciationYears
  const depPerMonth = depreciating ? capexUsd / (depreciationYears * 12) : 0
  // Labour, facilities, maintenance contracts and site overhead. Scales with
  // the size of the fab rather than with what it produces.
  // Labour, facilities, maintenance contracts and site overhead — about
  // $1,300 per wafer of installed capacity per month for a leading-edge fab,
  // which is a few thousand staff plus the power and water bill. It scales
  // with how big the fab is, not with how much it makes.
  const fixedOpex = fixedOpexPerMonthUsd ?? wspm * fixedOpexPerWaferOfCapacity
  const fixedTotal = depPerMonth + fixedOpex
  const depPerWafer = wafers > 0 ? depPerMonth / wafers : Infinity
  const fixedPerWafer = wafers > 0 ? fixedTotal / wafers : Infinity
  return {
    wafers, depPerMonth, fixedOpex, fixedTotal,
    depPerWafer, fixedPerWafer,
    variablePerWafer: variablePerWaferUsd, depreciating, ageYears, depreciationYears,
    total: fixedPerWafer + variablePerWaferUsd,
    depShare: fixedPerWafer + variablePerWaferUsd > 0
      ? depPerWafer / (fixedPerWafer + variablePerWaferUsd) : 0,
  }
}

/** Gross margin at a given wafer price and utilisation. */
export function fabMargin({ capexUsd, wspm, utilisation, waferPriceUsd, ...rest }) {
  const c = costPerWafer({ capexUsd, wspm, utilisation, ...rest })
  const revenue = c.wafers * waferPriceUsd
  const cost = c.wafers * c.total
  return {
    ...c, waferPriceUsd, revenue, cost,
    grossUsd: revenue - cost,
    grossMargin: revenue > 0 ? (revenue - cost) / revenue : 0,
  }
}

/**
 * Breakeven utilisation — the number a fab executive actually manages to.
 *
 *   utilisation* = fixed cost per month / ((price − variable) × capacity)
 *
 * Below it the fab loses money however well it is run, because the
 * depreciation arrives whether or not the tools do anything.
 */
export function breakevenUtilisation({ waferPriceUsd, variablePerWaferUsd = 1900, ...rest }) {
  const { wspm } = rest
  const c = costPerWafer({ utilisation: 1, variablePerWaferUsd, ...rest })
  const contribution = waferPriceUsd - variablePerWaferUsd
  if (contribution <= 0) return Infinity
  return c.fixedTotal / (contribution * wspm)
}

/**
 * A validation, and the gap in it is the interesting part.
 *
 * TSMC reported gross margins in the low-to-mid sixties through 2025 and 2026.
 * This model, given published capex and wafer prices, produces about 50% for a
 * BRAND-NEW leading-edge fab running flat out. Those are not in conflict — they
 * are the same fact seen twice.
 *
 * A company's margin is the blend across its whole fleet, and most of that
 * fleet is partly or entirely depreciated. A fab that opened last year is
 * carrying its full capital charge and is therefore the WORST margin in the
 * building; the ones that paid for themselves years ago are carrying the
 * average up. It is why a foundry's margin on a node climbs as the node
 * matures without anything about the process improving, and why TSMC has said
 * its overseas expansion may dilute gross margin by two to three points — new
 * fabs dilute by construction.
 *
 * So the check is directional rather than exact: a new fab must land clearly
 * below the reported fleet margin, and not absurdly below it.
 */
export const MARGIN_CHECK = {
  source: 'tsmc',
  fleetReported: [0.60, 0.67],
  note: 'TSMC reported roughly 60–67% gross margin across 2025–26, blended over a fleet in which much of the capacity is already depreciated.',
  expectation: 'A single new leading-edge fab at full utilisation should sit well below that — around half — because it is carrying its entire capital charge and nothing else is subsidising it.',
}

/** What the money actually goes on, per wafer, at a given utilisation. */
export function costStack(args) {
  const c = costPerWafer(args)
  const opexPerWafer = c.fixedPerWafer - c.depPerWafer
  return [
    { k: 'Depreciation', v: c.depPerWafer, fixed: true,
      what: 'The building and the tools, spread over five years. It arrives whether the fab runs or not, and it is usually the largest single line.' },
    { k: 'Fixed operating', v: opexPerWafer, fixed: true,
      what: 'Labour, facilities, maintenance contracts, site overhead. Scales with the size of the fab, not with what it produces.' },
    { k: 'Materials and gases', v: args.variablePerWaferUsd ?? 1900, fixed: false,
      what: 'Blank wafers, chemicals, process gases, energy, consumable parts. The only part that genuinely falls when you run fewer wafers.' },
  ]
}
