// The assistant.
//
// An honest note about what this is, because it matters. This site is a static
// bundle on GitHub Pages: no server, no API key, no network calls at runtime.
// There is nowhere to put a language model. So this is not one.
//
// What it is instead is a grounded query engine over the app's own state. It
// reads the live simulation, the die you configured, the yield model, the
// material chain and the process data, and answers from those. For the
// questions people actually have here — "why is my yield bad", "what is the
// bottleneck", "how much rock is this chip" — that is strictly better than a
// language model would be, because the answers are computed from the thing on
// screen rather than recalled. For open-ended questions it will say it cannot
// help, rather than inventing something.
//
// Every answer carries the numbers it used, so nothing has to be taken on
// trust.

import { computeRun, YIELD_MODELS, RETICLE, fmt } from './fab.js'
import { traceBack, grams } from './chain.js'
import { computeThroughput, ops, DEFAULT_COMPUTE } from './compute.js'
import { journeyTotals } from './journey.js'
import { PROCESS } from '../data/process.js'
import { NODES } from '../data/nodes.js'

const has = (q, ...words) => words.some((w) => q.includes(w))

/**
 * @param q    the question, lowercased
 * @param ctx  { cfg, snap, journey } — live app state
 */
export function ask(q0, ctx) {
  const q = String(q0 || '').toLowerCase().trim()
  if (!q) return null
  const { cfg, snap, journey } = ctx
  const run = computeRun(cfg)
  const area = cfg.dieX * cfg.dieY

  // --- the running line ---------------------------------------------------
  if (has(q, 'bottleneck', 'constraint', 'jam', 'slow')) {
    if (!snap) return { text: 'The fab run is not going yet. Open the Fab run tab and press run, then ask again.', tab: 'run' }
    const m = snap.metrics
    const others = m.groups.filter((g) => g.id !== m.bottleneckId).sort((a, b) => b.util - a.util)[0]
    return {
      text: `${m.bottleneckName} is the constraint, at ${fmt.pct(m.bottleneckUtil)} utilisation with ${m.groups.find((g) => g.id === m.bottleneckId).queued} lots queued. Next busiest is ${others.name} at ${fmt.pct(others.util)}. Adding tools anywhere except the constraint will not raise output — the queue just moves. Scanners cost $${m.groups.find((g) => g.id === 'litho').capex}M each, which is why nobody buys spares and why lithography is usually the thing you are waiting for.`,
      tab: 'run',
    }
  }

  if (has(q, 'cycle time', 'how long', 'x-factor', 'xfactor', 'queue')) {
    if (!snap) return { text: 'Start the fab run and I can read the actual cycle time off the line.', tab: 'run' }
    const m = snap.metrics
    if (m.avgCycleDays <= 0) return { text: `No lot has finished yet — day ${snap.day}, and the route takes about ${fmt.n(m.rawDays, 0)} days of pure process time. Let it run.`, tab: 'run' }
    return {
      text: `Cycle time is ${fmt.n(m.avgCycleDays, 0)} days against ${fmt.n(m.rawDays, 0)} days of actual process time — an X-factor of ${fmt.n(m.xFactor, 2)}. So roughly ${fmt.pct(1 - 1 / m.xFactor, 0)} of a wafer's life here is spent waiting in a queue, not being processed. That is normal; real lines run 2 to 3.`,
      tab: 'run',
    }
  }

  if (has(q, 'excursion', 'went wrong', 'broke', 'down', 'event')) {
    if (!snap) return { text: 'Nothing is running. Start the fab run.', tab: 'run' }
    const m = snap.metrics
    const recent = snap.events.slice(0, 3).map((e) => `day ${fmt.n(e.t / 24, 0)}: ${e.text}`).join('; ')
    return {
      text: `${m.toolsDown} tools are offline and ${m.excursionCount} excursions are running undetected. ${recent ? 'Recently — ' + recent + '.' : 'Nothing has gone wrong yet.'} An excursion keeps damaging wafers until a sampled lot reaches metrology, so the sampling rate decides how many lots get hurt first.`,
      tab: 'run',
    }
  }

  // --- yield --------------------------------------------------------------
  if (has(q, 'yield', 'why is my yield', 'good die', 'dies per wafer')) {
    const worst = area > 400 ? 'die area' : cfg.d0 > 0.15 ? 'defect density' : 'neither area nor defects — this is a healthy configuration'
    return {
      text: `Your ${cfg.dieX} × ${cfg.dieY} mm die is ${fmt.n(area, 0)} mm². That gives ${fmt.n(run.geo.gross)} gross dies per 300 mm wafer, ${fmt.pct(run.dieYield)} die yield under the ${run.modelMeta.label} model at D₀ = ${cfg.d0}, so ${fmt.n(run.goodDies)} good dies. The limiting factor is ${worst}. Halving the die area would roughly quadruple gross dies and raise yield at the same time — area is punished twice.`,
      tab: 'wafer',
    }
  }

  if (has(q, 'cost', 'price', 'margin', 'expensive', 'profit')) {
    return {
      text: `At $${fmt.n(cfg.waferCost)} per processed wafer and ${fmt.n(run.goodDies)} good dies, silicon works out at ${fmt.usd(run.costPerGoodDie)} per shippable part including $${cfg.packageCost} of packaging.${cfg.asp > 0 ? ` Against a ${fmt.usd(cfg.asp)} selling price that is ${fmt.pct(run.margin)} gross margin.` : ' Set a selling price on the Economics tab and I can give you margin.'} Cost per good die, not yield, is what a fab is actually run to — 40% yield on a cheap wafer routinely beats 80% on an expensive one.`,
      tab: 'economics',
    }
  }

  if (has(q, 'model', 'poisson', 'murphy', 'seeds', 'negative binomial', 'clustering')) {
    const rows = Object.entries(YIELD_MODELS)
      .map(([, m]) => `${m.label} ${fmt.pct(m.fn(area / 100, cfg.d0, cfg.alpha))}`).join(', ')
    return {
      text: `On your die at D₀ = ${cfg.d0}: ${rows}. You are using ${run.modelMeta.label}. ${run.modelMeta.note} The spread matters — pick Poisson for a 600 mm² part and you will conclude the product is impossible.`,
      tab: 'wafer',
    }
  }

  if (has(q, 'reticle', 'too big', 'maximum die', 'chiplet')) {
    return {
      text: `The scanner reticle field is ${RETICLE.x} × ${RETICLE.y} mm, so ${RETICLE.area} mm² is the largest single die anyone can print. Yours is ${fmt.n(area, 0)} mm², ${run.reticleFit ? `which fits — ${fmt.pct(area / RETICLE.area, 0)} of the field` : 'which does not fit, so it has to be built as chiplets or stitched'}. Splitting a large die into several small ones and wiring them in the package is not a packaging trick, it is arithmetic: yield falls sharply with area.`,
      tab: 'silicon',
    }
  }

  // --- the journey --------------------------------------------------------
  if (has(q, 'journey', 'travel', 'how many steps', 'path', 'sand to silicon', 'from sand')) {
    const t = journeyTotals(journey)
    return {
      text: `${fmt.n(t.steps)} process steps from quartz rock to a shipped part. ${fmt.n(t.hours)} hours of pure process time — ${fmt.n(t.days, 0)} days — and the wafer travels ${fmt.n(t.km, 1)} km inside the fab on ceiling rails without ever leaving the building. It passes through lithography ${t.lithoVisits} times and peaks at ${t.peakTemp} °C.`,
      tab: 'run',
    }
  }

  if (has(q, 'rock', 'sand', 'quartz', 'how much material', 'mass')) {
    const tr = traceBack(cfg, run)
    if (!tr.ok) return { text: 'That die configuration produces no good dies, so there is nothing to trace back. Shrink it on the Yield lab tab.', tab: 'wafer' }
    return {
      text: `About ${grams(tr.quartzite)} of quartzite per shipped ${cfg.dieX} × ${cfg.dieY} mm die — roughly ${fmt.n(tr.quartzite / tr.dieMass, 1)} grams of rock per gram of silicon that ships, once you account for kerf loss, crucible losses and yield. The die itself is ${grams(tr.dieMass)}. Energy works out around ${fmt.n(tr.energy, 2)} kWh per die, dominated by the fab rather than the material chain.`,
      tab: 'sand',
    }
  }

  if (has(q, 'purity', 'nines', 'pure', 'polysilicon')) {
    return {
      text: 'Quartz arrives about 99% pure and electronic-grade polysilicon leaves at 99.9999999% — one foreign atom per billion. The purification is not done in the furnace: silicon is converted to trichlorosilane, which boils at 32 °C, and a liquid can be fractionally distilled where a metal cannot. The Siemens reactor afterwards only converts material distillation has already cleaned.',
      tab: 'sand',
    }
  }

  // --- compute ------------------------------------------------------------
  if (has(q, 'tops', 'flops', 'throughput', 'compute', 'performance', 'precision')) {
    const c = { ...DEFAULT_COMPUTE, ...(cfg.compute || {}) }
    const th = computeThroughput(cfg, c, run)
    return {
      text: `Your die at ${c.density} MTr/mm² and ${c.clockGHz} GHz delivers about ${ops(th.opsPerDie)} peak at ${th.prec.label}, ${ops(th.achieved)} at realistic utilisation. A whole wafer of them is ${ops(th.opsPerWafer)}. Note that dropping from FP64 to FP4 multiplies the headline figure by 64 without changing a single transistor — that is most of why accelerator throughput outran Moore's law.`,
      tab: 'compute',
    }
  }

  // --- process explanations ----------------------------------------------
  //
  // Two guards here, both learned the hard way. Bare substring matching made
  // "write me a poem about wafers" look like a request to explain the wafer
  // slicing step — it contains "wafer". So a lookup must (a) be shaped like a
  // question about a thing, and (b) match on a word boundary rather than
  // anywhere inside another word.
  const wants = /\b(what (is|are|does)|explain|define|tell me about|how does)\b/.test(q)
  const word = (needle) => new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q)

  if (wants) {
    const step = PROCESS.find((p) => word(p.name.toLowerCase()) || word(p.id))
    if (step) {
      return { text: `${step.name}: ${step.one} ${step.what} ${step.physics}`, tab: 'line' }
    }
    const node = NODES.find((n) => word(n.node.toLowerCase().replace(' ', '')))
    if (node) {
      return { text: `${node.node}, around ${node.year}. ${node.arch}, patterned with ${node.litho}. ${node.note}`, tab: 'nodes' }
    }
  }

  if (has(q, 'euv', 'lithography', 'scanner', 'litho')) {
    return {
      text: 'EUV runs at 13.5 nm in a vacuum, off mirrors, because no material transmits it usefully — including air. Immersion DUV runs 193 nm through water at NA 1.35 and bottoms out near 38 nm half-pitch, so finer pitches need the pattern split across two, three or four masks. One company on Earth makes EUV scanners, at roughly $200M each, and that fact explains more about semiconductor geopolitics than any other.',
      tab: 'line',
    }
  }

  if (has(q, 'what can you', 'help', 'who are you', 'what are you')) {
    return {
      text: 'I read this app\'s live state and answer from it. Try: what is the bottleneck, why is my yield low, what does this cost per die, how much rock does one chip take, how many steps is the journey, what is CMP, what is EUV, how many TOPS. I am not a language model and there is no server behind this page — every answer is computed from the numbers currently on screen. If I do not recognise a question I will say so rather than guess.',
    }
  }

  return null
}

export const SUGGESTIONS = [
  'What is the bottleneck?',
  'Why is my yield low?',
  'How many steps from sand to silicon?',
  'What does one die cost?',
  'How much rock per chip?',
  'What is CMP?',
]
