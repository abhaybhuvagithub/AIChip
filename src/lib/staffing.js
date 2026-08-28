// Headcount, derived rather than asserted.
//
// The business tab prices a programme in engineer-years by node. This turns
// the same figure into people, so the two views cannot disagree — change the
// node there and the team here changes with it.
//
// Two adjustments matter. Discipline shares are tilted per project type,
// because an analog power IC and an AI accelerator are not the same team
// wearing different badges. And average headcount is not peak headcount: a
// programme ramps, peaks somewhere in physical design and verification
// closure, then sheds. Quoting the average as though it were the team you need
// to hire understates the peak by roughly half.

import { NODE_COSTS } from './business.js'
import { GROUPS, PROJECTS } from '../data/teams.js'

/**
 * Engineer-years for a node, from the same table the NRE model uses.
 *
 * Returns null rather than 0 for an unknown node. A missing key silently
 * becoming zero is how the automotive MCU archetype came out with a team of
 * nobody — a number that looks like an answer and is actually an absence.
 */
export function engineerYears(node) {
  const n = NODE_COSTS.find((x) => x.node === node)
  return n ? n.engineerYears : null
}

/** Peak is meaningfully above average on any real programme. */
export const PEAK_MULTIPLIER = 1.45

/**
 * Team composition for a project archetype.
 *
 * @param projectId  one of PROJECTS
 * @param scale      multiplier for a larger or smaller programme of that kind
 */
export function staffing(projectId, scale = 1) {
  const p = PROJECTS.find((x) => x.id === projectId) || PROJECTS[1]
  const base = engineerYears(p.node)
  if (base === null) return { project: p, unknownNode: true, groups: [] }
  const years = base * scale
  const avg = years / p.years

  // Tilt the shares, then renormalise so they still sum to one — otherwise a
  // tilted project quietly gains or loses people.
  const tilted = GROUPS.map((g) => ({ g, w: g.share * (p.tilt[g.id] ?? 1) }))
  const total = tilted.reduce((n, t) => n + t.w, 0)

  const groups = tilted.map(({ g, w }) => {
    const share = w / total
    return {
      id: g.id, label: g.label, hue: g.hue, phase: g.phase, what: g.what,
      share,
      avg: avg * share,
      peak: avg * share * PEAK_MULTIPLIER,
      years: years * share,
    }
  }).sort((a, b) => b.avg - a.avg)

  return {
    project: p, engineerYears: years, durationYears: p.years,
    avgHeadcount: avg, peakHeadcount: avg * PEAK_MULTIPLIER,
    groups,
  }
}

/** Cost of the team, at a fully loaded rate. */
export const teamCost = (engineerYearsTotal, perYearUsd = 250000) =>
  engineerYearsTotal * perYearUsd
