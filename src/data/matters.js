// Why any of this matters.
//
// The site explains how a chip is made in enormous detail and never says why
// a reader should care. That gap invites the worst kind of writing — "chips
// are in everything!" — so this tab does the opposite: every claim here is a
// number, and the last section argues against the tab itself.
//
// The organising idea is LEVERAGE. Semiconductors are almost never the
// expensive part of anything. They are the part without which the expensive
// part does not function, and that asymmetry is the whole story.

/**
 * Semiconductor content against product value.
 *
 * `chips` is a rough count of distinct semiconductor devices; `contentUsd` is
 * approximate semiconductor bill-of-materials; `valueUsd` is what the finished
 * thing sells for. All are order-of-magnitude figures assembled from public
 * teardown and industry reporting — the ratio is the point, not the digits.
 */
export const LEVERAGE = [
  { id: 'car', name: 'Mid-range car', short: 'Car', icon: 'mcu', chips: 1400, contentUsd: 600, valueUsd: 38000,
    note: 'Over a thousand chips, most of them mature-node parts costing a dollar or two. If one is missing the vehicle cannot ship.' },
  { id: 'ev', name: 'Electric vehicle', short: 'EV', icon: 'power', chips: 2000, contentUsd: 1500, valueUsd: 45000,
    note: 'Roughly double the content of a combustion car, and the added parts are power devices — silicon carbide, not logic.' },
  { id: 'phone', name: 'Smartphone', short: 'Phone', icon: 'soc', chips: 40, contentUsd: 170, valueUsd: 800,
    note: 'The densest concentration of leading-edge silicon most people own, and still under a quarter of what they paid.' },
  { id: 'laptop', name: 'Laptop', short: 'Laptop', icon: 'cpu', chips: 60, contentUsd: 300, valueUsd: 1200,
    note: 'Processor, memory, storage, power management, radios. A quarter of the price, and all of the capability.' },
  { id: 'washer', name: 'Washing machine', short: 'Appliance', icon: 'mcu', chips: 12, contentUsd: 18, valueUsd: 700,
    note: 'A few microcontrollers and power devices. Nobody thinks of a washing machine as electronics until it will not start.' },
  { id: 'pacemaker', name: 'Implanted pacemaker', short: 'Pacemaker', icon: 'ipsec', chips: 8, contentUsd: 60, valueUsd: 25000,
    note: 'A handful of parts that must not fail for a decade inside a person. The extreme end of what reliability engineering is for.' },
  { id: 'airliner', name: 'Airliner', short: 'Airliner', icon: 'ipnoc', chips: 25000, contentUsd: 900000, valueUsd: 110000000,
    note: 'Avionics, engine control, cabin systems. Certified to standards that make automotive qualification look relaxed.' },
  { id: 'aiserver', name: 'AI training server', short: 'AI server', icon: 'npu', chips: 120, contentUsd: 280000, valueUsd: 330000,
    note: 'The one case where the ratio inverts: the chips are not a component of the product, they are essentially the entire product.' },
]

/** The 2021 shortage, which is the cleanest demonstration of the asymmetry. */
export const SHORTAGE = {
  year: 2021,
  vehiclesLost: 7.7e6,
  revenueLostUsd: 210e9,
  source: 'alixpartners2021',
  what: 'Through 2021 the automotive industry could not obtain enough semiconductors — mostly ordinary microcontrollers on mature nodes, the kind nobody writes about. AlixPartners estimated 7.7 million vehicles were not built and $210 billion of revenue was lost.',
  why: 'The parts that stopped production were not the expensive ones. A vehicle contains over a thousand chips and needs all of them, so a two-dollar component that had not arrived idled a forty-thousand-dollar product. That is leverage in its purest form, and it is why supply chains that look like a procurement detail turn out to be strategic.',
  lesson: 'Also worth noting what it was not: not a technology failure, not a leading-edge problem. Mature-node capacity had been allocated elsewhere when automotive demand was cancelled and then returned. An industry can be brought down by a scheduling decision.',
}

/**
 * What actually depends on the newest silicon, and what does not.
 *
 * Conflating these is the commonest error in public discussion of the
 * industry: leading-edge nodes matter enormously for a narrow set of things
 * and hardly at all for most of what a society runs on.
 */
export const DEPENDENCE = [
  { id: 'leading', name: 'Needs the leading edge', short: 'Leading edge', node: '5 nm and below', icon: 'npu',
    what: 'AI training and inference, flagship phones, high-end laptops, datacentre CPUs.',
    stakes: 'Real, and narrower than the coverage suggests. If leading-edge supply stopped, this would stall — and the lights would stay on.' },
  { id: 'mature', name: 'Runs on mature nodes', short: 'Mature nodes', node: '28 nm to 180 nm', icon: 'mcu',
    what: 'Cars, medical devices, industrial control, aerospace, appliances, power grids, water treatment, payment terminals.',
    stakes: 'This is the layer a society actually rests on, it is made on nodes twenty years old, and it is where the 2021 shortage bit.' },
  { id: 'analog', name: 'Barely a node at all', short: 'Specialised', node: 'Specialised processes', icon: 'power',
    what: 'Power conversion, sensors, radio front ends, image sensors.',
    stakes: 'Made in dedicated fabs on processes that do not scale and do not need to. Invisible, unglamorous, and non-substitutable.' },
]

/**
 * The counterweight. A "why it matters" page that only celebrates would be
 * exactly the kind of writing this site exists to avoid — and mattering is not
 * the same as being good.
 */
export const AGAINST = [
  { k: 'Mattering is not the same as being good',
    what: 'Everything on this page argues that semiconductors have enormous leverage. Leverage is a description of power, not a defence of it. The same supply chain that makes medical imaging possible makes mass surveillance possible, and the same accelerators that fold proteins also guide weapons. The industry does not get credit for one without the other.' },
  { k: 'The costs are real and unevenly borne',
    what: 'Fabs consume electricity and ultrapure water at industrial scale and emit process gases thousands of times more warming than carbon dioxide. Historic chemical exposures have been linked to serious illness among production workers. The benefits are global; several of the costs are local and fell on people who did not choose them.' },
  { k: 'The value is captured narrowly',
    what: 'A handful of companies and a few regions hold most of the profit and nearly all of the irreplaceable capability. That concentration is why chips became statecraft, and it is not obviously a good arrangement for anyone outside it.' },
  { k: 'Importance is not an argument for any particular policy',
    what: 'That an industry is strategically vital is used to justify subsidy, export control and industrial policy in every direction at once. This page makes the case that the leverage is real. It deliberately makes no case about what should be done with that fact, which is a political question and not one arithmetic settles.' },
]

/** The argument for the rest of the site existing at all. */
export const WHY_UNDERSTAND = `Decisions about export controls, subsidy programmes, energy policy and
AI capability are being taken by people who, mostly, could not describe what happens to a wafer
between the sand and the socket. That is not a criticism — nobody can hold every field — but it does
mean the arguments get made in metaphors, and metaphors are where bad policy hides. The specific
value of knowing that yield falls exponentially with area, that one company makes the scanners, or
that most silicon is not leading-edge, is that each replaces a slogan with a constraint.`
