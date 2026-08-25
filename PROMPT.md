# The build prompt

This is the prompt this repository was built with, kept in the repo so the
next change is held to the same bar as the first one. Paste it whole. It is
written to be re-runnable: point it at a feature and it produces the feature
plus the checks that stop the feature regressing.

---

## Prompt

> You are building **FabSim**, an interactive site that explains how a
> semiconductor chip is manufactured and the arithmetic that decides whether
> it can be sold profitably. Ship it production-grade, in one pass.
>
> **Subject and audience.** An engineer, student, or investor who knows what a
> chip is and nothing about how one is made. The page's single job is to make
> the reader feel *why* die area is the cruellest variable in the industry.
> Never explain a number without letting them change it.
>
> **Non-negotiables**
>
> 1. **Every number is computed, never asserted.** No hardcoded yield figures
>    in the copy. If the page says a yield is 62%, a function produced 62%
>    from inputs the reader can move. Where a figure comes from outside —
>    wafer prices, die sizes, density claims — say on the page that it is a
>    public estimate and varies by source.
> 2. **The picture and the number come from the same code.** If a wafer map
>    is drawn beside a die count, the count must come from the same layout
>    that drew the map. A closed-form approximation that disagrees with the
>    rendered picture is a bug, because the reader trusts their eyes.
> 3. **No dead interactivity.** Every control changes something visible
>    within one frame. If a slider exists, moving it must move the answer. Cut
>    any control that only exists to look interactive.
> 4. **State is a URL.** The current configuration lives in the address bar so
>    a reader can send someone the exact thing they are looking at.
> 5. **Client-side only.** No backend, no network calls at runtime, no
>    analytics, no storage beyond a theme preference. It must work offline and
>    deploy as static files.
>
> **Design direction**
>
> Carry the token system from `ArchSim-System-Design-Studio`: the same CSS
> variable names (`--bg --panel --panel2 --border --text --muted --accent
> --ok --warn --bad`), pill buttons, `--r-card` geometry, IBM Plex Sans for
> body, IBM Plex Mono for data and labels, Space Grotesk for display. Ship
> at least one light theme and respect `prefers-reduced-motion`.
>
> Ground the palette in the subject rather than a default: the default accent
> is amber because lithography bays are lit yellow so photoresist does not
> expose, and that is the one thing everyone who has stood in a fab
> remembers. Name the theme after the room.
>
> Pick **one** signature element and spend the boldness there — for this
> build, the live wafer map with dies drawn to scale, ghosted partial dies at
> the edge, and defect-killed dies in red. Everything around it stays quiet.
>
> **Writing**
>
> Write like someone who has been in the building. Plain verbs, sentence
> case, no marketing register, no exclamation marks, no "unlock" or
> "revolutionise". Prefer the concrete fact over the adjective: not
> "extremely precise", but "flat to a few tens of nanometres across 300 mm".
> Every section should contain at least one thing a reader did not know.
> Where a simplification is load-bearing, say so rather than hiding it.
>
> **Production-grade means**
>
> - A `scripts/verify.mjs` suite that runs on `npm test` and fails the build.
>   It must pin the maths against hand-worked cases (not against whatever the
>   code currently returns), check invariants across a sweep rather than a
>   single point, check edge cases return sane values instead of `NaN` or
>   `Infinity`, validate that content data is complete and internally
>   consistent, and inspect the **built bundle** to confirm the app, the
>   themes, and the static assets actually shipped.
> - An error boundary that explains what broke and offers a way back, never a
>   blank page.
> - Keyboard focus visible, ARIA labels on every control, semantic headings,
>   responsive to 360 px.
> - Comments that explain *why*, especially where a non-obvious choice was
>   made or a trap was avoided. No comments that restate the code.
> - CI that builds, verifies, and deploys on every push to `main`. A failing
>   verify must block the deploy.
>
> **Deliver**: working site, verify suite passing, GitHub Actions deploy to
> Pages, and a README that states what is modelled, what is approximated, and
> what is not modelled at all.

---

## How to re-run it

For a change rather than a fresh build, append:

> Add `<feature>`. Hold everything above. Before you finish: extend
> `scripts/verify.mjs` with checks that would have caught this feature
> breaking, and confirm `npm test` passes. If the feature makes an existing
> check wrong, change the check and say why in the commit.

## What the bar caught on the first build

Worth keeping, because these are the mistakes the prompt exists to prevent:

- The die count started as the De Vries closed form, `πr²/S − πd/√(2S)`. It
  disagreed with the drawn map by a few dies. Rule 2 forced placing and
  counting the grid instead — slower, but the picture and the number can no
  longer diverge.
- Defects were initially re-scattered on every render, so dragging a slider
  reshuffled the whole wafer and nothing could be compared. Seeding the RNG
  fixed it.
- The verify suite's first yield checks compared against the code's own
  output, which would have passed forever regardless of correctness. They were
  rewritten against hand-computed values: `e^-0.5 = 0.60653`, `1/(1+0.5) =
  0.6667`, `(1+0.25)^-2 = 0.64`.
- CSS minification strips quotes from attribute selectors, so a bundle check
  for `data-theme="litho"` failed against a correct build. The check now
  accepts both forms — a reminder to test what ships, not what you wrote.
