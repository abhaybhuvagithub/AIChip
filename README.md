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
| **Yield lab** | A live 300 mm wafer map drawn to scale. Drag die size, defect density, edge exclusion or scribe width and watch gross dies, yield and good dies move together. Four real yield models, side by side on the same wafer. |
| **Economics** | Cost per good die, silicon utilisation and gross margin, with eight real product shapes — mobile SoC through SiC power device — computed through the same model. |
| **Nodes** | 180 nm to 2 nm, with the transistor architecture that made each generation possible, and a drawn cross-section showing how many sides of the channel the gate controls. |
| **Compute** | Turns the die you configured into operations per second, and climbs from one die to a 100,000-die cluster. Shows why headline throughput outran Moore's law: precision and sparsity, not density. |
| **Quantum** | A surface code resource calculator — drag the physical error rate and watch the qubit count go vertical at threshold — plus five hardware modalities and a side-by-side of classical against quantum fabrication. |
| **3D & beyond** | The architecture ladder with drawn cross-sections — planar, FinFET, nanosheet, forksheet, CFET, 2D-material channel — plus backside power delivery, four levels of circuit stacking, and an interactive thermal-wall calculator. Every entry carries a status badge, because "demonstrated at IEDM" and "in a product" are five to ten years apart. |
| **Silicon** | Twenty real parts — Apple A-series and M-series, Google TPU v1 through the eighth generation, NVIDIA H100/Blackwell/Rubin, AMD MI300X, Cerebras WSE-3 — drawn at true relative area on one 300 mm wafer. Load any of them into the yield lab. |
| **Value chain** | The seven layers that actually produce a chip, and how few suppliers each has. Arm's licensing model and its 2026 move into shipping its own silicon. Three business models — IDM, fabless plus foundry, and the vertical re-integration Terafab is betting on. A fab-scale calculator that turns wafer starts per month into chips, silicon and compute per year. |
| **Quiz** | Thirty-three questions, self-explaining. |

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
| `npm run verify` | 356 checks — the maths pinned against hand-computed values, content completeness, sourcing discipline, and the shipped bundle. |
| `npm run smoke` | Renders all thirteen tabs across five configurations, including an unmakeable die and a zero-yield process. Catches components that throw on first render, and output that leaks `NaN` or `undefined` — which reads as broken while passing every other check. |
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

`npm run verify` runs 356 checks across wafer geometry, yield model
correctness (pinned against hand-computed values), economics invariants,
defect scatter determinism, a 13px legibility floor across the stylesheet and
every inline style, architecture and thermal-wall arithmetic, material
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

Five themes ship: Litho bay, Wafer, Glow, Millikelvin, and Cleanroom (light).

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
