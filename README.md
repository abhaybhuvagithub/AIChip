# FabSim

An interactive walk through how a semiconductor chip is manufactured, and the
arithmetic that decides whether it can be sold.

**Live:** https://abhaybhuvagithub.github.io/AIChip/

Five tabs:

| Tab | What it does |
| --- | --- |
| **Sand → silicon** | The material chain from quartz rock to a finished die, running by itself — no clicking required. A purity ladder on a log scale, and a mass and energy balance worked backwards from the die you configured. Plus what replaces the people: FOUPs, overhead hoist transport, SECS/GEM, run-to-run control. |
| **Fab line** | The 17 modules a wafer passes through, from crystal growth to final test. Each opens up into physics, tools, failure modes and duration. A "run a lot" button walks the line. |
| **Yield lab** | A live 300 mm wafer map drawn to scale. Drag die size, defect density, edge exclusion or scribe width and watch gross dies, yield and good dies move together. Four real yield models, side by side on the same wafer. |
| **Economics** | Cost per good die, silicon utilisation and gross margin, with eight real product shapes — mobile SoC through SiC power device — computed through the same model. |
| **Nodes** | 180 nm to 2 nm, with the transistor architecture that made each generation possible, and a drawn cross-section showing how many sides of the channel the gate controls. |
| **Compute** | Turns the die you configured into operations per second, and climbs from one die to a 100,000-die cluster. Shows why headline throughput outran Moore's law: precision and sparsity, not density. |
| **Quantum** | A surface code resource calculator — drag the physical error rate and watch the qubit count go vertical at threshold — plus five hardware modalities and a side-by-side of classical against quantum fabrication. |
| **Silicon** | Twenty real parts — Apple A-series and M-series, Google TPU v1 through the eighth generation, NVIDIA H100/Blackwell/Rubin, AMD MI300X, Cerebras WSE-3 — drawn at true relative area on one 300 mm wafer. Load any of them into the yield lab. |
| **Quiz** | Twenty-three questions, self-explaining. |

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
npm test         # build, then run the verification suite
```

`npm run verify` runs 183 checks across wafer geometry, yield model
correctness (pinned against hand-computed values), economics invariants,
defect scatter determinism, material chain mass balance, published specs for
real parts, compute-model
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

## Licence

MIT.
