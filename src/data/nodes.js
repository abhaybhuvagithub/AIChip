// Node names stopped describing any physical dimension around 22 nm. What
// they still track is a generation of density, and that is what this table
// compares. Density figures are order-of-magnitude published claims, not
// measured, and vendors count differently — treat them as a ranking.

export const NODES = [
  { node: '180 nm', year: 1999, arch: 'Planar bulk CMOS', litho: 'KrF 248 nm', mtr: 0.9, gate: '180 nm', note: 'Aluminium wiring gives way to copper damascene. The last node where the name meant the gate length.' },
  { node: '130 nm', year: 2001, arch: 'Planar, Cu/low-k', litho: 'KrF 248 nm', mtr: 1.6, gate: '~70 nm', note: 'Copper interconnect goes mainstream. Gate length starts running ahead of the node name.' },
  { node: '90 nm', year: 2004, arch: 'Strained silicon', litho: 'ArF 193 nm dry', mtr: 3.2, gate: '~50 nm', note: 'Strain engineering arrives — stretch the lattice and carriers move faster for free.' },
  { node: '65 nm', year: 2006, arch: 'Strained planar', litho: '193 nm dry', mtr: 5.5, gate: '~35 nm', note: 'Leakage becomes the dominant design problem. Dennard scaling quietly ends.' },
  { node: '45 nm', year: 2007, arch: 'High-k metal gate', litho: '193 nm immersion', mtr: 9, gate: '~25 nm', note: 'Hafnium replaces SiO₂ as the gate dielectric after 40 years. Immersion litho ships.' },
  { node: '32 nm', year: 2010, arch: 'HKMG planar', litho: '193i', mtr: 15, gate: '~20 nm', note: 'The last widely used planar generation at the leading edge.' },
  { node: '22 nm', year: 2011, arch: 'FinFET (tri-gate)', litho: '193i', mtr: 16, gate: 'Fin', note: 'Intel raises the channel into a fin so the gate wraps three sides. Electrostatics recovered.' },
  { node: '14/16 nm', year: 2014, arch: 'FinFET', litho: '193i + double patterning', mtr: 30, gate: 'Fin', note: 'Foundry FinFET era begins. Multi-patterning cost starts climbing hard.' },
  { node: '10 nm', year: 2017, arch: 'FinFET', litho: '193i, triple/quad patterning', mtr: 55, gate: 'Fin', note: 'The node that stalled Intel for years — patterning complexity outran yield.' },
  { node: '7 nm', year: 2018, arch: 'FinFET', litho: '193i, EUV on N7+', mtr: 95, gate: 'Fin', note: 'EUV enters production on selected layers, collapsing mask counts where it is used.' },
  { node: '5 nm', year: 2020, arch: 'FinFET', litho: 'EUV', mtr: 135, gate: 'Fin', note: 'Broad EUV adoption. Roughly 14 EUV layers replace far more DUV masks.' },
  { node: '3 nm', year: 2022, arch: 'FinFET (N3) / GAA (SF3)', litho: 'EUV', mtr: 200, gate: 'Fin / nanosheet', note: 'The architectures diverge: TSMC stays on fins, Samsung moves first to gate-all-around.' },
  { node: '2 nm', year: 2025, arch: 'GAA nanosheet', litho: 'EUV, High-NA piloting', mtr: 300, gate: 'Nanosheet', note: 'Gate wraps the channel on all four sides. Backside power delivery separates power from signal wiring.' },
]

export const ARCHITECTURES = [
  { id: 'planar', name: 'Planar', years: '–2011', gateSides: 1, why: 'The gate sits on top of a flat channel. Simple, cheap, and it fails once the channel gets short enough that the drain starts controlling current instead of the gate.' },
  { id: 'finfet', name: 'FinFET', years: '2011–2024', gateSides: 3, why: 'Stand the channel up as a fin and wrap the gate around three faces. Far better control, and drive current is set by fin height, so you add fins instead of widening.' },
  { id: 'gaa', name: 'Gate-all-around nanosheet', years: '2022–', gateSides: 4, why: 'Stack horizontal sheets and wrap the gate completely around each one. Full electrostatic control, and sheet width is tunable — an analogue knob FinFET never had.' },
  { id: 'cfet', name: 'CFET', years: 'Research', gateSides: 4, why: 'Fold the n and p devices on top of one another instead of side by side. Roughly halves the cell footprint without needing a finer pitch.' },
]

// Real-ish parameter sets. Die sizes and wafer prices are public estimates,
// which vary by source — they are here to make the model concrete, not to
// quote anyone's contract.
export const PRODUCTS = [
  {
    id: 'mobile-soc', name: 'Flagship mobile SoC', icon: '▤',
    blurb: 'Small die, huge volume, brutal power budget. Yield matters less than cost per die and how many you can ship in a quarter.',
    dieX: 10.5, dieY: 10.5, node: '3 nm', d0: 0.07, alpha: 2.5, waferCost: 20000, layers: 78, asp: 120, packageCost: 6, testYield: 0.97,
  },
  {
    id: 'gpu', name: 'Discrete GPU', icon: '▦',
    blurb: 'Large monolithic die pressed against the reticle limit. Every extra mm² is punished twice — fewer dies and worse yield.',
    dieX: 24, dieY: 25, node: '5 nm', d0: 0.09, alpha: 2, waferCost: 17000, layers: 72, asp: 900, packageCost: 25, testYield: 0.95,
  },
  {
    id: 'ai-accel', name: 'AI accelerator + HBM', icon: '◫',
    blurb: 'Beyond one reticle, so it is built as chiplets on an interposer with stacked memory. Packaging cost rivals the silicon.',
    dieX: 26, dieY: 33, node: '3 nm', d0: 0.08, alpha: 2, waferCost: 20000, layers: 80, asp: 22000, packageCost: 1200, testYield: 0.9, packageYield: 0.96,
  },
  {
    id: 'cpu-chiplet', name: 'CPU chiplet', icon: '▪',
    blurb: 'Deliberately small so yield stays high, then several are packaged together. This is the whole argument for disaggregation.',
    dieX: 8, dieY: 9.2, node: '5 nm', d0: 0.08, alpha: 2.5, waferCost: 17000, layers: 70, asp: 90, packageCost: 40, testYield: 0.96,
  },
  {
    id: 'mcu', name: 'Automotive MCU', icon: '▫',
    blurb: 'Mature node, tiny die, decade-long supply commitments. Defect density is low because the process has run for years.',
    dieX: 3.2, dieY: 3.2, node: '40 nm', d0: 0.03, alpha: 3, waferCost: 3000, layers: 32, asp: 4, packageCost: 0.4, testYield: 0.99,
  },
  {
    id: 'dram', name: 'DRAM', icon: '▥',
    blurb: 'Redundant rows and columns mean a defective die is often repairable at sort — yield behaves differently from logic.',
    dieX: 6.5, dieY: 8, node: '1α nm', d0: 0.05, alpha: 3, waferCost: 5500, layers: 40, asp: 3.5, packageCost: 0.6, testYield: 0.98,
  },
  {
    id: 'nand', name: '3D NAND', icon: '▩',
    blurb: 'Scaling moved to the vertical axis: stack more layers rather than shrink. The hard part is a single etch through all of them.',
    dieX: 9, dieY: 11, node: '200+ layers', d0: 0.06, alpha: 3, waferCost: 6000, layers: 45, asp: 6, packageCost: 0.8, testYield: 0.97,
  },
  {
    id: 'power', name: 'SiC power device', icon: '◪',
    blurb: 'Different substrate entirely, on 200 mm. Silicon carbide is hard to grow and hard to cut, so substrate cost dominates.',
    waferDia: 200, dieX: 5, dieY: 5, node: 'SiC', d0: 0.4, alpha: 2, waferCost: 1500, layers: 18, asp: 12, packageCost: 1.5, testYield: 0.94,
  },
]

export const FOUNDRIES = [
  { name: 'TSMC', role: 'Pure-play foundry', edge: 'N3, N2 ramping', note: 'The majority of leading-edge foundry revenue, and effectively the only merchant source for the very top nodes.' },
  { name: 'Samsung Foundry', role: 'IDM + foundry', edge: 'SF3, SF2', note: 'First to production gate-all-around; competing on architecture rather than following.' },
  { name: 'Intel Foundry', role: 'IDM opening to external customers', edge: 'Intel 18A', note: 'Betting on backside power delivery and gate-all-around arriving together.' },
  { name: 'GlobalFoundries', role: 'Specialty foundry', edge: '12–90 nm', note: 'Exited the leading-edge race in 2018 to focus on RF, automotive and embedded non-volatile memory.' },
  { name: 'SMIC / UMC / Tower', role: 'Mature and specialty', edge: '14 nm and above', note: 'Where most of the world\'s chips by unit count are actually made.' },
]
