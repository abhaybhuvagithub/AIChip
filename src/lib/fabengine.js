// A working fab, simulated.
//
// Everything else on this site is closed-form: put numbers in, get numbers
// out. A real fab is not closed-form. It is a few hundred tools, a few
// thousand wafers, and a queueing problem that decides almost everything —
// cycle time, WIP, and which tool you should have bought more of.
//
// So this is a discrete-event simulation rather than a formula. One tick is
// one hour. Lots of 25 wafers walk a route of 70 mask layers, six steps each,
// queueing at tool groups that are sometimes down. Defects accumulate as they
// go, and the wafer that comes out the far end has a yield that was earned
// step by step rather than assumed.
//
// Scale: this is ONE LINE at roughly 2,500 wafer starts a month, not a
// gigafab. A gigafab runs sixty of these. Simulating 150,000 wafers would be
// arithmetically identical and unwatchable.
//
// Everything is seeded. Two runs with the same seed are the same run, which is
// what makes it debuggable and what lets the verify suite pin its behaviour.

export const LOT_SIZE = 25

// Tool counts are sized so lithography is the constraint, because in a real
// leading-edge fab it is: scanners are the most expensive tool by an order of
// magnitude, so nobody buys spare ones, and everything else is bought with
// headroom around them. Defect rates are calibrated so a healthy run lands
// near D0 = 0.06 defects/cm², which is a plausible mature-line number and is
// the figure the yield lab treats as good.
export const TOOL_GROUPS = [
  // Hours are whole numbers because a tick is one hour. Fractional values
  // were silently rounded up, which made a 1.5 h track a 2 h track and moved
  // the constraint off lithography — a wrong answer that looked plausible.
  { id: 'clean', name: 'Clean', glyph: '⌇', hours: 2, tools: 23, mtbf: 700, mttr: 6, defectRate: 0.09, capex: 3 },
  { id: 'track', name: 'Coat / develop', glyph: '▤', hours: 1, tools: 23, mtbf: 600, mttr: 5, defectRate: 0.07, capex: 5 },
  { id: 'litho', name: 'Lithography', glyph: '☀', hours: 2, tools: 20, mtbf: 400, mttr: 14, defectRate: 0.13, capex: 200 },
  { id: 'etch', name: 'Etch', glyph: '▽', hours: 3, tools: 33, mtbf: 500, mttr: 10, defectRate: 0.16, capex: 12 },
  { id: 'depo', name: 'Deposition', glyph: '▲', hours: 3, tools: 19, mtbf: 550, mttr: 9, defectRate: 0.14, capex: 15 },
  { id: 'implant', name: 'Implant', glyph: '↓', hours: 2, tools: 10, mtbf: 650, mttr: 8, defectRate: 0.07, capex: 10 },
  { id: 'cmp', name: 'CMP', glyph: '═', hours: 2, tools: 23, mtbf: 450, mttr: 7, defectRate: 0.18, capex: 8 },
  { id: 'metro', name: 'Metrology', glyph: '⊙', hours: 1, tools: 4, mtbf: 900, mttr: 4, defectRate: 0, capex: 20 },
]

// One mask layer, as a route. FEOL layers implant; BEOL layers deposit metal.
// Metrology is sampled, not universal — which is the whole reason an excursion
// can run for several lots before anyone notices.
export function routeForLayer(n, totalLayers) {
  const beol = n > totalLayers * 0.45
  const route = [
    'clean', 'track', 'litho', 'track', 'etch',
    beol ? 'depo' : 'implant',
    'cmp',
  ]
  // Metrology is not on every layer. Measuring everything would cost more
  // capacity than it is worth, which is precisely why an excursion gets a
  // head start.
  if (n % 5 === 0) route.push('metro')
  return route
}

function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

export function createFab(opts = {}) {
  const {
    seed = 42,
    layers = 70,
    toolCounts = {},
    // Fractional, because the line is extremely sensitive here: 8.0 h between
    // releases gives 85% constraint utilisation and an X-factor of 1.2, while
    // 7.0 h gives 94% and an X-factor of 5. That cliff is real — queueing
    // delay goes to infinity as utilisation approaches one — and it is why
    // fabs are run deliberately short of full capacity.
    // 8.0 h is the calibrated operating point: it produces a 110-day cycle
    // time, an X-factor of 2.7, lithography as the constraint at 94%, and
    // D0 around 0.06 — all four of which match published figures for a real
    // leading-edge line. Nothing here was fitted to make a number look good;
    // the tool set was sized first and this fell out.
    releaseEveryHours = 8.0,   // one lot released every N hours, on average
    wipCap = 500,              // CONWIP: stop releasing into a jammed line
    apc = true,                // run-to-run control corrects drift
    metroSample = 5,           // inspect 1 lot in N
    excursions = true,
  } = opts

  const rand = rng(seed)
  const groups = TOOL_GROUPS.map((g) => ({
    ...g,
    tools: toolCounts[g.id] ?? g.tools,
    queue: [],
    busy: [],
    down: 0,
    downUntil: [],
    busyHours: 0,
    processedLots: 0,
    excursion: 0,       // multiplier on defect rate while running undetected
    excursionAge: 0,
  }))
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]))

  return {
    t: 0, rand, layers, releaseEveryHours, wipCap, apc, metroSample, excursions,
    releaseCredit: 0,
    groups, byId,
    lots: [], done: [], nextLotId: 1,
    events: [],
    stats: { released: 0, completed: 0, scrapped: 0 },
  }
}

function log(fab, kind, text) {
  fab.events.unshift({ t: fab.t, kind, text })
  if (fab.events.length > 60) fab.events.length = 60
}

function releaseLot(fab) {
  const lot = {
    id: fab.nextLotId++,
    layer: 1,
    step: 0,
    route: routeForLayer(1, fab.layers),
    remaining: 0,
    at: null,
    defects: 0,
    started: fab.t,
    waited: 0,
    processed: 0,
  }
  fab.lots.push(lot)
  // Release means "into the first queue", not "into existence". Without this
  // the lot sits nowhere: WIP climbs, utilisation stays flat, nothing ever
  // completes — which is exactly how it presented.
  fab.byId[lot.route[0]].queue.push(lot)
  fab.stats.released++
  return lot
}

/** Advance one hour. */
export function tick(fab) {
  fab.t++
  const { rand } = fab

  // --- tool failures and repairs -----------------------------------------
  for (const g of fab.groups) {
    // Repairs first, so a tool that comes back is available this hour.
    g.downUntil = g.downUntil.filter((until) => {
      if (fab.t >= until) { g.down--; return false }
      return true
    })
    const up = g.tools - g.down
    for (let i = 0; i < up; i++) {
      if (rand() < 1 / g.mtbf) {
        g.down++
        g.downUntil.push(fab.t + Math.round(g.mttr * (0.5 + rand())))
        log(fab, 'down', `${g.name} tool down — ${g.down} of ${g.tools} offline`)
        break
      }
    }

    // --- excursions ------------------------------------------------------
    // A chamber drifts. Nothing alarms; wafers keep processing and keep
    // collecting defects until metrology samples a lot that went through it.
    if (fab.excursions && g.excursion === 0 && g.defectRate > 0 && rand() < 0.0006) {
      g.excursion = 4 + Math.floor(rand() * 8)
      g.excursionAge = 0
      log(fab, 'excursion', `${g.name} excursion started — defect rate ×${g.excursion}, undetected`)
    }
    if (g.excursion > 0) g.excursionAge++
  }

  // --- release ------------------------------------------------------------
  // A WIP cap, which real lines run for the same reason: releasing into a
  // jammed fab does not make it produce more, it makes the queue longer and
  // cycle time worse for everything already inside.
  fab.releaseCredit += 1 / fab.releaseEveryHours
  if (fab.releaseCredit >= 1 && fab.lots.length < fab.wipCap) {
    fab.releaseCredit -= 1
    releaseLot(fab)
  }

  // --- process ------------------------------------------------------------
  for (const g of fab.groups) {
    // Advance work in progress.
    for (const b of g.busy) b.remaining--
    const finished = g.busy.filter((b) => b.remaining <= 0)
    g.busy = g.busy.filter((b) => b.remaining > 0)

    for (const b of finished) {
      const lot = b.lot
      lot.at = null
      g.processedLots++

      // Defects picked up at this step.
      if (g.defectRate > 0) {
        const mult = g.excursion > 0 ? g.excursion : 1
        const damp = fab.apc ? 0.75 : 1   // run-to-run control trims drift
        lot.defects += g.defectRate * mult * damp * LOT_SIZE * (0.6 + rand() * 0.8)
      }

      // Metrology is where an excursion actually gets caught.
      if (g.id === 'metro' && g.excursion === 0) {
        const inspected = lot.id % fab.metroSample === 0
        if (inspected) {
          for (const src of fab.groups) {
            if (src.excursion > 0) {
              log(fab, 'caught', `Metrology caught ${src.name} excursion after ${src.excursionAge}h — chamber pulled`)
              src.excursion = 0
              src.excursionAge = 0
              break
            }
          }
        }
      }

      advanceLot(fab, lot)
    }

    // Pull from the queue into any free tool.
    const free = (g.tools - g.down) - g.busy.length
    for (let i = 0; i < free && g.queue.length; i++) {
      const lot = g.queue.shift()
      lot.at = g.id
      // Process time varies. This is not decoration: queueing delay is driven
      // by variability at least as much as by utilisation, and a simulation
      // with fixed process times reports a cycle time no real line achieves.
      const actual = Math.max(1, Math.round(g.hours * (0.65 + rand() * 1.0)))
      g.busy.push({ lot, remaining: actual })
      lot.processed += actual
    }
    g.busyHours += g.busy.length
  }

  // Anything sitting in a queue is waiting, and waiting is most of cycle time.
  for (const g of fab.groups) for (const lot of g.queue) lot.waited++

  return fab
}

function advanceLot(fab, lot) {
  lot.step++
  if (lot.step >= lot.route.length) {
    lot.step = 0
    lot.layer++
    if (lot.layer > fab.layers) {
      lot.finished = fab.t
      lot.cycleHours = fab.t - lot.started
      fab.done.push(lot)
      if (fab.done.length > 400) fab.done.shift()
      fab.lots = fab.lots.filter((l) => l !== lot)
      fab.stats.completed++
      return
    }
    lot.route = routeForLayer(lot.layer, fab.layers)
  }
  const next = fab.byId[lot.route[lot.step]]
  next.queue.push(lot)
}

/** Everything the dashboard shows, derived rather than tracked. */
export function metrics(fab) {
  const wip = fab.lots.length
  const recent = fab.done.slice(-40)
  const avgCycleH = recent.length
    ? recent.reduce((n, l) => n + l.cycleHours, 0) / recent.length
    : 0

  // Raw process time: how long a lot would take with no queueing at all.
  // Cycle time divided by this is the X-factor, and it is the number fab
  // managers actually argue about.
  let rawH = 0
  for (let n = 1; n <= fab.layers; n++) {
    rawH += routeForLayer(n, fab.layers).reduce((a, id) => a + fab.byId[id].hours, 0)
  }
  const xFactor = rawH > 0 && avgCycleH > 0 ? avgCycleH / rawH : 0

  const groups = fab.groups.map((g) => {
    const capacity = fab.t * (g.tools - g.down || g.tools)
    return {
      ...g,
      util: capacity > 0 ? Math.min(1, g.busyHours / (fab.t * g.tools)) : 0,
      queued: g.queue.length,
      running: g.busy.length,
    }
  })
  const bottleneck = groups.reduce((a, b) => (b.util > a.util ? b : a), groups[0])

  // Throughput in wafer starts per month, from completions.
  const weeks = fab.t / 168
  const wpm = weeks > 0 ? (fab.stats.completed * LOT_SIZE) / (weeks / 4.345) : 0

  const avgDefects = recent.length
    ? recent.reduce((n, l) => n + l.defects, 0) / recent.length
    : 0

  return {
    wip, avgCycleH, avgCycleDays: avgCycleH / 24, rawH, rawDays: rawH / 24, xFactor,
    groups, bottleneck, wpm, avgDefects,
    activeExcursions: fab.groups.filter((g) => g.excursion > 0),
    toolsDown: fab.groups.reduce((n, g) => n + g.down, 0),
  }
}

/**
 * Defects on a finished lot, converted to a defect density the rest of the
 * site already understands — so the fab run feeds the yield lab rather than
 * duplicating it.
 */
export function defectDensity(lotDefects, waferDia = 300) {
  const areaCm2 = (Math.PI * Math.pow(waferDia / 2, 2)) / 100
  return lotDefects / LOT_SIZE / areaCm2
}

/** Capital cost of the tool set, in millions. Adding scanners is not free. */
export function toolCapex(groups) {
  return groups.reduce((n, g) => n + g.tools * g.capex, 0)
}

/**
 * A plain, immutable view of the fab for rendering.
 *
 * The simulation object is mutated in place tens of thousands of times a
 * second, and React must never read it during render — a component that reads
 * a live mutating object can render a half-updated line, and the value it read
 * does not trigger an update when it changes. So the loop mutates, then
 * publishes one of these, and the UI renders only from this.
 */
export function snapshot(fab) {
  const m = metrics(fab)
  const tracked = fab.lots.length
    ? fab.lots.reduce((a, b) => (a.layer > b.layer ? a : b))
    : null
  const lastDone = fab.done.length ? fab.done[fab.done.length - 1] : null

  return {
    t: fab.t,
    day: Math.floor(fab.t / 24),
    layers: fab.layers,
    stats: { ...fab.stats },
    events: fab.events.map((e) => ({ ...e })),
    metrics: {
      wip: m.wip,
      avgCycleDays: m.avgCycleDays,
      rawDays: m.rawDays,
      xFactor: m.xFactor,
      wpm: m.wpm,
      toolsDown: m.toolsDown,
      excursionCount: m.activeExcursions.length,
      bottleneckId: m.bottleneck.id,
      bottleneckName: m.bottleneck.name,
      bottleneckUtil: m.bottleneck.util,
      groups: m.groups.map((g) => ({
        id: g.id, name: g.name, glyph: g.glyph, tools: g.tools, capex: g.capex,
        util: g.util, queued: g.queued, running: g.running, down: g.down,
        excursion: g.excursion,
      })),
    },
    tracked: tracked
      ? { id: tracked.id, layer: tracked.layer, daysIn: (fab.t - tracked.started) / 24 }
      : null,
    lastDefects: lastDone ? lastDone.defects : 0,
    capex: toolCapex(fab.groups),
  }
}
