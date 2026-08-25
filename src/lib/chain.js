// Mass and energy balance, worked backwards from the die.
//
// Forward is the wrong direction. Nobody starts with a tonne of rock and asks
// what falls out; they start with a chip they have to ship and ask what it
// costs to feed the line. So the chain runs in reverse: die mass, then divide
// by each stage's yield to find what had to go in.
//
// Every loss factor is a published rough figure and they vary by producer.
// The point is the shape — about seven grams of rock per gram of packaged die
// — not any single number.

import { CHAIN } from '../data/sand.js'

export const SI_DENSITY = 2.329          // g/cm³
export const WAFER_THICKNESS_UM = 775

/** Mass of one polished wafer, in grams. */
export function waferMass(diaMm, thicknessUm = WAFER_THICKNESS_UM) {
  const rCm = diaMm / 20                 // mm diameter → cm radius
  const tCm = thicknessUm / 10000
  return Math.PI * rCm * rCm * tCm * SI_DENSITY
}

/**
 * Walk the chain backwards from one good die to the quartzite that fed it.
 *
 * @param cfg  die geometry and yield config, shared with the rest of the site
 * @param yieldResult  output of computeRun — supplies good dies per wafer
 */
export function traceBack(cfg, yieldResult) {
  const wafer = waferMass(cfg.waferDia)
  const good = yieldResult?.goodDies || 0
  if (good <= 0) return { ok: false, wafer, dieMass: 0, stages: [], quartzite: 0, energy: 0 }

  // Silicon charged to the wafer, divided over the dies that actually ship.
  // The unused wafer area is not recoverable, so it belongs to the survivors.
  const dieMass = wafer / good

  // From the die end backwards: each stage's lossFactor says how much input
  // mass one unit of its output required.
  const idx = CHAIN.findIndex((s) => s.id === 'die')
  let mass = dieMass
  const stages = []
  for (let i = idx; i >= 0; i--) {
    const s = CHAIN[i]
    mass = mass * s.lossFactor
    stages.unshift({ id: s.id, name: s.name, massG: mass, purity: s.purity })
  }

  const quartzite = stages[0].massG

  // Energy is charged on the mass entering each stage, since that is what the
  // furnace, reactor or scanner actually has to process.
  let energy = 0
  for (let i = 0; i < CHAIN.length; i++) {
    const st = stages.find((x) => x.id === CHAIN[i].id)
    energy += (st.massG / 1000) * CHAIN[i].energyKwhPerKg
  }

  return { ok: true, wafer, dieMass, stages, quartzite, energy, goodDies: good }
}

/** Impurity concentration expressed the way the industry says it out loud. */
export function nines(purity) {
  if (purity >= 1) return '∞'
  const n = -Math.log10(1 - purity)
  return `${n.toFixed(0)}N`
}

export function impurityPpb(purity) {
  return (1 - purity) * 1e9
}

export function grams(g) {
  if (!Number.isFinite(g) || g <= 0) return '—'
  if (g >= 1e6) return `${(g / 1e6).toFixed(2)} t`
  if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`
  if (g >= 1) return `${g.toFixed(2)} g`
  if (g >= 0.001) return `${(g * 1000).toFixed(1)} mg`
  return `${(g * 1e6).toFixed(0)} µg`
}
