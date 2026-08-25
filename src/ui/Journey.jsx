import React, { useEffect, useMemo, useState } from 'react'
import { buildJourney, journeyTotals, PHASES } from '../lib/journey.js'
import { fmt } from '../lib/fab.js'
import { speak, stopSpeaking, canSpeak } from '../lib/speech.js'

const STEP_MS = 1400

export default function Journey({ narrate, setNarrate }) {
  const steps = useMemo(() => buildJourney(70), [])
  const totals = useMemo(() => journeyTotals(steps), [steps])
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [skipRepeats, setSkipRepeats] = useState(false)

  // With repeats collapsed, layers 2..70 fold into one entry per step type —
  // useful for orientation, dishonest as a picture of the process, which is
  // why it is off by default and labelled.
  const view = useMemo(() => {
    if (!skipRepeats) return steps
    const seen = new Set()
    return steps.filter((s) => {
      const k = `${s.phase}:${s.key}`
      if (s.layer > 1 && s.layer < 66 && seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [steps, skipRepeats])

  const idx = Math.min(i, view.length - 1)
  const s = view[idx]

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setI((v) => {
        if (v + 1 >= view.length) { setPlaying(false); return v }
        return v + 1
      })
    }, STEP_MS / speed)
    return () => clearInterval(t)
  }, [playing, speed, view.length])

  // Narration reads the step aloud as the path advances. The name and the
  // one-line context only — reading the full paragraph would fall behind.
  useEffect(() => {
    if (!narrate || !s) return
    const where = s.layer > 0 && s.phase !== 'assembly' ? `, layer ${s.layer}` : ''
    speak(`${s.name}${where}. ${s.tool}.`, { rate: 1.05 })
    return () => stopSpeaking()
  }, [narrate, s])

  useEffect(() => () => stopSpeaking(), [])

  const jump = (frac) => setI(Math.round(frac * (view.length - 1)))

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? '❙❙ Pause' : '▶ Follow the wafer'}
        </button>
        <div className="row" style={{ gap: 6 }}>
          {[1, 3, 8, 20].map((v) => (
            <button key={v} className={`btn sm ${speed === v ? 'active' : ''}`} onClick={() => setSpeed(v)}>{v}×</button>
          ))}
        </div>
        {canSpeak() && (
          <button className={`btn sm ${narrate ? 'active' : ''}`} onClick={() => { setNarrate(!narrate); stopSpeaking() }}>
            {narrate ? '🔊 Narrating' : '🔈 Narrate'}
          </button>
        )}
        <button className={`btn sm ${skipRepeats ? 'active' : ''}`} onClick={() => { setSkipRepeats((v) => !v); setI(0) }}>
          {skipRepeats ? 'Repeats collapsed' : 'Every repeat shown'}
        </button>
      </div>

      {/* The path itself. Every step is a tick; the phases are the bands. */}
      <div className="card">
        <div className="path-track" role="group" aria-label="Process path">
          {Object.entries(PHASES).map(([id, p]) => {
            const n = view.filter((x) => x.phase === id).length
            return (
              <div key={id} className="path-band" style={{ flex: n || 0.001 }}>
                <div className="path-band-label" style={{ color: p.hue }}>{p.label}</div>
                <div className="path-band-bar" style={{ background: p.hue, opacity: s.phase === id ? 0.9 : 0.28 }} />
                <div className="path-band-n">{n} steps</div>
              </div>
            )
          })}
        </div>
        <input className="path-scrub" type="range" min="0" max={view.length - 1} step="1" value={idx}
          onChange={(e) => { setPlaying(false); setI(+e.target.value) }}
          aria-label="Scrub through the process path" />
        <div className="row" style={{ justifyContent: 'space-between', fontSize: 15, color: 'var(--muted)' }}>
          <span>Step {fmt.n(idx + 1)} of {fmt.n(view.length)}</span>
          <span>{fmt.n(s.cumHours)} h elapsed · {fmt.n(s.cumDistance / 1000, 2)} km travelled</span>
        </div>
        <div className="row" style={{ marginTop: 8, gap: 6 }}>
          {[['Rock', 0], ['First print', 0.16], ['Halfway', 0.5], ['Last metal', 0.9], ['Ship', 1]].map(([l, f]) => (
            <button key={l} className="btn sm" onClick={() => { setPlaying(false); jump(f) }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="detail" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="eyebrow" style={{ margin: 0, color: PHASES[s.phase].hue }}>
              {PHASES[s.phase].label}
              {s.layer > 0 && s.phase !== 'assembly' && ` · layer ${s.layer} of 70`}
            </div>
            <span className="badge">{s.temp} °C</span>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-.02em', marginTop: 4 }}>{s.name}</h3>
          <div className="one" style={{ fontFamily: 'var(--font-mono)', fontSize: 16.5 }}>{s.tool}</div>
          <p style={{ marginTop: 10 }}>{s.what}</p>
          {s.levelLabel && <span className="badge on">{s.levelLabel}</span>}
        </div>

        <div className="card">
          <dl className="kv">
            <dt>Elapsed process time</dt>
            <dd style={{ color: 'var(--accent)' }}>{fmt.n(s.cumHours)} h — {fmt.n(s.cumHours / 24, 1)} days</dd>
            <dt>Distance travelled in the fab</dt>
            <dd>{fmt.n(s.cumDistance / 1000, 2)} km on ceiling rails</dd>
            <dt>Hottest point so far</dt>
            <dd>{s.peakTemp} °C</dd>
            <dt>This step takes</dt>
            <dd>{s.hours} h</dd>
            <dt>Progress</dt>
            <dd>
              <div className="bar"><i style={{ width: `${((idx + 1) / view.length) * 100}%` }} /></div>
            </dd>
          </dl>
        </div>
      </div>

      <div className="grid g3" style={{ marginTop: 14 }}>
        <div className="stat hi">
          <div className="k">Total steps</div>
          <div className="v">{fmt.n(totals.steps)}</div>
          <div className="sub">rock to shipped part</div>
        </div>
        <div className="stat">
          <div className="k">Through lithography</div>
          <div className="v">{totals.lithoVisits}×</div>
          <div className="sub">the same tool, seventy times</div>
        </div>
        <div className="stat">
          <div className="k">Distance travelled</div>
          <div className="v">{fmt.n(totals.km, 1)}<span style={{ fontSize: 18.5 }}> km</span></div>
          <div className="sub">without leaving the building</div>
        </div>
      </div>

      <p className="small" style={{ marginTop: 12, maxWidth: '62ch' }}>
        Every repeat is listed. Layers two through seventy are not summarised away, because the
        repetition <i>is</i> the process — a chip is not five hundred different operations, it is
        about ten operations run seventy times over, each pass aligned to the one beneath it within a
        few nanometres. Process times here are the steps themselves; the fab run tab adds the
        queueing, which is where most of the three months actually goes.
      </p>
    </div>
  )
}
