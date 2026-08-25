// Two calculations underpin the 3D tab.
//
// The first is footprint: what each architecture does to standard-cell area.
// The figures in ARCH are relative claims from vendor and imec publications,
// normalised to planar at iso-node, and they are approximate by nature — the
// point is the ratio between generations, not any single digit.
//
// The second is the wall. Stacking multiplies transistors per unit of
// footprint, and it multiplies power per unit of footprint by the same factor,
// while the surface available to remove heat stays exactly the same. That is
// arithmetic, not engineering pessimism, and it is why 3D logic stacking is
// harder than 3D memory stacking: memory is mostly idle, logic is not.

import { ARCH, THERMAL_LIMITS } from '../data/arch3d.js'

/** Relative standard-cell footprint for an architecture, planar = 1. */
export function cellArea(archId) {
  const a = ARCH.find((x) => x.id === archId)
  return a ? a.cellArea : 1
}

/** How much smaller `to` is than `from`, as a percentage reduction. */
export function areaReduction(fromId, toId) {
  const f = cellArea(fromId), t = cellArea(toId)
  return f > 0 ? 1 - t / f : 0
}

/**
 * Stack `tiers` of logic in the same footprint and see what happens.
 *
 * @param areaMm2   footprint of one tier
 * @param wattsTier power of one tier at the given activity
 * @param tiers     how many tiers stacked
 * @param activity  fraction of tiers switching at once — the honest escape
 *                  hatch, since not every tier runs flat out simultaneously
 */
export function stackThermal({ areaMm2, wattsTier, tiers = 1, activity = 1 }) {
  if (!(areaMm2 > 0)) return { ok: false }
  const activeTiers = 1 + (tiers - 1) * activity
  const totalW = wattsTier * activeTiers
  const density = totalW / areaMm2

  // Surface for heat removal does not grow with tiers. That is the whole
  // problem: density scales with tiers, cooling area does not.
  const feasible = THERMAL_LIMITS.filter((l) => l.wPerMm2 >= density)
  const needed = feasible.length ? feasible[0] : null
  const beyondAll = density > THERMAL_LIMITS[THERMAL_LIMITS.length - 1].wPerMm2

  // Effective transistor density gain is the full tier count — heat is what
  // you pay, not what you get.
  return {
    ok: true, tiers, activeTiers, totalW, density, needed, beyondAll,
    densityGain: tiers,
    headroom: needed ? needed.wPerMm2 / density : 0,
  }
}

/** Which cooling approach a given power density requires. */
export function coolingFor(density) {
  return THERMAL_LIMITS.find((l) => l.wPerMm2 >= density) || null
}
