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
> body, IBM Plex Mono for data and labels, Space Grotesk for display.
>
> Theming is a **palette crossed with a mode**, never a flat list with one
> light entry: every palette gets a hand-tuned light variant, plus an Auto mode
> that follows the OS live. A light theme is not an inverted dark one — accents
> that work on near-black wash out on white and must be darkened separately.
> Compute WCAG contrast for every combination in the verify suite rather than
> eyeballing it. Respect `prefers-reduced-motion`.
>
> Ground the palette in the subject rather than a default: the default accent
> is amber because lithography bays are lit yellow so photoresist does not
> expose, and that is the one thing everyone who has stood in a fab
> remembers. Name the theme after the room.
>
> Iconography is drawn, not imported: line art on one grid, stroked in
> `currentColor` so every icon works in every palette and both modes from a
> single asset. Emoji carry their own colours and their own baggage; an icon
> font is a network request for glyphs that were never designed for this
> subject. Give the set a grammar so it reads as a family, and check that every
> icon a data file references actually exists — a typo should fail the build,
> not render an invisible gap.
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

---

## Thirteenth pass: palette × mode

The theme list had five entries of which exactly one was light, which is not a
light mode — it is a light theme someone has to know to find, and it loses your
palette choice when you pick it.

- **Restructured to two independent axes.** `data-theme` selects the palette,
  `data-mode` selects dark or light, and Auto resolves from the OS *and keeps
  following it* — a machine that flips at sunset flips the page with it, rather
  than only being read at load. Kesar joins from ArchSim, saffron accent intact.
- **Every light variant is hand-written, not derived.** Inverting a dark theme
  produces accents that wash out: the amber that carries Litho bay at 10.8:1 on
  near-black manages 1.9:1 on white. Each light palette has its own darkened
  accent, chosen against a contrast calculation rather than by eye.
- **Contrast is computed in the suite, from the stylesheet.** All thirty ratios
  — text on background, text on card panel, muted on background, accent on
  background — recomputed by parsing the CSS. Text must clear AAA, muted must
  clear AA because muted carries the `.small` prose class, accents 3:1. Two
  further checks assert light modes are actually light and that a palette's two
  variants genuinely differ, since a mislabel would be invisible in review and
  obvious to a user.
- **Existing choices are migrated, not discarded.** Someone who had picked the
  old `cleanroom` theme lands on Litho bay in light mode rather than being
  silently reset.
- **The browser chrome follows.** `theme-color` is updated from the resolved
  `--bg`, so a light page no longer sits under a black status bar on mobile.

---

## Fourteenth pass: pinning the mode switch

The switch was already last in the DOM, so "move it to the corner" was not a
reordering job — the toolbar was a single wrapping flex row, and with fourteen
tabs the wrap carried the controls along with it.

- **Fixed the cause, not the position.** The toolbar is now two rows: controls
  in the top row with the switch in the corner, tabs in their own row below.
  The tab row scrolls horizontally instead of wrapping, which also stops the
  toolbar height changing as tab labels change and shoving page content down.
- **The check asserts position, not presence.** A check that `.modeswitch`
  exists would have passed the whole time it was in the wrong place. The new
  ones assert it sits inside the control row, after the spacer, before the tab
  nav, and that no control follows it — verified by adding a stray button after
  it and watching the last of those fail.

---

## Fifteenth pass: clock speed

"GHz and advanced THz" is a brief that invites a wrong answer. There is no
terahertz processor, none is coming, and writing the tab as though there might
be would have been the easy version.

- **The honest story is better than the marketing one.** Individual transistors
  passed a terahertz in 2007 and reached 1.5 THz by 2013; commodity processors
  clock at five or six gigahertz. That two-hundred-fold gap, and the four
  separate walls that create it, is far more interesting than a roadmap to a
  terahertz CPU would have been.
- **Compute the refusal, do not assert it.** A terahertz CMOS clock is not
  dismissed in prose — the tab computes it: 1.6 GW from P ∝ f³, past every
  cooling approach on the 3D tab, and a signal reach of 173 µm per cycle, which
  is smaller than one functional block. A clock that cannot cross its own die
  in one period is not a clock, and that falls out of c/√ε rather than opinion.
- **Keep conflatable quantities visually distinct.** Device f_max, radio
  carrier frequency and processor clock are three different things, and almost
  every terahertz-chip claim comes from swapping one for another. The ladder
  colours them separately and a verify check asserts no processor clock in it
  sits above 100 GHz — I moved one to 1.2 THz to confirm the check named it.
- **Checked the figures rather than recalling them.** InP f_max above 1 THz,
  the 48 GHz SFQ multiplier, the ~700 GHz RSFQ ceiling and the sub-THz 6G bands
  are all sourced, and each carries a status so research is never mistaken for
  shipping.

---

## Sixteenth pass: speed binning in the yield lab

Clock frequency had its own tab and no connection to the wafer, which left the
site making a claim it never demonstrated: that yield and speed are the same
process variation seen twice.

- **The missing model was per-die Fmax.** Three sources, and they behave
  differently: systematic radial variation (anneal, CMP and focus all vary with
  radius, so the slow ring repeats on every wafer from that tool), random
  die-to-die noise, and within-die worst-path statistics. The wafer map now
  colours by bin, and the ring is immediately visible in the same place the
  defects and partial dies are.
- **The within-die term is the interesting one, and it is gentle.** A die runs
  at its slowest critical path, and the worst of N samples sits about
  √(2·ln N) deviations out. Six times the area costs under 2% of clock, while
  the same change destroys yield. Asserting that contrast is more useful than
  asserting the term exists.
- **A normalisation bug that looked plausible.** The path penalty was applied
  absolutely, shifting every die 10% below every bin — a wafer where nothing
  sells, which reads as a believable result rather than a bug. Fixed by
  normalising against a reference die area, with a check that a nominal die
  lands on the nominal clock.
- **The model produced a counterintuitive result worth keeping, not smoothing.**
  Tightening die-to-die variation often *lowers* blended price, because
  tightening around a median below a bin edge removes the lucky fast dies
  without promoting anything. That is true of real fabs and it is now a
  callout and a quiz question.
- **Smoke caught a genuine crash.** `Math.min(...array)` blows the call stack
  past about 100,000 elements, and a 450 mm wafer of 1 mm dies has 150,000 —
  reachable from the sliders. It surfaced only because the smoke test renders a
  deliberate extremes configuration. Replaced with iteration, and there is now
  a verify check that runs the whole binning path on a 100k-die wafer.

---

## Seventeenth pass: zero to market

The site modelled the physics and the factory and never the business case,
which is the thing that actually decides whether a chip exists. A design that
yields beautifully is still a bad idea if the money to reach it can never be
earned back.

- **Build the whole tab around one equation.** Break-even units = NRE ÷ (price
  − cost per unit). Everything else — the phase timeline, the node table, the
  cash curve — is decoration on that, and the tab says so rather than
  presenting six coequal charts.
- **Wire it to the models already here.** Cost per unit is not an input; it
  comes from the die configured in the yield lab, through the same yield model.
  Changing the die changes the business case, which is the point.
- **Cross-check the build-up against an independent figure.** NRE is computed
  from engineer-years, mask cost, EDA and IP — then compared against the
  commonly cited total-design-cost estimate for that node, which is a genuinely
  separate number. A verify check asserts they agree within a factor of two.
  Agreement is reassurance, not proof, and the tab says that too.
- **The model produced the lesson rather than being told it.** A low-price part
  that pays back at 28 nm never pays back at 3 nm — not because the chip is
  worse but because the NRE cannot be amortised over the volume the market
  absorbs. That is the honest reason most silicon is not leading-edge, and it
  falls out of the arithmetic. There is a check asserting it stays true.
- **Estimates that vary by 2× are labelled as such.** Nobody publishes their
  real mask bill. The ratios between nodes are more trustworthy than any single
  figure and the shape of the cash curve more trustworthy than either, and the
  closing note says exactly that instead of implying precision.

---

## Eighteenth pass: icons

The site had been using unicode glyphs — ▤ ▦ ◫ ▪ — as stand-ins for chips.
They were placeholders that had quietly become permanent.

- **Drawn, not imported.** About thirty line-art icons on a shared 24×24 grid,
  stroked in `currentColor`. That single decision means one asset works across
  five palettes and two modes, and an icon can take a maker's hue or a speed-bin
  colour without a variant. Emoji would have brought their own palette; an icon
  font would have been a network request for glyphs never designed for silicon.
- **Give the set a grammar.** A chip is a rounded square with connections on its
  edges; what it *does* is shown by what fills it; an IP block gets a dashed
  outline, because it is a licensed drawing rather than a part. Without a rule
  like that, thirty icons are thirty unrelated drawings.
- **Applied where they distinguish, not everywhere.** The Economics product
  table, the Silicon catalogue, the value-chain layers, the Arm licence types
  and the NRE lines all gained icons because in each the icon carries
  information. The yield-lab preset dropdown lost its glyph entirely — a
  `<select>` cannot render SVG, and a lone emoji there was worse than nothing.
- **The check is on the reference, not the asset.** A misspelled icon name
  renders an invisible gap that no visual review catches. Verify resolves every
  `icon:` in every data file against the set; I typo'd one to confirm it named
  the file and the bad key.

---

## Nineteenth pass: icons, in detail

The previous set was thirty simple outlines. Adequate, and not what the subject
deserves — a chip package has real structure and drawing it as a square with
dots throws that away.

- **Draw the thing, do not symbolise it.** A BGA is now a cross-section:
  substrate, die, bond wires arcing to the die edge, mould cap, solder balls
  underneath. A 2.5D interposer shows three distinct bump pitches, because that
  is the entire point of a 2.5D package. Hybrid bonding is two dies with a
  single seam and no solder at all. Someone who knows packages should recognise
  each instantly; someone who does not should still read the shape.
- **The transistor icons carry an argument.** Planar shows the gate on one face,
  FinFET wrapping three, nanosheet wrapping four, forksheet with its dielectric
  wall, CFET with n stacked over p. The whole roadmap is legible from six icons
  in a row, which no amount of prose achieves as quickly.
- **Coverage, not decoration.** 64 icons now, and every unicode glyph on the
  site is gone: sixteen fab tool types on the fab-line modules and the travel
  path, the material chain, the quantum modalities, the business phases. A
  `glyph:` field of unicode characters had survived twelve passes.
- **Check the property that matters.** A check that icons *exist* would have
  passed before this pass and after it. So the suite now asserts an average of
  at least four drawn shapes per icon — a direct measure of the thing that was
  actually improved, and one that fails if someone later simplifies them back.

---

## Twentieth pass: discipline and ethics

The brief asked for what is required to make this "a flawless success". The tab
argues with the word, in its own headline, because the premise is the most
important thing to correct.

- **Flawless is the wrong target, and saying so is the contribution.** A
  culture that expects perfection is a culture where problems get hidden,
  because admitting one marks you out. The disciplines exist because failure is
  certain; the goal is detection, containment and recovery. Agreeing with the
  brief would have produced a worse tab.
- **Then earn the claim with arithmetic.** Seven hundred steps, yield
  multiplies, so 99% line yield demands 99.9986% per step — fourteen parts per
  million, every step, every time. That single computed figure makes the case
  for procedure over heroics better than any amount of exhortation, and it
  reframes discipline as arithmetic rather than virtue.
- **Name the hard case, and keep its qualification.** The tab cites a
  documented occupational-health settlement with dates and the company's own
  quoted words — and states that the company did not concede causation, because
  it did not. A verify check asserts that clause and the word "contested"
  cannot be edited out; I removed them to confirm it fired. Long-latency
  disease is genuinely hard to attribute, and a site that flattened that into
  an accusation would be doing the same thing it criticises elsewhere:
  preferring a clean story to a measurement.
- **Ethics sections fail when they are lists of virtues.** Each discipline
  therefore states what breaks in its absence, and each ethical domain states
  what good practice actually looks like rather than that the issue is
  important. On dual use the tab says plainly that reasonable people disagree
  about where the line sits — because they do, and claiming otherwise would be
  the same false confidence.

---

## Twenty-first pass: the truncated phase labels

A small fix with a general lesson. The business-tab phase blocks are sized by
duration — `flex: months` — so the one-month tapeout block is necessarily a
sliver and its label was being cut off mid-word.

- **Fix the cause as well as the symptom.** A tooltip alone would have left a
  block a few pixels wide and barely clickable. So: a `min-width` floor so the
  shortest phase stays usable, `text-overflow: ellipsis` so a truncated label
  reads as deliberate rather than broken, and only then the tooltip carrying
  the full text.
- **Hover is not the only way in.** The tooltip opens on `:focus-visible` as
  well as `:hover`, so keyboard users get it, and an `aria-label` carries the
  full text for screen readers — which never see the truncation and would
  otherwise be read a half-word.
- **A CSS trap worth knowing.** Setting `overflow-x: auto` silently makes
  `overflow-y` auto too, so a tooltip drawn above a block inside a horizontally
  scrolling rail is clipped. Rather than ship it broken at that breakpoint, the
  blocks get a roomier fixed width there and the tooltip is suppressed — the
  detail card below already carries everything.
- **Checks assert the compensations, not the tooltip.** Asserting a tooltip
  exists would pass while the label was still cut off mid-word. The suite
  checks the ellipsis, the min-width, the focus-visible rule, the aria-label
  and both suppression cases.

---

## Twenty-second pass: the glass sidebar

Seventeen destinations in a horizontally scrolling tab row had stopped being
navigation and become a haystack. Moving them into a sidebar was the excuse;
grouping them was the actual improvement.

- **Glass built from tokens, not from rgba.** The translucency comes from
  `color-mix(in srgb, var(--panel) 62%, transparent)`, so one declaration
  serves five palettes and two modes — light palettes get light glass
  automatically. Hardcoding an rgba would have meant ten variants and nine
  chances to get one wrong, and there is a check asserting none crept in.
- **Translucency without blur is worse than no glass.** `backdrop-filter` is
  not universal, and where it is missing a see-through panel leaves text
  floating on whatever is behind it. A `@supports not` block falls back to an
  opaque panel. I deleted the fallback to confirm the check fired.
- **Glass has a lit edge in the physical world.** A one-pixel gradient down the
  inner border is the difference between something that reads as glass and
  something that reads as flat transparency.
- **Grouping was the point.** Six named sections with an icon each, and the
  groups are *derived* from the tab list rather than declared separately, so
  adding a tab cannot leave it orphaned outside a group.
- **Three older checks failed, correctly.** They guarded the tab row that no
  longer exists. I rewrote them against the new structure rather than deleting
  them — a check that fails because the thing it guarded moved is doing exactly
  its job, and deleting it would throw away the coverage.

---

## Twenty-third pass: more science

The science tab covered the transistor and stopped. Four things a
semiconductor engineer would notice missing: why silicon at all, how carriers
actually move, what goes wrong when channels get short, and the wire problem.

- **Why silicon is the best question on the tab.** Germanium is three times
  faster, gallium arsenide six, silicon carbide blocks ten times the field —
  and silicon won on its native oxide, its abundance and its thermal
  conductivity. None of them electrical. It also carries the indirect-bandgap
  explanation, which is why silicon cannot lase and why silicon photonics
  still bonds an indium phosphide die on top to make the light it then guides.
- **Two bugs, both caught by checking against reality before building the UI.**
  The RC delay used `1e-2` where the µΩ·cm → Ω·nm conversion needs `10`, so
  every wire delay came out a thousand times too small — and picoseconds next
  to a wire look entirely plausible, which is what made it dangerous. And the
  "gate is in control" threshold used the textbook five natural lengths, at
  which this model still gives 200 mV/V of DIBL; real designs sit at seven to
  ten. Both are now pinned by checks, and I reintroduced the unit bug to
  confirm the new ones name it.
- **Section 9 is the roadmap in one control.** Drag the channel below seven
  natural lengths and the drain takes over; switch to gate-all-around and the
  same channel becomes workable. Every architecture change on the 3D tab exists
  to shrink λ so L can shrink with it, and here that is a slider rather than a
  claim.
- **Check the physics as invariants, not just as values.** Combined mobility
  must be worse than either mechanism alone (Matthiessen), phonon and impurity
  scattering must move oppositely with temperature, DIBL must fall by exactly
  e per two natural lengths, Elmore delay must go exactly as length squared.
  Those catch a wrong model that happens to produce a right-looking number.
