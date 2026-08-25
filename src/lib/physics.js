// The physics underneath everything else on this site.
//
// Every function here is a textbook equation with real units, not a curve
// fitted to look right. Where a model is a simplification — and the
// square-law MOSFET is a large one at modern nodes — the UI says so rather
// than quietly presenting a first-order result as the truth.
//
// Units are CGS-ish where semiconductor practice is: centimetres for device
// dimensions, because mobility is quoted in cm²/V·s and nobody writes it any
// other way. Conversions are done at the boundary, once, and commented.

export const K = {
  q: 1.602176634e-19,        // C, elementary charge (exact, SI 2019)
  kB_eV: 8.617333262e-5,     // eV/K, Boltzmann
  kB_J: 1.380649e-23,        // J/K (exact)
  hbar: 1.054571817e-34,     // J·s
  me: 9.1093837015e-31,      // kg, electron rest mass
  eps0: 8.8541878128e-14,    // F/cm — note the cm
  c: 2.99792458e8,           // m/s
}

export const SILICON = {
  Eg300: 1.12,               // eV, bandgap at 300 K
  ni300: 1.0e10,             // cm^-3, intrinsic carrier concentration at 300 K
  epsR: 11.7,
  atomicDensity: 5.0e22,     // cm^-3
  muElectron: 1400,          // cm²/V·s, bulk, lightly doped
  muHole: 450,
  vSat: 1.0e7,               // cm/s, saturation velocity
}

export const DIELECTRICS = [
  { id: 'sio2', name: 'SiO₂', k: 3.9, barrier: 3.1, note: 'The original. Grown, not deposited, and the interface with silicon is nearly perfect — which is why silicon won over every other semiconductor.' },
  { id: 'sion', name: 'SiON', k: 5.7, barrier: 2.8, note: 'Nitrided oxide. Bought a couple of nodes of margin before high-k became unavoidable.' },
  { id: 'hfo2', name: 'HfO₂', k: 25, barrier: 1.5, note: 'Hafnium oxide, deposited by ALD. Roughly six times the permittivity of SiO₂, so the same capacitance comes from a film six times thicker — and tunnelling falls off exponentially with thickness.' },
  { id: 'hfsio', name: 'HfSiO', k: 15, barrier: 2.0, note: 'A silicate compromise: less permittivity than pure hafnia, better interface quality and thermal stability.' },
]

/** Thermal voltage kT/q, in volts. The number that sets almost everything. */
export const thermalVoltage = (T = 300) => (K.kB_eV * T)

/**
 * Bandgap narrowing with temperature — Varshni.
 * Eg(T) = Eg(0) − αT²/(T+β), with silicon's fitted constants.
 */
export function bandgap(T = 300) {
  const Eg0 = 1.166, alpha = 4.73e-4, beta = 636
  return Eg0 - (alpha * T * T) / (T + beta)
}

/** Intrinsic carrier concentration, cm^-3. Scales as T^1.5·exp(−Eg/2kT). */
export function intrinsicCarriers(T = 300) {
  const Eg = bandgap(T)
  const ref = SILICON.ni300
  const Eg300 = bandgap(300)
  return ref * Math.pow(T / 300, 1.5) * Math.exp(-(Eg / (2 * K.kB_eV * T)) + (Eg300 / (2 * K.kB_eV * 300)))
}

/**
 * Majority and minority carriers for a doped sample.
 * Mass action: n·p = ni², always, at equilibrium.
 */
export function carriers(dopingCm3, type = 'n', T = 300) {
  const ni = intrinsicCarriers(T)
  // Exact solution rather than the n ≈ N_D shortcut, so it stays right when
  // doping approaches ni at high temperature.
  const half = dopingCm3 / 2
  const majority = half + Math.sqrt(half * half + ni * ni)
  const minority = (ni * ni) / majority
  return type === 'n'
    ? { n: majority, p: minority, ni }
    : { n: minority, p: majority, ni }
}

/** Oxide capacitance per unit area, F/cm². tox in nanometres. */
export function oxideCap(toxNm, k = 3.9) {
  const toxCm = toxNm * 1e-7
  return (k * K.eps0) / toxCm
}

/**
 * Equivalent oxide thickness: how thick an SiO₂ film would have to be to give
 * the same capacitance. This single conversion is the entire argument for
 * high-k dielectrics.
 */
export const eot = (physicalNm, k) => physicalNm * (3.9 / k)
export const physicalForEot = (eotNm, k) => eotNm * (k / 3.9)

/**
 * Square-law MOSFET drain current, amps.
 *
 * A deliberate simplification: it ignores velocity saturation, channel-length
 * modulation, mobility degradation with vertical field and short-channel
 * effects, all of which matter enormously below about 100 nm. It is here
 * because the shape of the curve is what teaches the device, and because
 * every modern model is a correction to this one.
 */
export function drainCurrent({ vgs, vds, vth, wOverL, mu, cox, lambda = 0 }) {
  const vov = vgs - vth
  if (vov <= 0) return 0
  const beta = mu * cox * wOverL
  if (vds < vov) {
    return beta * (vov * vds - (vds * vds) / 2)          // linear / triode
  }
  return (beta / 2) * vov * vov * (1 + lambda * (vds - vov))  // saturation
}

/**
 * Subthreshold current — the exponential tail below threshold.
 * I = I0 · exp((Vgs − Vth) / (n·kT/q))
 */
export function subthresholdCurrent({ vgs, vth, n = 1.3, T = 300, i0 = 1e-7 }) {
  const vt = thermalVoltage(T)
  return i0 * Math.exp((vgs - vth) / (n * vt))
}

/**
 * Subthreshold swing, volts per decade of current.
 *
 *   SS = n · (kT/q) · ln(10)
 *
 * With n ≥ 1 this cannot go below 59.6 mV/decade at 300 K, no matter how good
 * the transistor is. It is not an engineering limit — it is the Boltzmann tail
 * of the carrier distribution, and beating it requires a device that does not
 * switch by thermionic emission at all. Cooling works; that is why cryogenic
 * CMOS is interesting.
 */
export function subthresholdSwing(n = 1.3, T = 300) {
  return n * thermalVoltage(T) * Math.LN10
}
export const ssFloor = (T = 300) => thermalVoltage(T) * Math.LN10

/** Body factor from depletion and oxide capacitance: n = 1 + Cdep/Cox. */
export const bodyFactor = (cdep, cox) => 1 + cdep / cox

/**
 * Direct tunnelling through the gate dielectric, as a relative current.
 *
 * WKB through a rectangular barrier: J ∝ exp(−2κt), with
 * κ = √(2 m* Φ_B)/ħ. Absolute magnitude needs a prefactor nobody agrees on,
 * so this returns a ratio against a 1 nm SiO₂ reference — which is the form
 * the answer is useful in anyway.
 */
export function tunnelKappa(barrierEv, mStar = 0.5) {
  const phi = barrierEv * K.q                    // eV → J
  const m = mStar * K.me
  return Math.sqrt(2 * m * phi) / K.hbar         // 1/m
}
export function relativeTunnelCurrent(thicknessNm, barrierEv = 3.1, mStar = 0.5) {
  const kappa = tunnelKappa(barrierEv, mStar)
  const ref = tunnelKappa(3.1, 0.5)
  return Math.exp(-2 * kappa * thicknessNm * 1e-9) / Math.exp(-2 * ref * 1e-9)
}
/** Thickness change that costs one decade of leakage. ~0.18 nm for SiO₂. */
export function nmPerDecade(barrierEv = 3.1, mStar = 0.5) {
  return (Math.LN10 / (2 * tunnelKappa(barrierEv, mStar))) * 1e9
}

/** Dynamic switching power, watts. P = α·C·V²·f — the whole of Dennard. */
export function dynamicPower({ capF, volts, freqHz, activity = 0.1 }) {
  return activity * capF * volts * volts * freqHz
}

// ---------------------------------------------------------------- optics --

export const LITHO = [
  { id: 'iline', name: 'i-line', lambda: 365, naMax: 0.6, medium: 'air', year: 1990 },
  { id: 'krf', name: 'KrF', lambda: 248, naMax: 0.8, medium: 'air', year: 1998 },
  { id: 'arf', name: 'ArF dry', lambda: 193, naMax: 0.93, medium: 'air', year: 2003 },
  { id: 'arfi', name: 'ArF immersion', lambda: 193, naMax: 1.35, medium: 'water (n = 1.44)', year: 2007 },
  { id: 'euv', name: 'EUV', lambda: 13.5, naMax: 0.33, medium: 'vacuum', year: 2019 },
  { id: 'euvhna', name: 'High-NA EUV', lambda: 13.5, naMax: 0.55, medium: 'vacuum', year: 2025 },
]

/** Rayleigh resolution: the smallest half-pitch a system can print. */
export const resolution = (lambdaNm, na, k1 = 0.31) => (k1 * lambdaNm) / na

/**
 * Depth of focus: DOF = k2·λ/NA².
 * Note the square. Every gain in resolution costs focus quadratically, which
 * is why planarisation exists.
 */
export const depthOfFocus = (lambdaNm, na, k2 = 0.5) => (k2 * lambdaNm) / (na * na)

/** Photon energy in eV, from wavelength in nm. E = hc/λ ≈ 1239.84/λ. */
export const photonEnergy = (lambdaNm) => 1239.84193 / lambdaNm

/**
 * Photons absorbed in one feature, and the Poisson noise on that count.
 *
 * This is why EUV has stochastic failures and DUV does not. An EUV photon
 * carries about fourteen times the energy of an ArF photon, so the same dose
 * in mJ/cm² delivers fourteen times fewer of them — and shot noise goes as
 * 1/√N. Below a few hundred photons per feature, some features simply fail,
 * at random, with no defect anywhere to blame.
 */
export function photonStatistics({ lambdaNm, doseMjCm2, featureNm }) {
  const eJ = photonEnergy(lambdaNm) * K.q            // eV → J
  const photonsPerCm2 = (doseMjCm2 * 1e-3) / eJ
  const areaCm2 = Math.pow(featureNm * 1e-7, 2)
  const n = photonsPerCm2 * areaCm2
  return { n, sigmaRel: n > 0 ? 1 / Math.sqrt(n) : Infinity, photonEnergyEv: photonEnergy(lambdaNm) }
}

// ------------------------------------------------------------- kinetics --

/**
 * Arrhenius. Diffusivity, and everything else thermally activated.
 * D = D0·exp(−Ea/kT)
 */
export const arrhenius = (d0, eaEv, T) => d0 * Math.exp(-eaEv / (K.kB_eV * T))

/** Characteristic diffusion length √(Dt), in nanometres. D in cm²/s, t in s. */
export const diffusionLength = (dCm2s, tS) => Math.sqrt(dCm2s * tS) * 1e7

/**
 * Deal–Grove oxide thickness, in nm, for time t in hours.
 * x² + Ax = B(t + τ) — reaction-limited when thin, diffusion-limited when thick.
 */
export function dealGrove({ hours, A = 0.165, B = 0.0117, tau = 0.37 }) {
  const t = hours + tau
  const x = (A / 2) * (Math.sqrt(1 + (4 * B * t) / (A * A)) - 1)
  return x * 1000   // µm → nm
}

/**
 * Random dopant fluctuation: σVth ∝ 1/√(W·L).
 *
 * A modern channel contains tens of dopant atoms, not millions, so where they
 * happen to sit is a source of device-to-device variation that no process
 * control can remove. It is a counting problem, not a cleanliness problem.
 */
export function dopantFluctuation({ wNm, lNm, dopingCm3 = 1e18, depletionNm = 20 }) {
  const volumeCm3 = (wNm * 1e-7) * (lNm * 1e-7) * (depletionNm * 1e-7)
  const count = dopingCm3 * volumeCm3
  return { count, sigmaRel: count > 0 ? 1 / Math.sqrt(count) : Infinity }
}
