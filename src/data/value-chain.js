// Who actually does what.
//
// Everything else on this site is physics and arithmetic about one die. This
// file is about the industrial structure around it, which is the most
// specialised supply chain on Earth: a dozen layers deep, and most layers have
// fewer than five viable suppliers. Several have one.
//
// Sourcing rules from the Silicon tab apply here too. Terafab in particular is
// an announced project, not an operating factory, and the entries below say
// which figures are confirmed commitments and which are stated ambitions.

export const LAYERS = [
  {
    id: 'isa', icon: 'ipcore',
    name: 'Instruction set and IP',
    who: ['Arm', 'RISC-V (open standard)', 'SiFive', 'Imagination'],
    what: 'Sells the design of the processor, not the processor. A licensee gets verified RTL or an architecture licence and builds their own silicon around it.',
    capture: 'Tiny share of chip revenue, enormous share of what gets designed. Arm cores ship in the billions annually without Arm ever owning a fab.',
    concentration: 'Two viable options for a new design: licence Arm, or take RISC-V and build the ecosystem yourself.',
  },
  {
    id: 'eda', icon: 'eda',
    name: 'Design automation',
    who: ['Synopsys', 'Cadence', 'Siemens EDA'],
    what: 'The software without which a modern chip cannot be designed at all — synthesis, place and route, timing closure, verification, and the foundry-certified process design kits.',
    capture: 'A rounding error against foundry revenue, and an absolute chokepoint. Nobody tapes out a leading-edge design without these tools.',
    concentration: 'Three companies, worldwide.',
  },
  {
    id: 'fabless', icon: 'fabless',
    name: 'Fabless design',
    who: ['Apple', 'NVIDIA', 'Qualcomm', 'AMD', 'Broadcom', 'MediaTek'],
    what: 'Designs the chip, owns the product and the customer relationship, and never touches a wafer. This is the model that has won the last thirty years.',
    capture: 'The largest margins in the industry, because the capital risk sits with somebody else.',
    concentration: 'Crowded at the bottom, extremely thin at the leading edge — a full N3 mask set and design programme runs into hundreds of millions.',
  },
  {
    id: 'foundry', icon: 'foundry',
    name: 'Foundry',
    who: ['TSMC', 'Samsung Foundry', 'Intel Foundry', 'GlobalFoundries', 'UMC', 'SMIC'],
    what: 'Owns the fab and sells wafer starts. Takes the capital risk that makes the fabless model possible in the first place.',
    capture: 'Enormous revenue against enormous fixed cost. A leading-edge fab is $15–30B before it makes a single wafer.',
    concentration: 'Effectively one merchant supplier at the very top nodes, which is the single most consequential fact about the industry.',
  },
  {
    id: 'equipment', icon: 'equipment',
    name: 'Equipment',
    who: ['ASML', 'Applied Materials', 'Lam Research', 'Tokyo Electron', 'KLA'],
    what: 'Builds the scanners, etchers, deposition chambers and inspection tools. A fab is largely a building full of these.',
    capture: 'Roughly the cost of the fab itself. Tools are the majority of fab capex.',
    concentration: 'One company on Earth makes EUV scanners. There is no second source, and that is why export controls on lithography bite the way they do.',
  },
  {
    id: 'materials', icon: 'materials',
    name: 'Materials',
    who: ['Shin-Etsu', 'SUMCO (wafers)', 'JSR', 'Tokyo Ohka (resist)', 'Linde (gases)'],
    what: 'Blank wafers, photoresist, specialty gases, slurries, and the ultrapure chemistry the whole line runs on.',
    capture: 'Low margin, low visibility, absolutely load-bearing. A resist shortage stops a fab as surely as a scanner failure.',
    concentration: 'Heavily Japanese, and thin. Two companies supply most of the world\'s 300 mm blank wafers.',
  },
  {
    id: 'osat', icon: 'osat',
    name: 'Assembly and test',
    who: ['ASE', 'Amkor', 'JCET', 'TSMC (advanced packaging)'],
    what: 'Dices, packages, bonds and tests. Historically the commodity end of the chain — and no longer, now that packaging is where performance is won.',
    capture: 'Rising fast. Advanced packaging capacity is currently a harder constraint than leading-edge wafer capacity.',
    concentration: 'Broad for conventional packaging, very narrow for 2.5D and 3D.',
  },
]

// Arm gets its own section because it is the layer people forget exists, and
// because the model itself — sell the design, never build anything — is the
// thing that made the fabless world possible.
export const ARM = {
  what: 'Arm sells processor designs and the right to build them. It has never owned a fab, and until recently never sold a chip. Its cores are in essentially every phone on Earth, in Apple\'s M-series, in NVIDIA\'s Grace and Vera CPUs, and increasingly in datacentre silicon designed by the hyperscalers themselves.',
  licences: [
    {
      k: 'Core licence', icon: 'ipcore',
      what: 'You take a verified Arm core — a Cortex-A for phones, a Neoverse for servers — drop it into your design and pay a royalty on every chip shipped. Fast, low-risk, and your CPU is the same as everyone else\'s.',
    },
    {
      k: 'Architecture licence', icon: 'iplicense',
      what: 'You licence the instruction set and design your own core that implements it. Far more expensive, far more work, and the only way to differentiate on the CPU itself. Apple holds one, which is why Apple cores beat stock Arm cores.',
    },
    {
      k: 'CSS — Compute Subsystem', icon: 'ipnoc',
      what: 'A pre-validated block: cores, mesh interconnect, memory and interrupt controllers, floorplanned and verified together. It moves Arm up the stack from selling a part to selling most of the chip.',
    },
    {
      k: 'CSA — Chiplet System Architecture', icon: 'chiplet',
      what: 'A published specification for how chiplets from different vendors talk to each other, over AMBA CHI C2C and UCIe. An attempt to make a multi-vendor chiplet market exist at all, rather than each company building its own private one.',
    },
  ],
  ownSilicon: 'In 2026 Arm went further and announced its own complete chip — the Arm AGI CPU, built on Neoverse V3 cores at TSMC on a 3 nm process, with memory and I/O attached as chiplets. Reports put it at 136 Neoverse V3 cores on Armv9.2, in full production in the second half of 2026, with early customers including Meta, OpenAI, SAP, Cerebras, Cloudflare and SK Telecom. That is a licensor becoming a supplier, and it puts Arm in tension with the customers it licenses to.',
  tension: 'The pitch is that a turnkey CPU compresses a custom silicon programme from years to months. The cost is that Arm now competes with its own licensees, including sister company Ampere under the same SoftBank ownership. Meanwhile RISC-V — an open instruction set with no licence fee — grows fastest exactly where Arm\'s royalties are most visible: embedded, storage controllers, and anything shipped in enormous volume at low margin. Published share estimates vary widely depending on whether you count chips, cores, or dollars.',
}

export const MODELS = [
  {
    id: 'idm',
    name: 'Integrated device manufacturer',
    who: 'Intel, Samsung, Texas Instruments, Micron, SK Hynix',
    how: 'Design and manufacture in the same company. The original model, and still how all memory is made.',
    pro: 'Design and process co-optimised. No margin paid to a foundry, and no queue behind somebody else\'s product.',
    con: 'You carry the fab through every downturn. Intel\'s 10 nm difficulties held its product line hostage for years in a way a fabless company would simply have routed around.',
  },
  {
    id: 'fabless', icon: 'fabless',
    name: 'Fabless plus foundry',
    who: 'Apple, NVIDIA, Qualcomm, AMD, and effectively everyone new',
    how: 'Design the chip, buy wafer starts from TSMC or Samsung, buy packaging from an OSAT. Specialise, and let each layer be world-class at one thing.',
    pro: 'No capital risk, access to the best available process without owning it, and the ability to switch nodes and foundries.',
    con: 'You are in a queue you do not control, for capacity you do not own, at a supplier your competitors also use.',
  },
  {
    id: 'vertical',
    name: 'Vertical re-integration',
    who: 'Terafab (Tesla, SpaceX); Intel Foundry, in the other direction',
    how: 'Bring design, logic, memory, packaging and test back under one roof — betting that the specialisation which made the industry efficient has become a liability when capacity itself is the scarce resource.',
    pro: 'Control of supply, and a much shorter design-iteration loop if the chip and the fab are in the same building.',
    con: 'Every layer you re-integrate is one where a dedicated specialist has thirty years of head start. This is the argument the industry settled decades ago, being reopened.',
  },
]

// Fab scale. The terminology is real industry shorthand; the top tier is a
// proposal, and is labelled as one.
export const FAB_TIERS = [
  {
    id: 'fab', name: 'Fab', wpm: 20000,
    note: 'A conventional single fab. Mature nodes, specialty processes, most of the world\'s chips by unit count.',
    real: true,
  },
  {
    id: 'megafab', name: 'Megafab', wpm: 65000,
    note: 'TSMC\'s shorthand for a complex running roughly 30,000 to 100,000 wafer starts a month.',
    real: true,
  },
  {
    id: 'gigafab', name: 'Gigafab', wpm: 150000,
    note: 'Above 100,000 wafer starts a month. A handful exist, and they are among the most capital-intensive objects humans build.',
    real: true,
  },
  {
    id: 'terafab', name: 'Terafab', wpm: 400000,
    note: 'The proposed next tier, and the origin of the name. The wafer-start figure here is illustrative — no such number has been published — so treat this row as a what-if, not a specification.',
    real: false,
  },
]

export const TERAFAB = {
  status: 'Announced and permitted, not operating.',
  confirmed: [
    ['Owners', 'Tesla and SpaceX, with Intel reported as a partner'],
    ['Site', 'Grimes County, Texas, near College Station'],
    ['Phase one capital', 'More than $16.8 billion, per the Texas governor\'s office'],
    ['Phase one jobs', 'About 3,000'],
    ['Planned footprint', 'Around 100 million square feet — which would make it the largest building on Earth'],
    ['Precursor', 'A research fab at Giga Texas North Campus, broken ground April 2026'],
  ],
  ambitions: [
    ['Process target', '2 nm class'],
    ['Scope', 'Logic, memory, advanced packaging and test in one facility'],
    ['Output framing', 'More than a terawatt of compute annually — a metric that does not come from the chip industry, and which critics note originates in orbital-datacentre planning rather than semiconductor practice'],
    ['Products', 'Inference silicon for Tesla Optimus and Cybercab, and high-power chips for SpaceX space-based datacentres'],
  ],
  why: 'The actual idea is not size, it is the iteration loop. Today a design change means shipping wafers between continents and waiting months. The claim is that with design, lithography, packaging and test in one building you can make a chip, test it, revise the mask and repeat — compressing a cycle measured in quarters into one measured in weeks.',
  against: 'Every stage being consolidated is one where a specialist has decades of accumulated process knowledge, and the fab line tab is a reasonable guide to how much of that there is. The largest private semiconductor investment attempted in the United States is a real commitment; the physics, the staffing and the yield curve of everything after phase one are not yet demonstrated. Coverage has been openly split on whether the terawatt framing means anything measurable.',
}
