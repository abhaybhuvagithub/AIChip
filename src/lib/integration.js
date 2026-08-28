// The arithmetic of 3D integration.
//
// The 3D tab described stacking and never computed the number that actually
// explains it. Connection density goes as the INVERSE SQUARE of bonding pitch,
// so the step from a 40 µm microbump to a 1 µm hybrid bond is not forty times
// better — it is sixteen hundred times better. That single exponent is why
// hybrid bonding changed what a stacked part can be, and why HBM sits beside
// a compute die rather than across a board.
//
// Two more things belong here because they decide whether a stack is a
// product or a demo: how stack yield behaves depending on when you test, and
// what backside power delivery actually buys.

/** Connections per square millimetre at a given bonding pitch, in microns. */
export function connectionDensity(pitchUm) {
  if (!(pitchUm > 0)) return 0
  return Math.pow(1000 / pitchUm, 2)
}

/**
 * Bandwidth through one square millimetre of interface — both ways of being
 * limited, because which one binds is the interesting part.
 *
 * PIN-LIMITED is what the pitch allows: connections times the rate each can
 * run. POWER-LIMITED is what the energy budget allows: the power available,
 * divided by the energy it costs to move a bit.
 *
 * At micro-bump pitch, pins bind and every extra connection is more bandwidth.
 * At hybrid-bond pitch the constraint flips — a million connections per square
 * millimetre is far more than the power budget can drive, and the interface
 * stops being a wiring problem and becomes an energy one. That inversion is
 * the thing worth knowing about 3D integration, and it does not appear in any
 * pitch figure on its own.
 */
export function interfaceBandwidth({ pitchUm, gbpsPerLink = 2, dutyFraction = 0.5, pjPerBit = 0.05, powerBudgetW = 1 }) {
  // Not every connection carries data — power, ground and redundancy take a
  // large share. Quoting raw pin count as bandwidth is how these get inflated.
  const links = connectionDensity(pitchUm) * dutyFraction
  const pinTbps = (links * gbpsPerLink) / 1000
  // W / (J/bit) = bits/s.
  const powerTbps = powerBudgetW / (pjPerBit * 1e-12) / 1e12
  return {
    links, pinTbps, powerTbps,
    tbps: Math.min(pinTbps, powerTbps),
    limitedBy: powerTbps < pinTbps ? 'power' : 'pins',
  }
}

/** Interconnect generations, with the energy each costs to move a bit. */
export const BONDS = [
  { id: 'board', name: 'Across a board', pitchUm: 800, pjPerBit: 10,
    note: 'Off-package traces. Cheap, slow, and the reason memory used to be far away.' },
  { id: 'c4', name: 'C4 flip-chip bump', pitchUm: 150, pjPerBit: 3,
    note: 'Die to package substrate. Still how most chips reach the outside world.' },
  { id: 'ubump', name: 'Micro-bump (2.5D)', pitchUm: 40, pjPerBit: 1.0,
    note: 'Die to silicon interposer. What put HBM beside the compute die.' },
  { id: 'fine', name: 'Fine-pitch micro-bump', pitchUm: 25, pjPerBit: 0.6,
    note: 'Roughly where conventional solder bumping runs out — solder does not scale below this.' },
  { id: 'hybrid', name: 'Hybrid bond', pitchUm: 1, pjPerBit: 0.05,
    note: 'Copper pads fused directly, no solder and no gap. Three orders of magnitude denser than a micro-bump.' },
  { id: 'hybrid05', name: 'Hybrid bond, next generation', pitchUm: 0.5, pjPerBit: 0.03,
    note: 'Sub-micron pitch, in development. At this density the boundary between two dies stops being a bottleneck at all.' },
]

/**
 * Yield of a stack, and why known-good-die testing exists.
 *
 * Wafer-to-wafer bonding aligns two whole wafers, so a good die can land on a
 * bad one and both are lost. Stack yield is the product of the die yields —
 * exponential in the number of tiers, and brutal.
 *
 * Die-to-wafer lets you place only dies that passed test. What survives is the
 * bonding yield and whatever the test missed, which is a far gentler curve. It
 * costs more per placement, and that is the whole trade.
 */
export function stackYield({ dieYield, tiers, mode = 'd2w', bondYield = 0.998, testCoverage = 0.98 }) {
  if (mode === 'w2w') {
    return { yield: Math.pow(dieYield, tiers) * Math.pow(bondYield, tiers - 1), mode }
  }
  // Only known-good dies are placed, so what remains is escapes plus bonding.
  const escaped = 1 - (1 - dieYield) * (1 - testCoverage)
  return { yield: Math.pow(escaped, tiers) * Math.pow(bondYield, tiers - 1), mode }
}

/**
 * Standard-cell area from track height and contacted gate pitch.
 *
 * Cell height is quoted in routing tracks, and it is the density metric that
 * actually moved when transistor names stopped meaning anything. Going from a
 * 12-track to a 6-track cell halves the area with no change to the transistor.
 */
export function cellArea({ tracks, mmpNm, cppNm, widthCpp = 4 }) {
  const heightNm = tracks * mmpNm
  const widthNm = widthCpp * cppNm
  return { heightNm, widthNm, areaNm2: heightNm * widthNm, areaUm2: (heightNm * widthNm) / 1e6 }
}

/**
 * IR drop across a power grid, and what moving it to the back of the wafer
 * buys.
 *
 * Front-side power rails compete with signal for the same routing tracks, so
 * they are narrow, long and resistive. A backside grid has the whole reverse
 * of the wafer to itself and can be far thicker and shorter — commonly quoted
 * as several times lower resistance, which shows up directly as droop.
 */
export function irDrop({ currentA, gridResistanceUohm = 120, backside = false, supplyV = 0.75 }) {
  // Effective end-to-end resistance of the delivery network, in microhms — the
  // unit this is actually quoted in. An earlier version worked in milliohms
  // per millimetre and produced twelve volts of droop on a 0.75 V supply,
  // which is the kind of wrong that is at least obvious.
  const improvement = backside ? 6 : 1
  const rOhm = (gridResistanceUohm * 1e-6) / improvement
  const dropV = currentA * rOhm
  return { rOhm, dropV, dropMv: dropV * 1000, dropPct: dropV / supplyV }
}

export const POWER_DELIVERY = [
  { id: 'front', name: 'Front-side only', improvement: 1,
    what: 'Power and signal share the same fifteen-plus metal levels. Power rails take routing tracks that signal wanted, and they are narrow because of it.' },
  { id: 'back', name: 'Backside power delivery', improvement: 6,
    what: 'The wafer is thinned from behind and a dedicated power grid is patterned on the reverse. Wider, shorter, and it frees the front-side tracks entirely.' },
]
