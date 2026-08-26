// What the industry has not solved.
//
// A note on why this tab exists. Every other tab here explains something that
// works. That gives a misleading impression of a field with a roadmap, when a
// great deal of it is a list of walls people have been running at for decades.
//
// The `since` field is the honest part and it is doing most of the work.
// Several of these have been "about ten years away" for twenty years, and the
// only way to show that is to put the date next to the promise. It is not
// scepticism for its own sake — some of these WILL be solved and will look
// obvious in hindsight. The hard part is that nobody can reliably say which,
// and a site that pretended to know would be doing the thing it criticises
// elsewhere.
//
// Status vocabulary, used strictly:
//   open        no demonstrated path; competing approaches, none convincing
//   partial     works in some regime, does not generalise
//   contained   managed rather than solved; the cost is paid every generation
//   stalled     demonstrated long ago, never made practical, little movement

export const DOMAINS = {
  device: { label: 'Devices', hue: '#ffb020' },
  pattern: { label: 'Patterning', hue: '#a679ff' },
  wires: { label: 'Wires and heat', hue: '#f6685e' },
  system: { label: 'Systems', hue: '#31c48d' },
  quantum: { label: 'Quantum', hue: '#4dd6e8' },
  structural: { label: 'Structural', hue: '#8ea2c0' },
}

export const STATUS = {
  open: { label: 'Open', hue: '#f6685e' },
  partial: { label: 'Partial', hue: '#ffb020' },
  contained: { label: 'Contained, not solved', hue: '#a679ff' },
  stalled: { label: 'Stalled', hue: '#8ea2c0' },
}

export const PROBLEMS = [
  // ------------------------------------------------------------ devices --
  {
    id: 'steep', name: 'Switching below 60 mV/decade', domain: 'device', status: 'stalled',
    since: 2004, icon: 'planar',
    what: 'Subthreshold swing has a thermodynamic floor of about 60 mV/decade at room temperature — it is the Boltzmann tail, not an engineering limit. Beating it would let supply voltage fall again, and power scales with the square of voltage.',
    tried: 'Tunnel FETs switch by band-to-band tunnelling instead of thermionic emission. Negative-capacitance FETs put a ferroelectric in the gate stack for internal voltage amplification.',
    hard: 'Tunnel FETs have delivered steep slope and useless on-current for twenty years — the two appear to trade against each other in every material system tried. Whether negative capacitance is stabilisable and reproducible at scale is still genuinely disputed in the literature, not merely unproven.',
    solved: 'A device with sub-60 mV/decade slope AND drive current within a factor of two of CMOS, reproducible across a wafer.',
    costs: 'Supply voltage stays where it is, so power density stays where it is, so clock speed stays where it is. This is the root of the wall the clock tab describes.',
  },
  {
    id: 'contact', name: 'Contact resistance', domain: 'device', status: 'open',
    since: 2010, icon: 'metal',
    what: 'Getting current from the metal into a nanometre-scale source and drain. As devices shrink the contact area shrinks with them, and contact resistance is now a leading term in total device resistance rather than a rounding error.',
    tried: 'Silicides, lower Schottky barriers, higher active doping, wrap-around contacts, and contact-over-active-gate layouts to recover area.',
    hard: 'There is a quantum limit to how low the resistance of a contact of a given area can be, and modern contacts are within sight of it. You cannot engineer past a limit set by the number of conducting channels available.',
    solved: 'Contact resistivity below roughly 10⁻⁹ Ω·cm² in production, reproducibly.',
    costs: 'Drive current stops improving even when the transistor does, so a better device delivers a worse circuit.',
  },
  {
    id: 'ptype2d', name: 'A good p-type 2D semiconductor', domain: 'device', status: 'open',
    since: 2011, icon: 'twod',
    what: 'Two-dimensional channels are the leading candidate for when silicon becomes too thick. Molybdenum disulphide works reasonably as an n-type channel. Complementary logic needs a p-type partner of comparable quality, and there is not one.',
    tried: 'Tungsten diselenide, black phosphorus, tellurium, and contact engineering to force p-type behaviour in materials that resist it.',
    hard: 'Fermi-level pinning at the contacts fights you, the good p-type candidates are unstable in air or hard to grow, and the whole problem sits underneath a second unsolved one — growing any of these at 300 mm with device-grade uniformity.',
    solved: 'A p-type 2D channel with mobility and stability within range of the n-type, grown rather than exfoliated, on 300 mm.',
    costs: 'No complementary logic means no CMOS, and without CMOS a 2D channel is a laboratory result rather than a successor.',
  },
  {
    id: 'cnt', name: 'Carbon nanotube logic at scale', domain: 'device', status: 'stalled',
    since: 1998, icon: 'twod',
    what: 'Carbon nanotubes have close to ideal channel properties: superb mobility, an atomically thin body, and excellent electrostatics. Working processors have been demonstrated.',
    tried: 'Solution-based purification, aligned growth, iterative removal of metallic tubes, and circuit-level design techniques that tolerate the defects rather than eliminating them.',
    hard: 'Every batch contains metallic tubes that short the channel, and purity requirements at billion-device scale are around one part in a billion. Placement and alignment at that density has not been solved either. Twenty-eight years of steady progress, still no path to volume.',
    solved: 'Semiconducting purity and placement adequate for a billion-transistor part, in a process a fab would accept.',
    costs: 'Nothing immediately — this is an option that has not opened rather than a wall being hit. But it is one of the few candidate successors, and it has been ten years away for a very long time.',
  },

  {
    id: 'sram', name: 'SRAM has stopped shrinking', domain: 'device', status: 'open',
    since: 2020, icon: 'ipmem',
    what: 'Logic density keeps improving roughly as advertised. The SRAM bit cell has very nearly stopped, scaling only a few percent across recent generations. Since cache is a large fraction of a modern die, that drags the density of the whole product down with it.',
    tried: 'Taller cells with more fins, assist circuits to recover margin at lower voltage, moving cache into a separate stacked die on an older node, and denser alternatives such as MRAM and eDRAM.',
    hard: 'An SRAM cell is six transistors that must be small AND stable AND fast at low voltage, and those pull against each other. Random dopant fluctuation and line-edge roughness hit the smallest devices on the die hardest, so shrinking the cell erodes exactly the margin it depends on. Stacking cache elsewhere works and costs packaging.',
    solved: 'A bit cell that scales with logic while holding read and write margin at production supply voltages.',
    costs: 'Every generation, cache occupies a larger share of the die, so the density gain from a new node is partly spent on memory that did not get smaller.',
  },

  // --------------------------------------------------------- patterning --
  {
    id: 'stochastic', name: 'EUV stochastic failures', domain: 'pattern', status: 'contained',
    since: 2016, icon: 'scanner',
    what: 'At extreme ultraviolet doses, the number of photons landing on a small feature is low enough that Poisson noise alone causes some features to fail — no particle, no misprint, just not enough photons happening to arrive there.',
    tried: 'Higher dose, which costs throughput on the most expensive tool in the building. Better resists. Post-processing to smooth the result. Design rules that avoid the most vulnerable configurations.',
    hard: 'It is a counting problem, so it cannot be inspected or cleaned away. Worse, resist performance obeys a trilemma — resolution, line-edge roughness and sensitivity trade against each other, and improving any two degrades the third.',
    solved: 'A resist chemistry that breaks the trilemma, or a source bright enough that dose stops costing throughput.',
    costs: 'Paid every wafer, in dose and therefore in scanner time, which is the constraint the whole fab is scheduled around.',
  },
  {
    id: 'metro', name: 'Measuring what you print', domain: 'pattern', status: 'open',
    since: 2015, icon: 'metrology',
    what: 'Features are now smaller than the wavelength of the light used to inspect them, and buried under layers. Optical inspection can no longer resolve a killer defect, and electron-beam inspection resolves them beautifully but far too slowly to cover a wafer.',
    tried: 'Deep-learning classification of ambiguous optical signals, hybrid optical-plus-ebeam sampling, and inferring defects from electrical test results after the fact.',
    hard: 'Throughput and resolution trade directly, and the gap is widening faster than either improves. Sampling less means an excursion runs longer before anyone sees it — which the fab run simulation shows costing lots.',
    solved: 'Full-wafer inspection at the resolution of a killer defect, at production speed.',
    costs: 'Excursions run longer before detection, so more wafers are damaged by each one.',
  },
  {
    id: 'highna', name: 'High-NA and the halved reticle', domain: 'pattern', status: 'partial',
    since: 2023, icon: 'scanner',
    what: 'High-numerical-aperture EUV improves resolution, but its anamorphic optics halve the printable field. Any die larger than the new field must be stitched from two exposures.',
    tried: 'Stitching, which Cerebras already does at wafer scale, and designing around the boundary so nothing critical crosses it.',
    hard: 'Stitching adds an overlay problem exactly where the design least wants one, and it costs throughput because every field is now two exposures. Whether the resolution is worth it depends on the design, which is not a satisfying answer for a tool costing several hundred million dollars.',
    solved: 'Either optics without the anamorphic penalty, or stitching so reliable it stops being a design consideration.',
    costs: 'A new constraint on floorplanning, and a throughput cost on the tool that was already the bottleneck.',
  },

  // ---------------------------------------------------- wires and heat --
  {
    id: 'wires', name: 'A metal better than copper', domain: 'wires', status: 'open',
    since: 2005, icon: 'metal',
    what: 'Copper resistivity rises sharply as wires narrow toward its 39 nm electron mean free path, and the barrier needed to contain it takes a fixed slice of every wire. The interconnect is now the limiter rather than the transistor.',
    tried: 'Cobalt, ruthenium and molybdenum, which have shorter mean free paths and may not need a barrier. Graphene and topological semimetals as more speculative options. Backside power delivery to relieve congestion rather than resistivity.',
    hard: 'No candidate is better on every axis. Ruthenium is more resistive in bulk but scales better; cobalt was tried in production and partly retreated from. Each is a different compromise and none is clearly right, which is why the industry keeps changing its mind.',
    solved: 'A conductor that beats copper at 10 nm width, deposits conformally, needs no barrier and does not poison silicon.',
    costs: 'Wire delay grows every node, so more of the improvement from a new node is spent getting signals across the die.',
  },
  {
    id: 'heat3d', name: 'Cooling stacked logic', domain: 'wires', status: 'open',
    since: 2008, icon: 'stack',
    what: 'Stacking multiplies transistors per unit of footprint and multiplies power per unit of footprint by the same factor, while the surface available to remove heat does not change at all.',
    tried: 'Microfluidic channels etched into the silicon, two-phase cooling, thermally conductive TSVs, and putting only low-power layers on top.',
    hard: 'Memory stacks work because memory is mostly idle. Logic is not, and there is no escape available to it. Every cooling approach buys roughly one more tier, and there are not many approaches left.',
    solved: 'Removing several watts per square millimetre from the interior of a stack, in production, at acceptable cost.',
    costs: '3D logic stays limited to low-power tiers, so the density gain that motivated 3D is largely unavailable to the parts that want it most.',
  },

  // ------------------------------------------------------------ systems --
  {
    id: 'memwall', name: 'The memory wall', domain: 'system', status: 'contained',
    since: 1994, icon: 'dram',
    what: 'Arithmetic throughput has grown far faster than memory bandwidth for three decades, so accelerators spend most of their time waiting for data rather than computing. Real utilisation on large models sits well below peak.',
    tried: 'Cache hierarchies, HBM stacked beside the compute die, larger on-chip SRAM, and algorithmic work to keep data resident.',
    hard: 'Bandwidth costs pins, power and area, all of which scale worse than logic. And the gap has widened every year since the term was coined in 1994 — thirty-two years of containment, not solution.',
    solved: 'Bandwidth per operation growing at the same rate as operations. Nothing on any roadmap does this.',
    costs: 'Most of a modern accelerator is idle most of the time, and the headline throughput figure describes a machine nobody experiences.',
  },
  {
    id: 'inmem', name: 'Computing in memory', domain: 'system', status: 'stalled',
    since: 1997, icon: 'ipmem',
    what: 'If moving data costs more than computing on it, compute where the data already is. Analogue in-memory arrays can perform a matrix multiply in one step, at very high efficiency.',
    tried: 'Resistive RAM crossbars, phase-change memory, magnetic RAM, flash-based analogue arrays, and a long line of startups.',
    hard: 'Analogue computation has limited precision, device-to-device variation is severe, and cells drift and wear. It fits inference at low precision and little else, and the software ecosystem assumes digital determinism it cannot provide.',
    solved: 'Enough precision and endurance to run a real workload, with a programming model people will adopt.',
    costs: 'Nothing directly — but it is the most-cited answer to the memory wall, and it has been for nearly thirty years.',
  },
  {
    id: 'kgd', name: 'Known-good die for chiplets', domain: 'system', status: 'partial',
    since: 2017, icon: 'chiplet',
    what: 'Chiplet economics depend on packaging only good dies. But a die tested at wafer sort is not fully tested — some faults only appear once it is bonded, and by then you have committed several other good dies and an interposer to the same package.',
    tried: 'More thorough wafer-level test, built-in self-test, burn-in before assembly, and repairable or replaceable assembly.',
    hard: 'Full test needs the package the die is not in yet. Every additional test costs money on a part whose entire economic argument was that it should be cheap. And one bad chiplet condemns the whole assembly, so the yield maths compounds against you.',
    solved: 'Pre-assembly test coverage high enough that packaged yield approaches the product of die yields.',
    costs: 'Assembly yield eats part of the gain chiplets were adopted for, which is visible on the economics tab.',
  },

  // ------------------------------------------------------------ quantum --
  {
    id: 'qthreshold', name: 'Staying below threshold at scale', domain: 'quantum', status: 'open',
    since: 2012, icon: 'transmon',
    what: 'Error correction works only below roughly a 1% per-operation error rate, and the qubit count needed falls steeply as you go further below it. Small systems have been below threshold. Keeping thousands of qubits there simultaneously has not been shown.',
    tried: 'Better materials and interfaces, improved junction fabrication, dynamical decoupling, and moving to modalities with intrinsically identical qubits.',
    hard: 'Error rates that look fine in isolation degrade under crosstalk, and two-level-system defects at interfaces are invisible to every classical inspection tool. Scaling and fidelity have historically traded against each other.',
    solved: 'A few thousand physical qubits held simultaneously well below threshold, with a demonstrated logical error rate falling as distance grows.',
    costs: 'Above threshold, error correction makes things worse and no qubit count helps. This is the gate everything else waits behind.',
  },
  {
    id: 'qwiring', name: 'Wiring a million qubits', domain: 'quantum', status: 'open',
    since: 2015, icon: 'ipnoc',
    what: 'Superconducting qubits need control lines running from room temperature into a dilution refrigerator. A million qubits means a million lines, and the heat load and physical volume of that cabling exceed what any cryostat can take.',
    tried: 'Cryogenic CMOS control chips inside the fridge, frequency multiplexing, and photonic links to replace coaxial cable.',
    hard: 'Cryo-CMOS must dissipate almost nothing at millikelvin, which is a hard constraint on a control circuit. Multiplexing trades against crosstalk and control fidelity — and fidelity is the other unsolved problem above.',
    solved: 'Control electronics scaling sub-linearly with qubit count, at a heat load a fridge can absorb.',
    costs: 'A hard ceiling on system size regardless of qubit quality.',
  },
  {
    id: 'magic', name: 'Magic state overhead', domain: 'quantum', status: 'open',
    since: 2005, icon: 'atom',
    what: 'The surface code cannot perform T gates directly. They are produced in distillation factories that frequently dominate the chip footprint, and no algorithm of interest avoids needing them in enormous numbers.',
    tried: 'Better distillation protocols, magic state cultivation, alternative codes with different gate sets, and algorithm-level reductions in T count.',
    hard: 'Improvements have been real but incremental, and this factor alone is why published resource estimates for the same algorithm differ by an order of magnitude.',
    solved: 'Fault-tolerant universal gates without an overhead that dwarfs the computation.',
    costs: 'Directly multiplies the physical qubit count for any useful algorithm — often several times over.',
  },

  // --------------------------------------------------------- structural --
  {
    id: 'nre', name: 'Nobody new can afford to start', domain: 'structural', status: 'open',
    since: 2015, icon: 'money',
    what: 'Design cost at the leading edge runs into hundreds of millions before first silicon. A startup with a genuinely better architecture cannot reach a leading-edge node, so novel ideas are filtered by capital rather than by merit.',
    tried: 'Multi-project wafer shuttles, open-source EDA and PDKs, chiplet reuse, and government-funded access programmes.',
    hard: 'Shuttles get you prototypes, not products. The cost is dominated by engineering and verification headcount, which no tooling initiative has substantially reduced. And a chiplet ecosystem needs standards adopted by companies with little reason to lower the barrier.',
    solved: 'A credible path from a good architectural idea to leading-edge silicon for well under $50M.',
    costs: 'The rate of genuinely new architectures being tried, which is not measurable and matters enormously.',
  },
  {
    id: 'concentration', name: 'Single points of failure', domain: 'structural', status: 'open',
    since: 2020, icon: 'foundry',
    what: 'One company makes EUV scanners. Effectively one merchant foundry serves the very top nodes. Several critical materials come from one or two suppliers in one or two countries. Each is a chokepoint with no alternative.',
    tried: 'National subsidy programmes, new fabs on other continents, and second-sourcing where a second source exists.',
    hard: 'These positions took decades and enormous accumulated process knowledge to build and cannot be replicated by capital alone. A new fab still needs the same scanner from the same company.',
    solved: 'Genuine redundancy at each chokepoint. There is no visible path to this at the top nodes within a decade.',
    costs: 'The entire modern economy depends on a supply chain with several irreplaceable nodes, and everyone involved knows it.',
  },
]

export const CAVEAT = `Some of these will be solved and will look obvious in hindsight; the transition to
high-k metal gates looked impossible for years and then simply happened. Others are on the
list of things that have been ten years away for twenty. Nobody can reliably say in advance
which is which — including this page, which is why it states how long each has been open
rather than predicting when it will close.`
