// Clock speed, honestly.
//
// The interesting fact about clock frequency is that it stopped in 2005 and
// the transistors had nothing to do with it. Individual devices had already
// passed 100 GHz then and passed a terahertz two years later; commodity chips
// still clock at five or six. That two-hundred-fold gap is the subject of this
// file, and it is entirely power, wire delay and clock distribution.
//
// Everything here is computed from P = α·C·V²·f and from how far a signal can
// physically travel in one clock period. Both are unforgiving in a way no
// process improvement addresses.

import { K } from './physics.js'

/** Effective dielectric constant of on-chip interconnect. Low-k, roughly. */
export const EPS_EFF = 3.0

/**
 * Signal velocity on a good global wire: v = c/√ε_eff.
 *
 * This is the absolute floor, and real wires are far slower — local
 * interconnect is RC-limited, not velocity-limited, and RC delay grows with
 * the square of length. Treat every reach figure below as generous.
 */
export const signalVelocity = (epsEff = EPS_EFF) => K.c / Math.sqrt(epsEff)

/** How far a signal gets in one clock period, in millimetres. */
export function reachPerCycle(freqHz, epsEff = EPS_EFF) {
  if (!(freqHz > 0)) return Infinity
  return (signalVelocity(epsEff) / freqHz) * 1000
}

/** Clock period in seconds, and in a unit a human can read. */
export function period(freqHz) {
  const t = 1 / freqHz
  if (t >= 1e-3) return { t, label: `${(t * 1e3).toFixed(2)} ms` }
  if (t >= 1e-6) return { t, label: `${(t * 1e6).toFixed(2)} µs` }
  if (t >= 1e-9) return { t, label: `${(t * 1e9).toFixed(2)} ns` }
  if (t >= 1e-12) return { t, label: `${(t * 1e12).toFixed(2)} ps` }
  return { t, label: `${(t * 1e15).toFixed(1)} fs` }
}

/**
 * Power against frequency, the two ways it actually behaves.
 *
 * At fixed voltage, P = α·C·V²·f is linear in frequency — which sounds
 * survivable. But you cannot raise frequency at fixed voltage indefinitely:
 * gate delay scales roughly with V, so going faster needs more voltage, and
 * voltage enters squared. Scale both and power goes as roughly the CUBE of
 * frequency. That is the wall, and it arrived the moment supply voltage
 * stopped scaling — see the subthreshold floor on the science tab.
 */
export function powerAtFrequency({ baseWatts, baseGHz, targetGHz, scaleVoltage = true }) {
  if (!(baseGHz > 0)) return 0
  const r = targetGHz / baseGHz
  return scaleVoltage ? baseWatts * Math.pow(r, 3) : baseWatts * r
}

/** Supply voltage you would need, on the same first-order assumption. */
export const voltageAtFrequency = (baseV, baseGHz, targetGHz) => baseV * (targetGHz / baseGHz)

export function formatHz(hz) {
  if (!Number.isFinite(hz) || hz <= 0) return '—'
  const u = [[1e12, 'THz'], [1e9, 'GHz'], [1e6, 'MHz'], [1e3, 'kHz']]
  for (const [d, s] of u) if (hz >= d) return `${(hz / d).toFixed(hz / d < 10 ? 2 : 0)} ${s}`
  return `${hz.toFixed(0)} Hz`
}

export function formatWatts(w) {
  if (!Number.isFinite(w) || w <= 0) return '—'
  if (w >= 1e9) return `${(w / 1e9).toFixed(2)} GW`
  if (w >= 1e6) return `${(w / 1e6).toFixed(2)} MW`
  if (w >= 1e3) return `${(w / 1e3).toFixed(1)} kW`
  return `${w.toFixed(0)} W`
}

// A ladder of real, dated frequencies. Kinds are kept distinct on purpose:
// a transistor's fmax and a processor's clock are not the same quantity, and
// conflating them is how "terahertz chips" gets written.
export const LADDER = [
  { hz: 7.4e5, name: 'Intel 4004', year: 1971, kind: 'cpu', note: 'The first commercial microprocessor, at 740 kHz.' },
  { hz: 4.77e6, name: 'IBM PC (8088)', year: 1981, kind: 'cpu', note: 'Under 5 MHz, and it ran a generation of business software.' },
  { hz: 6.6e7, name: 'Pentium', year: 1993, kind: 'cpu', note: 'The clock race is on and doubling every couple of years.' },
  { hz: 1e9, name: 'The gigahertz barrier', year: 2000, kind: 'cpu', note: 'AMD and Intel raced to it within days of each other. It was treated as a milestone in a way no frequency has been since.' },
  { hz: 3.8e9, name: 'Pentium 4 Prescott', year: 2004, kind: 'cpu', note: 'The wall. A 10 GHz part was on Intel\'s public roadmap and was cancelled — the power did not work, and the industry turned to multiple cores instead.' },
  { hz: 6.2e9, name: 'Modern desktop boost', year: 2024, kind: 'cpu', note: 'Twenty years later, roughly 60% faster. Everything else improved by orders of magnitude; the clock did not.' },
  { hz: 9.1e9, name: 'Liquid-nitrogen overclock', year: 2022, kind: 'cpu', note: 'Records set at around −190 °C, for seconds at a time. Cooling buys clock, which is the whole point.' },
  { hz: 4.8e10, name: 'SFQ multiplier', year: 2019, kind: 'sfq', note: 'A gate-level-pipelined superconducting multiplier at 48 GHz on a few milliwatts, reported at ISSCC.' },
  { hz: 1e11, name: 'RSFQ logic elements', year: 2000, kind: 'sfq', note: 'Individual superconducting logic elements have run at 100 GHz for decades. At 4 kelvin.' },
  { hz: 3e11, name: 'Sub-THz 6G research', year: 2025, kind: 'radio', note: 'The 100–300 GHz bands being studied for 6G. A carrier frequency, not a clock.' },
  { hz: 7e11, name: 'RSFQ ceiling (projected)', year: 2011, kind: 'sfq', note: 'Published work puts the ceiling for simple RSFQ circuits around 700 GHz — sub-terahertz clocking, in the literature since 1991.' },
  { hz: 1.03e12, name: 'InP HBT f_max', year: 2007, kind: 'device', note: 'A single transistor\'s maximum oscillation frequency passes a terahertz. An amplifier, not a logic gate.' },
  { hz: 1.5e12, name: '25 nm InP f_max', year: 2013, kind: 'device', note: 'Enabled the first monolithic amplifier operating at a full terahertz.' },
]

export const KINDS = {
  cpu: { label: 'Processor clock', hue: '#ffb020' },
  sfq: { label: 'Superconducting logic', hue: '#4dd6e8' },
  radio: { label: 'Radio carrier', hue: '#a679ff' },
  device: { label: 'Single-device f_max', hue: '#31c48d' },
}

// Why 5 GHz and not 50. Four separate walls, all hit at once.
export const WALLS = [
  {
    k: 'Power',
    what: 'P = α·C·V²·f. Frequency is linear, but going faster needs more voltage and voltage is squared — so in practice power goes as roughly the cube of frequency. Ten times the clock is a thousand times the power.',
    why: 'This is the one that actually stopped the clock race in 2005, and it traces straight back to the subthreshold floor: supply voltage could not keep scaling, so the V² term stopped falling.',
  },
  {
    k: 'Heat',
    what: 'Whatever power you burn has to leave through the top of the die. A cold plate handles roughly 1.5 W/mm²; past that you are into two-phase or microfluidic cooling and then nothing.',
    why: 'Liquid nitrogen overclocking works precisely because it moves this wall. It is not a trick — it is the actual constraint, briefly relaxed.',
  },
  {
    k: 'Distance',
    what: 'A signal travels at c/√ε, about 173,000 km/s on chip. In one cycle at 5 GHz that is 35 mm; at 100 GHz it is 1.7 mm; at 1 THz it is 173 µm — smaller than a single functional block.',
    why: 'A clock that cannot cross its own die in one period is not a clock. This is why large chips are already split into multiple clock domains, and why frequency and die size fight each other.',
  },
  {
    k: 'The clock network itself',
    what: 'Distributing one edge to hundreds of millions of flip-flops with picoseconds of skew takes a balanced tree of buffers that switches every single cycle, whatever the chip is doing.',
    why: 'That network is commonly a fifth to a third of total dynamic power, and it is the one part you cannot clock-gate — which is why clock gating exists everywhere else.',
  },
]

export const THZ_REAL = [
  { name: 'Transistor f_max', status: 'Shipping', what: 'Indium phosphide HBTs passed 1 THz maximum oscillation frequency in 2007, and 25 nm devices reached about 1.5 THz. These are amplifiers for radio and instrumentation, three or four devices in a circuit — not logic gates by the billion.' },
  { name: 'THz imaging and spectroscopy', status: 'Shipping', what: 'Terahertz radiation passes through plastics, paper and clothing while being absorbed by water, which makes it useful for security screening, non-destructive inspection and chemical fingerprinting.' },
  { name: 'Sub-THz communications', status: 'Research', what: 'The 100–300 GHz bands under study for 6G. Enormous bandwidth, and atmospheric absorption that limits range to metres to hundreds of metres. A carrier frequency, not a clock rate.' },
  { name: 'Superconducting SFQ logic', status: 'Research', what: 'The only serious path to near-terahertz digital clocking. A Josephson junction switches in about a picosecond, individual elements run at 100 GHz and the literature discusses a ceiling near 700 GHz. It needs 4 kelvin, and complete circuits demonstrated so far run at tens of gigahertz.' },
  { name: 'A terahertz CMOS processor', status: 'Does not exist', what: 'And is not on any roadmap. The power would be gigawatts, the heat unremovable, and the clock could not cross a millimetre of die in one period. When a product claims terahertz, it is describing a radio, a sensor, or an aggregate bandwidth — not a clock.' },
]
