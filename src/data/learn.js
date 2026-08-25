// Guided tour + quiz. Both exist because the fab line is only interesting
// once you know which numbers to watch, and the quiz is the cheapest way to
// find out whether the line actually taught anything.

export const TOUR = [
  { id: 't1', tab: 'line', title: 'Start where the wafer starts', body: 'Open the fab line and click Crystal growth. A chip begins as sand refined to nine-nines purity and pulled into one continuous crystal. Every later step assumes that lattice is perfect.' },
  { id: 't2', tab: 'line', title: 'Find the step everything orbits', body: 'Click Lithography. A leading-edge part goes through it 60–80 times. Scanner throughput is the constraint the whole fab is scheduled around, which is why one tool costs as much as an aircraft.' },
  { id: 't3', tab: 'line', title: 'Notice the loop', body: 'Coat, expose, develop, etch, deposit, polish — then back to coat. The line is not 17 steps, it is six steps run dozens of times, each pass adding one layer.' },
  { id: 't4', tab: 'wafer', title: 'Watch area punish you twice', body: 'On the wafer map, drag die size up. Gross dies fall, and yield falls at the same time. That double penalty is the entire economic case for chiplets.' },
  { id: 't5', tab: 'wafer', title: 'Change the model, change the story', body: 'Switch between Poisson and negative binomial at a large die size. Same defect density, very different yield — because real defects cluster, and the model you pick decides whether the product looks viable.' },
  { id: 't6', tab: 'wafer', title: 'Read the edge', body: 'Raise edge exclusion. Those outer dies were never countable, and the ring you lose grows with wafer diameter — one of several reasons 450 mm never paid for itself.' },
  { id: 't7', tab: 'economics', title: 'Follow the money to the good die', body: 'Cost per good die, not yield, is what a fab is run to. A 40% yield on a cheap wafer can beat 80% on an expensive one. Try the automotive MCU against the AI accelerator.' },
  { id: 't8', tab: 'nodes', title: 'See why the names stopped meaning anything', body: 'From 22 nm the number stops describing a measurable dimension. What kept improving is density and the transistor architecture — planar to fin to nanosheet, one more side of the channel each time.' },
  { id: 't9', tab: 'quiz', title: 'Check it landed', body: 'Twelve questions. Everything needed to answer them is on the other four tabs.' },
]

export const QUIZ = [
  {
    q: 'Lithography bays are lit in yellow. Why?',
    opts: ['Yellow light penetrates cleanroom air better', 'Photoresist is insensitive to wavelengths above ~500 nm', 'It reduces eye strain on 12-hour shifts', 'It makes particles visible on the wafer'],
    a: 1,
    why: 'Resist is exposed by UV. Yellow light is long enough in wavelength to leave it unexposed, so people can work in a lit room without fogging every wafer.',
  },
  {
    q: 'A single EUV exposure at 13.5 nm happens in a vacuum. What forces that?',
    opts: ['The mirrors would oxidise in air', 'Air absorbs EUV — no material transmits it usefully', 'Vibration control requires evacuating the chamber', 'The plasma source needs vacuum to ignite'],
    a: 1,
    why: 'EUV is absorbed by essentially everything, air included. That is also why the optics are reflective mirrors rather than lenses.',
  },
  {
    q: 'Doubling die area hurts twice. What are the two effects?',
    opts: ['Fewer gross dies, and higher defect density', 'Fewer gross dies, and lower yield per die', 'Higher wafer cost, and longer cycle time', 'Lower yield, and more mask layers'],
    a: 1,
    why: 'Gross dies per wafer falls roughly with area, and a bigger die is a bigger target for the same defect density — so good dies per wafer collapses faster than area alone suggests.',
  },
  {
    q: 'Why does the negative binomial model give a higher yield than Poisson for a large die?',
    opts: ['It assumes fewer defects overall', 'It accounts for clustering, so defects overlap on the same dies', 'It ignores edge dies', 'It includes the line yield term'],
    a: 1,
    why: 'Clustered defects land repeatedly on already-dead dies instead of killing fresh ones. Poisson assumes independence and therefore over-counts the damage.',
  },
  {
    q: 'What sets the maximum size of a single monolithic die?',
    opts: ['Wafer diameter', 'The scanner reticle field, about 26 x 33 mm', 'The dicing blade width', 'Package substrate size'],
    a: 1,
    why: 'The scanner prints one field at a time. Anything bigger has to be stitched or split into chiplets — which is exactly what the largest accelerators do.',
  },
  {
    q: 'Why did hafnium oxide replace silicon dioxide as the gate dielectric?',
    opts: ['It is cheaper to deposit', 'Thin SiO₂ leaked by quantum tunnelling', 'It withstands higher anneal temperatures', 'It improves lithographic contrast'],
    a: 1,
    why: 'Below roughly 45 nm the oxide needed was only a few atoms thick and electrons tunnelled straight through. A high-k material gives the same capacitance at a physically thicker film.',
  },
  {
    q: 'What does CMP exist to prevent?',
    opts: ['Metal contamination of the silicon', 'Topography accumulating until lithography cannot focus', 'Wafer warpage during anneal', 'Copper electromigration'],
    a: 1,
    why: 'Depth of focus at the leading edge is around 100 nm. Without planarising between layers, surface relief exceeds it within a few levels and the pattern stops printing.',
  },
  {
    q: 'A wafer map shows failures in a ring around the edge. What does that suggest?',
    opts: ['Random particle contamination', 'A process uniformity or edge-handling problem', 'A bad mask', 'Test program error'],
    a: 1,
    why: 'Spatial signature is diagnostic. Random speckle points at particles; rings point at uniformity across the wafer; repeating patterns point at the reticle.',
  },
  {
    q: 'Why do chiplets improve economics even though packaging gets harder?',
    opts: ['Smaller dies yield far better, and only known-good ones get packaged', 'Chiplets use cheaper wafers', 'Packaging is always cheaper than silicon', 'They need fewer mask layers'],
    a: 0,
    why: 'Yield falls sharply with area, so four small dies beat one large one — and each is tested before assembly, so you are not packaging failures.',
  },
  {
    q: 'What is binning?',
    opts: ['Sorting wafers by lot', 'Selling the same die as different products by grade or fused-off blocks', 'Discarding failed dies at sort', 'Grouping masks by layer'],
    a: 1,
    why: 'A die with one failed core is not scrap, it is a cheaper SKU. Harvesting turns a yield distribution into a product ladder, which is why yield alone does not decide profit.',
  },
  {
    q: 'Gate-all-around wraps the gate on how many sides of the channel?',
    opts: ['One', 'Three', 'Four', 'Two'],
    a: 2,
    why: 'Planar controls one side, FinFET three, GAA nanosheet all four. Each step buys back electrostatic control lost to short-channel effects.',
  },
  {
    q: 'Roughly how long does a wafer take from start to finished part?',
    opts: ['2–3 weeks', '3–4 months', '6–8 days', 'About a year'],
    a: 1,
    why: 'Around 700–1,500 process steps, most of them queued behind tools. That long pipeline is why capacity decisions have to be made years before demand shows up.',
  },
]
