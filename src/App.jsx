import React, { useEffect, useState } from 'react'
import FabLine from './ui/FabLine.jsx'
import YieldLab from './ui/YieldLab.jsx'
import Economics from './ui/Economics.jsx'
import NodesView from './ui/Nodes.jsx'
import Compute from './ui/Compute.jsx'
import Quantum from './ui/Quantum.jsx'
import Quiz from './ui/Quiz.jsx'
import { TOUR } from './data/learn.js'
import { PRODUCTS } from './data/nodes.js'

const TABS = [
  { id: 'line', label: 'Fab line' },
  { id: 'wafer', label: 'Yield lab' },
  { id: 'economics', label: 'Economics' },
  { id: 'nodes', label: 'Nodes' },
  { id: 'compute', label: 'Compute' },
  { id: 'quantum', label: 'Quantum' },
  { id: 'quiz', label: 'Quiz' },
]

const THEMES = [
  { id: 'litho', label: 'Litho bay' },
  { id: 'wafer', label: 'Wafer' },
  { id: 'glow', label: 'Glow' },
  { id: 'mk', label: 'Millikelvin' },
  { id: 'cleanroom', label: 'Cleanroom' },
]

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
  const [tab, setTab] = useState(hash?.tab && TABS.some((t) => t.id === hash.tab) ? hash.tab : 'line')
  const [theme, setTheme] = useState(() => localStorage.getItem('fabsim.theme') || 'litho')
  const [cfg, setCfg] = useState({ ...DEFAULT, ...(hash || {}) })
  const [tourStep, setTourStep] = useState(-1)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fabsim.theme', theme)
  }, [theme])

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
        <div className="logo"><span className="mark" aria-hidden="true" />Fab<span>Sim</span></div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="btn sm" onClick={share}>{copied ? '✓ Link copied' : 'Copy link'}</button>
        <button className="btn sm" onClick={() => (tourStep < 0 ? tourNext() : setTourStep(-1))}>
          {tourStep < 0 ? 'Take the tour' : 'End tour'}
        </button>
        <select className="btn sm" value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Theme">
          {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </header>

      <main className="page">
        {tab === 'line' && <FabLine />}
        {tab === 'wafer' && <YieldLab cfg={cfg} patch={patch} />}
        {tab === 'economics' && <Economics cfg={cfg} patch={patch} />}
        {tab === 'nodes' && <NodesView />}
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
          <b>FabSim</b> — an interactive walk through how a semiconductor chip is made, what it delivers
          once it runs, and the arithmetic that decides whether either is worth doing. Every number on
          the yield, economics, compute and quantum tabs is computed in the browser from the model you
          choose; nothing is fetched and nothing is stored.
          <br /><br />
          Process figures, die sizes and wafer prices are public estimates and vary by source. Treat
          them as the right order of magnitude, not as anyone's specification.
        </div>
      </footer>
    </div>
  )
}
