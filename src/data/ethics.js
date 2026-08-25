// Discipline and ethics in semiconductor manufacturing.
//
// A note on the framing, because it matters. "Flawless" is not achievable and
// aiming at it directly makes things worse: a culture that expects perfection
// is a culture where people hide problems. Every discipline below exists
// because failure is certain, and the goal is to make failure DETECTABLE,
// CONTAINED and RECOVERABLE. The fabs with the best yields are not the ones
// that never have excursions; they are the ones that find them in hours
// instead of weeks.
//
// The ethics section names one real case with care. It is documented,
// acknowledged by the company involved, and it is the reason parts of this
// industry's safety practice look the way they do. Leaving it out would be the
// comfortable choice and a dishonest one.

export const DISCIPLINES = [
  {
    id: 'copy',
    name: 'Copy Exactly',
    icon: 'foundry',
    one: 'Replicate a working process to the last detail, including details you think are irrelevant.',
    what: 'When a process is transferred to a second fab, everything is matched: tool models, recipes, gas suppliers, sometimes paint colour and the layout of the room. Improvements are not permitted during transfer, however obviously good they look.',
    why: 'A leading-edge process has hundreds of interacting variables and nobody understands all of the interactions. An engineer who "improves" one during a transfer has run an uncontrolled experiment on a production line, and the effect may not appear for six weeks.',
    without: 'Two fabs that were supposed to be identical yield differently and nobody can say why, because they differ in four hundred small ways.',
  },
  {
    id: 'change',
    name: 'Change control',
    icon: 'iplicense',
    one: 'No undocumented change. None, by anyone, ever.',
    what: 'Every recipe edit, tool part swap, chemical lot change and software update is logged, reviewed and tied to a person. Supplier changes are qualified before they are accepted, which is why a resin change at a third-tier supplier can take a year to approve.',
    why: 'Yield debugging is a search over what changed. If the log is incomplete the search is unbounded, and an unbounded search on a line producing thousands of wafers a week is enormously expensive.',
    without: 'An excursion appears and the investigation begins with "what changed?" — and the honest answer is that nobody knows.',
  },
  {
    id: 'spc',
    name: 'Statistical process control',
    icon: 'metrology',
    one: 'Act on signals. Do not act on noise.',
    what: 'Every parameter is charted with control limits derived from its own behaviour, not from the specification. A point outside the limits triggers a response even when it is still within spec; a point inside them is left alone even when it looks worrying.',
    why: 'The instinct to adjust a process after a bad-looking measurement makes variation worse — chasing noise is a documented way to destabilise a stable line. Discipline here means doing nothing, on purpose, most of the time.',
    without: 'Operators tune continuously, variation grows, and the line becomes less predictable the harder people work on it.',
  },
  {
    id: 'stop',
    name: 'Stop-the-line authority',
    icon: 'prober',
    one: 'Anyone can halt production. Nobody is punished for it.',
    what: 'A technician who sees something wrong can stop a tool without seeking approval first. The cost of a false stop is accepted explicitly as the price of the true ones.',
    why: 'The person nearest the problem sees it first and has the least power. If using that authority is career-limiting, it will not be used, and the organisation loses its earliest and cheapest warning.',
    without: 'Concerns travel upward slowly, through people with an incentive to minimise them, arriving after the damaged wafers have moved on.',
  },
  {
    id: 'rootcause',
    name: 'Root cause to the physics',
    icon: 'etcher',
    one: '"We cleaned it and it went away" is not a root cause.',
    what: 'Structured investigation — 8D, five whys — continues until the mechanism is understood in physical terms, and a corrective action is verified by reproducing the failure and then preventing it.',
    why: 'A problem closed without a mechanism will return, usually at a worse time and usually in a form nobody connects to the first occurrence.',
    without: 'The same excursion recurs quarterly and is treated as a new event every time.',
  },
  {
    id: 'trace',
    name: 'Traceability',
    icon: 'wafer',
    one: 'Every wafer knows every tool and chamber it ever visited.',
    what: 'Lot genealogy records the full route: which chamber, which operator, which chemical lot, which recipe revision, at what time. A packaged part can be traced back to its position on its wafer.',
    why: 'When a field failure arrives, containment depends entirely on knowing which other parts share its history. Traceability is what turns a potential total recall into a bounded one.',
    without: 'A single field failure implicates every part you have ever shipped, because you cannot prove otherwise.',
  },
  {
    id: 'contam',
    name: 'Contamination discipline',
    icon: 'wetbench',
    one: 'Gowning protocol has no seniority exemption.',
    what: 'Entry procedure is identical for a new technician and a visiting executive. Materials, cosmetics and paper are restricted. Air, water and chemicals are monitored continuously rather than sampled occasionally.',
    why: 'A particle does not know who shed it. The rules are uniform because the physics is uniform, and visible exceptions destroy a protocol faster than any written change could.',
    without: 'Standards erode from the top, which is the direction people watch.',
  },
  {
    id: 'signoff',
    name: 'Signoff means a name',
    icon: 'eda',
    one: 'Approval is a person, not a checkbox.',
    what: 'Design and process gates are signed by named individuals who have actually reviewed the item, with the criteria stated in advance rather than negotiated afterwards.',
    why: 'Diffuse responsibility is no responsibility. A gate that everyone approves and nobody has read is worse than no gate, because it manufactures false confidence.',
    without: 'Everyone assumes someone else looked at it. This is the mechanism behind a large fraction of engineering disasters in every industry.',
  },
  {
    id: 'dataint',
    name: 'Data integrity',
    icon: 'tester',
    one: 'The measurement is what it is. This one is not negotiable.',
    what: 'Test results are recorded as measured. Retesting to obtain a better number, adjusting limits after the fact, or selecting favourable data are treated as serious misconduct rather than as commercial pressure.',
    why: 'Everything downstream — qualification, customer acceptance, safety argument — assumes the data is real. A falsified result does not merely mislead; it silently invalidates every decision built on it, potentially for years.',
    without: 'You are no longer running a factory. You are running a story about a factory.',
  },
]

export const ETHICS = [
  {
    id: 'integrity',
    name: 'Data and test integrity',
    icon: 'tester',
    stake: 'The cardinal one.',
    what: 'Pressure to ship arrives every quarter, and the easiest way to relieve it is to make a number look better than it is — retest until it passes, widen a limit, report a subset. Every safety argument in automotive, medical and aerospace rests on the assumption that this does not happen.',
    good: 'Test data is immutable once recorded. Limit changes require the same qualification as a process change. People who report bad results are treated as having done their job, which is the only thing that actually keeps it working.',
  },
  {
    id: 'worker',
    name: 'Worker health',
    icon: 'wetbench',
    stake: 'The industry has a documented history here, and it is recent.',
    what: 'Fabs handle arsine, phosphine, hydrofluoric acid, solvents and photoresist chemistry in quantity. Hydrofluoric acid is particularly unforgiving: skin contact can be painless at first and systemically dangerous. Historic exposures have been linked to serious illness among production workers, and long latency makes causation genuinely hard to establish — which has also made it easy to dispute.',
    good: 'Substitution of the worst chemistries, real-time monitoring rather than periodic sampling, honest exposure records kept for decades, and treating an unexplained illness cluster as something to investigate rather than to defend against.',
    case: 'In November 2018 Samsung Electronics publicly apologised to workers at its semiconductor and display lines who had developed illnesses including leukaemia and brain tumours, with an executive stating the company had failed to sufficiently manage health threats. It followed an eleven-year dispute begun by the family of a worker who died in 2007, and led to a mediator-designed compensation scheme covering employees back to 1984. Samsung did not concede that its workplaces directly caused the illnesses. The case is worth knowing precisely because the causal question stayed contested — which is the normal condition for long-latency occupational disease, and the reason the burden of proof cannot fairly sit with the worker.',
  },
  {
    id: 'environment',
    name: 'Environmental cost',
    icon: 'materials',
    stake: 'Large, and mostly invisible in the product.',
    what: 'Fabs consume electricity and ultrapure water at industrial scale. The process gases include some of the most potent greenhouse gases known — nitrogen trifluoride and sulphur hexafluoride have global warming potentials in the thousands to tens of thousands of times carbon dioxide over a century. Per-fluorinated compounds appear in resists and coolants and are under regulatory restriction.',
    good: 'Point-of-use abatement destroying the great majority of process gases, water recycled and re-polished on site rather than discharged, purchased renewable electricity, and reporting emissions on a basis that includes the supply chain rather than only the fab fence line.',
  },
  {
    id: 'counterfeit',
    name: 'Counterfeit and recycled parts',
    icon: 'qfp',
    stake: 'A safety issue disguised as a procurement issue.',
    what: 'Parts recovered from scrapped boards are cleaned, remarked and sold as new, often during shortages when buyers are desperate and go outside authorised distribution. They may function on the bench and fail early in the field, and they concentrate in exactly the long-life systems — aerospace, defence, medical — least able to tolerate it.',
    good: 'Buy through authorised channels even when it costs a schedule. Where that is impossible, test to a counterfeit-detection standard rather than a functional one. Support die-level authentication, and destroy scrap rather than selling it.',
  },
  {
    id: 'minerals',
    name: 'Materials and their origin',
    icon: 'quartzite',
    stake: 'The supply chain reaches places the industry does not see.',
    what: 'Tin, tantalum, tungsten and gold are used throughout electronics and have been sourced from regions where mining has funded armed conflict and used forced and child labour. Reporting obligations exist in several jurisdictions, and compliance can be reduced to paperwork rather than diligence.',
    good: 'Smelter-level auditing rather than supplier attestation, published sourcing, and staying engaged with legitimate producers in difficult regions instead of disengaging — an embargo that removes lawful income from a mining community is not automatically an ethical result.',
  },
  {
    id: 'labour',
    name: 'Labour across the chain',
    icon: 'osat',
    stake: 'Assembly and test sit where oversight is thinnest.',
    what: 'The final stages are labour-intensive and often several tiers from the brand on the package. Recruitment fees charged to migrant workers, retained identity documents and excessive overtime are recurring findings in industry audits.',
    good: 'Audits that are unannounced and reach beyond the first tier, employer-pays recruitment as a hard rule, worker-accessible grievance channels that do not route through the employer, and acting on findings rather than filing them.',
  },
  {
    id: 'dualuse',
    name: 'Dual use and end use',
    icon: 'ipcore',
    stake: 'The chip does not choose what it is used for.',
    what: 'The same accelerator trains a medical model and guides a weapon; the same imaging sensor inspects a weld and populates a surveillance network. Export controls encode part of this judgement into law, but law is a floor and always lags the technology.',
    good: 'Know your customer beyond the compliance minimum, decline business the licence would permit but the use does not justify, and be honest internally that a capability sold is a capability released. Reasonable people disagree about where these lines sit; pretending the question does not arise is not one of the reasonable positions.',
  },
  {
    id: 'spec',
    name: 'Honest specification',
    icon: 'iplicense',
    stake: 'A datasheet is a promise, often for fifteen years.',
    what: 'Publishing best-case numbers as typical, omitting derating, quietly changing a die revision without a change notice, or discontinuing a part that a customer designed into a ten-year product are all legal and all corrosive.',
    good: 'Characterise across corners and publish what you find, issue product change notifications for anything a customer could reasonably care about, and honour longevity commitments even when the volume no longer justifies them.',
  },
]

export const PRINCIPLES = [
  {
    k: 'Flawless is the wrong target',
    what: 'A culture that expects perfection is a culture where problems get hidden, because admitting one marks you out. Aim instead at detection and recovery: find it fast, contain it, understand it, prevent it. The best fabs are not the ones without excursions — they are the ones that find an excursion in hours rather than weeks.',
  },
  {
    k: 'The discipline is arithmetic, not virtue',
    what: 'Seven hundred steps, and yield multiplies. To finish 99 wafers out of 100 you need every step to succeed 99.9986% of the time. No amount of care or talent delivers fourteen parts per million by attention alone, which is why procedure, control charts and automation exist. They are not bureaucracy; they are the only mechanism that works at this scale.',
  },
  {
    k: 'Bad news must travel faster than good news',
    what: 'Every mechanism above — stop-the-line authority, change logs, SPC, root cause — is a way of getting unwelcome information to a decision-maker quickly and without penalty. An organisation where reporting a problem is risky has disabled its own instrumentation, and will not know it until something expensive happens.',
  },
  {
    k: 'Ethics and quality are the same discipline',
    what: 'Falsifying a test result, hiding an exposure incident and shipping a part you know is marginal are the same act: substituting a preferred story for a measurement. The habits that produce reliable silicon are the habits that produce honest conduct, and organisations rarely have one without the other.',
  },
]
