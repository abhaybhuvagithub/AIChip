// The acronyms, expanded.
//
// Semiconductors may be the most abbreviation-dense field in engineering, and
// most glossaries stop at the expansion — which is the least useful part.
// Knowing that DIBL is "drain-induced barrier lowering" tells you nothing;
// knowing that it is the drain stealing control of the channel from the gate,
// and that it is why short channels leak, tells you what you needed.
//
// So every entry carries a one-line meaning as well as the expansion, and
// where the site explains something properly, a pointer to the tab that does.
//
// Compact tuple format — [acronym, expansion, meaning, category, tab?] —
// because 200 object literals would be unreadable and unmaintainable, and the
// mapping below turns them into objects once.

export const CATEGORIES = {
  process: { label: 'Process and fab', hue: '#ffb020', icon: 'etcher' },
  litho: { label: 'Lithography', hue: '#a679ff', icon: 'scanner' },
  device: { label: 'Devices and physics', hue: '#31c48d', icon: 'planar' },
  memory: { label: 'Memory', hue: '#4dd6e8', icon: 'dram' },
  design: { label: 'Design and EDA', hue: '#8b7bff', icon: 'eda' },
  pkg: { label: 'Packaging', hue: '#f6685e', icon: 'bga' },
  test: { label: 'Test and reliability', hue: '#ff9f43', icon: 'tester' },
  compute: { label: 'Compute', hue: '#37c28e', icon: 'npu' },
  quantum: { label: 'Quantum', hue: '#4dd6e8', icon: 'transmon' },
  business: { label: 'Business and industry', hue: '#8ea2c0', icon: 'money' },
}

const RAW = [
  // ------------------------------------------------- process and fab ----
  ['ALD', 'Atomic layer deposition', 'Self-limiting surface reactions deposit one atomic layer per cycle. The only way to coat a three-dimensional structure evenly, which is what makes gate-all-around possible.', 'process', 'line'],
  ['ALE', 'Atomic layer etching', 'The removal counterpart to ALD — one monolayer per cycle, where the budget allows it.', 'process', 'line'],
  ['AMHS', 'Automated material handling system', 'The ceiling rails and hoists that carry wafer pods between tools. Wafers travel kilometres inside a fab without a human touching them.', 'process', 'sand'],
  ['APC', 'Advanced process control', 'Software that adjusts recipes automatically from measurement, rather than waiting for an engineer to notice a drift.', 'process', 'run'],
  ['BEOL', 'Back end of line', 'Everything after the transistors are built: fifteen-plus levels of metal wiring them together.', 'process', 'line'],
  ['CMP', 'Chemical-mechanical planarisation', 'Polishing the wafer flat between layers. Without it, topography accumulates until the scanner cannot hold the field in focus.', 'process', 'line'],
  ['CVD', 'Chemical vapour deposition', 'Growing a film by reacting gases at the wafer surface.', 'process', 'line'],
  ['Cz', 'Czochralski', 'Pulling a single silicon crystal from a melt with a rotating seed. Where every wafer begins.', 'process', 'sand'],
  ['D0', 'Defect density', 'Killer defects per square centimetre. The single number that decides yield, and the one every fab is trying to drive down.', 'process', 'wafer'],
  ['DI', 'Deionised (water)', 'Water stripped of ions. A fab drinks millions of litres a day and recycles most of it.', 'process', 'sand'],
  ['FDC', 'Fault detection and classification', 'Watching thousands of sensor traces per tool against learned signatures, to catch a failing chamber before it scraps wafers.', 'process', 'ethics'],
  ['FEOL', 'Front end of line', 'Building the transistors themselves, before any wiring.', 'process', 'line'],
  ['FOUP', 'Front-opening unified pod', 'A sealed 25-wafer carrier with its own nitrogen micro-environment. Cleaner inside than the cleanroom around it.', 'process', 'sand'],
  ['HF', 'Hydrofluoric acid', 'Strips native oxide, and one of the most dangerous chemicals in the building — skin contact can be painless at first and systemically serious.', 'process', 'ethics'],
  ['MES', 'Manufacturing execution system', 'The software that knows where every lot is, what it needs next, and what it has already been through.', 'process', 'run'],
  ['MG-Si', 'Metallurgical-grade silicon', 'Roughly 98–99% pure silicon straight from the arc furnace. Most of it goes to aluminium alloys, not chips.', 'process', 'sand'],
  ['OHT', 'Overhead hoist transport', 'The vehicles running on the ceiling rails. A large fab moves tens of thousands of pods a day on them.', 'process', 'sand'],
  ['PECVD', 'Plasma-enhanced chemical vapour deposition', 'CVD with a plasma supplying the energy, so films can be grown at lower temperature.', 'process', 'line'],
  ['PVD', 'Physical vapour deposition', 'Sputtering material off a target onto the wafer. How metals get deposited.', 'process', 'line'],
  ['RCA', 'RCA clean', 'The classic clean sequence — ammonia/peroxide for organics, hydrochloric/peroxide for metals. Named for the company that developed it in 1965.', 'process', 'line'],
  ['RIE', 'Reactive ion etch', 'Plasma etching that mixes chemical reaction with physical sputtering, so walls come out vertical rather than undercut.', 'process', 'line'],
  ['RTA', 'Rapid thermal anneal', 'Seconds at ~1,000 °C to repair implant damage and activate dopants — hot enough to work, brief enough that nothing diffuses.', 'process', 'line'],
  ['R2R', 'Run-to-run control', 'Using the last lot\'s measurements to adjust the next lot\'s recipe. Corrects drift before it becomes a deviation.', 'process', 'run'],
  ['SECS/GEM', 'SEMI equipment communications standard / generic equipment model', 'The protocol every tool speaks, so a scanner and an etcher can be driven by the same host software.', 'process', 'sand'],
  ['SPC', 'Statistical process control', 'Charting parameters against limits derived from their own behaviour, and acting only on genuine signals. Mostly it means doing nothing, on purpose.', 'process', 'ethics'],
  ['TCS', 'Trichlorosilane', 'SiHCl₃, boiling at 32 °C. Turning silicon into a distillable liquid is where nine-nines purity actually comes from.', 'process', 'sand'],
  ['UPW', 'Ultrapure water', 'Water purified far beyond drinking standard. So aggressive a solvent it would leach minerals from your body.', 'process', 'sand'],
  ['WIP', 'Work in progress', 'Lots currently inside the line. Multiply by cycle time and you get throughput — Little\'s law.', 'process', 'run'],
  ['WPM', 'Wafer starts per month', 'How fab capacity is quoted. A gigafab exceeds 100,000.', 'process', 'chain'],

  // -------------------------------------------------------- lithography --
  ['ArF', 'Argon fluoride laser', '193 nm deep-ultraviolet light. Still the workhorse for everything EUV does not do.', 'litho', 'science'],
  ['BARC', 'Bottom anti-reflective coating', 'A layer under the resist that stops light bouncing off the layers below and blurring the image.', 'litho', 'line'],
  ['CD', 'Critical dimension', 'The measured width of a printed feature. The number the whole patterning module is controlled to.', 'litho', 'line'],
  ['CD-SEM', 'Critical-dimension scanning electron microscope', 'Measures printed features without touching them. The feedback that run-to-run control acts on.', 'litho', 'line'],
  ['DOF', 'Depth of focus', 'k₂·λ/NA². Note the square — every gain in resolution costs focus quadratically, which is why CMP exists.', 'litho', 'science'],
  ['DUV', 'Deep ultraviolet', 'The 248 nm and 193 nm generations. Everything before EUV.', 'litho', 'science'],
  ['EUV', 'Extreme ultraviolet', '13.5 nm light, in a vacuum, off mirrors — because no material transmits it, air included. One company on Earth makes the scanners.', 'litho', 'science'],
  ['High-NA', 'High numerical aperture (EUV)', 'NA 0.55 optics for finer resolution, at the cost of a halved reticle field that must then be stitched.', 'litho', 'unsolved'],
  ['KrF', 'Krypton fluoride laser', '248 nm light, the generation before ArF. Still in volume use for mature nodes, where the cheapest tool that can print the feature is the right one.', 'litho', 'science'],
  ['LER', 'Line-edge roughness', 'Random wobble in a printed edge. At these dimensions a few nanometres of roughness is a large fraction of the line.', 'litho', 'unsolved'],
  ['MEEF', 'Mask error enhancement factor', 'How much a mask error is magnified on the wafer. Above one, and it rises as you approach the resolution limit.', 'litho'],
  ['NA', 'Numerical aperture', 'n·sin θ. Immersion raises it by putting water between lens and wafer, since sin θ cannot exceed one.', 'litho', 'science'],
  ['OPC', 'Optical proximity correction', 'Deliberately distorting the mask so the wafer comes out right. The drawn shape and the printed shape stopped resembling each other decades ago.', 'litho', 'line'],
  ['RLS', 'Resolution, line-edge roughness, sensitivity', 'The resist trilemma: improve any two and the third degrades. A fundamental obstacle, not an engineering gap.', 'litho', 'unsolved'],
  ['TMAH', 'Tetramethylammonium hydroxide', 'The developer that dissolves exposed resist.', 'litho', 'line'],

  // ------------------------------------------------ devices and physics --
  ['2DEG', 'Two-dimensional electron gas', 'A sheet of highly mobile carriers at a heterojunction. How GaN transistors get their speed.', 'device', 'science'],
  ['CFET', 'Complementary FET', 'Stacking the n device directly above the p device. The first step that shrinks a cell without shrinking any dimension.', 'device', '3d'],
  ['CMOS', 'Complementary metal-oxide-semiconductor', 'n-type and p-type transistors in complementary pairs, so a static gate draws almost no current. The reason chips are possible at all.', 'device', 'science'],
  ['DIBL', 'Drain-induced barrier lowering', 'The drain stealing control of the channel from the gate. Why short channels leak, measured in mV of threshold lost per volt of drain.', 'device', 'science'],
  ['EOT', 'Equivalent oxide thickness', 'How thick an SiO₂ film would have to be for the same capacitance. The single conversion that justifies high-k dielectrics.', 'device', 'science'],
  ['FDSOI', 'Fully depleted silicon on insulator', 'A thin undoped channel over a buried oxide. Good electrostatics without fins, and body bias as a tuning knob.', 'device'],
  ['FinFET', 'Fin field-effect transistor', 'The channel stood up as a fin so the gate wraps three faces. Ruled from 2011 to about 2024.', 'device', '3d'],
  ['GAA', 'Gate-all-around', 'The gate wrapped completely around a stack of nanosheets — all four faces. What 2 nm-class nodes use.', 'device', '3d'],
  ['HBT', 'Heterojunction bipolar transistor', 'Where terahertz transistor figures come from. Indium phosphide HBTs passed 1 THz f_max in 2007.', 'device', 'clock'],
  ['HCI', 'Hot carrier injection', 'Carriers energised by the drain field damaging the gate dielectric. Unusually, it gets worse as temperature falls.', 'device', 'science'],
  ['HEMT', 'High electron mobility transistor', 'A transistor built on a 2DEG. Used for RF and high-voltage switching, not logic.', 'device'],
  ['HKMG', 'High-k metal gate', 'Hafnium oxide plus a metal gate, replacing SiO₂ and polysilicon at 45 nm. Ended forty years of silicon dioxide.', 'device', 'science'],
  ['Ioff', 'Off-state current', 'What leaks when the transistor is supposed to be off. Multiply by billions of devices and it becomes most of a chip\'s idle power.', 'device', 'science'],
  ['Ion', 'On-state current', 'Drive current. Everything about performance comes back to this against Ioff.', 'device', 'science'],
  ['LDD', 'Lightly doped drain', 'A graded drain extension that spreads the field, reducing hot carrier damage.', 'device'],
  ['MOSFET', 'Metal-oxide-semiconductor field-effect transistor', 'The device the entire industry is built on. A gate controlling a channel through an insulator.', 'device', 'science'],
  ['NBTI', 'Negative bias temperature instability', 'Threshold voltage drifting under bias and heat over years. The circuit slows down rather than failing.', 'device', 'science'],
  ['NCFET', 'Negative-capacitance FET', 'A ferroelectric gate stack providing internal voltage amplification, in an attempt to beat 60 mV/decade. Still disputed.', 'device', 'unsolved'],
  ['RDF', 'Random dopant fluctuation', 'A 20 nm channel holds about eight dopant atoms. Where they land shifts the threshold by tens of percent.', 'device', 'science'],
  ['RTN', 'Random telegraph noise', 'A single trap capturing and releasing a carrier, making the current flick between two levels. Visible when devices get small enough.', 'device'],
  ['SCE', 'Short-channel effects', 'The family of problems that appear when the channel is no longer long compared with the natural length.', 'device', 'science'],
  ['SOI', 'Silicon on insulator', 'A device layer over buried oxide, isolating it from the substrate.', 'device'],
  ['SS', 'Subthreshold swing', 'Millivolts of gate needed per decade of current. Floored at 59.6 mV/dec at room temperature by the Boltzmann tail.', 'device', 'science'],
  ['TDDB', 'Time-dependent dielectric breakdown', 'Traps accumulating in the gate dielectric until a conducting path forms and the gate shorts, permanently.', 'device', 'science'],
  ['TFET', 'Tunnel FET', 'Switching by band-to-band tunnelling to beat the thermal limit. Steep slope demonstrated, useful on-current never.', 'device', 'unsolved'],
  ['Vth', 'Threshold voltage', 'Where the transistor turns on. Everything about power and speed is a negotiation around it.', 'device', 'science'],

  // ------------------------------------------------------------ memory --
  ['DDR', 'Double data rate', 'Transferring on both clock edges. The main-memory interface standard.', 'memory'],
  ['DRAM', 'Dynamic random-access memory', 'One transistor and one capacitor per bit, refreshed constantly because the charge leaks away.', 'memory', 'silicon'],
  ['ECC', 'Error-correcting code', 'Extra bits that detect and repair corruption. Standard in servers, increasingly everywhere.', 'memory'],
  ['eDRAM', 'Embedded DRAM', 'DRAM on the logic die. Denser than SRAM, harder to make in a logic process.', 'memory'],
  ['HBM', 'High-bandwidth memory', 'DRAM dies stacked eight to twelve high with through-silicon vias, sitting beside the compute die. The answer to the memory wall so far.', 'memory', 'silicon'],
  ['LPDDR', 'Low-power DDR', 'The mobile variant, optimised for energy per bit rather than peak bandwidth.', 'memory'],
  ['MLC/TLC/QLC', 'Multi / triple / quad level cell', 'Storing two, three or four bits per NAND cell by distinguishing more charge levels. Denser, slower, and shorter-lived each step.', 'memory'],
  ['MRAM', 'Magnetoresistive RAM', 'Storing bits in magnetisation rather than charge. Non-volatile, and the leading candidate to replace embedded flash.', 'memory'],
  ['NAND', 'NAND flash', 'Non-volatile storage that scaled vertically instead of horizontally — 200-plus layers stacked and etched through in one go.', 'memory', 'silicon'],
  ['PCM', 'Phase-change memory', 'Storing bits in whether a chalcogenide is crystalline or amorphous.', 'memory'],
  ['ReRAM', 'Resistive RAM', 'A filament that forms and dissolves in an oxide. Central to most in-memory-computing proposals.', 'memory', 'unsolved'],
  ['SRAM', 'Static random-access memory', 'Six transistors per bit, fast, and no longer shrinking — which drags the density of every modern die down with it.', 'memory', 'unsolved'],

  // -------------------------------------------------- design and EDA ----
  ['ASIC', 'Application-specific integrated circuit', 'A chip designed for one job, as opposed to a programmable one.', 'design', 'business'],
  ['ATPG', 'Automatic test pattern generation', 'Software that works out which input patterns would reveal a given manufacturing fault.', 'design', 'ethics'],
  ['BIST', 'Built-in self-test', 'Test circuitry on the die itself, so the part can check itself without external equipment.', 'design'],
  ['CTS', 'Clock tree synthesis', 'Building the buffer tree that delivers one clock edge to hundreds of millions of flip-flops within picoseconds.', 'design', 'clock'],
  ['DFM', 'Design for manufacturability', 'Designing so the thing can actually be made at yield, not merely simulated correctly.', 'design'],
  ['DFT', 'Design for test', 'Adding structure so the finished chip can be tested at all. Untestable is unshippable.', 'design', 'ethics'],
  ['DRC', 'Design rule check', 'Verifying the layout obeys the foundry\'s geometric rules. One of the gates before tapeout.', 'design', 'business'],
  ['ECO', 'Engineering change order', 'A late fix to a nearly finished design. Metal-only ECOs are cheap; anything deeper is not.', 'design', 'business'],
  ['EDA', 'Electronic design automation', 'The software without which no modern chip can be designed. Three companies, worldwide.', 'design', 'chain'],
  ['FPGA', 'Field-programmable gate array', 'Reconfigurable logic. Slower and less efficient than an ASIC, and available the same afternoon.', 'design'],
  ['GDSII', 'Graphic Data System II', 'The layout file format sent to the mask shop. A 1970s format still carrying every chip made.', 'design', 'business'],
  ['HDL', 'Hardware description language', 'Verilog, SystemVerilog, VHDL — languages for describing hardware rather than programming it.', 'design'],
  ['IP', 'Intellectual property (block)', 'A pre-designed, licensed circuit block — a CPU core, a memory controller, a PHY. Most of a modern SoC is licensed rather than written.', 'design', 'chain'],
  ['LVS', 'Layout versus schematic', 'Checking that the drawn layout matches the intended circuit. The other gate before tapeout.', 'design', 'business'],
  ['P&R', 'Place and route', 'Deciding where every cell sits and how every wire gets there. Where timing closure happens, or does not.', 'design', 'business'],
  ['PDK', 'Process design kit', 'The foundry\'s models, rules and libraries. Without one you cannot design for that process at all.', 'design', 'chain'],
  ['PPA', 'Power, performance, area', 'The three axes every design decision trades between. There is no fourth.', 'design'],
  ['RTL', 'Register transfer level', 'The abstraction chips are designed at — logic between registers, per clock cycle.', 'design', 'business'],
  ['STA', 'Static timing analysis', 'Proving every path meets timing across corners, without simulating vectors.', 'design'],
  ['UVM', 'Universal verification methodology', 'The standard framework for building verification environments. Verification is most of the effort on a chip.', 'design', 'business'],

  // -------------------------------------------------------- packaging --
  ['2.5D', 'Two-and-a-half dimensional packaging', 'Dies side by side on a silicon interposer. Not stacking, but where the industry started going three-dimensional.', 'pkg', '3d'],
  ['3D-IC', 'Three-dimensional integrated circuit', 'Dies stacked vertically and connected through the silicon rather than around it.', 'pkg', '3d'],
  ['BGA', 'Ball grid array', 'A package connecting through a grid of solder balls underneath, rather than pins around the edge.', 'pkg'],
  ['C4', 'Controlled collapse chip connection', 'Flip-chip solder bumps. IBM\'s 1960s invention, still how high-pin-count dies attach.', 'pkg'],
  ['CoWoS', 'Chip on wafer on substrate', 'TSMC\'s 2.5D interposer packaging. Currently a harder constraint on AI accelerators than wafer capacity.', 'pkg', 'chain'],
  ['EMIB', 'Embedded multi-die interconnect bridge', 'Intel\'s approach — a small silicon bridge embedded in the substrate instead of a full interposer.', 'pkg'],
  ['InFO', 'Integrated fan-out', 'Packaging that fans connections out beyond the die edge without an interposer.', 'pkg'],
  ['KGD', 'Known-good die', 'A die proven working before it is committed to a package. Harder than it sounds, and a live problem for chiplets.', 'pkg', 'unsolved'],
  ['MCM', 'Multi-chip module', 'Several dies in one package. The idea chiplets rediscovered and industrialised.', 'pkg'],
  ['OSAT', 'Outsourced semiconductor assembly and test', 'The companies that package and test what the foundries make.', 'pkg', 'chain'],
  ['PoP', 'Package on package', 'Stacking whole packages — commonly memory on top of an application processor in phones.', 'pkg'],
  ['QFN', 'Quad flat no-lead', 'A small package with pads underneath rather than leads at the sides.', 'pkg'],
  ['QFP', 'Quad flat package', 'The classic square package with gull-wing leads on all four sides.', 'pkg'],
  ['RDL', 'Redistribution layer', 'Metal added on top of a die to move its connections to where the package needs them.', 'pkg'],
  ['SiP', 'System in package', 'A whole subsystem — logic, memory, passives — in one package.', 'pkg'],
  ['TSV', 'Through-silicon via', 'A conductor running vertically through a die, so a stack can carry signals between its layers.', 'pkg', '3d'],
  ['UCIe', 'Universal Chiplet Interconnect Express', 'An open standard for chiplet-to-chiplet links, aiming at a multi-vendor chiplet market.', 'pkg', 'chain'],
  ['WLCSP', 'Wafer-level chip-scale package', 'Packaging done on the wafer, producing a part barely larger than the die.', 'pkg'],

  // ------------------------------------------- test and reliability -----
  ['AEC-Q100', 'Automotive Electronics Council qualification 100', 'The automotive qualification standard for integrated circuits. Adds roughly a year before you may sell one.', 'test', 'business'],
  ['ATE', 'Automated test equipment', 'The testers that exercise every part. Test can be 5–15% of total chip cost.', 'test', 'line'],
  ['DPMO', 'Defects per million opportunities', 'The unit six sigma is quoted in. Six sigma is 3.4 DPMO on the conventional 1.5σ-shift definition.', 'test', 'ethics'],
  ['DPPM', 'Defective parts per million', 'What escapes to customers. Automotive targets one or below; across a hundred million parts that is still a hundred cars.', 'test', 'ethics'],
  ['EM', 'Electromigration', 'Electron momentum physically transporting metal atoms until a wire opens. Lifetime goes as the inverse square of current density.', 'test', 'science'],
  ['ESD', 'Electrostatic discharge', 'A static shock destroying a device. Every input pin carries protection circuitry against it.', 'test'],
  ['HTOL', 'High-temperature operating life', 'Running parts hot under bias for weeks, so the Arrhenius factor converts that into years of use.', 'test', 'ethics'],
  ['JEDEC', 'Joint Electron Device Engineering Council', 'The standards body behind memory interfaces and much reliability qualification.', 'test'],
  ['MTTF', 'Mean time to failure', 'The figure Black\'s equation predicts for electromigration, and the currency of reliability engineering.', 'test', 'science'],
  ['WAT', 'Wafer acceptance test', 'Electrical measurements on test structures in the scribe lanes, checking the process rather than the product.', 'test'],

  // ------------------------------------------------------------ compute --
  ['BF16', 'Brain floating point 16', 'Sixteen bits that trade mantissa for exponent range. Mostly won over FP16 for training.', 'compute', 'compute'],
  ['CPU', 'Central processing unit', 'The general-purpose processor. Fewer, larger cores optimised for latency rather than throughput.', 'compute', 'silicon'],
  ['FLOPS', 'Floating-point operations per second', 'The headline throughput unit — and meaningless without stating the precision it was measured at.', 'compute', 'compute'],
  ['FP8 / FP4', 'Eight- and four-bit floating point', 'Narrow arithmetic. Dropping from FP64 to FP4 multiplies headline throughput by 64 on identical silicon.', 'compute', 'compute'],
  ['GPU', 'Graphics processing unit', 'Thousands of simple cores optimised for throughput. Repurposed for AI, and now designed for it.', 'compute', 'silicon'],
  ['ISA', 'Instruction set architecture', 'The contract between hardware and software. Arm and RISC-V are ISAs; the chips implementing them are not.', 'compute', 'chain'],
  ['MAC', 'Multiply-accumulate', 'The single operation that dominates neural network arithmetic. Counted as two operations in every FLOPS figure.', 'compute', 'compute'],
  ['MFU', 'Model FLOPS utilisation', 'What fraction of peak throughput a real workload achieves. Typically 30–60%, and memory bandwidth is usually why.', 'compute', 'compute'],
  ['NPU', 'Neural processing unit', 'A fixed-function accelerator for neural network inference, usually a systolic array of MACs.', 'compute', 'silicon'],
  ['NVLink', 'NVIDIA link', 'A proprietary high-bandwidth interconnect between accelerators, far faster than PCIe.', 'compute'],
  ['PCIe', 'Peripheral Component Interconnect Express', 'The standard serial interconnect between processors and everything else.', 'compute'],
  ['SIMD', 'Single instruction, multiple data', 'One instruction operating on many values at once. The basis of vector units.', 'compute'],
  ['SIMT', 'Single instruction, multiple threads', 'The GPU variant — many threads executing in lockstep until they diverge.', 'compute'],
  ['SoC', 'System on chip', 'CPU, GPU, memory controllers, modem and accelerators on one die. Every phone chip is one.', 'compute', 'silicon'],
  ['TOPS', 'Tera-operations per second', 'A trillion operations a second. Like FLOPS, meaningless without the precision.', 'compute', 'compute'],
  ['TPU', 'Tensor processing unit', 'Google\'s accelerator family, built around a systolic array with the weights held still and data flowing through.', 'compute', 'silicon'],

  // ------------------------------------------------------------ quantum --
  ['NISQ', 'Noisy intermediate-scale quantum', 'The current era — enough qubits to be interesting, too noisy for error correction.', 'quantum', 'quantum'],
  ['QEC', 'Quantum error correction', 'Encoding one logical qubit across many physical ones. Works only below roughly a 1% error rate.', 'quantum', 'quantum'],
  ['QPU', 'Quantum processing unit', 'The quantum chip itself, as distinct from the refrigerator and control electronics around it.', 'quantum', 'quantum'],
  ['RSFQ', 'Rapid single flux quantum', 'Superconducting logic switching on magnetic flux quanta. The only serious path to near-terahertz clocking, at 4 kelvin.', 'quantum', 'clock'],
  ['SFQ', 'Single flux quantum', 'The quantised bundle of magnetic flux that superconducting logic uses as its bit.', 'quantum', 'clock'],
  ['TLS', 'Two-level system', 'Atomic-scale defects at surfaces and interfaces that absorb microwave energy and destroy qubit coherence. Invisible to every classical inspection tool.', 'quantum', 'quantum'],

  // ------------------------------------------- business and industry ----
  ['ASP', 'Average selling price', 'What a part actually sells for. Erodes 6–25% a year depending on the market.', 'business', 'business'],
  ['BOM', 'Bill of materials', 'Everything that goes into a product, and what each costs.', 'business'],
  ['CapEx', 'Capital expenditure', 'Spending on fabs and tools. A leading-edge fab is $15–30B before it makes a wafer.', 'business', 'chain'],
  ['COGS', 'Cost of goods sold', 'What it costs to produce what you sold — silicon, packaging, test.', 'business', 'economics'],
  ['EOL', 'End of life', 'When a part stops being made. In automotive and industrial, announcing one badly can end a customer relationship.', 'business', 'ethics'],
  ['Fabless', 'Fabless', 'Designing chips without owning a fab. The model that has won the last thirty years.', 'business', 'chain'],
  ['IDM', 'Integrated device manufacturer', 'Designing and manufacturing in the same company. Intel, Samsung, TI, and all memory.', 'business', 'chain'],
  ['IRDS', 'International Roadmap for Devices and Systems', 'The successor to the ITRS. The industry\'s shared view of what comes next.', 'business'],
  ['ITRS', 'International Technology Roadmap for Semiconductors', 'The roadmap that coordinated the industry from 1998 to 2016, then stopped — partly because the path stopped being agreed.', 'business'],
  ['LTB', 'Last time buy', 'The final chance to order a part before it is discontinued. A recurring crisis in long-life systems.', 'business'],
  ['MPW', 'Multi-project wafer', 'Several designs sharing one mask set and wafer run. How a university or startup affords a prototype.', 'business', 'business'],
  ['NRE', 'Non-recurring engineering', 'Everything spent before the first part ships — masks, design, tools, IP. Hundreds of millions at the leading edge.', 'business', 'business'],
  ['PCN', 'Product change notification', 'Telling customers something changed. Skipping one is legal and corrosive.', 'business', 'ethics'],
  ['PFAS', 'Per- and polyfluoroalkyl substances', 'Persistent fluorinated chemicals used in resists and coolants, now under regulatory restriction.', 'business', 'ethics'],
  ['PFC', 'Perfluorinated compound', 'Process gases including NF₃ and SF₆, with global warming potentials thousands of times CO₂. Abated at point of use.', 'business', 'ethics'],
  ['RBA', 'Responsible Business Alliance', 'The industry code of conduct covering labour, health, safety and ethics across the supply chain.', 'business', 'ethics'],
  ['ROI', 'Return on investment', 'Whether the money came back. On a chip programme, four years later.', 'business', 'business'],
  ['SIA', 'Semiconductor Industry Association', 'The US industry body. A common source for market and policy figures.', 'business'],
  ['TAM', 'Total addressable market', 'Everything that could theoretically be sold. Usually the most optimistic number in any deck.', 'business', 'business'],
  ['3TG', 'Tin, tantalum, tungsten, gold', 'The conflict minerals subject to sourcing due diligence. Used throughout electronics.', 'business', 'ethics'],
]

export const ACRONYMS = RAW.map(([acronym, expansion, meaning, category, tab]) => ({
  acronym, expansion, meaning, category, tab: tab || null,
}))

/** Case- and punctuation-insensitive match across all three fields. */
export function searchAcronyms(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return ACRONYMS
  const bare = q.replace(/[^a-z0-9]/g, '')
  return ACRONYMS.filter((a) => {
    const ac = a.acronym.toLowerCase()
    return ac.includes(q) ||
      ac.replace(/[^a-z0-9]/g, '').includes(bare) ||
      a.expansion.toLowerCase().includes(q) ||
      a.meaning.toLowerCase().includes(q)
  })
}
