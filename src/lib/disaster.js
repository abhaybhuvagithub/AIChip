// What happens when a fab stops.
//
// The discipline tab argues that failure is certain and the goal is to make it
// detectable, contained and recoverable. This is the other half: what
// "recoverable" actually costs, which is routinely underestimated by people
// outside the industry — and by some inside it.
//
// THE NON-OBVIOUS PART. A fab is a pipeline roughly three months deep. When it
// stops you do not lose the days it was down; you lose those days PLUS however
// long it takes to refill a pipeline that is now partly empty. After a full
// restart the first wafer emerges one cycle time later, and nothing anyone does
// makes that faster. Downtime is the small number.
//
// Every case below is documented, dated and sourced. They are not scenarios.

/**
 * Recovery from a disruption.
 *
 * Two clocks run and the slower one wins:
 *   • REFILL   — surviving work in progress drains out, and whatever was
 *                destroyed must be restarted and cross the whole line again.
 *   • REBUILD  — damaged tools must be procured, installed and requalified,
 *                and lead times run to quarters rather than weeks.
 *
 * Modelling only the downtime is the error that makes a fire look survivable.
 */
export function recovery({
  wafersPerDay, cycleTimeDays, waferPriceUsd,
  downtimeDays, wipLossFraction, toolLeadDays = 0,
}) {
  const wip = wafersPerDay * cycleTimeDays
  const wipDestroyed = wip * wipLossFraction

  const refillDays = downtimeDays + wipLossFraction * cycleTimeDays
  const rebuildDays = downtimeDays + toolLeadDays
  const daysToFull = Math.max(refillDays, rebuildDays)

  // Output is zero while down, then climbs as the line refills. Treated as a
  // linear ramp, which is optimistic — real restarts are lumpier than this.
  const lostFromDowntime = wafersPerDay * downtimeDays
  const lostFromRamp = wafersPerDay * (daysToFull - downtimeDays) * 0.5
  const wafersLost = lostFromDowntime + lostFromRamp + wipDestroyed

  return {
    wip, wipDestroyed, refillDays, rebuildDays, daysToFull,
    wafersLost, revenueLostUsd: wafersLost * waferPriceUsd,
    bindingConstraint: rebuildDays > refillDays ? 'tool replacement' : 'refilling the line',
    downtimeShare: daysToFull > 0 ? downtimeDays / daysToFull : 0,
  }
}

/** Output as a fraction of normal, day by day, for the chart. */
export function recoveryCurve(args, horizonDays) {
  const r = recovery(args)
  const out = []
  for (let d = 0; d <= horizonDays; d++) {
    let f
    if (d < args.downtimeDays) f = 0
    else if (d >= r.daysToFull) f = 1
    else f = (d - args.downtimeDays) / Math.max(1, r.daysToFull - args.downtimeDays)
    out.push({ day: d, output: f })
  }
  return out
}

/**
 * Event classes, sorted by what they destroy — which decides recovery far more
 * than how dramatic the event looked.
 */
export const EVENTS = [
  {
    id: 'power', name: 'Power interruption', icon: 'power',
    downtimeDays: 3, wipLossFraction: 0.85, toolLeadDays: 0,
    what: 'Seconds without power ruins whatever was mid-process across the entire fab. The tools are usually fine; the work inside them is not.',
    why: 'Nearly all the damage is work in progress, so the fab restarts within days and then produces almost nothing for most of a cycle time while the pipeline refills.',
  },
  {
    id: 'contamination', name: 'Material contamination', icon: 'wetbench',
    downtimeDays: 2, wipLossFraction: 0.35, toolLeadDays: 0,
    what: 'A bad batch of chemistry reaches the line and is invisible until yield deviates downstream. Everything processed since has to be scrapped.',
    why: 'Recoverable: the lost output is usually made up the following quarter. The damage is a quarter of revenue moved rather than destroyed.',
  },
  {
    id: 'fire', name: 'Cleanroom fire', icon: 'foundry',
    downtimeDays: 30, wipLossFraction: 1.0, toolLeadDays: 70,
    what: 'A tool ignites. Even a small burned area contaminates the cleanroom and destroys equipment, and the fab is shut while it is cleaned, rebuilt and requalified.',
    why: 'Tool replacement sets the schedule, not the fire. Procurement, installation and qualification run for months after the flames are out.',
  },
  {
    id: 'quake', name: 'Earthquake', icon: 'metrology',
    downtimeDays: 5, wipLossFraction: 0.6, toolLeadDays: 20,
    what: 'Seismic interlocks stop every tool, wafers in motion are lost, and all equipment must be re-levelled and requalified before it can run again.',
    why: 'Requalification is the long pole. A scanner that has moved by microns is not a scanner until it has been proven to be one again.',
  },
  {
    id: 'cyber', name: 'Cyber incident', icon: 'ipsec',
    downtimeDays: 3, wipLossFraction: 0.3, toolLeadDays: 0,
    what: 'Malware reaches the tool network. Production halts because the machines cannot be controlled, not because anything is damaged.',
    why: 'Short if the backups are clean and the network is segmented. The cost is almost entirely lost output rather than lost equipment.',
  },
  {
    id: 'supply', name: 'Single-source supply cut', icon: 'materials',
    downtimeDays: 0, wipLossFraction: 0, toolLeadDays: 60,
    what: 'A chemical, gas or component with one qualified supplier stops arriving. The fab runs until the safety stock is gone, then stops.',
    why: 'Nothing is damaged and the fab still cannot run. Qualifying a second source takes months, which is why it must be done before it is needed.',
  },
]

/**
 * Real events, each chosen because it teaches something different about
 * recovery. Figures come from company statements, regulatory filings and
 * contemporaneous reporting.
 */
export const CASES = [
  {
    id: 'renesas', name: 'Renesas Naka fire', date: 'March 2021', icon: 'foundry',
    source: 'renesas2021',
    what: 'Plating equipment ignited from an overcurrent at 2:47 am and burned for five and a half hours. Roughly 600 m² — about 5% of the cleanroom floor — and some 2% of the fab\u2019s equipment were damaged.',
    recovery: 'Production resumed on 17 April, four weeks later, reached 88% of pre-fire capacity by the end of May, and took around 100 days to restore fully — paced by the delivery and start-up of replacement tools rather than by the fire itself.',
    cost: 'Renesas put lost production at about ¥17 billion a month. Ford told the SEC that the automotive shortage might not be fully resolved until 2022 as a result.',
    lesson: 'This building made roughly 0.2% of the world\u2019s 300 mm wafers, and a carmaker on another continent wrote it into a quarterly filing. Concentration risk is not about how big a fab is. It is about whether anyone else makes the part.',
  },
  {
    id: 'tsmcresist', name: 'TSMC photoresist contamination', date: 'January 2019', icon: 'wetbench',
    source: 'tsmc2019',
    what: 'A batch of photoresist contained an abnormally treated component that formed a foreign polymer, affecting 12/16 nm wafers at Fab 14B. It was undetectable until yield deviated downstream; reported estimates put the scrapped total near 30,000 wafers.',
    recovery: 'Detected, contained and made up inside a quarter. The scrapped output was re-run and contributed the same $550 million to the following quarter\u2019s revenue.',
    cost: 'About $550 million of first-quarter revenue and 2.6 points of gross margin — but only 0.2 points across the full year.',
    lesson: 'The best-case disaster: tools undamaged, cause identified, output recoverable. It still cost half a billion dollars, and it arrived through a supplier rather than through the fab.',
  },
]

/** What is actually done about it, and what each defence cannot do. */
export const DEFENCES = [
  { k: 'Geographic separation', icon: 'route',
    what: 'Run the same process in fabs on different fault lines, grids and watersheds.',
    limit: 'Expensive, and it only helps if the second fab is qualified for the same product. Capacity nobody has qualified is not capacity.' },
  { k: 'Dual sourcing', icon: 'materials',
    what: 'Qualify a second supplier for every critical material before you need one.',
    limit: 'Qualification takes months to years, so it must be done in advance for things that may never fail. It is insurance, and it gets cut like insurance.' },
  { k: 'Safety stock', icon: 'die',
    what: 'Hold weeks of material and finished goods so a short interruption never reaches the customer.',
    limit: 'Working capital sitting still, on parts that may be obsolete before they are used.' },
  { k: 'Power and seismic hardening', icon: 'power',
    what: 'Isolated tool mounts, uninterruptible supplies, on-site generation, water recycling and storage.',
    limit: 'Reduces damage, never to zero. A ride-through system sized for seconds does not cover an hour.' },
  { k: 'Network segmentation', icon: 'ipsec',
    what: 'Keep the tool network separate from everything else and treat every incoming tool as untrusted.',
    limit: 'Tools arrive with vendor software and need vendor access. The attack surface is a business requirement.' },
  { k: 'A practised restart', icon: 'prober',
    what: 'Know in advance, in writing, the order in which the line comes back and what gets requalified first.',
    limit: 'The cheapest defence here and the easiest to skip, because it produces nothing at all until the day it is needed.' },
]
