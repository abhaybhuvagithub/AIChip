// Sand to silicon, as eight refinements.
//
// The through-line is purity, not shape. Quartz rock arrives around 99% pure
// and leaves the polysilicon plant at 99.9999999% — one foreign atom per
// billion silicon atoms. Everything before the fab exists to remove nine
// nines' worth of impurity; everything after it exists to put a controlled
// amount back in exactly the right places.
//
// The second through-line is that no human touches any of it. That is not a
// convenience. A fully gowned person still sheds particles continuously, and
// a particle is a defect. Automation in a modern fab is a yield requirement.

export const CHAIN = [
  {
    id: 'quartzite',
    name: 'Quartzite',
    formula: 'SiO₂',
    one: 'A rock that is already a quarter silicon by weight.',
    purity: 0.99,              // fraction pure
    temp: 'Ambient',
    what: 'High-grade quartz rock is mined, crushed and washed. Not beach sand — that carries too much iron, aluminium and organic matter. What the industry wants is massive vein quartz, chosen for what it lacks rather than what it contains.',
    chem: 'Silicon is the second most abundant element in the crust, but never found free. It is always bound to oxygen, and every step after this one is a fight to take the oxygen away.',
    autonomy: 'Automated crushing, washing and optical sorting. Ore grade is assayed continuously and the blend adjusted to hold input chemistry steady.',
    energyKwhPerKg: 0.1,
    lossFactor: 1,
    stat: '~28% of the Earth\'s crust by mass',
  },
  {
    id: 'mgsi',
    name: 'Carbothermic reduction',
    formula: 'SiO₂ + 2C → Si + 2CO',
    one: 'Burn the oxygen off with carbon, at nineteen hundred degrees.',
    purity: 0.99,
    temp: '~1,900 °C',
    what: 'Quartzite, coal, charcoal and wood chips are fed into a submerged electric arc furnace. Carbon strips the oxygen and molten metallurgical-grade silicon is tapped from the bottom, around 98–99% pure. Most of the world\'s output goes to aluminium alloys and silicones; only a sliver continues toward electronics.',
    chem: 'The furnace runs continuously for years. Electrodes are consumed and fed downward as they burn, and the reaction zone is never directly observed — it is inferred entirely from electrical and thermal signatures.',
    autonomy: 'Electrode position, feed rate and power are held by closed-loop control against furnace impedance. Tapping is on a robotic lance. Nobody looks inside.',
    energyKwhPerKg: 12,
    lossFactor: 2.5,          // kg quartzite per kg of this stage's output
    stat: '~12 kWh per kg — the single most energy-hungry step by mass',
  },
  {
    id: 'tcs',
    name: 'Trichlorosilane',
    formula: 'Si + 3HCl → SiHCl₃ + H₂',
    one: 'Turn the silicon into a liquid you can distil.',
    what: 'Powdered metallurgical silicon reacts with hydrogen chloride in a fluidised bed at around 300 °C. The product, trichlorosilane, boils at 32 °C — and that is the entire point. A liquid can be fractionally distilled; a metal cannot.',
    formula2: 'Purification happens here, not in the furnace.',
    chem: 'Impurities form chlorides with different boiling points. Repeated fractional distillation through tall columns separates them, and this is where the purity is actually won — the Siemens reactor that follows only converts what distillation has already cleaned.',
    purity: 0.9999999,
    temp: '~300 °C',
    autonomy: 'Distillation columns are the oldest fully automated chemistry there is. Column temperature and reflux ratio run on cascaded control loops; composition is watched by in-line analysers.',
    energyKwhPerKg: 15,
    lossFactor: 1.2,
    stat: 'Boiling point 31.8 °C — the reason this step exists',
  },
  {
    id: 'poly',
    name: 'Siemens deposition',
    formula: 'SiHCl₃ + H₂ → Si + 3HCl',
    one: 'Grow it back as a solid, one atom at a time, on a hot rod.',
    what: 'Purified trichlorosilane and hydrogen flow into a bell-jar reactor over silicon filaments heated to about 1,100 °C. Silicon deposits on the rods for days until they grow to 150–200 mm across. The result is electronic-grade polysilicon: 99.9999999% pure or better.',
    chem: 'Nine nines means fewer than one foreign atom per billion. At this purity the material is useless as a conductor and useless as an insulator, which is exactly the condition a semiconductor needs before doping gives it a job.',
    purity: 0.999999999,
    temp: '~1,100 °C',
    autonomy: 'Runs unattended for two to three days per batch. Rod temperature is held by optical pyrometry, gas flows by mass-flow controllers, and the reactor is opened only when the batch is finished.',
    energyKwhPerKg: 60,
    lossFactor: 1.4,
    stat: '9N purity — 1 impurity atom per 1,000,000,000',
  },
  {
    id: 'cz',
    name: 'Czochralski pull',
    formula: 'Si (poly) → Si (single crystal)',
    one: 'Melt it, dip a seed, and pull one perfect lattice out.',
    what: 'Polysilicon chunks are melted at 1,414 °C in a quartz crucible. A small seed crystal is lowered to touch the surface and withdrawn while rotating. The melt freezes onto the seed in its exact orientation, and a boule up to two metres long comes out as one continuous crystal.',
    chem: 'Dopant is added to the melt here — the first time anything is deliberately put back in. Pull rate controls diameter; a narrow neck is drawn first to shed dislocations before the crystal is allowed to widen.',
    purity: 0.999999999,
    temp: '1,414 °C',
    autonomy: 'The puller holds diameter to within a millimetre by watching the bright meniscus ring with a camera and correcting pull rate in real time — a vision-based control loop running for three days straight.',
    energyKwhPerKg: 40,
    lossFactor: 1.2,
    stat: '~2 m long, ~265 kg, one crystal',
  },
  {
    id: 'slice',
    name: 'Slice and polish',
    formula: 'Boule → wafers',
    one: 'Cut it into mirrors flat to a few tens of nanometres.',
    what: 'The boule is ground to exact diameter, notched to mark lattice orientation, and sliced by diamond wire into wafers 775 µm thick. Each is lapped, etched to remove saw damage, then chemically-mechanically polished to a surface flat enough for a scanner to focus on.',
    chem: 'Wire-saw kerf destroys 30–40% of the crystal as dust. It is the largest single material loss in the whole chain, and it is why sawing methods are still an active research area.',
    purity: 0.999999999,
    temp: 'Ambient',
    autonomy: 'Wafers move between saw, lapper, etch and polish on robotic handlers and never touch skin. Every wafer is laser-scanned for particles and flatness before it is allowed into a FOUP.',
    energyKwhPerKg: 30,
    lossFactor: 1.6,
    stat: '300 mm wafer: 127 g, 775 µm thick',
  },
  {
    id: 'fab',
    name: 'The fab',
    formula: 'Wafer → patterned wafer',
    one: 'Seven hundred steps, three months, no hands.',
    what: 'The wafer enters a FOUP — a sealed pod with its own filtered micro-environment — and does not leave it again except inside a tool. Overhead hoist vehicles carry pods along ceiling rails between hundreds of tools, dispatched by software that is solving a scheduling problem continuously.',
    chem: 'This is where the purity is spent. Dopants, metals and dielectrics are added back in precise amounts at precise depths, sixty to eighty patterned layers deep.',
    purity: 0.999999999,
    temp: 'Ambient to 1,100 °C, depending on the step',
    autonomy: 'The most automated factory type on Earth. Tools talk to the host over SECS/GEM, run-to-run control adjusts recipes from the last lot\'s metrology, and fault detection pulls a tool offline on a signature drift before a wafer is damaged. Humans handle exceptions, not wafers.',
    energyKwhPerKg: 5700,
    lossFactor: 1.02,
    stat: '~730 kWh per wafer at the leading edge',
  },
  {
    id: 'die',
    name: 'Die',
    formula: 'Wafer → chips',
    one: 'A gram of rock, three months ago.',
    what: 'The wafer is thinned, diced, and the known-good dies are packaged and tested. What ships weighs a fraction of a gram and contains tens of billions of switching elements, each one placed by machines working to tolerances no hand could hold and no eye could check.',
    chem: 'Trace the object backward and it is a piece of quartz rock that was heated, dissolved, distilled, re-grown, re-melted, sliced, and printed on eighty times.',
    purity: 0.999999999,
    temp: 'Ambient',
    autonomy: 'Fully automated grind, dice, pick-and-place, bond and test. The first human contact with the finished part is usually the customer.',
    energyKwhPerKg: 0,
    lossFactor: 1,
    stat: 'A phone SoC die: about 0.2 g of silicon',
  },
]

// What actually makes a fab run without people in it.
export const AUTOMATION = [
  {
    k: 'FOUP',
    name: 'Front-opening unified pod',
    what: 'A sealed carrier holding 25 wafers in their own nitrogen-purged micro-environment. The cleanroom air is clean; the inside of a FOUP is cleaner. Wafers are exposed only inside a tool\'s load port.',
  },
  {
    k: 'AMHS',
    name: 'Automated material handling',
    what: 'Overhead hoist vehicles running on ceiling rails carry pods between tools and stockers. A large fab moves tens of thousands of pods a day on rails that never cross a walkway.',
  },
  {
    k: 'SECS/GEM',
    name: 'Tool-to-host protocol',
    what: 'A standard every tool speaks, so the manufacturing execution system can start a job, read status, and collect trace data from a scanner and an etcher in the same language.',
  },
  {
    k: 'R2R / APC',
    name: 'Run-to-run control',
    what: 'Metrology from the last lot adjusts the recipe for the next one automatically. Drift is corrected before it becomes a deviation, without anyone deciding to correct it.',
  },
  {
    k: 'FDC',
    name: 'Fault detection and classification',
    what: 'Thousands of sensor traces per tool are watched against learned signatures. A chamber that is starting to fail is taken offline on the pattern, not on the scrap.',
  },
  {
    k: 'Scheduling',
    name: 'Dispatch',
    what: 'With hundreds of tools, re-entrant flows and lots at seventy different steps at once, deciding what runs next is a continuous optimisation. No human could hold the state.',
  },
]

export const WHY_NO_HUMANS = [
  'A fully gowned person in a cleanroom still sheds particles continuously. A particle landing on a wafer between layers is a defect, and a defect is a dead die.',
  'Three hundred millimetre wafers in a loaded FOUP are heavy and awkward, and a dropped pod is twenty-five wafers and three months of work.',
  'A leading-edge line runs 24/7 for years. Consistency over that horizon is a machine property, not a human one.',
  'Overlay budgets are single-digit nanometres and control loops correct on millisecond timescales. There is no version of this a person could be inside.',
]
