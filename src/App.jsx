import React, { useEffect, useMemo, useState } from 'react'
import FabLine from './ui/FabLine.jsx'
import FabRun from './ui/FabRun.jsx'
import GodView from './ui/GodView.jsx'
import Assistant from './ui/Assistant.jsx'
import YieldLab from './ui/YieldLab.jsx'
import Economics from './ui/Economics.jsx'
import NodesView from './ui/Nodes.jsx'
import Silicon from './ui/Silicon.jsx'
import Beyond3D from './ui/Beyond3D.jsx'
import Science from './ui/Science.jsx'
import ValueChain from './ui/ValueChain.jsx'
import SandToSilicon from './ui/SandToSilicon.jsx'
import Compute from './ui/Compute.jsx'
import Quantum from './ui/Quantum.jsx'
import Quiz from './ui/Quiz.jsx'
import { TOUR } from './data/learn.js'
import { PRODUCTS } from './data/nodes.js'
import { buildJourney } from './lib/journey.js'

const TABS = [
  { id: 'god', label: 'God view ✨' },
  { id: 'sand', label: 'Sand → silicon' },
  { id: 'line', label: 'Fab line' },
  { id: 'run', label: 'Fab run' },
  { id: 'wafer', label: 'Yield lab' },
  { id: 'economics', label: 'Economics' },
  { id: 'science', label: 'The science' },
  { id: 'nodes', label: 'Nodes' },
  { id: '3d', label: '3D & beyond' },
  { id: 'silicon', label: 'Silicon' },
  { id: 'chain', label: 'Value chain' },
  { id: 'compute', label: 'Compute' },
  { id: 'quantum', label: 'Quantum' },
  { id: 'quiz', label: 'Quiz' },
]

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
    for (const k of ['dieX', 'dieY', 'waferDia', 'd0', 'model', 'alpha', 'edgeExclusion', 'waferCost', 'asp', 'packageCost', 'preset']) {
      if (cfg[k] !== undefined && cfg[k] !== '') p.set(k, String(cfg[k]))
    }
    window.history.replaceState(null, '', '#' + p.toString())
  }, [tab, cfg])

  const patch = (d) => setCfg((c) => ({ ...c, ...d }))

  const tourNext = () => {
    const n = tourStep + 1
    if (n >= TOUR.length) { setTourStep(-1); return }
    setTourStep(n)
    setTab(TOUR[n].tab)
  }

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch { setCopied(false) }
  }

  return (
    <div className="app">
      <header className="toolbar">
        {/* Two rows, deliberately. With fourteen tabs a single wrapping row
            put the mode switch wherever the wrap happened to land it — the
            controls need their own row to stay in the corner. */}
        <div className="toolbar-top">
          <div className="logo"><span className="mark" aria-hidden="true" />Fab<span>Sim</span></div>
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

        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="page">
        {tab === 'sand' && <SandToSilicon cfg={cfg} />}
        {tab === 'line' && <FabLine />}
        {tab === 'god' && <GodView cfg={cfg} snap={snap} goTab={setTab} />}
        {tab === 'run' && <FabRun cfg={cfg} onSnapshot={setSnap} />}
        {tab === 'wafer' && <YieldLab cfg={cfg} patch={patch} />}
        {tab === 'economics' && <Economics cfg={cfg} patch={patch} />}
        {tab === 'science' && <Science />}
        {tab === 'nodes' && <NodesView />}
        {tab === '3d' && <Beyond3D cfg={cfg} />}
        {tab === 'silicon' && <Silicon cfg={cfg} patch={patch} goTab={setTab} />}
        {tab === 'chain' && <ValueChain cfg={cfg} />}
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

      <Assistant
        cfg={cfg} snap={snap} journey={journey} goTab={setTab}
        open={assistantOpen} setOpen={setAssistantOpen}
      />

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
  )
}
