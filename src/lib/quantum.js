// Quantum error correction, costed in physical qubits.
//
// A quantum chip is not a small classical chip. It has thousands of devices
// where a logic die has a hundred billion, and it is still harder to build,
// because the useful quantity is not how many qubits exist but how many
// survive long enough to compute with. Everything below prices that gap.
//
// The surface code is used because it is the code the hardware people are
// actually building toward: nearest-neighbour connectivity on a 2D grid, and
// the highest known threshold for a practical code.

export const THRESHOLD = 0.01 // ~1% per-operation error, the surface code threshold

/**
 * Rotated surface code at distance d: d² data qubits and d²−1 measurement
 * qubits, so 2d²−1 physical qubits carry one logical qubit.
 */
export function physicalPerLogical(d) {
  return 2 * d * d - 1
}

/**
 * Logical error per error-correction round.
 *   p_L ≈ A · (p / p_th)^⌊(d+1)/2⌋
 * A is a fitted prefactor, conventionally around 0.1. The exponent is the
 * number of errors needed to fool the code — which is why adding two to the
 * distance buys an order of magnitude, not a percentage.
 */
export function logicalErrorRate(p, d, A = 0.1) {
  if (p >= THRESHOLD) return 1 // above threshold, more qubits make it worse
  return A * Math.pow(p / THRESHOLD, Math.floor((d + 1) / 2))
}

/** Smallest odd distance that meets a target logical error rate. */
export function requiredDistance(p, targetPL, maxD = 101) {
  if (p >= THRESHOLD) return null
  for (let d = 3; d <= maxD; d += 2) {
    if (logicalErrorRate(p, d) <= targetPL) return d
  }
  return null
}

/**
 * Full resource estimate for an algorithm.
 *
 * The magic-state factory multiplier is the honest weak point here. Real
 * estimates size distillation explicitly and it often dominates the footprint;
 * this collapses it into one factor so the reader can move it and see how much
 * it matters. Published estimates for the same algorithm differ by an order of
 * magnitude for exactly this reason.
 */
export function estimateResources({ p, logicalQubits, tGates, factoryOverhead = 1.5, cycleUs = 1 }) {
  // Every T gate must succeed, so the per-round budget is set by the total
  // number of rounds the algorithm will run.
  const targetPL = 1 / Math.max(1, tGates * 10)
  const d = requiredDistance(p, targetPL)
  if (!d) return { ok: false, reason: p >= THRESHOLD ? 'above-threshold' : 'unreachable', targetPL }

  const perLogical = physicalPerLogical(d)
  const dataQubits = logicalQubits * perLogical
  const totalQubits = Math.ceil(dataQubits * factoryOverhead)

  // One T gate consumed per surface-code cycle block of d rounds, serially.
  const seconds = tGates * d * cycleUs * 1e-6
  return {
    ok: true, d, perLogical, dataQubits, totalQubits, targetPL,
    achievedPL: logicalErrorRate(p, d),
    seconds,
  }
}

export const ALGORITHMS = [
  { id: 'demo', name: 'Textbook demonstration', logical: 20, t: 1e4, note: 'Small enough to run today if the qubits were perfect. They are not, which is the entire field.' },
  { id: 'chem', name: 'FeMoco ground state', logical: 2000, t: 1e10, note: 'Nitrogen fixation catalysis — a molecule classical simulation genuinely cannot handle. The canonical "why bother" example.' },
  { id: 'shor', name: 'Shor, RSA-2048', logical: 6200, t: 3e9, note: 'The famous one. Published estimates for the physical footprint range from a few million to tens of millions of qubits depending on assumptions.' },
  { id: 'grover', name: 'Grover, AES-128 key search', logical: 3000, t: 1e15, note: 'Quadratic speedup only. The T-gate count is so large the runtime, not the qubit count, is what kills it.' },
]

export const MODALITIES = [
  {
    id: 'transmon', icon: 'transmon', name: 'Superconducting transmon', temp: '~15 mK',
    gate: '20–50 ns', coherence: '100–500 µs',
    fab: 'Closest to a normal fab. Aluminium, niobium or tantalum films on high-resistivity silicon or sapphire, patterned by DUV or e-beam, with Josephson junctions formed by double-angle shadow evaporation through a suspended bridge.',
    hard: 'Junction resistance scatter of even 1–2% shifts qubit frequencies enough to collide with neighbours. On a fixed-frequency chip, collision probability climbs with qubit count — a yield problem that looks nothing like a defect density.',
    pro: 'Fast gates, lithographic fabrication, a clear path to 2D tiling.',
    con: 'Everything must live in a dilution refrigerator, and every qubit needs its own microwave line out of it.',
  },
  {
    id: 'ion', icon: 'iontrap', name: 'Trapped ion', temp: 'Room-temp trap, laser-cooled ions',
    gate: '10–100 µs', coherence: 'Seconds to minutes',
    fab: 'The chip is an ion trap, not a qubit array: patterned electrodes on silicon or sapphire that shape an RF field. The qubits are individual atoms held in vacuum above the surface, so they are identical by physics rather than by process control.',
    hard: 'Scaling means shuttling ions between trap zones or photonically linking modules. The optics and vacuum, not the lithography, set the ceiling.',
    pro: 'Identical qubits, the best gate fidelities demonstrated, all-to-all connectivity within a trap.',
    con: 'Gates are a thousand times slower than superconducting, so long algorithms take correspondingly longer.',
  },
  {
    id: 'atom', icon: 'atomarray', name: 'Neutral atom', temp: 'Room-temp chamber, µK atoms',
    gate: '~1 µs', coherence: 'Seconds',
    fab: 'Barely a chip at all. Optical tweezers made by a spatial light modulator hold atoms in arbitrary 2D or 3D arrays; entanglement is mediated by exciting atoms to Rydberg states.',
    hard: 'Atoms are lost from traps and must be reloaded mid-computation. Rydberg gate fidelity is the current limiter.',
    pro: 'Thousands of sites arranged in any geometry, and the array is reconfigurable between shots.',
    con: 'Mid-circuit measurement and continuous reloading are still being solved.',
  },
  {
    id: 'spin', icon: 'spinqubit', name: 'Silicon spin', temp: '~100 mK–1 K',
    gate: '~100 ns', coherence: '~1 ms (isotopically purified)',
    fab: 'The one modality that could genuinely reuse a CMOS line. Qubits are single electron spins in quantum dots defined by gate electrodes on isotopically purified silicon-28.',
    hard: 'Device-to-device variability is severe at the scale that matters, and the pitch is so tight that getting control wiring in and out is a routing problem before it is a physics problem.',
    pro: 'Nanometre footprint, and 300 mm foundry processes have already produced working devices.',
    con: 'Furthest behind on qubit count; the field is still in the tens.',
  },
  {
    id: 'photonic', icon: 'photonic', name: 'Photonic', temp: 'Room temperature (detectors cryogenic)',
    gate: 'Speed of light', coherence: 'No decoherence in flight',
    fab: 'Silicon photonics on a standard foundry line: waveguides, beam splitters, phase shifters, plus superconducting nanowire single-photon detectors that do need cooling.',
    hard: 'Photons do not interact, so two-qubit gates are probabilistic and need heavy multiplexing. Loss in the waveguides is the dominant error.',
    pro: 'Room-temperature operation, natural networking, and a mature manufacturing base.',
    con: 'Probabilistic gates mean enormous resource overhead before error correction is even considered.',
  },
]

export const FAB_DIFFERENCES = [
  {
    k: 'Device count',
    classical: '10¹¹ transistors on one die',
    quantum: '10²–10³ qubits',
    why: 'Quantum advantage comes from state space, not device count. A thousand good qubits beat a million bad ones, and no amount of density fixes a bad one.',
  },
  {
    k: 'What yield means',
    classical: 'A defect kills a die; redundancy or binning may save it',
    quantum: 'Every qubit must meet frequency, coherence and fidelity spec',
    why: 'There is no binning. A chip with one out-of-spec qubit in the wrong place may be unusable, because the surface code assumes a working lattice.',
  },
  {
    k: 'Critical dimension',
    classical: 'Sub-10 nm, EUV, the whole patterning apparatus',
    quantum: 'Often micron-scale features',
    why: 'Transmons are large. The precision required is in film quality, interface cleanliness and junction resistance uniformity — not in how small a line can be printed.',
  },
  {
    k: 'The dominant defect',
    classical: 'Particles and pattern failures',
    quantum: 'Two-level-system defects at surfaces and interfaces',
    why: 'Atomic-scale disorder in native oxides and at the substrate interface absorbs microwave energy and destroys coherence. It is invisible to every classical inspection tool.',
  },
  {
    k: 'Operating environment',
    classical: 'Ambient, in a phone or a rack',
    quantum: 'Millikelvin, in a dilution refrigerator',
    why: 'Thermal energy at room temperature is vastly larger than the qubit energy splitting. The fridge is not cooling for reliability; it is what makes the qubit exist.',
  },
  {
    k: 'Wiring',
    classical: '15+ metal levels, kilometres of copper on-die',
    quantum: 'One coax line per qubit, out of the cryostat',
    why: 'Control wiring is a hard scaling wall — the heat load and physical volume of the cabling grows with qubit count, which is why cryo-CMOS control chips are being developed.',
  },
]

export const SHARED = [
  'Photolithography — the same scanners, at relaxed resolution',
  'Thin-film deposition — sputtering, evaporation, ALD',
  'Plasma etch and wet chemistry',
  'CMP for planarisation on multi-layer devices',
  'Cleanroom discipline, metrology, and statistical process control',
  'Flip-chip bonding, now used to separate qubits from their control wiring',
]
