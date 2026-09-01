// Real parts, so the models on the other tabs have something to bite on.
//
// Sourcing discipline, because this is the file most likely to go quietly
// wrong: transistor counts and die areas are vendor figures where vendors
// publish them and third-party die-shot measurements where they do not.
// Apple has never published a die area in its life; every Apple number here
// is measured off a die shot by someone else. Google publishes almost nothing
// about TPU silicon — pod-level throughput, yes; die area, no — so those
// entries say so rather than guessing.
//
// `est` marks a figure that is an estimate or a measurement rather than a
// vendor specification. `areaKnown: false` means nobody outside the company
// knows, and the UI refuses to pretend otherwise.
//
// Areas are stored as mm². Width and height are almost never published, so
// the yield lab loads a square of the same area — which is what matters for
// dies-per-wafer, and is stated in the UI.

export const MAKERS = {
  apple: { name: 'Apple', hue: '#a0a0a8' },
  google: { name: 'Google', hue: '#4dd6e8' },
  nvidia: { name: 'NVIDIA', hue: '#76b900' },
  amd: { name: 'AMD', hue: '#f6685e' },
  intel: { name: 'Intel', hue: '#5aa9e6' },
  arm: { name: 'Arm', hue: '#00c1de' },
  tesla: { name: 'Tesla', hue: '#e82127' },
  qualcomm: { name: 'Qualcomm', hue: '#3253dc' },
  cerebras: { name: 'Cerebras', hue: '#ffb020' },
  broadcom: { name: 'Broadcom', hue: '#cc0000' },
  graphcore: { name: 'Graphcore', hue: '#ff6b35' },
  ibm: { name: 'IBM', hue: '#8a9ba8' },
  aws: { name: 'AWS', hue: '#ff9900' },
  // Kept deliberately small. "Others" was doing real work here — it held Tesla
  // and Qualcomm, which are not footnotes — and a bucket that large is a sign
  // the taxonomy has stopped describing the thing. It is now genuinely for
  // parts whose maker appears once.
  other: { name: 'Others', hue: '#a679ff' },
}

/**
 * Where a part is in its life, which the single `year` field could not express.
 *
 * `year` conflated two different dates — when a chip was unveiled and when
 * anyone could buy one — which for silicon are routinely two or three years
 * apart. Ponte Vecchio was announced in 2019 and shipped in 2023. Separating
 * them also makes the gap visible, and the gap is often the story.
 *
 * `status` is the field most likely to go stale, and it is dated for that
 * reason: a status with no as-of date is a claim about the present made by
 * someone who has left the building.
 */
export const STATUS_AS_OF = 'September 2026'

export const STATUS = {
  shipping: { label: 'Shipping', hue: '#31c48d', note: 'Available to buy now, in volume.' },
  ramping: { label: 'Ramping', hue: '#4dd6e8', note: 'Announced and in production, not yet at volume.' },
  announced: { label: 'Announced', hue: '#ffb020', note: 'Publicly detailed, not yet shipping.' },
  expected: { label: 'Expected', hue: '#a679ff', note: 'Reported or projected, not formally announced. Treat the numbers as provisional.' },
  legacy: { label: 'Legacy', hue: '#8ea2c0', note: 'Superseded, still in the field and still supported.' },
  discontinued: { label: 'Discontinued', hue: '#f6685e', note: 'No longer made. Some of these were cancelled rather than retired, which is a different thing and is said in the text.' },
}

export const CATEGORIES = {
  mobile: 'Phone and tablet',
  pc: 'Laptop, desktop and server',
  ai: 'Datacentre AI',
  network: 'Networking',
  sensor: 'Image sensor',
  power: 'Power',
  embedded: 'Embedded and automotive',
  extreme: 'Beyond the reticle',
}

export const SILICON = [
  // ---------------- Apple ----------------
  {
    id: 'a17pro', icon: 'soc', maker: 'apple', cat: 'mobile', name: 'A17 Pro', year: 2023,
    foundry: 'TSMC', node: 'N3B', transistors: 19e9, areaMm2: 103, est: true,
    power: 8, isa: 'Arm', dies: 1,
    announced: 2023, shipped: 2023, status: 'legacy',
    what: 'The first 3 nm processor in a phone. Apple bought most of TSMC\'s early N3B capacity, which is the arrangement that has defined both companies for a decade: Apple takes the risk on a new node first, and pays for the privilege.',
    notable: 'First 3 nm consumer SoC',
  },
  {
    id: 'm1', icon: 'soc', maker: 'apple', cat: 'pc', name: 'M1', year: 2020,
    foundry: 'TSMC', node: 'N5', transistors: 16e9, areaMm2: 119, est: true,
    power: 20, isa: 'Arm', dies: 1,
    announced: 2020, shipped: 2020, status: 'legacy',
    what: 'The chip that ended Apple\'s Intel era. Its argument was not raw throughput but unified memory — CPU, GPU and neural engine addressing one pool, so data stops being copied between them.',
    notable: 'Unified memory architecture',
  },
  {
    id: 'm1ultra', icon: 'chiplet', maker: 'apple', cat: 'pc', name: 'M1 Ultra', year: 2022,
    foundry: 'TSMC', node: 'N5', transistors: 114e9, areaMm2: 420, est: true, dies: 2,
    power: 60, isa: 'Arm',
    announced: 2022, shipped: 2022, status: 'legacy',
    what: 'Two M1 Max dies joined edge-to-edge by a silicon interposer Apple calls UltraFusion, presented to software as one chip. The cleanest consumer demonstration of why the reticle limit is not the end of the road.',
    notable: 'Two dies, one logical chip',
  },
  {
    id: 'm4', icon: 'soc', maker: 'apple', cat: 'pc', name: 'M4', year: 2024,
    foundry: 'TSMC', node: 'N3E', transistors: 28e9, areaMm2: 165, est: true, dies: 1,
    power: 22, isa: 'Arm',
    announced: 2024, shipped: 2024, status: 'shipping',
    what: 'A move from the first-generation N3B to N3E, which trades a little density for markedly better yield and cost. The interesting decision at this point in the roadmap is usually which flavour of a node to use, not which node.',
    notable: 'N3E for yield over density',
  },
  {
    id: 'm5', icon: 'soc', maker: 'apple', cat: 'pc', name: 'M5', year: 2025,
    foundry: 'TSMC', node: 'N3P', transistors: 28e9, areaMm2: 150, est: true, dies: 1,
    power: 22, isa: 'Arm',
    announced: 2025, shipped: 2025, status: 'shipping',
    what: 'Apple stayed on 3 nm rather than taking N2 first, reportedly on cost. Reports differ on whether the base part is N3E or N3P. The M5 Pro and Max that followed in March 2026 bond two dies together under a scheme Apple calls Fusion Architecture.',
    notable: 'Stayed on 3 nm; Pro/Max went dual-die',
  },
  {
    id: 'm6', icon: 'soc', maker: 'apple', cat: 'pc', name: 'M6 / A20', year: 2026,
    foundry: 'TSMC', node: 'N2', transistors: 0, areaMm2: 0, areaKnown: false, dies: 1,
    power: 0, isa: 'Arm', upcoming: true,
    status: 'expected',
    what: 'The move to N2 — TSMC\'s first gate-all-around nanosheet node, and the first change in transistor architecture since FinFET arrived in 2011. More than half of TSMC\'s initial N2 allocation is reported to go to Apple.',
    notable: 'First gate-all-around Apple silicon',
  },

  // ---------------- Google ----------------
  {
    id: 'tpuv1', icon: 'npu', maker: 'google', cat: 'ai', name: 'TPU v1', year: 2015,
    foundry: 'TSMC', node: '28 nm', transistors: 0, areaMm2: 331, dies: 1,
    power: 75, isa: 'Custom', tops: 92e12, precision: 'INT8',
    announced: 2016, shipped: 2015, status: 'discontinued',
    what: 'A deliberately boring chip built around one idea: a 256×256 systolic array of multipliers with the weights held still and the data flowing through. No caches, no speculation, no out-of-order machinery. It went from silicon to datacentre deployment in about fifteen months.',
    notable: 'The systolic array bet',
  },
  {
    id: 'tpuv4', icon: 'npu', maker: 'google', cat: 'ai', name: 'TPU v4', year: 2021,
    foundry: 'TSMC', node: '7 nm', transistors: 0, areaMm2: 0, areaKnown: false, dies: 1,
    power: 200, isa: 'Custom', est: true, tops: 275e12, precision: 'BF16',
    announced: 2021, shipped: 2022, status: 'legacy',
    what: 'Introduced optical circuit switching between pods, so the interconnect topology can be reconfigured for the shape of the job rather than fixed at build time. Google publishes pod throughput freely and die area almost never.',
    notable: 'Optically switched interconnect',
  },
  {
    id: 'tpuv7', icon: 'chiplet', maker: 'google', cat: 'ai', name: 'TPU v7 (Ironwood)', year: 2025,
    foundry: 'TSMC', node: 'Undisclosed', transistors: 0, areaMm2: 0, areaKnown: false, dies: 2,
    power: 0, isa: 'Custom', precision: 'FP8',
    announced: 2025, shipped: 2025, status: 'shipping',
    what: 'A dual-chiplet part: two TensorCores and four SparseCores per chip, 192 GB of HBM at about 7.4 TB/s, in 9,216-chip liquid-cooled pods delivering 42.5 exaflops. The first TPU generation whose physical layout was optimised by a reinforcement learning tool.',
    notable: '9,216 chips per pod, 42.5 EFLOPS',
  },
  {
    id: 'tpu8t', icon: 'npu', maker: 'google', cat: 'ai', name: 'TPU 8t', year: 2026,
    foundry: 'TSMC', node: 'Undisclosed', transistors: 0, areaMm2: 0, areaKnown: false, dies: 1,
    power: 0, isa: 'Custom', precision: 'FP4',
    announced: 2026, status: 'announced',
    what: 'The eighth generation split into two chips — the first time Google has fielded genuinely distinct training and inference silicon in one generation. The 8t is the training half, designed with Broadcom, in superpods of 9,600 chips sharing two petabytes of HBM and delivering 121 FP4 exaflops.',
    notable: '121 EFLOPS per superpod',
  },
  {
    id: 'tpu8i', icon: 'npu', maker: 'google', cat: 'ai', name: 'TPU 8i', year: 2026,
    foundry: 'TSMC', node: 'Undisclosed', transistors: 0, areaMm2: 0, areaKnown: false, dies: 1,
    power: 0, isa: 'Custom', precision: 'FP4',
    announced: 2026, status: 'announced',
    what: 'The inference half, designed with MediaTek. Around 10.1 FP4 petaflops per chip, 384 MB of on-chip SRAM — triple the previous generation — and 288 GB of HBM at 8.6 TB/s. The SRAM number is the tell: serving is a memory problem before it is an arithmetic one.',
    notable: '384 MB on-chip SRAM',
  },

  // ---------------- NVIDIA ----------------
  {
    id: 'h100', icon: 'gpu', maker: 'nvidia', cat: 'ai', name: 'H100', year: 2022,
    foundry: 'TSMC', node: '4N', transistors: 80e9, areaMm2: 814, dies: 1,
    power: 700, isa: 'Custom', tops: 990e12, precision: 'FP16',
    announced: 2022, shipped: 2022, status: 'shipping',
    what: 'A single die pressed right against the reticle field, and the part most of the current AI buildout was trained on. It is also the calibration point for the compute model on this site: 80 billion transistors, about 280,000 tensor MAC lanes, 1.755 GHz.',
    notable: 'Reticle-limit monolithic die',
  },
  {
    id: 'b200', icon: 'chiplet', maker: 'nvidia', cat: 'ai', name: 'B200 (Blackwell)', year: 2024,
    foundry: 'TSMC', node: '4NP', transistors: 208e9, areaMm2: 800, est: true, dies: 2,
    power: 1000, isa: 'Custom',
    announced: 2024, shipped: 2024, status: 'shipping',
    what: 'Two reticle-sized dies bonded into one package and presented as a single GPU. When you cannot make the die bigger, you make the package bigger — the same conclusion Apple reached at the other end of the market.',
    notable: 'Two reticle dies, one GPU',
  },
  {
    id: 'rubin', icon: 'interposer', maker: 'nvidia', cat: 'ai', name: 'Rubin (R100)', year: 2026,
    foundry: 'TSMC', node: 'N3', transistors: 336e9, areaMm2: 800, est: true, dies: 2,
    power: 1800, isa: 'Custom', est2: true, precision: 'FP4',
    announced: 2025, status: 'announced',
    what: 'Two reticle-sized compute dies on TSMC N3, 336 billion transistors, 288 GB of HBM4 at around 22 TB/s, and roughly 50 petaflops of FP4 inference per package. A full NVL72 rack is quoted at about 3.6 exaflops.',
    notable: '336B transistors, HBM4',
  },
  {
    id: 'vera', icon: 'cpu', maker: 'nvidia', cat: 'ai', name: 'Vera CPU', year: 2026,
    foundry: 'TSMC', node: 'N3', transistors: 227e9, areaMm2: 0, areaKnown: false, dies: 1,
    power: 0, isa: 'Arm',
    announced: 2025, status: 'announced',
    what: '88 custom Arm cores, coherently attached to a Rubin GPU over NVLink-C2C. Notable mostly for the transistor count — a CPU carrying more transistors than an entire H100, because most of it is cache and interconnect rather than cores.',
    notable: 'CPU with more transistors than an H100',
  },

  // ---------------- AMD ----------------
  {
    id: 'mi300x', icon: 'interposer', maker: 'amd', cat: 'ai', name: 'Instinct MI300X', year: 2023,
    foundry: 'TSMC', node: 'N5 + N6', transistors: 153e9, areaMm2: 115, est: true, dies: 12,
    power: 750, isa: 'x86 + CDNA',
    announced: 2023, shipped: 2023, status: 'shipping',
    what: 'Eight compute dies on 5 nm stacked on four I/O dies on 6 nm, with 192 GB of HBM3 around them — thirteen pieces of silicon in one package. The clearest production example of putting each function on whichever node suits it rather than paying leading-edge prices for everything.',
    notable: 'Mixed-node 3.5D chiplets',
  },
  {
    id: 'ryzenccd', icon: 'chiplet', maker: 'amd', cat: 'pc', name: 'Ryzen CCD', year: 2022,
    foundry: 'TSMC', node: 'N5', transistors: 6.5e9, areaMm2: 71, est: true, dies: 1,
    power: 65, isa: 'x86',
    announced: 2022, shipped: 2022, status: 'shipping',
    what: 'A deliberately small eight-core compute die. The whole strategy is visible in the geometry: keep the expensive silicon tiny so it yields, put the I/O on a cheap older node, and assemble the product in the package.',
    notable: 'Small on purpose',
  },

  // ---------------- Cerebras ----------------
  {
    id: 'wse3', icon: 'waferscale', maker: 'cerebras', cat: 'extreme', name: 'WSE-3', year: 2024,
    foundry: 'TSMC', node: '5 nm', transistors: 4e12, areaMm2: 46225, dies: 1,
    power: 23000, isa: 'Custom', tops: 125e15, precision: 'FP16',
    announced: 2024, shipped: 2024, status: 'shipping',
    what: 'One chip, 215 mm on a side, occupying almost an entire 300 mm wafer. It is not diced. Reticle fields are stitched together across their boundaries so signals cross what would normally be a scribe lane, and defective cores are routed around rather than discarded — which is the only way a die this size can yield at all.',
    notable: 'The wafer is the chip',
  },
  {
    id: 'wse3t', icon: 'waferscale', maker: 'cerebras', cat: 'extreme', name: 'WSE-3 Turbo', year: 2026,
    foundry: 'TSMC', node: '5 nm', transistors: 4e12, areaMm2: 46225, dies: 1,
    power: 23000, isa: 'Custom', est: true,
    announced: 2026, status: 'expected',
    what: 'Same silicon, same node, roughly twice the performance — a generation won without a shrink. It breaks the usual pattern of Cerebras generations tracking TSMC process generations, and is a reminder that a node is only one of the levers.',
    notable: 'A generation without a shrink',
  },

  // ---------------- Others ----------------
  {
    id: 'd1', icon: 'npu', maker: 'tesla', cat: 'ai', name: 'Tesla D1 (Dojo)', year: 2021,
    foundry: 'TSMC', node: '7 nm', transistors: 50e9, areaMm2: 645, dies: 1,
    power: 400, isa: 'Custom', est: true,
    announced: 2021, shipped: 2022, status: 'discontinued',
    what: 'Built to be tiled: 25 dies bonded onto a single substrate as a "training tile" with no packaging between them, so the array behaves like one large fabric. An answer to the reticle limit sitting between chiplets and wafer scale — and a reminder that an elegant answer is not the same as a surviving one.',
    notable: 'Cancelled — Dojo was shut down in August 2025',
    epitaph: 'Tesla disbanded the Dojo team in August 2025 and the programme was ended, with the work converging on its AI5 and AI6 parts instead. Musk described the planned successor as an evolutionary dead end. The architecture was genuinely interesting and it is not coming back, which is worth recording rather than quietly deleting.',
  },
  {
    id: 'sd8elite', icon: 'soc', maker: 'qualcomm', cat: 'mobile', name: 'Snapdragon 8 Elite', year: 2024,
    foundry: 'TSMC', node: 'N3E', transistors: 0, areaMm2: 125, est: true, dies: 1,
    power: 10, isa: 'Arm',
    announced: 2024, shipped: 2024, status: 'shipping',
    what: 'The other half of the flagship phone market. Same foundry, same node family as Apple, different design philosophy — custom Arm-compatible cores clocked aggressively, in a part sold to many handset makers rather than one.',
    notable: 'Merchant flagship SoC',
  },

  // ---- networking, sensors, power: the silicon nobody writes about --------
  {
    id: 'tomahawk5', icon: 'ipnoc', maker: 'broadcom', cat: 'network', name: 'Tomahawk 5', year: 2022,
    foundry: 'TSMC', node: '5 nm', transistors: 0, areaMm2: 0, areaKnown: false, dies: 1,
    power: 0,
    announced: 2022, shipped: 2023, status: 'shipping',
    what: 'A 51.2 terabit-per-second Ethernet switch on one die. Every large AI cluster is limited as much by what moves between accelerators as by the accelerators, and this is the part doing the moving — which is why a switch ASIC belongs beside them rather than in a footnote.',
    notable: '51.2 Tb/s on a single die',
  },
  {
    id: 'imx', icon: 'ipisp', maker: 'other', cat: 'sensor', name: 'Stacked CMOS image sensor', year: 2023,
    foundry: 'Sony', node: '40 nm + 22 nm', transistors: 0, areaMm2: 0, areaKnown: false, dies: 2,
    power: 0,
    status: 'shipping',
    what: 'Two dies bonded face to face: a photodiode array optimised for capturing light on top, and a logic die underneath doing the readout and processing. Neither process can do the other job well, which is exactly the argument for stacking — and image sensors got there a decade before logic did.',
    notable: 'Stacking shipped here first, in phones',
  },
  {
    id: 'sicfet', icon: 'power', maker: 'other', cat: 'power', name: 'Silicon-carbide power MOSFET', year: 2023,
    foundry: 'Wolfspeed / Infineon / onsemi', node: 'Not a logic node', transistors: 0,
    areaMm2: 25, dies: 1,
    power: 0, est: true,
    status: 'shipping',
    what: 'One transistor, roughly the area of a fingernail, switching hundreds of amps at over a thousand volts. Silicon carbide blocks ten times the field of silicon and conducts heat three times better, which is why every fast-charging electric vehicle contains these and not silicon.',
    notable: 'A single transistor, and a whole industry',
  },
  {
    id: 'mcu', icon: 'mcu', maker: 'other', cat: 'embedded', name: 'Automotive microcontroller', year: 2022,
    foundry: 'TSMC / in-house', node: '40 nm', transistors: 0.4e9, areaMm2: 30, dies: 1,
    power: 2, isa: 'Arm', est: true,
    status: 'shipping',
    what: 'A mature-node part with embedded flash, made in enormous volume, qualified to AEC-Q100 and supplied for fifteen years. There are dozens in a modern car. Nobody writes about these and the industry could not function without them — the shortage that stopped car production in 2021 was largely this part.',
    notable: 'Dozens per car, a decade of supply',
  },

  // ---- more compute ------------------------------------------------------
  {
    id: 'pontevecchio', icon: 'chiplet', maker: 'intel', cat: 'ai', name: 'Ponte Vecchio (Xe HPC)', year: 2022,
    foundry: 'Intel + TSMC', node: 'Five nodes in one package', transistors: 100e9,
    areaMm2: 0, areaKnown: false, dies: 47,
    power: 600, isa: 'x86 + Xe', est: true,
    announced: 2019, shipped: 2023, status: 'discontinued',
    what: 'Forty-seven tiles across five process nodes from two foundries, in one package. The most aggressively disaggregated product yet shipped, and a useful demonstration that the packaging complexity is real rather than free — it was years late.',
    notable: '47 tiles, 5 nodes, 2 foundries',
  },
  {
    id: 'gc200', icon: 'waferscale', maker: 'graphcore', cat: 'ai', name: 'Colossus MK2 GC200 (IPU)', year: 2020,
    foundry: 'TSMC', node: '7 nm', transistors: 59.4e9, areaMm2: 823, dies: 1,
    power: 300, isa: 'Custom', est: true,
    announced: 2020, shipped: 2020, status: 'legacy',
    what: 'Nine hundred megabytes of SRAM on the die itself and no external memory at all — a bet that if the model fits on chip, the memory wall does not apply. It works beautifully when the model fits, and the difficulty is entirely in the word "if".',
    notable: '900 MB of on-die SRAM, no DRAM',
  },
  {
    id: 'telum', icon: 'cpu', maker: 'ibm', cat: 'pc', name: 'Telum', year: 2021,
    foundry: 'Samsung', node: '7 nm', transistors: 22.5e9, areaMm2: 530, dies: 1,
    power: 400, isa: 'z/Architecture', est: true,
    announced: 2021, shipped: 2022, status: 'shipping',
    what: 'A mainframe processor with an AI accelerator on the die, placed so a transaction can be scored for fraud while it is still in flight. Built for a market that values never being wrong over being fast, which produces very different silicon.',
    notable: 'Inference inside the transaction',
  },
  {
    id: 'graviton4', icon: 'cpu', maker: 'aws', cat: 'pc', name: 'Graviton4', year: 2023,
    foundry: 'TSMC', node: '4 nm', transistors: 73e9, areaMm2: 0, areaKnown: false, dies: 7,
    power: 0, isa: 'Arm',
    announced: 2023, shipped: 2024, status: 'shipping',
    what: 'A cloud provider designing its own server CPU, on Arm, because at their volume the economics of a custom part beat buying one. The clearest example of what the value chain tab calls the third business model — build silicon for yourself and never sell a chip.',
    notable: 'Designed by the customer, sold to nobody',
  },
  {
    id: 'lpu', icon: 'npu', maker: 'other', cat: 'ai', name: 'Groq LPU', year: 2020,
    foundry: 'GlobalFoundries', node: '14 nm', transistors: 26.8e9, areaMm2: 725, dies: 1,
    power: 300, isa: 'Custom', est: true,
    announced: 2020, shipped: 2021, status: 'shipping',
    what: 'Entirely deterministic: no caches, no branch prediction, no arbitration — the compiler schedules every cycle in advance. On a mature node, which is the point. Predictable latency is worth more than peak throughput when you are serving requests rather than training.',
    notable: 'Deterministic, on a 14 nm node',
  },
  {
    id: 'miner', icon: 'die', maker: 'other', cat: 'extreme', name: 'Bitcoin mining ASIC', year: 2023,
    foundry: 'TSMC / Samsung', node: '5 nm', transistors: 0, areaMm2: 0, areaKnown: false, dies: 1,
    power: 25, est: true,
    status: 'shipping',
    what: 'A chip that computes exactly one hash function and nothing else. The extreme end of specialisation: no memory hierarchy worth the name, no flexibility, and an efficiency per operation that no general-purpose part approaches. Made in enormous volume on leading-edge nodes.',
    notable: 'One function, and nothing else',
  },

  {
    id: 'armagi', icon: 'chiplet', maker: 'arm', cat: 'pc', name: 'Arm AGI CPU', year: 2026,
    foundry: 'TSMC', node: '3 nm', transistors: 0, areaMm2: 0, areaKnown: false, dies: 2,
    power: 0, isa: 'Arm',
    announced: 2026, status: 'ramping',
    what: 'Arm’s first complete chip in thirty-five years of selling designs rather than parts. Up to 136 Neoverse V3 cores across two chiplets, built from its own Compute Subsystem, with memory and I/O attached as further chiplets. Announced in March 2026 with Meta as launch customer.',
    notable: 'The licensor became a supplier',
  },
]

// Transistor count over time, for the log plot. Only parts with a published
// or measured count — the entries where nobody outside the company knows are
// deliberately absent rather than interpolated.
export const COUNTED = SILICON.filter((s) => s.transistors > 0)
