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

// ===================================================== MATERIALS ==========
//
// Why silicon, when several semiconductors are better at the thing a
// semiconductor is nominally for. The answer is not mobility and never was.

export const MATERIALS = [
  { id: 'si', name: 'Silicon', eg: 1.12, gap: 'indirect', muE: 1400, muH: 450,
    ebd: 0.3, kth: 150, note: 'Grows a native oxide with a near-perfect interface, is abundant, machines well and conducts heat. It wins on everything except the electrical figures.' },
  { id: 'ge', name: 'Germanium', eg: 0.66, gap: 'indirect', muE: 3900, muH: 1900,
    ebd: 0.1, kth: 60, note: 'The first transistor material and nearly three times silicon\'s electron mobility. Its oxide is water-soluble, which ended the argument. Now returning as a strained channel layer.' },
  { id: 'gaas', name: 'Gallium arsenide', eg: 1.42, gap: 'direct', muE: 8500, muH: 400,
    ebd: 0.4, kth: 55, note: 'Six times silicon\'s electron mobility and a direct gap, so it emits light. No usable native oxide, poor thermal conductivity, and hole mobility too low for complementary logic.' },
  { id: 'inp', name: 'Indium phosphide', eg: 1.34, gap: 'direct', muE: 5400, muH: 200,
    ebd: 0.5, kth: 68, note: 'Where terahertz transistors come from. Superb for high-frequency amplifiers and photonics, hopeless for billions of logic gates.' },
  { id: 'sic', name: 'Silicon carbide (4H)', eg: 3.26, gap: 'indirect', muE: 900, muH: 120,
    ebd: 3.0, kth: 490, note: 'Ten times silicon\'s breakdown field and three times its thermal conductivity. Mobility is irrelevant when the job is blocking 1,200 volts.' },
  { id: 'gan', name: 'Gallium nitride', eg: 3.4, gap: 'direct', muE: 1000, muH: 200,
    ebd: 3.3, kth: 130, note: 'A two-dimensional electron gas at the AlGaN interface reaches mobilities silicon cannot. Fast switching at high voltage, and it emits blue light.' },
]

/**
 * Silicon has an INDIRECT gap: the conduction band minimum sits at a different
 * crystal momentum from the valence band maximum, so an electron cannot fall
 * across it by emitting a photon alone — it needs a phonon at the same instant
 * to conserve momentum, and three-body events are rare.
 *
 * That is why silicon does not make a laser, why every optical link is built
 * from a III-V material, and why silicon photonics still needs a bonded
 * indium phosphide die to produce the light it then guides.
 */
export const isDirect = (id) => MATERIALS.find((m) => m.id === id)?.gap === 'direct'

// ================================================ CARRIER TRANSPORT =======

/**
 * Caughey–Thomas mobility against doping, with the standard silicon fit.
 * Above about 10^17 cm^-3 the carriers you added start scattering off the
 * dopant ions that supplied them — the material fights its own doping.
 */
const CT = {
  n: { min: 68.5, max: 1414, ref: 9.2e16, alpha: 0.711 },
  p: { min: 44.9, max: 470.5, ref: 2.23e17, alpha: 0.719 },
}
// [caughey1967]
export function mobilityVsDoping(dopingCm3, type = 'n') {
  const c = CT[type]
  return c.min + (c.max - c.min) / (1 + Math.pow(dopingCm3 / c.ref, c.alpha))
}

/**
 * Matthiessen's rule: scattering rates add, so mobilities combine as
 * reciprocals and the WORST mechanism dominates. Lattice (phonon) scattering
 * worsens with temperature; ionised-impurity scattering improves with it.
 */
export function mobilityComponents({ dopingCm3, T = 300, surfaceMu = 0 }) {
  const lattice = 1414 * Math.pow(T / 300, -2.4)
  const doped = mobilityVsDoping(dopingCm3, 'n')
  // Back out the impurity term from the room-temperature fit, then scale it.
  const impurity300 = 1 / Math.max(1e-9, 1 / doped - 1 / 1414)
  const impurity = impurity300 * Math.pow(T / 300, 1.5)
  let inv = 1 / lattice + 1 / impurity
  if (surfaceMu > 0) inv += 1 / surfaceMu
  return { lattice, impurity, surface: surfaceMu || Infinity, total: 1 / inv }
}

/**
 * Drift velocity against field, with saturation.
 *   v = µE / (1 + (µE/v_sat)^β)^(1/β),  β = 2 for electrons in silicon
 *
 * Carriers stop accelerating once they can shed energy to optical phonons as
 * fast as the field supplies it. A short channel sits in this regime at normal
 * supply voltages, which is why drive current stopped scaling as 1/L.
 */
export function driftVelocity(fieldVcm, mu = 1400, vSat = SILICON.vSat, beta = 2) {
  const low = mu * fieldVcm
  return low / Math.pow(1 + Math.pow(low / vSat, beta), 1 / beta)
}
/** Field at which velocity reaches half of saturation — the knee. */
export const saturationField = (mu = 1400, vSat = SILICON.vSat) => vSat / mu

// ============================================ SHORT-CHANNEL EFFECTS =======

/**
 * Natural length: how far the drain's field reaches into the channel.
 *
 *   λ = √(ε_si/ε_ox · t_ox · t_body)
 *
 * The gate keeps control while the channel is long compared with λ. The
 * industry rule of thumb is L ≳ 5–6λ, and every architecture change on the 3D
 * tab — thinner body, more gated faces — is a way of shrinking λ so L can
 * shrink with it. Multi-gate geometries divide it further; a double-gate
 * device sees roughly λ/√2 and gate-all-around better still.
 */
export function naturalLength({ toxNm, tbodyNm, gates = 1 }) {
  const base = Math.sqrt((SILICON.epsR / 3.9) * toxNm * tbodyNm)
  const divisor = gates >= 4 ? 2 : gates >= 2 ? Math.SQRT2 : 1
  return base / divisor
}

/**
 * Threshold roll-off and drain-induced barrier lowering.
 *
 * Both scale as exp(−L/2λ): the drain's influence on the channel barrier
 * decays exponentially with channel length measured in natural lengths. The
 * prefactors are conventional fitted values, so read the trend rather than the
 * millivolts — but the trend is the entire reason short channels leak.
 */
export function shortChannel({ lengthNm, lambdaNm, vds = 0.7, vbi = 0.9 }) {
  const x = Math.exp(-lengthNm / (2 * lambdaNm))
  return {
    ratio: lengthNm / lambdaNm,
    rollOffV: 3 * (vbi + vds) * x,          // Vth loss vs a long channel
    diblMvV: 1000 * 3 * x,                  // mV of Vth shift per volt of Vds
    // Five natural lengths is the textbook rule of thumb, but at five this
    // model still gives a couple of hundred mV/V of DIBL, which no product
    // would ship. Real designs sit nearer seven to ten, where DIBL lands in
    // the tens of mV/V — so that is the threshold used here.
    controlled: lengthNm / lambdaNm >= 7,
  }
}

// ============================================== INTERCONNECT ==============

export const CU = { rho0: 1.68, mfpNm: 39, R: 0.43, p: 0.5 }  // µΩ·cm, nm

/**
 * Copper's resistivity size effect — the reason wires stopped scaling.
 *
 * Two mechanisms, both kicking in when the wire narrows toward the electron
 * mean free path (39 nm in copper at room temperature):
 *
 *   Fuchs–Sondheimer   electrons scatter off the wire's surfaces
 *   Mayadas–Shatzkes   electrons scatter off grain boundaries, and grains
 *                      cannot be larger than the wire containing them
 *
 * On top of both, the diffusion barrier that stops copper poisoning the
 * silicon takes a fixed thickness off every side and carries almost no
 * current — so the conducting cross-section shrinks faster than the drawn one.
 * At 20 nm the barrier alone can take a third of the wire.
 */
// [fuchs1938] surface scattering, [mayadas1970] grain boundaries
export function copperResistivity({ widthNm, heightNm = null, barrierNm = 1.5 }) {
  const w = widthNm, h = heightNm || widthNm * 2
  const { rho0, mfpNm, R, p } = CU

  // Fuchs–Sondheimer, thin-film limit, applied to both confined dimensions.
  const fs = 1 + (3 / 8) * (1 - p) * mfpNm * (1 / w + 1 / h)

  // Mayadas–Shatzkes, with grain size taken equal to the wire width.
  const a = (mfpNm / w) * (R / (1 - R))
  const ms = 1 / (3 * (1 / 3 - a / 2 + a * a - a * a * a * Math.log(1 + 1 / a)))

  const rhoEff = rho0 * fs * ms

  // Barrier steals conducting area without carrying current.
  const wEff = Math.max(0.1, w - 2 * barrierNm)
  const hEff = Math.max(0.1, h - 2 * barrierNm)
  const areaRatio = (w * h) / (wEff * hEff)

  return {
    fs, ms, rhoEff, rhoWithBarrier: rhoEff * areaRatio,
    ratioToBulk: (rhoEff * areaRatio) / rho0,
    barrierPenalty: areaRatio,
  }
}

/**
 * Elmore delay for a distributed RC line: τ = 0.38·r·c·L².
 * The square is what matters — doubling a wire quadruples its delay, which is
 * why long routes are broken up with repeaters and why floorplanning is a
 * timing activity rather than a tidiness one.
 */
export function rcDelay({ widthNm, heightNm = null, lengthUm, capPerMmPf = 0.2, barrierNm = 1.5 }) {
  const h = heightNm || widthNm * 2
  const { rhoWithBarrier } = copperResistivity({ widthNm, heightNm: h, barrierNm })
  // Unit conversion, and it is the one that bit first time round:
  //   1 µΩ·cm = 1e-6 Ω · 1 cm = 1e-6 Ω · 1e7 nm = 10 Ω·nm
  // An earlier version used 1e-2 here and reported delays a thousand times
  // too small — which looked plausible, because picoseconds are what you
  // expect to see next to a wire.
  const rPerNm = (rhoWithBarrier * 10) / (widthNm * h)     // Ω/nm
  const rPerMm = rPerNm * 1e6                              // Ω/mm
  const cPerMm = capPerMmPf * 1e-12                        // F/mm
  const lMm = lengthUm / 1000
  return {
    rPerMm, resistanceOhm: rPerMm * lMm,
    delayS: 0.38 * rPerMm * cPerMm * lMm * lMm,
    delayPs: 0.38 * rPerMm * cPerMm * lMm * lMm * 1e12,
  }
}

// ================================================ RELIABILITY =============

/**
 * Black's equation for electromigration:
 *   MTTF = A · J^(−n) · exp(Ea/kT),  n ≈ 2 for copper
 *
 * Momentum from the electron wind physically moves metal atoms. A void opens
 * upstream, a hillock grows downstream, and the wire either opens or shorts to
 * its neighbour. It is why current density limits appear in every design rule
 * deck, and why they tighten as wires narrow.
 */
// [black1969]
export function blackMttf({ currentDensityAcm2, T = 373, eaEv = 0.9, n = 2, A = 1e-14 }) {
  return A * Math.pow(currentDensityAcm2, -n) * Math.exp(eaEv / (K.kB_eV * T))
}

/** Arrhenius acceleration between a stress condition and a use condition. */
export function accelerationFactor({ tUse, tStress, eaEv = 0.7 }) {
  return Math.exp((eaEv / K.kB_eV) * (1 / tUse - 1 / tStress))
}

export const WEAROUT = [
  { id: 'em', name: 'Electromigration', law: 'MTTF ∝ J⁻ⁿ·exp(Ea/kT)', ea: 0.9,
    what: 'Electron momentum physically transports metal atoms. A void opens upstream of a flux divergence and the wire goes open, or a hillock grows and shorts to a neighbour.',
    fix: 'Current-density design rules, copper over aluminium, alloying and better liners. Nothing removes it — the rules simply keep it beyond the product lifetime.' },
  { id: 'tddb', name: 'Dielectric breakdown', law: 'MTTF ∝ exp(−γE)', ea: 0.7,
    what: 'Traps accumulate in the gate dielectric under field until enough line up to form a conducting path. The gate then shorts to the channel, permanently.',
    fix: 'Thicker equivalent oxide via high-k, lower operating field, and screening the early-life tail with burn-in.' },
  { id: 'nbti', name: 'Bias temperature instability', law: 'ΔVth ∝ t^n·exp(−Ea/kT)', ea: 0.5,
    what: 'Threshold voltage drifts under bias and temperature as interface states are generated. The circuit slows down over years rather than failing outright.',
    fix: 'Guard-band the timing at design, and in some designs measure the drift on-chip and raise the supply to compensate.' },
  { id: 'hci', name: 'Hot carrier injection', law: 'Worst at high field, low T', ea: -0.1,
    what: 'Carriers accelerated by the drain field gain enough energy to be injected into the gate dielectric, damaging the interface near the drain.',
    fix: 'Lightly doped drain extensions to spread the field, and lower supply voltage. Notably it gets WORSE as temperature falls, which makes it the odd one out.' },
]

// ============================================ THE MOS CAPACITOR ==========
//
// The tab jumps straight to a transistor's current, which skips the object the
// transistor actually is: a capacitor whose semiconductor plate can be
// persuaded to change what it is made of. Everything about the threshold
// voltage follows from here, and nothing about it is arbitrary.

/** Fermi potential — how far the Fermi level sits from mid-gap. */
export const fermiPotential = (dopingCm3, T = 300) =>
  thermalVoltage(T) * Math.log(dopingCm3 / intrinsicCarriers(T))

/**
 * Depletion width at the onset of strong inversion.
 *
 * Strong inversion is conventionally taken as the surface potential reaching
 * 2φF — the point where the minority carrier concentration at the surface
 * equals the majority concentration in the bulk. It is a convention, not a
 * threshold in nature: the current does not switch on there, it is merely
 * where everyone agreed to stop calling it subthreshold.
 */
export function depletionWidth({ dopingCm3, T = 300 }) {
  const psi = 2 * fermiPotential(dopingCm3, T)
  const epsS = SILICON.epsR * K.eps0          // F/cm — K.eps0 already is
  return Math.sqrt((2 * epsS * psi) / (K.q * dopingCm3))   // cm
}

/** Depletion charge per unit area, in C/cm². */
export function depletionCharge({ dopingCm3, T = 300 }) {
  const psi = 2 * fermiPotential(dopingCm3, T)
  const epsS = SILICON.epsR * K.eps0
  return Math.sqrt(2 * K.q * epsS * dopingCm3 * psi)
}

/**
 * Body-effect coefficient γ = √(2·q·ε_si·N_a) / C_ox.
 *
 * How much the threshold moves when the substrate is biased. A thicker oxide
 * means a smaller C_ox and a larger γ, which is one reason thin oxides were
 * worth chasing for reasons beyond drive current.
 *
 * NOT `bodyFactor` above, which is the ideality factor n = 1 + C_dep/C_ox used
 * in subthreshold swing. Both are called "the body factor" in conversation and
 * they are different quantities; the collision is real enough that it broke
 * the build when this was added, which is a better outcome than two functions
 * quietly meaning different things.
 */
export function bodyEffectGamma({ dopingCm3, toxNm, kOx = 3.9 }) {
  const epsS = SILICON.epsR * K.eps0
  const cox = (kOx * K.eps0) / (toxNm * 1e-7)          // F/cm²
  return { gamma: Math.sqrt(2 * K.q * epsS * dopingCm3) / cox, cox }
}

/**
 * Threshold voltage, assembled from its parts:
 *
 *   V_th = V_FB + 2φ_F + γ·√(2φ_F)
 *
 * with V_FB = φ_ms − Q_ox/C_ox.
 *
 * The interesting term is the flat-band voltage, which is set by the work
 * function difference between gate and channel. That is a materials property,
 * and it is precisely why replacing polysilicon with metal was not merely a
 * conductivity improvement: a metal gate whose work function can be tuned is a
 * threshold voltage you can choose. Without it, the arithmetic below lands
 * near zero and the device leaks.
 */
export function thresholdVoltage({ dopingCm3, toxNm, kOx = 3.9, phiMs = -0.95, qOxPerCm2 = 0, T = 300 }) {
  const { gamma, cox } = bodyEffectGamma({ dopingCm3, toxNm, kOx })
  const phiF = fermiPotential(dopingCm3, T)
  const vfb = phiMs - qOxPerCm2 / cox
  const vth = vfb + 2 * phiF + gamma * Math.sqrt(2 * phiF)
  return { vth, vfb, phiF, gamma, cox, depletionTerm: gamma * Math.sqrt(2 * phiF) }
}

// ================================================== LEAKAGE PATHS ========
//
// "Leakage" is not one thing. A modern transistor leaks by at least five
// distinct mechanisms with different physics, different temperature
// behaviour and different fixes — and the one that dominates has changed
// twice in twenty years.

export const LEAKAGE_PATHS = [
  { id: 'sub', name: 'Subthreshold conduction', icon: 'planar',
    law: 'I ∝ exp(−V_th·q/nkT)', temp: 'Worse when hot',
    what: 'Carriers with enough thermal energy to cross the barrier even with the gate off. Set by the 60 mV/decade floor and therefore by the threshold voltage.',
    fix: 'Raise V_th, which costs drive current. Better electrostatics — more gated faces — so the floor is actually approached.' },
  { id: 'gate', name: 'Gate tunnelling', icon: 'ipsec',
    law: 'I ∝ exp(−2κt)', temp: 'Nearly temperature-independent',
    what: 'Electrons tunnelling straight through the gate dielectric. Rose tenfold for every 0.18 nm of oxide removed until it dominated everything.',
    fix: 'High-k dielectrics: a physically thicker film at the same capacitance. This is the whole reason hafnium replaced silicon dioxide.' },
  { id: 'gidl', name: 'Gate-induced drain leakage', icon: 'ipphy',
    law: 'I ∝ E·exp(−B/E)', temp: 'Weakly temperature-dependent',
    what: 'Band-to-band tunnelling in the drain where the gate overlaps it. The high field bends the bands enough that valence electrons tunnel to the conduction band.',
    fix: 'Lighter drain doping under the overlap, less overlap, lower supply. It sets the floor on standby leakage in memory.' },
  { id: 'junction', name: 'Junction leakage', icon: 'die',
    law: 'I ∝ n_i² and n_i', temp: 'Doubles every 8–10 °C',
    what: 'Reverse-biased source and drain junctions leaking by diffusion and by thermal generation in the depletion region.',
    fix: 'Little to be done — it is the intrinsic carrier concentration, which is exponential in temperature. It is why hot chips leak more.' },
  { id: 'punch', name: 'Punch-through', icon: 'finfet',
    law: 'Onset when depletion regions meet', temp: 'Worse when hot',
    what: 'Source and drain depletion regions touching beneath the channel, so current flows in the bulk where the gate has no influence at all.',
    fix: 'Halo implants, thinner bodies, and ultimately wrapping the gate. It is short-channel failure in its most literal form.' },
]

/** Junction leakage scales with n_i², which is brutally temperature-dependent. */
export function junctionLeakageRatio(T1, T2) {
  const n1 = intrinsicCarriers(T1), n2 = intrinsicCarriers(T2)
  return (n2 * n2) / (n1 * n1)
}

// ======================================================== NOISE ==========
//
// Every measurement has a floor, and for analog circuits the floor is where
// the design stops. These are not engineering imperfections — thermal noise is
// the equipartition theorem and shot noise is the discreteness of charge.

/** Johnson–Nyquist thermal noise voltage across a resistor, V rms. */
export const thermalNoiseV = (rOhm, bandwidthHz, T = 300) =>
  Math.sqrt(4 * K.kB_J * T * rOhm * bandwidthHz)

/** Shot noise current, from the fact that charge arrives in lumps. */
export const shotNoiseA = (currentA, bandwidthHz) =>
  Math.sqrt(2 * K.q * currentA * bandwidthHz)

/**
 * kTC noise: sampling onto a capacitor traps a random charge, and the
 * resulting voltage uncertainty is √(kT/C) — independent of the resistance
 * that charged it, which is the surprising part. It is why every switched
 * capacitor in a data converter is larger than the signal would require.
 */
export const ktcNoiseV = (capF, T = 300) => Math.sqrt((K.kB_J * T) / capF)

/** Flicker (1/f) noise, the one that gets worse as devices shrink. */
export const flickerNoiseV2 = ({ kf = 1e-25, cox, wCm, lCm, freqHz }) =>
  kf / (cox * wCm * lCm * freqHz)

/**
 * Pelgrom's law: mismatch between two nominally identical devices scales as
 * the inverse square root of their area.
 *
 *   σ(ΔV_th) = A_Vth / √(W·L)
 *
 * This is why analog circuits use devices vastly larger than the process
 * allows, and why the smallest transistors on a die — the six in an SRAM cell
 * — are the ones whose margin erodes first. It is the statistical statement of
 * the same physics as random dopant fluctuation.
 */
// [pelgrom1989]
export function pelgromMismatch({ aVthMvUm = 3.0, wNm, lNm }) {
  const areaUm2 = (wNm * 1e-3) * (lNm * 1e-3)
  return areaUm2 > 0 ? aVthMvUm / Math.sqrt(areaUm2) : Infinity
}

// ========================================= QUANTUM CONFINEMENT ===========

/**
 * Ground-state energy in a thin body, from the infinite square well:
 *
 *   E₁ = h² / (8·m*·t²)
 *
 * Squeeze the channel and the lowest available state moves up, which raises
 * the threshold voltage — a thin-body device has a different V_th purely
 * because it is thin. Below about 5 nm this stops being a correction and
 * becomes a design parameter.
 */
export function confinementEnergyEv({ thicknessNm, mStar = 0.19 }) {
  const t = thicknessNm * 1e-9
  const h = 2 * Math.PI * K.hbar          // there is no K.h — only hbar
  const e = (h * h) / (8 * mStar * K.me * t * t)
  return e / K.q
}

/**
 * Effective oxide thickness including the parts that are not oxide.
 *
 * The inversion layer has a finite thickness — carriers sit roughly a
 * nanometre below the interface, not on it — and that distance adds to the
 * electrical thickness. A polysilicon gate adds a depletion layer of its own.
 * Together they put a floor under EOT that no dielectric can lower, and
 * removing the polysilicon term is the second reason metal gates arrived.
 */
export function electricalEot({ eotNm, inversionNm = 0.4, polyDepletionNm = 0 }) {
  const total = eotNm + inversionNm + polyDepletionNm
  return { total, penalty: total / eotNm, inversionNm, polyDepletionNm }
}

// ============================================ STRAIN ENGINEERING =========
//
// When gate length scaling stopped delivering, mobility was bought instead —
// by deliberately deforming the crystal. Strain splits the conduction band
// valleys and warps the valence band, lowering the effective mass along the
// direction of transport and reducing inter-valley scattering.
//
// It is one of the few times the industry improved a material property rather
// than a dimension, and it bought roughly a generation.

export const STRAIN = [
  { id: 'sige', name: 'SiGe source/drain', carrier: 'holes', gain: 1.9,
    how: 'Silicon-germanium grown in etched source and drain recesses. Its larger lattice constant compresses the channel between them.',
    note: 'The single largest mobility improvement in production, and it arrived at 90 nm.' },
  { id: 'nitride', name: 'Tensile nitride liner', carrier: 'electrons', gain: 1.3,
    how: 'A stressed silicon nitride film deposited over the device pulls the channel into tension.',
    note: 'Applied selectively — the two carriers want opposite strain, so nMOS and pMOS get different treatments on the same die.' },
  { id: 'sic', name: 'SiC source/drain', carrier: 'electrons', gain: 1.25,
    how: 'Carbon-doped silicon has a smaller lattice constant, so it pulls rather than pushes.',
    note: 'The electron counterpart to SiGe, and less widely used because the nitride liner was cheaper.' },
  { id: 'orientation', name: 'Substrate orientation', carrier: 'holes', gain: 1.5,
    how: 'Hole mobility is markedly better on a (110) surface than the standard (100).',
    note: 'Attractive and awkward: electrons prefer (100), so you cannot have both without hybrid substrates.' },
]

// ================================================== SELF-HEATING =========

/**
 * Thermal conductivity of thin silicon, reduced by phonon boundary scattering.
 *
 * Bulk silicon conducts heat at about 150 W/m·K. A film thinner than the
 * phonon mean free path does not — phonons scatter off the surfaces before
 * they travel far, and conductivity collapses. A 5 nm nanosheet conducts heat
 * roughly an order of magnitude worse than the bulk it is made of, so the same
 * power makes it far hotter.
 *
 * This is the mechanism behind self-heating, and it worsens with exactly the
 * architectural changes that improve electrostatics. Thin bodies are good for
 * the gate and bad for the heat.
 */
export function thinFilmConductivity({ thicknessNm, bulkWmK = 150, phononMfpNm = 300 }) {
  return bulkWmK / (1 + phononMfpNm / thicknessNm)
}

/** Channel temperature rise from self-heating. */
export function selfHeating({ powerUw, thicknessNm, lengthNm, widthNm }) {
  const k = thinFilmConductivity({ thicknessNm })
  // One-dimensional conduction along the channel to the source and drain.
  const areaM2 = (thicknessNm * 1e-9) * (widthNm * 1e-9)
  const lenM = (lengthNm * 1e-9) / 2
  const rth = areaM2 > 0 ? lenM / (k * areaM2) : Infinity
  return { kEff: k, rthKperW: rth, deltaTK: (powerUw * 1e-6) * rth }
}
