import React, { useEffect, useRef, useState } from 'react'
import { PROCESS, STAGES, CYCLE } from '../data/process.js'
import Icon from './Icon.jsx'

export default function FabLine() {
  const [sel, setSel] = useState(PROCESS[0].id)
  const [running, setRunning] = useState(false)
  const [at, setAt] = useState(-1)
  const railRef = useRef(null)
  const timer = useRef(null)

  // "Run a lot" walks the line and selects each module in turn. It is a
  // narrative device, not a simulation — the honest version of a progress
  // bar for a process that really takes three months.
  useEffect(() => {
    if (!running) return
    timer.current = setInterval(() => {
      setAt((prev) => {
        const next = prev + 1
        if (next >= PROCESS.length) { setRunning(false); return PROCESS.length - 1 }
        setSel(PROCESS[next].id)
        return next
      })
    }, 1100)
    return () => clearInterval(timer.current)
  }, [running])

  useEffect(() => {
    const el = railRef.current?.querySelector('.step.on')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [sel])

  const step = PROCESS.find((s) => s.id === sel) || PROCESS[0]
  const idx = PROCESS.findIndex((s) => s.id === sel)

  return (
    <div>
      <div className="eyebrow">The line</div>
      <h1 className="title">A wafer meets seventeen modules.<br />Most of them more than once.</h1>
      <p className="lede">
        Every step below is really a group of steps, and the middle six run in a loop — coat, expose,
        develop, etch, deposit, polish — once for each of the 60 to 80 layers stacked on a leading-edge part.
        Click any module to open it up.
      </p>

      <div className="row" style={{ margin: '18px 0 12px' }}>
        <button className="btn primary" onClick={() => { setAt(-1); setRunning(true) }} disabled={running}>
          {running ? 'Lot in progress…' : '▶ Run a lot through the line'}
        </button>
        {running && <button className="btn" onClick={() => setRunning(false)}>Stop</button>}
        <span className="badge">{CYCLE.cycle}</span>
        <span className="badge">{CYCLE.logicSteps}</span>
        <span className="badge">{CYCLE.litho}</span>
      </div>

      <div className="line-rail" ref={railRef}>
        {PROCESS.map((s, i) => (
          <button
            key={s.id}
            className={`step ${sel === s.id ? 'on' : ''} ${running && i === at ? 'running' : ''} ${running && i < at ? 'done' : ''}`}
            onClick={() => { setRunning(false); setSel(s.id) }}
            aria-pressed={sel === s.id}
          >
            <div className="idx">{String(i + 1).padStart(2, '0')}</div>
            <div className="glyph" style={{ color: STAGES[s.stage].hue }}>
              <Icon name={s.icon} size={30} />
            </div>
            <div className="nm">{s.name}</div>
            <div className="stg" style={{ color: STAGES[s.stage].hue }}>{STAGES[s.stage].label}</div>
          </button>
        ))}
      </div>

      <div className="detail" style={{ marginTop: 6 }}>
        <div className="card">
          <div className="eyebrow" style={{ color: STAGES[step.stage].hue }}>
            Step {String(idx + 1).padStart(2, '0')} · {STAGES[step.stage].label}
          </div>
          <h3 className="iconrow">
            <Icon name={step.icon} size={34} style={{ color: STAGES[step.stage].hue }} title={step.name} />
            {step.name}
          </h3>
          <div className="one">{step.one}</div>
          <p>{step.what}</p>
          <p className="phys">{step.physics}</p>
        </div>

        <div className="card">
          <dl className="kv">
            <dt>Typical tools</dt>
            <dd><ul>{step.tools.map((t) => <li key={t}>{t}</li>)}</ul></dd>
            <dt>Consumes</dt>
            <dd>{step.inputs}</dd>
            <dt>What goes wrong</dt>
            <dd><ul>{step.defects.map((d) => <li key={d}>{d}</li>)}</ul></dd>
            <dt>Duration</dt>
            <dd>{step.time}</dd>
            <dt>Worth knowing</dt>
            <dd style={{ color: 'var(--accent)' }}>{step.stat}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">The scale of the building</h2>
      <div className="grid g3">
        {[
          ['Cleanroom class', CYCLE.cleanroom],
          ['Cost to build', CYCLE.fabCost],
          ['Process steps', CYCLE.logicSteps],
          ['Mask layers', CYCLE.litho],
          ['Cycle time', CYCLE.cycle],
          ['Ultrapure water', 'Millions of litres a day, recycled and re-polished on site'],
        ].map(([k, v]) => (
          <div className="stat" key={k}>
            <div className="k">{k}</div>
            <div className="sub" style={{ fontSize: 17, color: 'var(--text)', marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
