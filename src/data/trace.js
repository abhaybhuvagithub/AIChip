// Trace: the causal graph underneath the whole site.
//
// Every other tab answers a question in isolation. This one asserts something
// stronger and, I think, true: they are all the same argument. The number of
// cores in your laptop, the existence of chiplets, the fact that one company
// on Earth makes EUV scanners, and the reason most chips are not made on
// leading-edge nodes are not fifteen separate facts. They are consequences,
// and if you walk any of them backwards far enough you arrive at about a dozen
// constants of nature and a handful of accidents of chemistry.
//
// So this is a directed acyclic graph. Each node names one fact and lists what
// causes it. Pick anything and the ancestry is computed — a chain from a
// constant to a consequence, readable as a sentence.
//
// Two rules the graph is held to, both checked:
//   • it must be acyclic, or "because" stops meaning anything
//   • every node must trace back to a root, or it is an assertion floating free
//
// The roots are deliberately austere. Boltzmann's constant, the speed of
// light, the wavelength of available light, the bandgap of silicon, the fact
// that silicon grows a good oxide. Almost everything else is downstream.

export const LAYERS = [
  { id: 'nature', label: 'Nature', hue: '#4dd6e8', note: 'Constants and material facts. Nobody chose these.' },
  { id: 'physics', label: 'Physics', hue: '#8b7bff', note: 'What follows directly from them.' },
  { id: 'device', label: 'Device', hue: '#31c48d', note: 'What that means for a transistor.' },
  { id: 'process', label: 'Process', hue: '#ffb020', note: 'What it takes to build one.' },
  { id: 'chip', label: 'Chip', hue: '#ff9f43', note: 'What the finished object is like.' },
  { id: 'system', label: 'System', hue: '#f6685e', note: 'What you can build with it.' },
  { id: 'economy', label: 'Economy', hue: '#8ea2c0', note: 'What it costs and who can do it.' },
  { id: 'world', label: 'World', hue: '#a679ff', note: 'What that does to everyone else.' },
]

const N = (id, layer, label, note, from = [], tab = null) => ({ id, layer, label, note, from, tab })

export const NODES = [
  // ------------------------------------------------------------- nature --
  N('boltzmann', 'nature', 'Boltzmann constant', 'Thermal energy per degree. Sets the width of the energy distribution every carrier is drawn from.', [], 'science'),
  N('planck', 'nature', 'Planck constant', 'Quantises action. Makes tunnelling possible and gives a photon its energy.', [], 'science'),
  N('lightspeed', 'nature', 'Speed of light', 'A hard ceiling on how far a signal travels in one clock period.', [], 'clock'),
  N('sibandgap', 'nature', "Silicon's bandgap is indirect", '1.12 eV, and the band minimum sits at the wrong momentum. An accident of the crystal, not a design.', [], 'science'),
  N('sio2', 'nature', 'Silicon grows a good oxide', 'SiO₂ on silicon has a near-perfect interface. Germanium\'s oxide dissolves in water. This is chemistry, not engineering.', [], 'science'),
  N('euvabsorb', 'nature', 'Everything absorbs 13.5 nm light', 'No material transmits extreme ultraviolet usefully. Air included.', [], 'science'),
  N('poisson', 'nature', 'Random events cluster and scatter', 'Defects land, and photons arrive, according to Poisson statistics. Not a process failure — a property of counting.', [], 'wafer'),
  N('abundance', 'nature', 'Silicon is everywhere', 'Twenty-eight percent of the crust. The second most abundant element in it.', [], 'sand'),
  N('electronmfp', 'nature', 'Electrons have a mean free path', 'About 39 nm in copper. A distance, fixed by the metal, that wires are now narrower than.', [], 'science'),

  // ------------------------------------------------------------ physics --
  N('kToverQ', 'physics', 'kT/q is 25.85 mV at room temperature', 'The thermal voltage. Almost every limit on this site is some multiple of it.', ['boltzmann'], 'science'),
  N('ssfloor', 'physics', 'Switching cannot beat 60 mV/decade', 'kT/q · ln10. Thermodynamics, not engineering — no better transistor gets under it.', ['kToverQ'], 'science'),
  N('tunnel', 'physics', 'Thin barriers leak exponentially', 'Tunnelling current rises tenfold for every 0.18 nm of oxide removed.', ['planck'], 'science'),
  N('nolaser', 'physics', 'Silicon cannot emit light', 'An indirect gap needs a phonon as well as a photon to recombine. Three-body events are rare.', ['sibandgap'], 'science'),
  N('rayleigh', 'physics', 'Resolution is k₁·λ/NA', 'You cannot print much finer than the light you print with.', ['lightspeed'], 'science'),
  N('shotnoise', 'physics', 'Fewer photons means noisier edges', 'Relative noise falls as 1/√N, and EUV photons are fourteen times more energetic, so the same dose delivers fourteen times fewer.', ['poisson', 'planck'], 'science'),
  N('signalreach', 'physics', 'A signal travels ~173 µm per picosecond on chip', 'c/√ε. At a terahertz, that is smaller than one functional block.', ['lightspeed'], 'clock'),
  N('sizeeffect', 'physics', 'Narrow wires get disproportionately resistive', 'Once a wire approaches the electron mean free path, surfaces and grain boundaries dominate conduction.', ['electronmfp'], 'science'),

  // ------------------------------------------------------------- device --
  N('vthfloor', 'device', 'Threshold voltage stopped scaling', 'Lower Vth means exponentially more leakage, and the exponent is fixed by the 60 mV/decade floor.', ['ssfloor'], 'science'),
  N('vddfloor', 'device', 'Supply voltage stopped scaling', 'The transistor needs headroom above threshold, and threshold will not move.', ['vthfloor'], 'science'),
  N('highk', 'device', 'Hafnium replaced silicon dioxide', 'Same capacitance from a physically thicker film, because tunnelling depends on thickness exponentially and capacitance only linearly.', ['tunnel', 'sio2'], 'science'),
  N('scaling3d', 'device', 'The gate had to wrap the channel', 'Short channels let the drain steal control. More gated faces shrink the distance its field reaches.', ['kToverQ'], '3d'),
  N('siliconwins', 'device', 'Silicon won anyway', 'It loses on mobility to germanium and gallium arsenide, and wins on the interface, the abundance and the thermal conductivity.', ['sio2', 'abundance'], 'science'),
  N('rcwall', 'device', 'Wires became the limiter', 'Transistors kept shrinking. Their interconnect did not cooperate, and delay is now dominated by wiring rather than switching.', ['sizeeffect'], 'science'),

  // ------------------------------------------------------------ process --
  N('euvmirrors', 'process', 'EUV works in vacuum, off mirrors', 'No lens is possible when nothing transmits the light. The optics are stacked Bragg reflectors in an evacuated chamber.', ['euvabsorb'], 'line'),
  N('euvhard', 'process', 'EUV scanners are the hardest machines built', 'Vacuum, plasma sources, and mirrors polished to atomic flatness. Decades of accumulated knowledge sit inside one.', ['euvmirrors', 'rayleigh'], 'chain'),
  N('stochastic', 'process', 'Some features fail at random', 'Not a particle, not a misprint — simply not enough photons happened to land there.', ['shotnoise'], 'unsolved'),
  N('manysteps', 'process', 'Making a chip takes ~700 steps', 'About ten operations, each repeated once per layer, sixty to eighty layers deep.', ['rayleigh', 'highk', 'scaling3d'], 'sand'),
  N('yieldmath', 'process', 'Every step must succeed 99.9986% of the time', 'Yield multiplies. Across 700 steps, 99% at the end demands fourteen parts per million at each one.', ['manysteps'], 'ethics'),
  N('nohumans', 'process', 'People are kept away from the wafers', 'A gowned person still sheds particles continuously, and a particle is a defect. Automation here is a yield requirement.', ['yieldmath', 'poisson'], 'sand'),
  N('discipline', 'process', 'Procedure replaced judgement', 'No amount of care delivers fourteen parts per million by attention. Documented process, statistical control and stop-the-line authority are the only mechanisms that work at this scale.', ['yieldmath'], 'ethics'),

  // --------------------------------------------------------------- chip --
  N('defectyield', 'chip', 'Yield falls exponentially with die area', 'A bigger die is a bigger target for the same defect density.', ['poisson'], 'wafer'),
  N('reticle', 'chip', 'No die can exceed 858 mm²', 'The scanner prints one 26 × 33 mm field at a time. Nothing monolithic gets bigger.', ['rayleigh'], 'silicon'),
  N('chiplets', 'chip', 'Chips became several chips', 'Area punishes yield twice over, and the reticle caps it anyway. Split the die and wire it in the package.', ['defectyield', 'reticle'], 'silicon'),
  N('packaging', 'chip', 'Packaging became a performance lever', 'Once the die is split, how you reconnect it decides how fast the result runs.', ['chiplets', 'rcwall'], '3d'),
  N('powerwall', 'chip', 'Power density stopped falling', 'P = αCV²f, and V stopped scaling. Every subsequent generation runs hotter per unit area than the last.', ['vddfloor'], 'clock'),
  N('clockstop', 'chip', 'Clock speed stopped in 2005', 'Going faster needs more voltage, and voltage is squared. There is no version of this that fits in a package.', ['powerwall', 'signalreach'], 'clock'),
  N('binning', 'chip', 'The same design ships as several products', 'Process variation means every die clocks differently, so one wafer becomes a product ladder.', ['poisson'], 'wafer'),
  N('nosiliconlaser', 'chip', 'Optical links need a bonded III-V die', 'Silicon guides light beautifully and cannot make it, so the laser is a separate piece of indium phosphide.', ['nolaser'], 'science'),

  // ------------------------------------------------------------- system --
  N('multicore', 'system', 'You have many cores, not a fast one', 'When the clock stopped, parallelism was the only direction left. Every core you own is a consequence of the Boltzmann distribution.', ['clockstop'], 'clock'),
  N('memwall', 'system', 'Compute outran memory', 'Arithmetic scaled and bandwidth did not, because bandwidth costs pins and power, which scale worse than logic.', ['rcwall', 'clockstop'], 'unsolved'),
  N('hbm', 'system', 'Memory moved onto the package', 'If bandwidth is the constraint, shorten the distance. Stack the DRAM and put it beside the compute die.', ['memwall', 'packaging'], 'silicon'),
  N('precision', 'system', 'Arithmetic got narrower instead of faster', 'A smaller multiplier fits more times in the same silicon. FP64 to FP4 is sixty-four times the throughput without a new transistor.', ['clockstop'], 'compute'),
  N('accelerators', 'system', 'General-purpose chips gave way to specialised ones', 'When you cannot make everything faster, make the thing you care about faster.', ['multicore', 'precision'], 'compute'),
  N('thermalwall', 'system', 'Stacked logic cannot be cooled', 'Tiers multiply power per unit footprint. The surface available to remove heat does not change.', ['powerwall', 'packaging'], '3d'),

  // ------------------------------------------------------------ economy --
  N('fabcost', 'economy', 'A fab costs $15–30 billion', 'Seven hundred steps means hundreds of tool types, and the hardest of them is a scanner.', ['manysteps', 'euvhard'], 'chain'),
  N('nre', 'economy', 'A leading-edge design costs hundreds of millions', 'Sixty to eighty masks, thousands of engineer-years of verification, and it is all spent before you know whether the silicon works.', ['manysteps', 'discipline'], 'business'),
  N('breakeven', 'economy', 'Only high-volume parts can use the newest node', 'Fixed cost divided by units. If the market will not absorb the volume, the older node makes the better product.', ['nre'], 'business'),
  N('matureNodes', 'economy', 'Most chips are not leading-edge', 'And that is a rational choice, not a compromise. The economics say so.', ['breakeven'], 'chain'),
  N('fabless', 'economy', 'Design separated from manufacturing', 'Nobody can carry a $20B fab to make one product, so the fab became a service and design became a business.', ['fabcost'], 'chain'),
  N('foundryconc', 'economy', 'One merchant foundry serves the top nodes', 'Capital plus accumulated process knowledge, compounding for thirty years. Money alone does not replicate it.', ['fabcost', 'discipline'], 'chain'),
  N('euvmono', 'economy', 'One company makes EUV scanners', 'There is no second source, and no path to one within a decade.', ['euvhard'], 'chain'),
  N('armmodel', 'economy', 'Selling the design became a business', 'If you cannot afford silicon, licence the part of it that is pure knowledge.', ['nre', 'fabless'], 'chain'),

  // -------------------------------------------------------------- world --
  N('chokepoint', 'world', 'The supply chain has irreplaceable nodes', 'A chokepoint with no alternative is a policy instrument, whether or not anyone intended it to be.', ['euvmono', 'foundryconc'], 'unsolved'),
  N('geopolitics', 'world', 'Chips became statecraft', 'Export controls, subsidy programmes and industrial policy, all aimed at chokepoints that exist because the physics is hard.', ['chokepoint'], 'chain'),
  N('aiera', 'world', 'The AI buildout was possible at all', 'Parallel silicon, narrow arithmetic and memory on the package. None of it was designed for this; all of it was available because the clock stopped.', ['accelerators', 'hbm'], 'compute'),
  N('energycost', 'world', 'Computing became an energy question', 'Once power density stopped falling, every further increase in compute is an increase in electricity.', ['powerwall', 'aiera'], 'compute'),
  N('barrier', 'world', 'New entrants are filtered by capital', 'A better architecture cannot reach a leading-edge node without hundreds of millions. Ideas are selected by funding rather than merit.', ['nre', 'foundryconc'], 'unsolved'),
]

/** The questions worth entering the graph through. */
export const QUESTIONS = [
  { q: 'Why does my laptop have eight cores instead of one fast one?', node: 'multicore' },
  { q: 'Why is there only one EUV supplier on Earth?', node: 'euvmono' },
  { q: 'Why did chips become several chips?', node: 'chiplets' },
  { q: 'Why are most chips not made on the newest node?', node: 'matureNodes' },
  { q: 'Why did chips become a geopolitical instrument?', node: 'geopolitics' },
  { q: 'Why was the AI buildout possible at all?', node: 'aiera' },
  { q: 'Why can nobody new start a chip company?', node: 'barrier' },
  { q: 'Why does silicon photonics need a separate laser?', node: 'nosiliconlaser' },
  { q: 'Why is computing now an energy question?', node: 'energycost' },
]

const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]))
export const node = (id) => BY_ID[id]

/**
 * Full ancestry of a node, ordered roots-first, deduplicated.
 *
 * Depth-first with a visited set. The graph is asserted acyclic elsewhere, but
 * the guard stays because an infinite loop in a UI is a worse failure than a
 * missing edge.
 */
export function ancestry(id, seen = new Set()) {
  const n = BY_ID[id]
  if (!n || seen.has(id)) return []
  seen.add(id)
  const out = []
  for (const f of n.from) for (const a of ancestry(f, seen)) if (!out.includes(a)) out.push(a)
  out.push(id)
  return out
}

/** Everything downstream of a node. */
export function descendants(id, seen = new Set()) {
  if (seen.has(id)) return []
  seen.add(id)
  const kids = NODES.filter((n) => n.from.includes(id))
  const out = []
  for (const k of kids) {
    if (!out.includes(k.id)) out.push(k.id)
    for (const d of descendants(k.id, seen)) if (!out.includes(d)) out.push(d)
  }
  return out
}

/**
 * The principal chain from a root to this node — the LONGEST path, not the
 * shortest.
 *
 * This is a deliberate choice and the first version got it wrong. Asked why a
 * laptop has many cores, the shortest route runs through the speed of light in
 * three hops and is true but thin. The longest runs Boltzmann → kT/q → the
 * 60 mV/decade floor → threshold voltage → supply voltage → power density →
 * the clock stopping → multicore, which is the actual explanation. When the
 * question is "why", the fullest chain is the right answer, not the tersest.
 */
export function principalPath(id) {
  const n = BY_ID[id]
  if (!n) return []
  if (!n.from.length) return [id]
  let best = null
  for (const f of n.from) {
    const p = principalPath(f)
    if (!best || p.length > best.length) best = p
  }
  return [...best, id]
}

/** The terse route, kept for when a short answer is what is wanted. */
export function shortestPath(id) {
  const n = BY_ID[id]
  if (!n) return []
  if (!n.from.length) return [id]
  let best = null
  for (const f of n.from) {
    const p = shortestPath(f)
    if (!best || p.length < best.length) best = p
  }
  return [...best, id]
}

/** How much of the graph a single node is upstream of. The reach of a cause. */
export function reach(id) {
  return descendants(id).length
}

export const roots = () => NODES.filter((n) => !n.from.length).map((n) => n.id)
