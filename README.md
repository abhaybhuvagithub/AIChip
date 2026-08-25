# FabSim

An interactive walk through how a semiconductor chip is manufactured, and the
arithmetic that decides whether it can be sold.

**Live:** https://abhaybhuvagithub.github.io/AIChip/

Five tabs:

| Tab | What it does |
| --- | --- |
| **Fab line** | The 17 modules a wafer passes through, from crystal growth to final test. Each opens up into physics, tools, failure modes and duration. A "run a lot" button walks the line. |
| **Yield lab** | A live 300 mm wafer map drawn to scale. Drag die size, defect density, edge exclusion or scribe width and watch gross dies, yield and good dies move together. Four real yield models, side by side on the same wafer. |
| **Economics** | Cost per good die, silicon utilisation and gross margin, with eight real product shapes — mobile SoC through SiC power device — computed through the same model. |
| **Nodes** | 180 nm to 2 nm, with the transistor architecture that made each generation possible, and a drawn cross-section showing how many sides of the channel the gate controls. |
| **Quiz** | Twelve questions, self-explaining. |

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

## What is approximated

Die sizes, wafer prices and transistor densities are public estimates that
vary considerably by source. They are here to make the shape of the trade-off
concrete, not to quote anyone's contract. Density figures in the node table
should be read as a ranking rather than a specification — vendors count
transistors differently.

## What is not modelled

Cycle time and WIP, tool capacity and scheduling, mask set amortisation across
volume, redundancy repair at sort (which matters a great deal for DRAM),
binning and harvesting economics, or anything about the supply chain.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm test         # build, then run the verification suite
```

`npm run verify` runs 77 checks across wafer geometry, yield model correctness
(pinned against hand-computed values), economics invariants, defect scatter
determinism, content completeness, and the contents of the built bundle. A
failure blocks deployment — see `.github/workflows/deploy.yml`.

## Design

The token system is carried over from
[ArchSim System Design Studio](https://github.com/abhaybhuvagithub/ArchSim-System-Design-Studio)
so the two sit on the same shelf: same CSS variable names, same pill and card
geometry, IBM Plex Sans / IBM Plex Mono / Space Grotesk.

The default accent is amber, and the theme is called *Litho bay*, because a
lithography bay is lit yellow — photoresist is blind above about 500 nm, so
yellow light lets people work without exposing every wafer in the room.

Four themes ship: Litho bay, Wafer, Glow, and Cleanroom (light).

## The prompt

[`PROMPT.md`](PROMPT.md) holds the build prompt this repository was made with,
so the next change is held to the same bar. It is written to be re-run against
a new feature.

## Licence

MIT.
