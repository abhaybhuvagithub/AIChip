import React, { useEffect, useMemo, useState } from 'react'
import FabLine from './ui/FabLine.jsx'
import FabRun from './ui/FabRun.jsx'
import GodView from './ui/GodView.jsx'
import Assistant from './ui/Assistant.jsx'
import Icon from './ui/Icon.jsx'
import YieldLab from './ui/YieldLab.jsx'
import Economics from './ui/Economics.jsx'
import NodesView from './ui/Nodes.jsx'
import Silicon from './ui/Silicon.jsx'
import Beyond3D from './ui/Beyond3D.jsx'
import Science from './ui/Science.jsx'
import Clock from './ui/Clock.jsx'
import ValueChain from './ui/ValueChain.jsx'
import Business from './ui/Business.jsx'
import Ethics from './ui/Ethics.jsx'
import Teams from './ui/Teams.jsx'
import Unsolved from './ui/Unsolved.jsx'
import Acronyms from './ui/Acronyms.jsx'
import Trace from './ui/Trace.jsx'
import Operate from './ui/Operate.jsx'
import SandToSilicon from './ui/SandToSilicon.jsx'
import Compute from './ui/Compute.jsx'
import AIChips from './ui/AIChips.jsx'
import Quantum from './ui/Quantum.jsx'
import Quiz from './ui/Quiz.jsx'
import { TOUR } from './data/learn.js'
import { PRODUCTS } from './data/nodes.js'
import { buildJourney } from './lib/journey.js'
import { navigate } from './lib/motion.js'

const TABS = [
  // Grouped by the question each tab answers, not by when it was built. Every
  // entry carries a description because a sidebar of twenty-three items where
  // half the labels are single words — Clock, Trace, Nodes — is a list, not
  // navigation.
  { id: 'god', label: 'God view', icon: 'spark', group: 'Orientation',
    desc: 'The whole pipeline on one screen, live. Every node clicks through.' },
  { id: 'trace', label: 'Trace', icon: 'graph', group: 'Orientation',
    desc: 'Pick any fact — eight cores, one EUV supplier — and walk it back to a constant of nature.' },

  { id: 'sand', label: 'Sand → silicon', icon: 'quartzite', group: 'Making a chip',
    desc: 'Quartzite to a polished wafer, and where nine-nines purity comes from.' },
  { id: 'line', label: 'Fab line', icon: 'scanner', group: 'Making a chip',
    desc: 'Seventeen process modules, repeated seventy times over. Click any to run a lot through it.' },
  { id: 'run', label: 'Fab run', icon: 'foundry', group: 'Making a chip',
    desc: 'A discrete-event fab simulation, or the full 626-step journey narrated.' },
  { id: 'wafer', label: 'Yield lab', icon: 'wafer', group: 'Making a chip',
    desc: 'A live wafer map with four yield models, plus speed binning across the same dies.' },

  { id: 'science', label: 'The science', icon: 'atom', group: 'Why it works',
    desc: 'Eleven sections of device physics, computed live — from the switch to how it wears out.' },
  { id: 'nodes', label: 'Nodes', icon: 'timeline', group: 'Why it works',
    desc: '180 nm to 2 nm, with drawn cross-sections and what the names stopped meaning.' },
  { id: 'clock', label: 'Clock', icon: 'clock', group: 'Why it works',
    desc: 'Why frequency stopped in 2005, and what terahertz actually refers to.' },
  { id: '3d', label: '3D & beyond', icon: 'layers', group: 'Why it works',
    desc: 'The gate wrapping the channel, stacking, bonding density and the thermal wall.' },

  { id: 'silicon', label: 'Silicon', icon: 'soc', group: 'What it becomes',
    desc: 'Twenty real chips drawn to true relative scale on one wafer.' },
  { id: 'compute', label: 'Compute', icon: 'chart', group: 'What it becomes',
    desc: 'Transistors to operations per second, and what precision does to the number.' },
  { id: 'ai', label: 'AI chips', icon: 'npu', group: 'What it becomes',
    desc: 'The roofline model, and why a thousand-teraflop chip delivers three.' },

  { id: 'chain', label: 'Value chain', icon: 'route', group: 'The industry',
    desc: 'Seven layers from instruction sets to packaging, and where the chokepoints are.' },
  { id: 'economics', label: 'Economics', icon: 'money', group: 'The industry',
    desc: 'Cost per good die, wafer to product, across eight real product shapes.' },
  { id: 'business', label: '0 → market', icon: 'iplicense', group: 'The industry',
    desc: 'Four years and half a billion dollars, and the one calculation that decides it.' },
  { id: 'teams', label: 'Teams & roles', icon: 'ipnoc', group: 'The industry',
    desc: 'Who builds it — eight disciplines, 25 roles, and a headcount model.' },
  { id: 'ethics', label: 'Discipline', icon: 'shield', group: 'The industry',
    desc: 'Why flawless is the wrong target, and eight places the judgement is real.' },
  { id: 'operate', label: 'Run & operate', icon: 'gauge', group: 'The industry',
    desc: 'An autonomous operator runs the company for twenty quarters. Override it and see the bill.' },

  { id: 'quantum', label: 'Quantum', icon: 'transmon', group: 'The frontier',
    desc: 'Surface-code overhead, five modalities, and what a quantum fab has in common with this one.' },
  { id: 'unsolved', label: 'Open problems', icon: 'flask', group: 'The frontier',
    desc: 'Eighteen things nobody has solved, and how long each has been open.' },

  { id: 'acronyms', label: 'Acronyms', icon: 'book', group: 'Reference',
    desc: '172 abbreviations, each with what it actually means rather than just what it stands for.' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz', group: 'Reference',
    desc: 'Sixty-one questions. Every answer is somewhere on the other tabs.' },
]

/** Groups, in the order they appear, derived so the two cannot drift apart. */
const GROUPS = TABS.reduce((acc, t) => {
  const g = acc.find((x) => x.label === t.group)
  if (g) g.tabs.push(t); else acc.push({ label: t.group, tabs: [t] })
  return acc
}, [])

// Palette and mode are independent. Each palette has a hand-tuned light
// variant rather than a derived one, because inverting a dark theme produces
// accents that wash out on white.
const PALETTES = [
  { id: 'litho', label: 'Litho bay', why: 'Amber — lithography bays are lit yellow so resist does not expose.' },
  { id: 'wafer', label: 'Wafer', why: 'The iridescence of a polished wafer under light.' },
  { id: 'glow', label: 'Glow', why: 'Carried over from ArchSim, so the two sites sit on one shelf.' },
  { id: 'kesar', label: 'Kesar', why: 'Saffron. Also from ArchSim.' },
  { id: 'mk', label: 'Millikelvin', why: 'For the quantum tab — colder than deep space.' },
]
const MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true

const DEFAULT = {
  ...PRODUCTS[0], preset: PRODUCTS[0].id,
  waferDia: 300, scribe: 0.08, edgeExclusion: 3, model: 'negbinom', alpha: 2.5,
  lineYield: 0.98, testYield: 0.97, packageYield: 0.995, clustered: true, seed: 7,
  // Speed binning: where the process is centred, and how much it varies.
  fBase: 5, dieSigma: 0.035, radialAmp: 0.06, radialSign: -1,
}

// State lives in the URL hash so a configuration is a link. Someone arguing
// about a yield number can send the exact wafer they are looking at.
function readHash() {
  try {
    const raw = window.location.hash.replace(/^#/, '')
    if (!raw) return null
    const p = new URLSearchParams(raw)
    const out = {}
    for (const [k, v] of p) out[k] = /^-?\d*\.?\d+$/.test(v) ? parseFloat(v) : v === 'true' ? true : v === 'false' ? false : v
    return out
  } catch { return null }
}

export default function App() {
  const hash = readHash()
  // Renaming a tab renames its URL. An old link would otherwise fall through
  // the `some()` check below and land silently on a different tab, which reads
  // as the link being broken. Aliases are cheap; keep them when an id changes.
  const TAB_ALIASES = { javy: 'operate' }
  const wanted = TAB_ALIASES[hash?.tab] || hash?.tab
  const [tab, setTab] = useState(wanted && TABS.some((t) => t.id === wanted) ? wanted : 'sand')
  const [palette, setPalette] = useState(() => {
    const saved = localStorage.getItem('fabsim.palette')
    // Migrate the old flat theme names, so an existing visitor's choice is
    // not silently thrown away by the restructure.
    const legacy = localStorage.getItem('fabsim.theme')
    if (saved) return saved
    if (legacy === 'cleanroom') return 'litho'
    return PALETTES.some((p) => p.id === legacy) ? legacy : 'litho'
  })
  const [mode, setMode] = useState(() => {
    if (localStorage.getItem('fabsim.mode')) return localStorage.getItem('fabsim.mode')
    return localStorage.getItem('fabsim.theme') === 'cleanroom' ? 'light' : 'auto'
  })
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const [cfg, setCfg] = useState({ ...DEFAULT, ...(hash || {}) })
  const [tourStep, setTourStep] = useState(-1)
  const [snap, setSnap] = useState(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [navQuery, setNavQuery] = useState('')
  const journey = useMemo(() => buildJourney(70), [])
  const [copied, setCopied] = useState(false)

  // Auto follows the OS live, not just at load — someone whose machine flips
  // at sunset should see this flip with it.
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = (e) => setSystemDark(e.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  const resolved = mode === 'auto' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('data-theme', palette)
    el.setAttribute('data-mode', resolved)
    localStorage.setItem('fabsim.palette', palette)
    localStorage.setItem('fabsim.mode', mode)
    // Keep the browser chrome in step — otherwise a light page sits under a
    // black status bar on mobile.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content',
        getComputedStyle(el).getPropertyValue('--bg').trim() || '#0b0a07')
    }
  }, [palette, mode, resolved])

  useEffect(() => {
    const p = new URLSearchParams()
    p.set('tab', tab)
    for (const k of ['dieX', 'dieY', 'waferDia', 'd0', 'model', 'alpha', 'edgeExclusion', 'waferCost', 'asp', 'packageCost', 'preset', 'fBase', 'dieSigma', 'radialAmp', 'radialSign']) {
      if (cfg[k] !== undefined && cfg[k] !== '') p.set(k, String(cfg[k]))
    }
    window.history.replaceState(null, '', '#' + p.toString())
  }, [tab, cfg])

  const patch = (d) => setCfg((c) => ({ ...c, ...d }))

  // Every route change on the site goes through here, so the cross-fade and
  // the scroll reset happen once rather than being remembered at a dozen call
  // sites. Selecting the tab you are already on does nothing, which stops an
  // accidental flash when someone clicks the current item in the sidebar.
  const go = (id) => {
    if (id === tab) return
    navigate(() => setTab(id))
  }

  const tourNext = () => {
    const n = tourStep + 1
    if (n >= TOUR.length) { setTourStep(-1); return }
    setTourStep(n)
    go(TOUR[n].tab)
  }

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch { setCopied(false) }
  }

  return (
    <div className="app">
      {/* Frosted sidebar. Seventeen destinations need grouping and vertical
          room; the old scrolling tab row gave them neither. */}
      <aside className={`sidebar ${navOpen ? 'open' : ''}`} aria-label="Sections">
        <div className="side-head">
          <div className="logo"><span className="mark" aria-hidden="true" />Fab<span>Sim</span></div>
          <button className="side-close btn sm" onClick={() => setNavOpen(false)} aria-label="Close navigation">✕</button>
        </div>
        {/* Twenty-three destinations is past the point where scanning works,
            so: filter the list, and let the current one say what it holds. */}
        <div className="side-filter">
          <input
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder="Filter sections"
            aria-label="Filter sections"
            autoComplete="off"
          />
          {navQuery && (
            <button onClick={() => setNavQuery('')} aria-label="Clear filter">✕</button>
          )}
        </div>

        <nav className="side-nav">
          {(() => {
            const q = navQuery.trim().toLowerCase()
            // Match the label, the description and the group, so "yield",
            // "roofline" and "physics" all find something.
            const hit = (t) => !q || t.label.toLowerCase().includes(q) ||
              t.desc.toLowerCase().includes(q) || t.group.toLowerCase().includes(q)
            const groups = GROUPS
              .map((g) => ({ ...g, tabs: g.tabs.filter(hit) }))
              .filter((g) => g.tabs.length)
            if (!groups.length) {
              return <div className="side-empty">Nothing matches “{navQuery}”.</div>
            }
            return groups.map((g) => (
              <div className="side-group" key={g.label}>
                <div className="side-group-label">{g.label}</div>
                {g.tabs.map((t) => (
                  <button
                    key={t.id}
                    className={`side-tab ${tab === t.id ? 'on' : ''}`}
                    onClick={() => { go(t.id); setNavOpen(false); setNavQuery('') }}
                    aria-current={tab === t.id ? 'page' : undefined}
                  >
                    <span className="side-tab-row">
                      <Icon name={t.icon} size={20} />
                      <span className="side-tab-label">{t.label}</span>
                    </span>
                    {/* Only the current item expands. Twenty-three descriptions
                        at once is a wall; one is an explanation. */}
                    {tab === t.id && <span className="side-tab-desc">{t.desc}</span>}
                  </button>
                ))}
              </div>
            ))
          })()}
        </nav>
      </aside>

      {navOpen && <div className="side-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <div className="shell">
        <header className="toolbar">
          <div className="toolbar-top">
            <button className="side-open btn sm" onClick={() => setNavOpen(true)} aria-label="Open navigation">☰</button>
            <div className="crumb">{TABS.find((t) => t.id === tab)?.label}</div>
            <div className="spacer" />
            <button className="btn sm" onClick={share}>{copied ? '✓ Link copied' : 'Copy link'}</button>
            <button className="btn sm" onClick={() => (tourStep < 0 ? tourNext() : setTourStep(-1))}>
              {tourStep < 0 ? 'Take the tour' : 'End tour'}
            </button>
            <select className="btn sm" value={palette} onChange={(e) => setPalette(e.target.value)}
              aria-label="Colour palette" title={PALETTES.find((p) => p.id === palette)?.why}>
              {PALETTES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div className="modeswitch" role="group" aria-label="Light or dark mode">
              {MODES.map((m) => (
                <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  title={m.id === 'auto' ? `Follows your system — currently ${resolved}` : m.label}>
                  {m.id === 'auto' ? '◐' : m.id === 'light' ? '☀' : '☾'}
                </button>
              ))}
            </div>
          </div>
        </header>

      <main className="page" key={tab}>
        {tab === 'sand' && <SandToSilicon cfg={cfg} />}
        {tab === 'line' && <FabLine />}
        {tab === 'god' && <GodView cfg={cfg} snap={snap} goTab={go} />}
        {tab === 'trace' && <Trace goTab={go} />}
        {tab === 'operate' && <Operate goTab={go} />}
        {tab === 'run' && <FabRun cfg={cfg} onSnapshot={setSnap} />}
        {tab === 'wafer' && <YieldLab cfg={cfg} patch={patch} />}
        {tab === 'economics' && <Economics cfg={cfg} patch={patch} />}
        {tab === 'science' && <Science />}
        {tab === 'clock' && <Clock cfg={cfg} />}
        {tab === 'nodes' && <NodesView />}
        {tab === '3d' && <Beyond3D cfg={cfg} />}
        {tab === 'silicon' && <Silicon cfg={cfg} patch={patch} goTab={go} />}
        {tab === 'chain' && <ValueChain cfg={cfg} />}
        {tab === 'business' && <Business cfg={cfg} goTab={go} />}
        {tab === 'teams' && <Teams goTab={go} />}
        {tab === 'ethics' && <Ethics />}
        {tab === 'unsolved' && <Unsolved />}
        {tab === 'acronyms' && <Acronyms goTab={go} />}
        {tab === 'compute' && <Compute cfg={cfg} patch={patch} />}
        {tab === 'ai' && <AIChips />}
        {tab === 'quantum' && <Quantum />}
        {tab === 'quiz' && <Quiz />}
      </main>

      {tourStep >= 0 && (
        <aside className="tour" role="dialog" aria-label="Guided tour">
          <div className="tn">Tour {tourStep + 1} / {TOUR.length}</div>
          <h4>{TOUR[tourStep].title}</h4>
          <p>{TOUR[tourStep].body}</p>
          <div className="row">
            <button className="btn primary sm" onClick={tourNext}>{tourStep === TOUR.length - 1 ? 'Finish' : 'Next'}</button>
            <button className="btn sm" onClick={() => setTourStep(-1)}>Close</button>
          </div>
        </aside>
      )}


        <footer className="footer">
        <div className="page" style={{ padding: 0 }}>
          <b>FabSim</b> — an interactive walk from quartz rock to a finished chip, what it delivers
          once it runs, and the arithmetic that decides whether either is worth doing. Every number on
          the yield, economics, compute and quantum tabs is computed in the browser from the model you
          choose; nothing is fetched and nothing is stored.
          <br /><br />
          Process figures, die sizes and wafer prices are public estimates and vary by source. Treat
          them as the right order of magnitude, not as anyone's specification.
          <br /><br />
          <b>How this was built.</b> Developed with Claude, Anthropic's AI assistant. Everything here
          comes from publicly available information — vendor announcements, published papers, public
          reporting and standard textbook process engineering. No confidential, proprietary or
          internal data from any company was used, and none of the figures represent anyone's
          non-public specifications. Where a number could not be sourced publicly, it is marked as an
          estimate or left blank rather than guessed.
          <br /><br />
          <span className="credit">
            Curated by <b>Abhay Bhuva</b>
            <a href="https://www.linkedin.com/in/abhaybhuva" target="_blank" rel="noopener noreferrer me">LinkedIn</a>
            <a href="https://github.com/abhaybhuvagithub" target="_blank" rel="noopener noreferrer me">GitHub</a>
            <a href="https://github.com/abhaybhuvagithub/AIChip" target="_blank" rel="noopener noreferrer">Source</a>
          </span>
        </div>
        </footer>
      </div>

      <Assistant
        cfg={cfg} snap={snap} journey={journey} goTab={go}
        open={assistantOpen} setOpen={setAssistantOpen}
      />
    </div>
  )
}
