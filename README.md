# FabSim

An interactive walk through how a semiconductor chip is manufactured, and the
arithmetic that decides whether it can be sold.

**Live:** https://abhaybhuvagithub.github.io/AIChip/

Five tabs:

| Tab | What it does |
| --- | --- |
| **God view ✨** | One configuration, every consequence — the chain from quartzite through wafer, fab, die, cost and compute on a single screen, with the live line if it is running. Every figure computed from the same die; nothing entered. |
| **Sand → silicon** | The material chain from quartz rock to a finished die, running by itself — no clicking required. A purity ladder on a log scale, and a mass and energy balance worked backwards from the die you configured. Plus what replaces the people: FOUPs, overhead hoist transport, SECS/GEM, run-to-run control. |
| **Fab run** | Two modes. **Travel path** follows one wafer through all 626 process steps from rock to marked part — every repeat listed, with optional spoken narration. **The line** is a discrete-event simulation of one production line, one hour per tick. Lots of 25 wafers walk 70 mask layers, queue at eight tool groups that occasionally break, and accumulate defects. Left alone it settles at a 110-day cycle time with lithography as the constraint at 94% — and the defect density it earns feeds straight into the yield lab. |
| **Fab line** | The 17 modules a wafer passes through, from crystal growth to final test. Each opens up into physics, tools, failure modes and duration. A "run a lot" button walks the line. |
| **Yield lab** | A live 300 mm wafer map drawn to scale, colourable by defects **or by speed bin**. Drag die size, defect density, edge exclusion or scribe width and watch gross dies, yield and good dies move together. Four real yield models side by side on the same wafer, plus per-die maximum clock from process variation, a speed-bin distribution and blended selling price. |
| **Economics** | Cost per good die, silicon utilisation and gross margin, with eight real product shapes — mobile SoC through SiC power device — computed through the same model. |
| **The science** | The physics underneath everything else, computed live: an interactive MOSFET I–V family, the subthreshold floor with a temperature slider, gate tunnelling and why hafnium replaced silicon dioxide, Rayleigh optics, EUV photon shot noise, random dopant fluctuation, and why Dennard scaling ended. |
| **Clock** | Why frequency stopped in 2005 and the transistors had nothing to do with it. A log ladder from the 740 kHz Intel 4004 to 1.5 THz device f_max, with processor clocks, radio carriers and single-device figures kept visually distinct. Turn the clock up and watch power, heat and signal reach fail in that order. |
| **Nodes** | 180 nm to 2 nm, with the transistor architecture that made each generation possible, and a drawn cross-section showing how many sides of the channel the gate controls. |
| **Compute** | Turns the die you configured into operations per second, and climbs from one die to a 100,000-die cluster. Shows why headline throughput outran Moore's law: precision and sparsity, not density. |
| **Quantum** | A surface code resource calculator — drag the physical error rate and watch the qubit count go vertical at threshold — plus five hardware modalities and a side-by-side of classical against quantum fabrication. |
| **3D & beyond** | The architecture ladder with drawn cross-sections — planar, FinFET, nanosheet, forksheet, CFET, 2D-material channel — plus backside power delivery, four levels of circuit stacking, and an interactive thermal-wall calculator. Every entry carries a status badge, because "demonstrated at IEDM" and "in a product" are five to ten years apart. |
| **Silicon** | Twenty real parts — Apple A-series and M-series, Google TPU v1 through the eighth generation, NVIDIA H100/Blackwell/Rubin, AMD MI300X, Cerebras WSE-3 — drawn at true relative area on one 300 mm wafer. Load any of them into the yield lab. |
| **Discipline** | Why "flawless" is the wrong target, and what the right one is. The arithmetic that makes discipline compulsory — 700 steps at 99.9986% each — plus nine engineering disciplines, the rule of ten on escape cost, test-coverage escapes against real DPPM targets, and eight domains where the ethical judgement is genuine. |
| **0 → market** | The business case: seven phases from concept to ramp, an NRE build-up by node, and the one calculation that decides whether a chip exists — break-even units = NRE ÷ margin. Plus a lifetime cash-flow chart showing the four-year hole before the climb. Unit cost comes from the die you configured in the yield lab. |
| **Value chain** | The seven layers that actually produce a chip, and how few suppliers each has. Arm's licensing model and its 2026 move into shipping its own silicon. Three business models — IDM, fabless plus foundry, and the vertical re-integration Terafab is betting on. A fab-scale calculator that turns wafer starts per month into chips, silicon and compute per year. |
| **Quiz** | Forty-seven questions, self-explaining. |

## What is actually modelled

- **Die layout** — real rectangles placed on a real circle and counted, not a
  closed-form approximation. Partial dies and the edge exclusion ring are
  drawn, so the picture and the die count can never disagree.
- **Yield** — Poisson, Murphy, Seeds and negative binomial, each with its
  published formula, plus separate line yield, test yield and assembly yield
  terms.
- **Defect distribution** — seeded pseudo-random scatter with an optional
  clustering mode, so a wafer stays stable while you drag a slider.
- **Cost** — wafer cost amortised across good dies, plus per-die packaging,
  against a settable selling price.
- **Fab operations** — lot-level queueing at eight tool groups over 70 mask
  layers, tool failures on an MTBF basis, defect accumulation per step,
  excursions that run undetected until a sampled lot reaches metrology, and
  run-to-run control damping drift. Seeded, so a run is reproducible.
- **Device physics** — thermal voltage, Varshni bandgap, intrinsic carriers,
  mass action, oxide capacitance and EOT, square-law drain current,
  subthreshold swing, WKB gate tunnelling, and dynamic power.
- **Rigour** — per-step yield required for a target line yield over N steps,
  the DPMO-to-sigma conversion on the standard 1.5σ-shift convention, and test
  escapes against market DPPM targets.
- **Business case** — NRE built up from mask set, engineer-years, EDA and IP
  by node; break-even volume; an S-curve ramp with annual price erosion and
  yield learning; and quarter-by-quarter cumulative cash flow to a payback
  quarter.
- **Speed binning** — per-die maximum clock from three variation sources:
  systematic radial (anneal, CMP and focus vary with wafer radius), random
  die-to-die, and within-die worst-path statistics, where the slowest of N
  critical paths sits about √(2·ln N) deviations out. Dies are sorted into
  SKU bins and priced, giving a blended selling price per wafer.
- **Clock physics** — signal velocity c/√ε and reach per cycle, clock period,
  and power against frequency both at fixed voltage (linear) and with voltage
  scaling (cubic).
- **Optics** — Rayleigh resolution and depth of focus, photon energy, and
  Poisson photon statistics per feature.
- **Cell footprint** — relative standard-cell area per architecture at
  iso-node, planar as baseline, from vendor and imec publications.
- **Thermal wall** — power density as tiers stack, against approximate cooling
  capability bands. Density scales with tier count; heat-removal surface does
  not, which is the arithmetic behind why 3D memory shipped a decade before 3D
  logic.
- **Material chain** — wafer mass from geometry and silicon density
  (π·r²·t·2.329), then each stage's mass worked backwards from one good die
  through published loss factors, with energy charged on the mass entering
  each stage.
- **Throughput** — MAC lanes from transistor count, then operations per second
  by precision, sparsity, clock and utilisation, scaled from one die to a
  cluster with power tracked alongside.
- **Quantum error correction** — rotated surface code at distance *d*
  (2*d*²−1 physical qubits per logical), logical error rate
  *p_L* ≈ 0.1·(*p*/*p_th*)^⌊(d+1)/2⌋ against a 1% threshold, and the physical
  qubit count and runtime that follow for four published algorithms.

## What is approximated

Die sizes, wafer prices and transistor densities are public estimates that
vary considerably by source. They are here to make the shape of the trade-off
concrete, not to quote anyone's contract. Density figures in the node table
should be read as a ranking rather than a specification — vendors count
transistors differently.

The compute model is calibrated, not derived. It divides total transistors by
an amortised transistors-per-delivered-MAC figure (~250,000), fixed against a
well-documented 814 mm² 4 nm accelerator at ~1,000 TFLOPS FP16. Real designs
vary by a factor of two either way. A verify check pins that calibration so a
refactor cannot quietly move it.

Loss factors in the material chain are published rough figures and vary
considerably by producer — wire-saw kerf alone destroys 30–40% of a finished
crystal as dust. The compounded ratio, roughly eight grams of rock per gram of
shipped silicon, is the figure worth carrying; the individual digits are not.

Clock-tab power figures scale from a 200 W, 5 GHz reference and assume gate
delay is linear in supply voltage — a first-order model that overstates how
gracefully this degrades. Device frequencies are published f_max figures for
indium phosphide research devices, not for anything sold in volume, and the
tab keeps processor clocks, radio carriers and single-device f_max as visually
distinct categories because conflating them is how "terahertz chip" claims get
made. A verify check asserts no processor clock in the ladder is above 100 GHz.

Every equation on the science tab is the textbook one with real units, and
verify pins the outputs against known values: kT/q = 25.85 mV, the 59.6
mV/decade subthreshold floor, a 1.12 eV bandgap, n_i ≈ 10¹⁰ cm⁻³, 1.727 µF/cm²
for 2 nm of SiO₂, one decade of gate leakage per 0.18 nm, and 91.8 eV per EUV
photon. The MOSFET model is deliberately first-order and the tab says where it
stops being true — it ignores velocity saturation, channel-length modulation
and every short-channel effect, all of which matter below 100 nm.

The fab simulation is calibrated, not fitted. The tool set was sized so that
lithography is the constraint — which is what it is in a real leading-edge fab,
because scanners cost ten times any other tool and nobody buys spares — and the
operating point then produced a 110-day cycle time, an X-factor of 2.7 and
D0 ≈ 0.06 on its own. Verify checks pin all four, plus Little's law, so a
refactor cannot quietly make it unrealistic. Not modelled: dispatch priority
and hot lots, reticle setup, batch tools, staffing, and rework — all of which
make a real line worse than this, so treat its cycle time as optimistic.

Roadmap positions for forksheet, CFET and 2D-material channels come from imec,
IEDM and vendor publications through 2026 and carry an explicit status badge.
Cell-area figures are approximate and vary by cell and by claimant — read the
ratio between generations. Cooling capability bands are order-of-magnitude
only; real limits depend on hot-spot distribution rather than average density.
Verify checks assert that only the three shipping architectures are marked
production and that no beyond-CMOS option is.

The Discipline tab names one real occupational-health case. It is presented
with dates, the company's own quoted statements and the causal question left
where the parties left it — contested — because long-latency occupational
disease is genuinely hard to attribute and stating otherwise would be
unfair to everyone involved. A verify check asserts that qualification cannot
be edited out. The engineering disciplines are described in general terms from
published industry practice rather than attributed to any company's internal
procedure, and the escape-cost ratios are the conventional illustrative
figures.

Business-tab costs are widely-cited industry estimates and vary by a factor of
two or more between sources and between companies — nobody publishes their
real mask bill. The ratios between nodes are more reliable than any single
figure, and the shape of the cash curve is more reliable than either. The NRE
build-up is computed independently from engineer-years and mask cost, then
cross-checked against the published total-design-cost estimate for that node;
a verify check asserts the two agree within a factor of two.

Terafab is an announced project, not an operating factory. The tab separates
what is committed (site, permits, phase-one capital, jobs) from what is stated
ambition (2 nm target, the terawatt output framing, which does not originate
in semiconductor practice and has been publicly disputed), and verify checks
enforce that separation — the terawatt claim cannot move into the committed
column. The "terafab" wafer-start figure in the scale calculator is
illustrative; no such number has been published.

Figures for real parts come from vendor announcements and public reporting
through mid-2026. Transistor counts are vendor figures where vendors publish
them; die areas are third-party die-shot measurements where they do not, and
those are marked with an asterisk. Apple has never published a die size.
Google publishes pod-level throughput freely and silicon geometry almost
never — where nobody outside the company knows, the field is empty rather
than estimated, and a verify check enforces that.

The quantum estimator collapses magic-state distillation into a single
overhead factor. Real resource estimates size it explicitly and it often
dominates the footprint — which is most of why published estimates for the
same algorithm differ by an order of magnitude. The slider is there so you can
see how much it matters.

## What is not modelled

Cycle time and WIP, tool capacity and scheduling, mask set amortisation across
volume, redundancy repair at sort (which matters a great deal for DRAM),
binning and harvesting economics, or anything about the supply chain. On the
material chain: water and chemical consumption, recycling of reclaim wafers,
and emissions. On the
compute side: memory bandwidth as an explicit constraint, interconnect cost
between dies, and cooling. On the quantum side: qubit connectivity beyond
nearest-neighbour, decoder latency, and codes other than the surface code.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm test         # the whole gate — see below
```

## Icons

A drawn icon set (`src/ui/Icon.jsx`): **64 technical drawings** on a shared
24×24 grid, averaging four to five shapes each. Packages, chip function, IP
blocks, the sixteen fab tool types, the material chain, six transistor
architectures, five quantum modalities and the industry layers.

They are drawings, not pictograms. A BGA is a cross-section with substrate,
die, bond wires, mould cap and solder balls. A FinFET shows the gate wrapping
three faces of each fin and a nanosheet shows it wrapping four, so the roadmap
is legible from the icons alone. Where a cross-section is the honest view
(packages, transistors, stacking) they are cross-sections; where a plan view is
(wafers, arrays) they are plan views.

They stroke in `currentColor`, so an icon inherits whatever colour it sits in
(an accent, a maker's hue, a speed-bin colour) and works across all five
palettes and both modes without a second asset. That is the reason for drawing
them rather than using emoji, which carry their own colours, or an icon font,
which is a network request for glyphs never designed for silicon.

The grammar is consistent so the set reads as one family: silicon is a solid
rounded rectangle, substrate is a plain one, an IP block is dashed — because it
is a licensed drawing rather than a part — and a process tool is drawn as its
chamber with whatever enters or leaves it.

Verify checks that every icon referenced in any data file exists, that no
unicode glyph is left standing in for one, and that the set has not regressed
to outlines — it asserts an average of at least four drawn shapes per icon.

## The assistant

The ✨ button opens an assistant that answers from the app's live state — the
running simulation, your die, the yield and cost models, the material chain,
the process data.

**It is not a language model, and that is deliberate.** This site is a static
bundle on GitHub Pages: no server, no API key, no runtime network calls. There
is nowhere to put one. What it is instead is a grounded query engine, which for
the questions people actually have here — *what is the bottleneck, why is my
yield low, how much rock is one chip* — is better than a language model would
be, because every answer is computed from the numbers currently on screen
rather than recalled. For anything it cannot ground it says so rather than
inventing something, and a verify check asserts that.

Voice works through the Web Speech API, browser-native and keyless. Spoken
answers work broadly; voice input is Chromium-only, and the microphone button
is hidden where it would not work rather than offered and failing.

## The pipeline

`npm test` is the gate, and it runs the same five stages CI does, in the order
that fails fastest:

| Stage | What it catches |
| --- | --- |
| `npm run lint` | Dead imports, unused props, hook misuse. Found three real bugs the first time it ran. |
| `npm run build` | Anything that does not compile. |
| `npm run verify` | 582 checks — the maths pinned against hand-computed values, content completeness, sourcing discipline, and the shipped bundle. |
| `npm run smoke` | Renders all sixteen tabs across five configurations, including an unmakeable die and a zero-yield process. Catches components that throw on first render, and output that leaks `NaN` or `undefined` — which reads as broken while passing every other check. |
| `npm run budget` | Bundle size against a gzipped budget. This bundle grew 206 kB → 331 kB across six feature passes with nothing watching. |

CI (`.github/workflows/ci.yml`) runs all five on every push and pull request,
plus a dependency audit, and uploads the build as an artifact. It installs with
`npm ci` against the committed lockfile and reads the Node version from
`.nvmrc`, so a CI build and a local build are the same build.

Deploy (`.github/workflows/deploy.yml`) runs only from `main`, calls CI as its
gate, rebuilds and re-verifies the exact artifact it is about to publish, then
publishes from a throwaway clone rather than switching branches in place.

The last step is the one worth having: **`scripts/postdeploy.mjs` polls the
live URL until `index.html` references the exact content-hashed asset that was
just built, then fetches that asset to confirm it is not a 404.** A green
publish means the push succeeded, not that the bytes are being served — a
sister repo shipped the previous build for weeks with green checks the whole
time, because nothing closed that loop.

`npm run verify` runs 582 checks across wafer geometry, yield model
correctness (pinned against hand-computed values), economics invariants,
defect scatter determinism, a named type scale with a 14px floor and a pinned
prose tier, WCAG contrast across all ten themes, architecture and thermal-wall arithmetic, material
chain mass balance, published specs for real parts, value-chain sourcing
separation, the pipeline configuration itself, compute-model
calibration, surface code arithmetic, content completeness, and the contents of the built bundle. A
failure blocks deployment — see `.github/workflows/deploy.yml`.

## Design

The token system is carried over from
[ArchSim System Design Studio](https://github.com/abhaybhuvagithub/ArchSim-System-Design-Studio)
so the two sit on the same shelf: same CSS variable names, same pill and card
geometry, IBM Plex Sans / IBM Plex Mono / Space Grotesk.

The default accent is amber, and the theme is called *Litho bay*, because a
lithography bay is lit yellow — photoresist is blind above about 500 nm, so
yellow light lets people work without exposing every wafer in the room.

Themes are a **palette crossed with a mode**, not a flat list. Five palettes —
Litho bay, Wafer, Glow, Kesar, Millikelvin — each with a hand-tuned light and
dark variant, plus Auto, which follows the operating system live rather than
only at load.

A light theme is not a dark theme with the values flipped: accents that read
well on near-black wash out on white, so every light variant has its own
darkened accent. All thirty contrast ratios are recomputed from the stylesheet
by a verify check — body text at AAA (7:1) against both background and card
panel, muted at AA (4.5:1) because muted carries most of the explanatory prose
here, and accents at 3:1 for interface use.

## The prompt

[`PROMPT.md`](PROMPT.md) holds the build prompt this repository was made with,
so the next change is held to the same bar. It is written to be re-run against
a new feature.

## Curated by

**Abhay Bhuva** — [LinkedIn](https://www.linkedin.com/in/abhaybhuva) · [GitHub](https://github.com/abhaybhuvagithub)

## How this was built

Developed with [Claude](https://claude.ai), Anthropic's AI assistant.

Everything in this repository is derived from publicly available information:
vendor announcements and datasheets, published papers, public reporting, and
standard textbook process engineering. **No confidential, proprietary or
internal data from any company was used**, and no figure here represents
anyone's non-public specification.

Where a number could not be sourced publicly, it is marked as an estimate or
left blank rather than guessed — see the asterisked cells and the "not
disclosed" entries on the Silicon tab. Verify checks enforce that: undisclosed
die areas cannot be filled in, and third-party die-shot measurements must
carry an estimate flag.

## Licence

MIT.
