// Every step, in order, from rock to shipped part.
//
// The fab-run simulation models eight tool groups because that is what governs
// queueing. This file is the other view: the actual itinerary of one wafer,
// step by step, all ~520 of them. Nothing is aggregated. If a wafer goes
// through lithography seventy times, this lists it seventy times, because the
// repetition is the single most surprising thing about the process and
// summarising it away is what every diagram of chipmaking gets wrong.
//
// Distances are the wafer's own travel inside the fab. A pod moves on ceiling
// rails between tools, and over a full route that adds up to several
// kilometres without the wafer ever leaving the building.

import { CHAIN } from '../data/sand.js'

export const PHASES = {
  material: { label: 'Material', hue: '#8ea2c0', note: 'Rock to a polished mirror.' },
  feol: { label: 'Front end', hue: '#ffb020', note: 'Building the transistors.' },
  beol: { label: 'Back end', hue: '#a679ff', note: 'Wiring them together.' },
  assembly: { label: 'Assembly and test', hue: '#f6685e', note: 'Cut, package, prove, ship.' },
}

// What each fab step actually does, with the physical conditions. These repeat
// per layer, which is the point.
const FAB_STEPS = {
  clean: {
    name: 'Pre-clean', tool: 'Single-wafer cleaner', hours: 2, temp: 25, distance: 22,
    what: 'Ammonia and peroxide lift organics, hydrochloric and peroxide take metals, dilute HF strips native oxide. The surface has to be atomically clean before anything is grown or printed on it.',
  },
  coat: {
    name: 'Resist coat', tool: 'Coater track', hours: 1, temp: 110, distance: 14,
    what: 'Photoresist is dispensed at the wafer centre and spun to a uniform film tens of nanometres thick, then soft-baked to drive off solvent. This is why the bay is lit yellow.',
  },
  litho: {
    name: 'Exposure', tool: 'EUV / immersion scanner', hours: 2, temp: 22, distance: 35,
    what: 'The scanner projects a 4× reduced image of the mask onto the resist, one 26 × 33 mm field at a time, stepping across the wafer — around 80 shots, each aligned to the previous layer within a few nanometres.',
  },
  develop: {
    name: 'Bake and develop', tool: 'Developer track', hours: 1, temp: 100, distance: 14,
    what: 'A post-exposure bake amplifies the latent image, then developer dissolves the soluble regions. The pattern exists physically for the first time, as a resist stencil standing on the wafer.',
  },
  etch: {
    name: 'Plasma etch', tool: 'RIE chamber', hours: 3, temp: 60, distance: 28,
    what: 'Ions accelerate into the wafer and remove material wherever resist does not protect it. Sidewall passivation keeps the walls vertical; selectivity stops the etch on the layer beneath.',
  },
  implant: {
    name: 'Ion implant', tool: 'High-current implanter', hours: 2, temp: 25, distance: 30,
    what: 'Boron, phosphorus or arsenic ions are driven into the exposed silicon at keV energies, setting where and how strongly the device conducts.',
  },
  anneal: {
    name: 'Rapid thermal anneal', tool: 'RTP chamber', hours: 1, temp: 1000, distance: 18,
    what: 'Seconds at around 1,000 °C repair the lattice damage the implant caused and move dopants onto lattice sites where they are electrically active. Long enough to activate, brief enough that nothing diffuses.',
  },
  depo: {
    name: 'Deposition', tool: 'ALD / CVD / PVD', hours: 3, temp: 350, distance: 26,
    what: 'Film is added — sputtered, reacted from gas, or grown one self-limiting atomic layer at a time. ALD is what makes a conformal film on a three-dimensional structure possible at all.',
  },
  cmp: {
    name: 'Planarisation', tool: 'CMP polisher', hours: 2, temp: 40, distance: 24,
    what: 'The wafer is pressed against a rotating pad flooded with abrasive slurry until the surface is flat again. Without this, topography accumulates until the scanner cannot hold the whole field in focus.',
  },
  strip: {
    name: 'Resist strip', tool: 'Asher', hours: 1, temp: 250, distance: 16,
    what: 'Oxygen plasma burns off the remaining resist. The stencil has done its job and now has to leave without taking anything with it.',
  },
  metro: {
    name: 'Metrology', tool: 'CD-SEM / scatterometry / overlay', hours: 1, temp: 22, distance: 20,
    what: 'Critical dimensions, film thickness and overlay against the previous layer are measured without touching the wafer. The result feeds run-to-run control, which adjusts the next lot\'s recipe automatically.',
  },
  inspect: {
    name: 'Defect inspection', tool: 'Brightfield scanner', hours: 1, temp: 22, distance: 20,
    what: 'The surface is scanned optically for particles and pattern defects, and the spatial signature is classified. A ring means uniformity, a repeating pattern means the reticle, random speckle means particles.',
  },
}

const ASSEMBLY = [
  { key: 'sort', name: 'Wafer sort', tool: 'Prober + ATE', hours: 8, temp: 25, distance: 40,
    what: 'Needles land on every die and run functional and parametric tests. Failures are logged to a wafer map, so only known-good dies go on to be packaged. Memory parts get repaired here by fusing in spare rows.' },
  { key: 'grind', name: 'Backgrind', tool: 'Wafer grinder', hours: 3, temp: 30, distance: 60,
    what: 'The back of the wafer is ground from 775 µm down to as little as 50 µm. Thinner is better for heat and for stacking, and worse for surviving handling.' },
  { key: 'dice', name: 'Dicing', tool: 'Blade / stealth laser', hours: 2, temp: 25, distance: 30,
    what: 'The wafer is separated along the scribe lanes — by diamond blade, or by a laser that cracks it internally without producing debris.' },
  { key: 'attach', name: 'Die attach', tool: 'Pick and place', hours: 2, temp: 150, distance: 25,
    what: 'Known-good dies are picked off the tape and placed on a substrate or interposer, to a placement accuracy measured in single-digit microns.' },
  { key: 'bond', name: 'Interconnect', tool: 'Wire / flip-chip / hybrid bonder', hours: 3, temp: 250, distance: 20,
    what: 'The die is electrically connected — gold wire for cost-driven parts, solder bumps for high pin counts, or direct copper-to-copper hybrid bonding with no solder at all.' },
  { key: 'mold', name: 'Encapsulate', tool: 'Mold press', hours: 2, temp: 175, distance: 18,
    what: 'Underfill flows into the gap and mould compound encloses the assembly. Thermal expansion mismatch between silicon, substrate and compound is what governs how long the part survives.' },
  { key: 'final', name: 'Final test and burn-in', tool: 'ATE + burn-in oven', hours: 12, temp: 125, distance: 45,
    what: 'The packaged part is tested across voltage and temperature and stressed to force early-life failures out. Parts are then binned — the same die can leave as a top SKU or a cheaper one with a block fused off.' },
  { key: 'mark', name: 'Mark and ship', tool: 'Laser marker', hours: 1, temp: 25, distance: 15,
    what: 'The lid is marked with the part number and lot code, and the part is trayed. Three months after a rock went into a furnace, something leaves that can run an operating system.' },
]

/**
 * Build the whole itinerary.
 *
 * Returned steps are plain objects with cumulative fields already computed, so
 * the UI never has to reduce over 500 items on every frame.
 */
export function buildJourney(layers = 70) {
  const steps = []
  let hours = 0, distance = 0, temp = 0

  const push = (s) => {
    hours += s.hours
    distance += s.distance
    temp = Math.max(temp, s.temp)
    steps.push({ ...s, index: steps.length, cumHours: hours, cumDistance: distance, peakTemp: temp })
  }

  // --- material -----------------------------------------------------------
  const materialHours = { quartzite: 24, mgsi: 12, tcs: 8, poly: 72, cz: 72, slice: 48 }
  for (const c of CHAIN) {
    if (c.id === 'fab' || c.id === 'die') continue
    push({
      phase: 'material', key: c.id, name: c.name, tool: c.formula,
      hours: materialHours[c.id] || 24,
      temp: parseInt(String(c.temp).replace(/[^\d]/g, ''), 10) || 25,
      distance: 0, layer: 0,
      what: c.what,
    })
  }

  // --- fab: every layer, every step ---------------------------------------
  for (let L = 1; L <= layers; L++) {
    const beol = L > layers * 0.45
    const phase = beol ? 'beol' : 'feol'
    const seq = ['clean', 'coat', 'litho', 'develop', 'etch']
    seq.push(beol ? 'depo' : 'implant')
    if (!beol) seq.push('anneal')
    seq.push('strip', 'cmp')
    // Metrology and inspection are sampled. Listing them on every layer would
    // be the same misrepresentation as leaving them out.
    if (L % 5 === 0) seq.push('metro')
    if (L % 10 === 0) seq.push('inspect')

    for (const k of seq) {
      const s = FAB_STEPS[k]
      push({
        phase, key: k, layer: L, name: s.name, tool: s.tool,
        hours: s.hours, temp: s.temp, distance: s.distance, what: s.what,
        levelLabel: beol ? `Metal ${Math.max(1, Math.round((L - layers * 0.45) / ((layers * 0.55) / 15)))}` : 'Transistor',
      })
    }
  }

  // --- assembly -----------------------------------------------------------
  for (const a of ASSEMBLY) {
    push({ phase: 'assembly', key: a.key, layer: layers, name: a.name, tool: a.tool,
      hours: a.hours, temp: a.temp, distance: a.distance, what: a.what })
  }

  return steps
}

/** Headline totals, so the UI does not recompute them per frame. */
export function journeyTotals(steps) {
  const last = steps[steps.length - 1]
  const byPhase = {}
  for (const s of steps) {
    byPhase[s.phase] = byPhase[s.phase] || { count: 0, hours: 0 }
    byPhase[s.phase].count++
    byPhase[s.phase].hours += s.hours
  }
  return {
    steps: steps.length,
    hours: last.cumHours,
    days: last.cumHours / 24,
    km: last.cumDistance / 1000,
    peakTemp: last.peakTemp,
    lithoVisits: steps.filter((s) => s.key === 'litho').length,
    byPhase,
  }
}
