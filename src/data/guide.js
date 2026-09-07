// The guide.
//
// Everything else here is written for someone who already wants the detail.
// This is written for someone who does not yet know whether they do — and the
// only real test is whether a person with no background can read it once,
// start to finish, and come away able to explain a chip to someone else.
//
// Three rules were applied to every sentence below:
//
//   1. NO UNEXPLAINED JARGON. A technical word either does not appear or is
//      defined in plain words in the same breath. There is no third option
//      where the reader is expected to look it up.
//   2. PLAIN IS NOT THE SAME AS VAGUE. Simplifying by removing the numbers
//      would make this easier to write and useless to read. The numbers are
//      what make it real, so they stay — they are just given in things a
//      person can picture.
//   3. NO ANALOGY THAT MISLEADS. Photolithography genuinely is projection
//      printing and a photomask genuinely is a stencil, so those comparisons
//      are fair. Anything that would need un-teaching later was cut.

/** The whole thing, in ten steps. Each one is two or three plain sentences. */
export const STEPS = [
  {
    n: 1, title: 'Start with sand', icon: 'quartzite',
    what: 'Silicon is the second most common element in the ground. It arrives as quartz rock, which is silicon and oxygen stuck together.',
    detail: 'Getting the oxygen off, and everything else with it, is most of the work. The silicon a chip is made from is 99.9999999% pure — nine nines. If you had a swimming pool that pure, the impurity would be about a teaspoon.',
  },
  {
    n: 2, title: 'Grow one perfect crystal', icon: 'puller',
    what: 'The purified silicon is melted, and a small seed crystal is dipped in and slowly pulled out while turning.',
    detail: 'The molten silicon freezes onto the seed and copies its atomic arrangement exactly. What comes out is a single crystal, roughly a metre long and as thick as a dinner plate is wide — one continuous grid of atoms with no joins anywhere in it.',
  },
  {
    n: 3, title: 'Slice it into discs', icon: 'saw',
    what: 'The crystal is sawn into thin circular slices called wafers, about 30 centimetres across and less than a millimetre thick.',
    detail: 'Each one is then polished until it is flatter than almost anything else manufactured. Every chip on this site starts life as one of these, and one wafer becomes anywhere from a handful to several thousand chips.',
  },
  {
    n: 4, title: 'Coat it in something light-sensitive', icon: 'coater',
    what: 'The wafer is spun at high speed while a liquid is dripped on, spreading it into an even film a few hundred atoms thick.',
    detail: 'That film changes chemically wherever light hits it — the same basic idea as photographic film. It is the layer that will record the pattern.',
  },
  {
    n: 5, title: 'Print the pattern', icon: 'scanner',
    what: 'A machine shines light through a stencil and shrinks the image down onto the wafer, like a projector running backwards.',
    detail: 'This is the step everything else exists to serve, and the machine that does it at the finest sizes is made by exactly one company on Earth. The features it prints are around twenty nanometres. About four thousand of them would fit across a human hair.',
  },
  {
    n: 6, title: 'Develop, carve, and fill', icon: 'etcher',
    what: 'The exposed film is washed away where the light hit, leaving the pattern as a physical stencil on the wafer.',
    detail: 'Then gas turned into plasma carves down into the silicon wherever the stencil is open, other machines fill those trenches with metal or insulator, and the surface is polished flat again ready for the next layer.',
  },
  {
    n: 7, title: 'Now do that seventy more times', icon: 'foundry',
    what: 'A chip is not one pattern. It is sixty to eighty of them stacked on top of each other, each aligned to the ones below within a few atoms.',
    detail: 'Add it all up and making a chip is around seven hundred separate operations taking about three months. The wafer travels several kilometres inside the building without a person ever touching it — people shed particles, and at this size a speck of dust is a boulder.',
  },
  {
    n: 8, title: 'Find out which ones work', icon: 'prober',
    what: 'Needles touch down on each chip while it is still part of the wafer, and test it electrically.',
    detail: 'Most pass — a good process makes eight or nine out of ten work. The ones that fail usually failed because a single speck landed in the wrong place, and bigger chips are bigger targets, so a large chip fails far more often than a small one. That one fact shapes almost every decision in this industry.',
  },
  {
    n: 9, title: 'Cut them out and package them', icon: 'dicer',
    what: 'The wafer is sawn into individual chips, and the good ones are mounted into a protective package with connections to the outside.',
    detail: 'The package is not just protection. For modern parts it is where several chips get joined together, and how well that is done now affects performance as much as the chips themselves do.',
  },
  {
    n: 10, title: 'Test again, then sell', icon: 'tester',
    what: 'Every finished part is tested again, sorted by how fast it runs, and shipped.',
    detail: 'Chips off the same wafer are not identical — some run faster than others — so one design becomes several products at several prices. Then the whole thing has to earn back what it cost to design, which for a leading-edge chip is hundreds of millions before a single one is sold.',
  },
]

/** Why it is hard. Five reasons, in plain terms, each with the number. */
export const HARD = [
  {
    k: 'Everything is very small', icon: 'planar',
    what: 'The switches inside a chip are about twenty nanometres across. A sheet of paper is five million nanometres thick. You could line up four thousand of these switches across a single human hair, and a modern chip contains tens of billions of them.',
  },
  {
    k: 'Everything must work, seven hundred times', icon: 'metrology',
    what: 'Because the steps happen one after another, a failure anywhere ruins everything. To finish ninety-nine wafers out of a hundred, every one of those seven hundred steps has to succeed 99.9986% of the time. That is why fabs run on written procedure rather than skill — no amount of care delivers that.',
  },
  {
    k: 'Dirt is the enemy', icon: 'wetbench',
    what: 'A speck of dust is hundreds of times wider than the features being printed. Fab air is filtered thousands of times cleaner than a hospital operating theatre, people wear full suits, and even then most of the work is done by machines because a gowned person still sheds particles constantly.',
  },
  {
    k: 'Heat has nowhere to go', icon: 'power',
    what: 'Billions of switches flipping billions of times a second produce a lot of heat in a very small area — a modern processor runs hotter per square centimetre than a kitchen hotplate. This is why chips stopped getting faster around 2005 and started getting more numerous instead.',
  },
  {
    k: 'It costs an enormous amount before anything works', icon: 'money',
    what: 'A factory costs fifteen to thirty billion dollars. Designing one leading-edge chip costs hundreds of millions, and nearly all of it is spent before anyone knows whether the design works. That is why so few companies do this, and why the ones that do are so hard to replace.',
  },
]

/** The dozen words you cannot avoid, in plain English. */
export const WORDS = [
  { w: 'Wafer', d: 'The thin silicon disc, about 30 cm across, that chips are made on. One wafer holds many chips.' },
  { w: 'Die', d: 'One individual chip, while it is still part of the wafer. Plural: dice or dies.' },
  { w: 'Fab', d: 'Short for fabrication plant — the factory. Costs $15–30 billion.' },
  { w: 'Foundry', d: 'A fab that makes chips designed by other companies, as a service.' },
  { w: 'Fabless', d: 'A company that designs chips and pays a foundry to make them. Most chip companies work this way.' },
  { w: 'Transistor', d: 'The switch. It is the only thing a chip is really made of — everything else is billions of these wired together.' },
  { w: 'Node', d: 'A generation of manufacturing, named like "3 nm". The number stopped meaning a real measurement years ago; treat it as a version number.' },
  { w: 'Yield', d: 'The fraction of chips that work. The single most important number in the industry.' },
  { w: 'Defect', d: 'Anything that kills a chip — usually a particle landing where it should not.' },
  { w: 'Lithography', d: 'The printing step. Light through a stencil, shrunk onto the wafer.' },
  { w: 'EUV', d: 'The newest kind of that printing machine, using light so short it has to work in a vacuum and bounce off mirrors, because it would be absorbed by air and by any lens. One company makes them.' },
  { w: 'Packaging', d: 'Mounting finished chips into something you can solder onto a board — and increasingly, joining several chips into one part.' },
  { w: 'Tapeout', d: 'The moment a design is finished and sent to be manufactured. Named after magnetic tape, which is how it used to be sent.' },
  { w: 'Chiplet', d: 'One chip of several that are joined together in a package to act as one bigger chip.' },
]

/** Where to go next, described by what the reader would want, not by tab name. */
export const NEXT = [
  { tab: 'sand', want: 'I want to watch the sand actually become a wafer', why: 'The eight stages of purification, with what goes in and what comes out at each one.' },
  { tab: 'line', want: 'I want to see the seventeen machines a wafer visits', why: 'Click any of them and run a batch through it.' },
  { tab: 'wafer', want: 'I want to see chips fail', why: 'A real wafer map with defects scattered on it. Make the chip bigger and watch the failures multiply.' },
  { tab: 'economics', want: 'I want to know what a chip costs', why: 'Wafer price divided by the ones that work, for eight real kinds of product.' },
  { tab: 'science', want: 'I want to know how a transistor actually works', why: 'The physics, computed live. Longer, and the deepest thing here.' },
  { tab: 'matters', want: 'I want to know why any of this matters', why: 'Silicon is almost never the expensive part and always the part it stops without.' },
]

export const CLOSING = `That is the whole thing. Sand becomes a crystal, the crystal becomes discs,
patterns are printed onto the discs seventy times over, most of it works, the survivors are cut out
and sold. Everything else on this site is one of those steps in more detail, or a consequence of
one of them — and if you only remember one idea from this page, make it the yield problem: chips
fail at random, bigger chips fail more often, and almost every decision in this industry is
somebody working around that fact.`
