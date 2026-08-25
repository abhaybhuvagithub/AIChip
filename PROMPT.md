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
> 5. **Public sources only.** Every figure must be traceable to something
>    publicly available — a vendor announcement, a published paper, public
>    reporting, or standard process engineering. No confidential, proprietary
>    or internal company data, ever. Where a figure cannot be sourced
>    publicly, mark it an estimate or leave it blank; never fill a gap with a
>    plausible-looking number, because in a table of real specifications a
>    guess is indistinguishable from a source.
> 6. **Client-side only.** No backend, no network calls at runtime, no
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
> - A pipeline, not a script. `npm test` must be the whole gate — lint, build,
>   verify, smoke, budget — in the order that fails fastest, and CI must run
>   exactly that, installing from a committed lockfile against a pinned Node
>   version so a CI build and a local build are the same build. Deploy runs
>   only from the default branch, is gated on CI, and does not count as
>   successful until the live URL is confirmed to be serving the exact
>   content-hashed asset that was just built. A green publish step means the
>   push succeeded, not that the bytes are being served.
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
>   responsive to 360 px, and a **named type scale** with prose and labels
>   separated: reading text at 17–21px, scan labels no lower than 14px. Define
>   the scale as CSS custom properties and enforce both the floor and the prose
>   tier with checks. Dense, data-heavy interfaces drift small one component at
>   a time, and the class that carries most of the explanatory prose is the one
>   that ends up smallest.
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

---

## Second pass: compute and quantum

Re-run with the change clause appended. What the bar caught this time:

- The compute model's first version counted MAC lanes from a "fraction of die
  used for compute" and a per-lane transistor count. It produced roughly nine
  times the throughput a real accelerator delivers, because it ignored that
  most of an accelerator die is SRAM, scheduling and memory PHY that the lanes
  cannot run without. Rewritten to divide *total* transistors by an amortised
  transistors-per-delivered-MAC figure, calibrated against a published part —
  and a verify check now pins that calibration so a refactor cannot move it
  without failing the build.
- The quantum estimator initially returned a qubit count for physical error
  rates above the surface code threshold. That is not a large number, it is a
  category error: above threshold, correction adds more errors than it removes
  and no qubit count works. It now refuses and the UI explains why, because a
  plausible-looking number would have been worse than none.
- Magic-state distillation was going to be omitted for simplicity. It is
  usually the largest single term in a real estimate, so hiding it would have
  made the tool quietly wrong. It is a slider with the caveat attached.

---

## Third pass: the material chain

Appended clause: *"and it should run without human intervention"* — which has
two readings, and taking only one of them would have been the shallow answer.
The tab autoplays, and its subject is a factory that genuinely runs unattended.

What the bar caught:

- The mass balance was written forwards first: start with a kilogram of rock,
  apply yields, see what falls out. Nobody in the industry thinks that way.
  They start with the part they have to ship and ask what it costs to feed the
  line, so the chain was rewritten to run backwards from one good die — which
  also connects it to the yield lab, since a worse defect density now visibly
  costs more rock.
- The first draft narrated the furnace as the purification step. It is not.
  Purity is won in the distillation columns, because trichlorosilane boils at
  32 °C and a liquid can be fractionally distilled where a metal cannot. The
  Siemens reactor only converts material that is already clean. Getting this
  backwards would have been a genuine error dressed as a simplification.
- "No human intervention" was almost written as a labour-cost story. It is a
  yield story: a fully gowned person still sheds particles continuously, and a
  particle is a defect. The copy says that, and says the people are still
  there — several thousand of them — doing the things that are not moving
  wafers.
- The autoplay loop initially listed `progress` as an effect dependency, which
  restarted the animation every frame and left it frozen at zero. Left in with
  a comment, because it is the exact mistake the next person will make.

---

## Fourth pass: real parts

Named silicon, so the models have something to bite on. This pass was mostly
a sourcing problem rather than a modelling one.

- **Training data was stale and would have shipped wrong figures.** Checked
  current sources before writing anything: Google is on its eighth TPU
  generation and has split training and inference into separate chips, NVIDIA
  shipped Rubin, Apple went to M5 on 3 nm rather than N2. Writing any of that
  from memory would have put confidently wrong numbers into a repository.
- **The temptation was to fill every cell.** Google does not publish TPU die
  areas and Apple has never published a die size in its history. The file
  marks those `areaKnown: false` and the UI says "not disclosed" and refuses
  to offer a load, rather than inventing a plausible number. A verify check
  enforces it, because a guessed figure in a table of real specifications is
  worse than a gap — it looks identical to a sourced one.
- **Third-party die-shot measurements are not vendor specifications**, so they
  carry an `est` flag and an asterisk in the table. Another check asserts
  every Apple area is flagged.
- **Spot-check assertions, not just structural ones.** The suite pins H100 at
  80 billion transistors on 814 mm² and WSE-3 at 4 trillion on 46,225 mm².
  Those exist so a careless edit to a number fails the build, which structural
  checks would never catch.

---

## Fifth pass: Arm and Terafab

Two additions that turned out to belong together: both are about industrial
structure, which the site had ignored entirely in favour of physics and
per-die economics.

- **"Terafab" was not a term I could place.** Rather than assuming it meant a
  tera-scale fab in the abstract, I looked it up — it is a specific announced
  Tesla/SpaceX project in Grimes County, Texas. Guessing would have produced
  something confident and wrong. When a brief contains a term you cannot
  source, that is the signal to check, not to infer from morphology.
- **The live-project problem.** Terafab has a site, permits and incentive
  agreements, and no wafers. Presenting announced figures alongside operating
  ones would have been the ordinary mistake. The tab uses two explicitly
  labelled tables — committed versus stated ambition — and verify checks
  enforce the boundary: the terawatt output claim is asserted to be in the
  ambitions column and asserted *not* to be in the confirmed one. The case
  against gets a full paragraph rather than a hedging clause.
- **An illustrative number must be labelled inside the data, not just in
  prose.** The fab-scale calculator needed a wafer-start figure for the
  terafab tier and none is published, so the tier carries `real: false`, the
  UI renders "Proposed" and an asterisk, and a check asserts the flag. A
  plausible number in a column of real ones is the same failure mode as a
  guessed die area on the Silicon tab.
- **Arm's own-silicon move creates a conflict worth naming.** It would have
  been easy to write the CSS/CSA story as a straightforward product ladder.
  Arm now competes with the licensees it sells to, including a sister company
  under the same owner, while RISC-V presses from below. A check asserts the
  tension text mentions both, and another asserts that RISC-V share figures
  are hedged — published estimates differ enormously depending on whether you
  count chips, cores or dollars.

---

## Sixth pass: 3D transistors and beyond

- **The status badge is the most important element on the tab.** Writing about
  CFET, forksheet and 2D-material channels is where this subject usually goes
  wrong: a working device at IEDM and a shipping product are routinely five to
  ten years apart, and prose that treats them alike is misinformation with
  good grammar. Every entry carries an explicit status, and verify asserts
  that exactly the three shipping architectures are marked production and that
  no beyond-CMOS option is.
- **Each speculative technology gets an honest note, not a caveat.** Tunnel
  FETs have demonstrated steep switching for twenty years and never delivered
  on-current. Negative capacitance is still disputed in the literature.
  Writing only the promise would have been the easy version and the useless
  one, so a check asserts every entry's limitation runs past forty characters.
- **The thermal wall had to be computed, not asserted.** It would have been
  simple to write "stacking is hard because of heat". Instead the tier slider
  multiplies power density while heat-removal area stays fixed, and the
  cooling table shows each approach buying roughly one more tier. The activity
  slider is the honest part: drag it down and the problem vanishes, which is
  precisely the trick stacked memory plays and stacked logic cannot.
- **A stray CJK character appeared mid-sentence in the copy** — an artefact,
  not a decision. Caught on a read-back before shipping, and there is now a
  bundle check for non-Latin characters so it cannot recur silently.

---

## Seventh pass: the pipeline

The checks were good and the delivery around them was not. One workflow, one
job, no linting, and a smoke test living in `/tmp` and run by hand.

- **A check that lives outside the repo is not a check.** The smoke test had
  been run manually for six sessions. It is now `scripts/smoke.mjs`, part of
  `npm test`, and it renders all eleven tabs across five configurations —
  including an unmakeable die and a zero-yield process — asserting not only
  that nothing throws but that no output leaks `NaN`, `undefined` or
  `[object Object]`. That last class reads as broken to a user while passing
  every other check, which makes it worse than a crash.
- **Linting earned its place immediately.** First run found a dead import, an
  unused prop threaded through two files, and a genuine hook-purity violation
  where `performance.now()` was called in a function defined during render.
  That last one was also redundant — setting the index already re-runs the
  effect that resets the clock — so the fix removed a race rather than
  suppressing a warning. Rules that fight prose (`no-unescaped-entities` on a
  site that is mostly prose) are turned off with a stated reason; rules that
  catch bugs are not.
- **Budget the transfer, not the source.** The bundle grew 206 kB to 331 kB
  across six feature passes with nothing watching. The budget is set close to
  current size on purpose — a budget with generous headroom never fires — and
  raising it is fine as long as the commit says what bought the bytes.
- **The deploy did not close its own loop.** Publishing successfully is not the
  same as being served, and this repo's own history contains the failure mode:
  a sister project shipped the previous build for weeks with green checks,
  because `git checkout` replaced a gitignored `dist/` with the deploy
  branch's tracked copy. Publishing now happens from a throwaway clone, and
  the job only passes once the live URL serves the exact content-hashed asset
  that was built.
- **The pipeline is itself something that can regress**, so verify checks it:
  that CI is read-only, that jobs have timeouts, that deploy is gated on CI and
  only runs from main, that it re-verifies before publishing and confirms
  afterwards.

---

## Eighth pass: simulating the line

The brief was to simulate what actually happens inside a fab. The site had
seventeen clickable process modules, which is a diagram, not a simulation.

- **A fab is a queueing problem, so it needed a queueing simulation.** Not a
  formula. Lots of 25 wafers, 70 mask layers, a real route per layer, eight
  tool groups with MTBF-based failures, defects accumulating per step, and
  excursions that run undetected until a sampled lot reaches metrology. One
  tick is one hour and the seed is fixed.
- **Three bugs, each instructive.** Released lots were never pushed into the
  first queue, so WIP climbed forever and utilisation stayed at zero — visible
  immediately because the numbers were checked against reality rather than
  eyeballed. Then `Math.round(1.5)` silently turned a 1.5-hour track into a
  2-hour one and moved the constraint off lithography: a wrong answer that
  looked entirely plausible. Process times are whole hours now, and a verify
  check asserts it.
- **Calibrate, then let the numbers fall out.** The tool set was sized so
  lithography is the constraint, because that is what it is in a real fab. The
  operating point then produced a 110-day cycle time, an X-factor of 2.7 and
  D0 ≈ 0.06 without any of those being fitted. Verify pins all four plus
  Little's law, so a refactor cannot quietly make the simulation unrealistic
  while still passing.
- **The lint caught a real architectural error.** The first version held the
  mutating simulation in a ref and read it during render — which can paint a
  half-updated line and does not trigger updates. The fix was a snapshot: the
  loop mutates, then publishes a plain serialisable object, and render reads
  only that. Configuration changes remount the component so its state
  initialiser rebuilds the line, rather than a reset effect. That is better
  code, not a silenced warning.
- **The budget rose from 115 kB to 125 kB**, and says why in the file. An
  engine plus a live dashboard is about 9 kB gzipped and is the largest single
  feature here.

---

## Ninth pass: God view, travel path, assistant

- **"AI assistant" had a constraint worth naming rather than working around.**
  This is a static bundle on GitHub Pages — no server, no key, no runtime
  network. There is nowhere to put a language model, and shipping a key in a
  public bundle to pretend otherwise would be indefensible. So the assistant is
  a grounded query engine over the app's own live state instead, and it says so
  in its own first message. For the questions this site provokes it is the
  better answer anyway: "what is the bottleneck" is computed off the running
  simulation rather than recalled. A verify check asserts it returns nothing
  for what it cannot ground, and another asserts no key or endpoint is in the
  bundle.
- **The assistant matched "write me a poem about wafers".** Bare substring
  matching saw "wafer" and offered to explain wafer slicing. Two guards now: a
  lookup must be question-shaped, and must match on a word boundary. The
  failing test came first and is still there.
- **The travel path refuses to summarise.** 626 steps, every repeat listed,
  because the repetition *is* the process — a chip is about ten operations run
  seventy times, and every diagram that collapses that is lying about the
  thing it depicts. A verify check asserts lithography appears exactly seventy
  times and that all seventy layers are represented, so a future tidy-up
  cannot quietly compress it.
- **Two checks failed because my estimates were wrong, not the code.** I
  guessed ~500 steps and "months" of process time; the real figures are 626
  steps and 56 days of pure process time, the three-month number being mostly
  queueing. Corrected the checks to the computed truth and said why in the
  comment, rather than nudging the model to match the guess.
- **Voice is browser-native and honestly gated.** Speech synthesis is broadly
  supported; recognition is Chromium-only. Controls that would not work are
  hidden rather than offered and failing.

---

## Tenth pass: legibility

The user said the type was too small to read. They were right, and it had been
wrong for nine passes.

- **It drifted rather than being decided.** Nothing chose 10.5px labels; each
  new component was written a half-step smaller than the last to fit more data
  on screen, and the audit found sizes at 10, 10.5, 11 and 11.5px across the
  stylesheet and inline styles. A dense interface degrades this way by default.
- **Fixed with one scale, not with sed on the complaints.** A single mapping
  applied to every font size in the project, so the proportions between
  headings, body, labels and data survive the change. Body went to 16.5px with
  a 1.6 line-height; the smallest mono labels went to 13px.
- **Then the layout had to follow.** Larger type does not fit in cards sized
  for smaller type, so the process cards, chain links, God-view nodes and the
  assistant panel were all widened to match.
- **A floor check, and proof it works.** Verify now rejects any CSS or inline
  font size below 13px, with SVG user units exempted since they are not
  pixels. I deliberately reintroduced a 10px label to confirm the check fired
  and named the offender before shipping it — an untested guard is not a guard.

---

## Eleventh pass: the science

The site had a great deal of *what* and not enough *why*. Ten tabs on process,
economics, operations and roadmap, and nowhere did it say why 60 mV/decade is a
wall or why hafnium replaced an oxide that had worked for forty years.

- **Equations with units, checked against textbook values before anything was
  drawn.** A throwaway script printed every function's output next to its known
  value first: kT/q = 25.85 mV, the subthreshold floor at 59.53 mV/decade, a
  1.121 eV bandgap, n_i = 1.00e10, 1.727 µF/cm² for 2 nm of SiO₂. All of those
  are now verify checks, so the tab cannot silently drift wrong — nothing else
  on the site would catch it if it did.
- **Two figures are worth the whole tab, and both fall out of constants rather
  than being typed in.** Gate leakage rises a decade per 0.181 nm of SiO₂,
  computed from √(2m*Φ)/ħ — the "decade per two angstroms" everyone quotes. And
  a 20 × 20 nm channel contains about eight dopant atoms, so threshold voltage
  varies by tens of percent from counting statistics alone. Neither is an
  engineering failure; both are arithmetic.
- **Say where a model stops being true, in the interface.** The square-law
  MOSFET is wrong below 100 nm and the tab says so directly under the chart,
  rather than presenting a first-order result as the truth. It earns its place
  because every modern model is a correction to it.
- **The legibility check caught the new tab on its first run**, flagging seven
  chart labels at 10.5 and 11px. That guard was added one pass earlier and has
  already paid for itself — which is the argument for adding checks at the
  moment you fix something rather than afterwards.
- **The budget rose 125 → 138 kB** and now carries its own history in the file,
  so each rise names the feature that bought the bytes.

---

## Twelfth pass: prose, specifically

Raising every size proportionally last pass was the wrong shape of fix. The
label sizes had been the visible offenders, so they got the attention, and the
class carrying most of the actual reading text — `.small`, used under nearly
every chart and table on the site — came out at 15.5px and still read as fine
print.

- **The distinction that was missing: prose you read versus labels you scan.**
  They had been sized as if they were the same thing, and prose lost every
  time, because a label at 14px is fine and a paragraph at 15.5px is not.
- **Fixed with named tokens rather than another sweep.** `--fs-lede` 21px,
  `--fs-prose` 18px, `--fs-body` 17.5px, `--fs-note` 17px, `--fs-data` 16.5px,
  `--fs-label` 14.5px. The selectors now reference the scale, so the next
  adjustment is one line and the relationships cannot drift apart again.
- **Line-height moved with size**, since raising size alone makes long
  paragraphs worse, not better — notes went to 1.68, body to 1.65.
- **Checks now pin the tier, not just a floor.** Body ≥ 17px, card prose ≥
  18px, notes ≥ 17px, lede ≥ 20px, the scale monotonic, and `.small` required
  to reference the token rather than a bare value. I set `--fs-note` back to
  15px to confirm two checks fired before shipping.
