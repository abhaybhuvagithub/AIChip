// The third dimension, in the order the industry is taking it.
//
// Scaling used to mean printing smaller. It stopped meaning that around 2011,
// and what has replaced it is a sequence of moves into the vertical axis:
// stand the channel up (FinFET), wrap it completely (nanosheet), put a wall
// between n and p (forksheet), stack n on top of p (CFET), and eventually
// make the channel out of something only three atoms thick.
//
// Separately and simultaneously, the wafer itself is becoming two-sided —
// signal on the front, power from the back — and whole circuits are being
// bonded on top of one another.
//
// Status is stated for every entry, because the gap between "demonstrated at
// IEDM" and "in a product you can buy" is usually five to ten years, and
// conflating the two is the standard way this subject gets written badly.

export const STATUS = {
  production: { label: 'In production', hue: '#31c48d' },
  ramping: { label: 'Ramping', hue: '#ffb020' },
  demonstrated: { label: 'Demonstrated in the lab', hue: '#8b7bff' },
  research: { label: 'Research', hue: '#7d8a9c' },
}

export const ARCH = [
  {
    id: 'planar',
    name: 'Planar MOSFET',
    era: '1960s–2011',
    gated: 1,
    cellArea: 1.0,
    status: 'production',
    node: 'Down to 32/28 nm',
    one: 'A gate lying on top of a flat channel.',
    what: 'Current flows through a sheet of silicon at the surface, and a gate above it decides whether it flows. Simple to build, and it worked for four decades.',
    why: 'It fails when the channel gets short enough that the drain starts influencing the channel as much as the gate does. Leakage climbs, the device stops turning fully off, and the transistor becomes a resistor with opinions.',
    cost: 'None — this is the baseline everything else is measured against.',
  },
  {
    id: 'finfet',
    name: 'FinFET',
    era: '2011–2024',
    gated: 3,
    cellArea: 0.62,
    status: 'production',
    node: '22 nm to 7 nm, still shipping at mature nodes',
    one: 'Stand the channel up and wrap the gate around three faces.',
    what: 'The channel becomes a thin vertical fin. The gate drapes over it, touching left, right and top, so it controls the channel from three sides instead of one.',
    why: 'Electrostatic control comes back. Drive current is now set by fin height rather than width, so you add fins instead of widening the device — which is why transistor sizing became quantised.',
    cost: 'Fin patterning needs multiple exposures below about 40 nm pitch, and fin height uniformity becomes a first-order yield concern.',
  },
  {
    id: 'nanosheet',
    name: 'Gate-all-around nanosheet',
    era: '2022–',
    gated: 4,
    cellArea: 0.55,
    status: 'production',
    node: '3 nm (Samsung SF3), 2 nm (TSMC N2), Intel 18A',
    one: 'Stack horizontal sheets and wrap the gate all the way around each one.',
    what: 'Silicon and silicon-germanium layers are grown alternately, then the SiGe is etched out from between them, leaving suspended silicon sheets. Gate dielectric and metal are deposited by ALD into the gaps, wrapping every sheet on four sides.',
    why: 'Full electrostatic control, and sheet width becomes a continuous design knob again — something FinFET took away. Wider sheets for drive, narrower for density, in the same cell.',
    cost: 'The inner spacer and channel release steps are among the hardest in any production flow. You are etching a sacrificial layer out from between suspended sheets a few nanometres apart, without touching the sheets.',
  },
  {
    id: 'forksheet',
    name: 'Forksheet',
    era: 'Roadmap',
    gated: 4,
    cellArea: 0.45,
    status: 'demonstrated',
    node: 'Proposed to extend the nanosheet era toward A10',
    one: 'Put a dielectric wall between the n and p devices so they can sit closer.',
    what: 'Rather than two separate gate-all-around stacks with a gap between them, a dielectric wall separates them and each stack is gated from three sides against the wall — a fork rather than a full wrap.',
    why: 'The n-to-p spacing in a standard cell is set by how close you can put two gates without shorting. A wall removes that constraint, tightening the cell without changing the transistor itself.',
    cost: 'You give up part of the gate wrap in exchange for the spacing. Imec has proposed an outer-wall variant to extend nanosheet-based scaling to around the A10 node before CFET becomes necessary.',
  },
  {
    id: 'cfet',
    name: 'CFET',
    era: 'Roadmap',
    gated: 4,
    cellArea: 0.28,
    status: 'demonstrated',
    node: 'Imec places it at A7 and beyond',
    one: 'Stop putting n and p side by side. Put one on top of the other.',
    what: 'A complementary FET stacks the n-channel device directly above the p-channel device. A CMOS inverter — the fundamental logic building block — becomes a vertical object rather than a horizontal one.',
    why: 'This is the first move that shrinks a cell without shrinking anything. The pitch stays the same; the footprint roughly halves because one device is hiding under the other.',
    cost: 'Enormous. TSMC reported the first fully functional monolithic CFET inverter at 48 nm gate pitch at IEDM 2024, with backside contacts. Getting power and signal to a device buried under another device is the central problem, and it is why CFET and backside power arrive together.',
  },
  {
    id: '2d',
    name: '2D-material channel',
    era: 'Research',
    gated: 4,
    cellArea: 0.2,
    status: 'research',
    node: 'Discussed for A5 and A3',
    one: 'When silicon is too thick, use a channel three atoms thick.',
    what: 'A monolayer of a transition metal dichalcogenide such as molybdenum disulphide replaces silicon as the channel. It is inherently a single molecular layer, so thickness variation is not a manufacturing tolerance — it is fixed by chemistry.',
    why: 'Below roughly 5 nm body thickness, silicon\'s mobility collapses from surface scattering and thickness variation becomes uncontrollable. A 2D material sidesteps both: the body is as thin as matter allows and perfectly uniform.',
    cost: 'Contact resistance to a monolayer is brutal, and growing or transferring device-grade films at 300 mm is the open problem. Imec reported functional stacked nanosheet FETs with monolayer MoS₂ channels transferred onto 300 mm wafers at IEDM 2024 — a real milestone, and still a long way from a product.',
  },
]

// The second axis: the wafer gets a back side.
export const BACKSIDE = {
  what: 'For sixty years everything happened on one face of the wafer. Signal and power both had to come down through the same fifteen-plus metal levels, competing for the same routing tracks. Backside power delivery moves the power network to the other side of the wafer entirely.',
  how: 'The wafer is bonded face-down to a carrier, thinned from the back until only a few hundred nanometres of silicon remain above the transistors, and then patterned again from behind — vias down to the source and drain, and a power grid on what used to be the underside.',
  gains: [
    ['Routing', 'The front-side metal stack is freed for signal only, which relieves the congestion that had become the limiter in dense cells.'],
    ['IR drop', 'Power rails on the back can be far wider and shorter, so voltage droop under load falls sharply.'],
    ['Cell height', 'Removing power rails from the cell lets standard cells shrink in track count — scaling without a new transistor.'],
  ],
  cost: 'The process acquires a whole second lithographic side, wafer bonding, and extreme thinning — and a thinned wafer bonded to a carrier is mechanically fragile through the rest of the flow. Alignment between front and back is a new class of overlay problem.',
  where: 'Intel ships it as PowerVia on Intel 18A; TSMC has it on the A16 roadmap as Super Power Rail. Intel has also shown PowerVia-style connections carrying power to the buried device in a CFET, where routing purely from the front would need a punishing high-aspect-ratio etch.',
  status: 'ramping',
}

// The third axis: stack whole circuits, not just devices.
export const STACKING = [
  {
    id: 'package',
    name: 'Package-level (2.5D)',
    what: 'Separate dies placed side by side on a silicon interposer. Not stacking at all, strictly, but it is where the industry started going three-dimensional.',
    pitch: '~40–100 µm bumps',
    status: 'production',
    note: 'Every large AI accelerator does this today.',
  },
  {
    id: 'microbump',
    name: '3D microbump',
    what: 'Dies stacked vertically and joined by solder microbumps, with through-silicon vias carrying signals through the upper die.',
    pitch: '~25–40 µm',
    status: 'production',
    note: 'How HBM stacks eight to twelve DRAM dies.',
  },
  {
    id: 'hybrid',
    name: 'Hybrid bonding',
    what: 'Copper pads on two dies are pressed into direct contact and annealed until the copper fuses. No solder, no bump, no gap.',
    pitch: '~1–10 µm, heading below 1 µm',
    status: 'production',
    note: 'A thousand times the connection density of microbumps. Stacked cache and the densest 3D parts use it.',
  },
  {
    id: 'sequential',
    name: 'Sequential (monolithic) 3D',
    what: 'The upper tier of transistors is built directly on top of the lower tier, on the same wafer, rather than bonded from a second wafer.',
    pitch: 'Contact pitch — effectively unlimited density',
    status: 'research',
    note: 'The hard constraint is thermal budget: building the top tier must not exceed roughly 500–600 °C or it destroys the finished devices underneath.',
  },
]

export const BEYOND_CMOS = [
  {
    name: 'Negative-capacitance / ferroelectric FET',
    idea: 'A ferroelectric layer in the gate stack provides internal voltage amplification, potentially beating the 60 mV/decade subthreshold slope that thermal physics imposes on a conventional MOSFET.',
    why: 'Below 60 mV/decade you can lower supply voltage without leakage exploding — and supply voltage is what power scales with, quadratically.',
    status: 'research',
    honest: 'Whether the effect is stabilisable and reproducible at scale is still genuinely disputed in the literature.',
  },
  {
    name: 'Tunnel FET',
    idea: 'Switch by band-to-band tunnelling rather than thermionic emission over a barrier, which removes the thermal limit on subthreshold slope entirely.',
    why: 'Same prize — steep switching at low voltage.',
    status: 'research',
    honest: 'Steep slope has been demonstrated. On-current has been consistently too low to be useful, for twenty years.',
  },
  {
    name: 'Carbon nanotube FET',
    idea: 'Use aligned semiconducting carbon nanotubes as the channel. Superb intrinsic mobility and an ideally thin body.',
    why: 'The material is close to theoretically ideal for a channel.',
    status: 'research',
    honest: 'Purifying, aligning and placing nanotubes at billion-device densities with no metallic ones left is the problem, and it has not moved as fast as hoped.',
  },
  {
    name: 'Spintronics and magnetic logic',
    idea: 'Encode state in electron spin or magnetisation rather than charge, so state persists without power.',
    why: 'Non-volatility at the logic level, not just in memory.',
    status: 'research',
    honest: 'Real in memory — MRAM ships. As a replacement for logic switching, speed and energy per operation are still well behind CMOS.',
  },
]

export const THERMAL_LIMITS = [
  { id: 'passive', name: 'Passive / no heatsink', wPerMm2: 0.15 },
  { id: 'air', name: 'Forced air heatsink', wPerMm2: 0.6 },
  { id: 'cold', name: 'Liquid cold plate', wPerMm2: 1.5 },
  { id: 'two', name: 'Two-phase / direct-to-chip', wPerMm2: 3.5 },
  { id: 'micro', name: 'Embedded microfluidics', wPerMm2: 7 },
]
