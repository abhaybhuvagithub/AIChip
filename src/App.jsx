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
import SandToSilicon from './ui/SandToSilicon.jsx'
import Compute from './ui/Compute.jsx'
import Quantum from './ui/Quantum.jsx'
import Quiz from './ui/Quiz.jsx'
import { TOUR } from './data/learn.js'
import { PRODUCTS } from './data/nodes.js'
import { buildJourney } from './lib/journey.js'
import { navigate } from './lib/motion.js'

const TABS = [
  { id: 'god', label: 'God view ✨', icon: 'spark', group: 'Start' },
  { id: 'trace', label: 'Trace', icon: 'route', group: 'Start' },

  { id: 'sand', label: 'Sand → silicon', icon: 'quartzite', group: 'Making it' },
  { id: 'line', label: 'Fab line', icon: 'scanner', group: 'Making it' },
  { id: 'run', label: 'Fab run', icon: 'foundry', group: 'Making it' },
  { id: 'wafer', label: 'Yield lab', icon: 'wafer', group: 'Making it' },

  { id: 'science', label: 'The science', icon: 'atom', group: 'Why it works' },
  { id: 'clock', label: 'Clock', icon: 'clock', group: 'Why it works' },
  { id: '3d', label: '3D & beyond', icon: 'layers', group: 'Why it works' },
  { id: 'nodes', label: 'Nodes', icon: 'timeline', group: 'Why it works' },
  { id: 'quantum', label: 'Quantum', icon: 'transmon', group: 'Why it works' },

  { id: 'silicon', label: 'Silicon', icon: 'soc', group: 'The real world' },
  { id: 'chain', label: 'Value chain', icon: 'route', group: 'The real world' },
  { id: 'compute', label: 'Compute', icon: 'chart', group: 'The real world' },

  { id: 'economics', label: 'Economics', icon: 'money', group: 'The business' },
  { id: 'business', label: '0 → market', icon: 'iplicense', group: 'The business' },
  { id: 'teams', label: 'Teams & roles', icon: 'ipnoc', group: 'The business' },
  { id: 'ethics', label: 'Discipline', icon: 'shield', group: 'The business' },

  { id: 'unsolved', label: 'Open problems', icon: 'route', group: 'Check' },
  { id: 'acronyms', label: 'Acronyms', icon: 'iplicense', group: 'Check' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz', group: 'Check' },
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
  const [tab, setTab] = useState(hash?.tab && TABS.some((t) => t.id === hash.tab) ? hash.tab : 'sand')
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
        <nav className="side-nav">
          {GROUPS.map((g) => (
            <div className="side-group" key={g.label}>
              <div className="side-group-label">{g.label}</div>
              {g.tabs.map((t) => (
                <button
                  key={t.id}
                  className={`side-tab ${tab === t.id ? 'on' : ''}`}
                  onClick={() => { go(t.id); setNavOpen(false) }}
                  aria-current={tab === t.id ? 'page' : undefined}
                >
                  <Icon name={t.icon} size={20} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          ))}
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
