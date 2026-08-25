import React, { useEffect, useState } from 'react'
import Journey from './Journey.jsx'
import {
  createFab, tick, snapshot, defectDensity, TOOL_GROUPS, LOT_SIZE,
} from '../lib/fabengine.js'
import { computeRun, fmt } from '../lib/fab.js'

/**
 * The die, building itself.
 *
 * This is the "what is actually happening" view. As the tracked lot climbs
 * through 70 mask layers, the cross-section accumulates: substrate, wells,
 * gate stack, contacts, then metal level after metal level. Local levels are
 * drawn thin and tight, upper levels fat — which is true, and is why the top
 * of a real stack carries power and clock rather than logic.
 */
function DieBuild({ layer, totalLayers }) {
  const beolStart = Math.round(totalLayers * 0.45)
  const metalLevels = Math.max(0, Math.floor(((layer - beolStart) / (totalLayers - beolStart)) * 15))
  const feolProgress = Math.min(1, layer / beolStart)

  const rows = []
  let y = 116
  // Metal stack, drawn bottom-up: narrow and dense at the bottom, wide at top.
  for (let m = 0; m < metalLevels; m++) {
    const h = 3 + m * 0.55
    y -= h + 1.5
    const pitch = 7 + m * 3.5
    const bars = []
    for (let x = 6; x < 194; x += pitch) {
      bars.push(<rect key={x} x={x} y={y} width={Math.max(2, pitch * 0.45)} height={h} fill="var(--accent)" opacity={0.35 + m * 0.04} />)
    }
    rows.push(
      <g key={`m${m}`}>
        <rect x="4" y={y - 1} width="192" height={h + 2} fill="var(--panel2)" opacity=".5" />
        {bars}
        <text x="199" y={y + h} textAnchor="end" fill="var(--muted)" style={{ fontSize: 4, fontFamily: 'var(--font-mono)' }}>M{m + 1}</text>
      </g>
    )
  }

  return (
    <svg viewBox="0 0 200 130" width="100%" height="290" role="img"
      aria-label={`Die cross-section at layer ${layer} of ${totalLayers}`}>
      {/* Substrate */}
      <rect x="4" y="118" width="192" height="10" fill="var(--panel2)" />
      <text x="8" y="125.5" fill="var(--muted)" style={{ fontSize: 4.2, fontFamily: 'var(--font-mono)' }}>Si substrate</text>

      {/* FEOL: wells, then fins/sheets, then the gate stack, then contacts. */}
      {feolProgress > 0.1 && [30, 70, 110, 150].map((x) => (
        <rect key={`w${x}`} x={x} y="112" width="34" height="6" fill="var(--muted)" opacity=".28" />
      ))}
      {feolProgress > 0.3 && [34, 74, 114, 154].map((x) => (
        <g key={`c${x}`}>
          {[0, 8, 16].map((d) => <rect key={d} x={x + d} y="104" width="4" height="8" fill="var(--muted)" opacity=".6" />)}
        </g>
      ))}
      {feolProgress > 0.55 && [32, 72, 112, 152].map((x) => (
        <rect key={`g${x}`} x={x} y="100" width="26" height="5" fill="var(--accent)" opacity=".85" />
      ))}
      {feolProgress > 0.8 && [36, 76, 116, 156].map((x) => (
        <g key={`v${x}`}>
          <rect x={x} y="94" width="3" height="7" fill="var(--warn)" opacity=".8" />
          <rect x={x + 14} y="94" width="3" height="7" fill="var(--warn)" opacity=".8" />
        </g>
      ))}
      {feolProgress > 0.1 && (
        <text x="199" y="110" textAnchor="end" fill="var(--muted)" style={{ fontSize: 4, fontFamily: 'var(--font-mono)' }}>FEOL</text>
      )}

      {rows}

      {layer >= totalLayers && (
        <text x="100" y="14" textAnchor="middle" fill="var(--ok)" style={{ fontSize: 7.5, fontFamily: 'var(--font-mono)' }}>
          stack complete
        </text>
      )}
    </svg>
  )
}

function Line({ cfg, counts, apc, metroSample, running, speed, setCount, setMetroSample, setApc, onRestart, setRunning, setSpeed, onSnapshot }) {
  // The fab lives in state, not a ref. It is mutated in place by the loop, but
  // render reads only `snap` — never the live object — so a frame can never
  // show a half-updated line.
  const [sim, setSim] = useState(() => {
    const fab = createFab({ seed: 42, layers: 70, toolCounts: counts, apc, metroSample })
    return { fab, snap: snapshot(fab) }
  })

  useEffect(() => {
    if (!running) return
    let alive = true
    let raf = 0
    const loop = () => {
      if (!alive) return
      setSim((s) => {
        // Many simulated hours per animation frame — a 110-day cycle time at
        // one hour per frame would take an hour to watch.
        for (let i = 0; i < speed; i++) tick(s.fab)
        return { fab: s.fab, snap: snapshot(s.fab) }
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [running, speed])

  // Publish upward so God view and the assistant can read the live line
  // without reaching into this component's state.
  useEffect(() => { onSnapshot?.(sim.snap) }, [sim.snap, onSnapshot])

  const snap = sim.snap
  const m = snap.metrics
  const showLayer = snap.tracked ? snap.tracked.layer : (snap.stats.completed > 0 ? snap.layers : 1)

  const d0 = snap.lastDefects > 0 ? defectDensity(snap.lastDefects, cfg.waferDia) : 0
  const yieldRun = d0 > 0 ? computeRun({ ...cfg, d0 }) : null
  const capex = snap.capex

  return (
    <div>
      <div className="eyebrow">Fab run</div>
      <h1 className="title">One line, running.<br />Watch where it jams.</h1>
      <p className="lede">
        A discrete-event simulation, one hour per tick. Lots of {LOT_SIZE} wafers walk a route of 70
        mask layers, queue at tool groups that occasionally break, and pick up defects on the way. The
        yield at the end was earned step by step rather than assumed. Left alone it settles at a
        110-day cycle time with lithography as the constraint — which is roughly what a real
        leading-edge line does.
      </p>

      <div className="row" style={{ margin: '18px 0 14px' }}>
        <button className="btn primary" onClick={() => setRunning((r) => !r)}>
          {running ? '❙❙ Pause' : '▶ Run the line'}
        </button>
        <button className="btn" onClick={onRestart}>⟳ Restart</button>
        <div className="row" style={{ gap: 6 }}>
          {[10, 40, 120, 400].map((v) => (
            <button key={v} className={`btn sm ${speed === v ? 'active' : ''}`} onClick={() => setSpeed(v)}>{v}h/frame</button>
          ))}
        </div>
        <span className="badge on">day {fmt.n(snap.day)}</span>
        {m.toolsDown > 0 && <span className="badge" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>{m.toolsDown} tools down</span>}
        {m.excursionCount > 0 && (
          <span className="badge" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>
            excursion running undetected
          </span>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,400px)' }}>
        <div>
          <div className="wafer-stage" style={{ minHeight: 0, padding: 10 }}>
            <DieBuild layer={showLayer} totalLayers={snap.layers} />
            <div className="wafer-legend">
              <span>Layer {showLayer} of {snap.layers}</span>
              <span>{snap.tracked ? `lot #${snap.tracked.id}, day ${fmt.n(snap.tracked.daysIn, 0)} in the line` : 'waiting for a lot'}</span>
            </div>
          </div>

          <div className="grid g3" style={{ marginTop: 12 }}>
            <div className="stat hi">
              <div className="k">WIP</div>
              <div className="v">{fmt.n(m.wip)}</div>
              <div className="sub">lots in the line · {fmt.n(m.wip * LOT_SIZE)} wafers</div>
            </div>
            <div className="stat">
              <div className="k">Cycle time</div>
              <div className="v">{m.avgCycleDays > 0 ? fmt.n(m.avgCycleDays, 0) : '—'}<span style={{ fontSize: 18.5 }}> d</span></div>
              <div className="sub">raw process time is {fmt.n(m.rawDays, 0)} d</div>
            </div>
            <div className={`stat ${m.xFactor > 3.5 ? 'bad' : m.xFactor > 0 ? 'ok' : ''}`}>
              <div className="k">X-factor</div>
              <div className="v">{m.xFactor > 0 ? `${fmt.n(m.xFactor, 2)}×` : '—'}</div>
              <div className="sub">cycle time over raw — the rest is queueing</div>
            </div>
            <div className="stat">
              <div className="k">Output</div>
              <div className="v">{fmt.n(m.wpm, 0)}</div>
              <div className="sub">wafers per month</div>
            </div>
            <div className="stat">
              <div className="k">Bottleneck</div>
              <div className="v" style={{ fontSize: 21 }}>{m.bottleneckName}</div>
              <div className="sub">{fmt.pct(m.bottleneckUtil)} utilised</div>
            </div>
            <div className="stat">
              <div className="k">Tool capital</div>
              <div className="v">${fmt.n(capex / 1000, 2)}B</div>
              <div className="sub">at list, tools only</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="eyebrow">Tool floor</div>
          <p className="small" style={{ marginBottom: 10 }}>
            Add tools to the constraint and the line speeds up. Add them anywhere else and you have
            bought an expensive ornament — the queue simply moves.
          </p>
          {m.groups.map((g) => (
            <div key={g.id} style={{ marginBottom: 9 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 6, flexWrap: 'nowrap' }}>
                <span style={{ fontSize: 16.5, minWidth: 0 }}>
                  <span style={{ color: g.excursion > 0 ? 'var(--warn)' : 'var(--accent)', marginRight: 6 }}>{g.glyph}</span>
                  {g.name}
                  {g.id === m.bottleneckId && <span className="badge on" style={{ marginLeft: 6 }}>constraint</span>}
                  {g.down > 0 && <span className="badge" style={{ marginLeft: 6, color: 'var(--bad)', borderColor: 'var(--bad)' }}>{g.down} down</span>}
                </span>
                <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                  <button className="btn sm" onClick={() => setCount(g.id, counts[g.id] - 1)} aria-label={`Remove a ${g.name} tool`}>−</button>
                  <b style={{ fontFamily: 'var(--font-mono)', fontSize: 16.5, minWidth: 22, textAlign: 'center' }}>{g.tools}</b>
                  <button className="btn sm" onClick={() => setCount(g.id, counts[g.id] + 1)} aria-label={`Add a ${g.name} tool`}>+</button>
                </span>
              </div>
              <div className="bar" style={{ marginTop: 4 }}>
                <i style={{
                  width: `${g.util * 100}%`,
                  background: g.util > 0.9 ? 'var(--bad)' : g.util > 0.75 ? 'var(--warn)' : 'var(--ok)',
                }} />
              </div>
              <div className="small" style={{ fontSize: 14.5, marginTop: 2 }}>
                {fmt.pct(g.util, 0)} busy · {g.queued} lots queued · ${g.capex}M each
              </div>
            </div>
          ))}

          <div className="ctl" style={{ marginTop: 12 }}>
            <label><span>Metrology sampling</span><b>1 in {metroSample}</b></label>
            <input type="range" min="1" max="25" step="1" value={metroSample}
              onChange={(e) => setMetroSample(+e.target.value)} aria-label="Metrology sampling rate" />
            <div className="hint">
              Inspect every lot and you catch an excursion immediately, at the cost of metrology
              capacity. Sample one in twenty and a drifting chamber quietly damages nineteen lots
              before anyone knows. This is a real trade and fabs argue about it constantly.
            </div>
          </div>
          <div className="row">
            <button className={`btn sm ${apc ? 'active' : ''}`} onClick={() => setApc((a) => !a)}>
              {apc ? '◉ Run-to-run control on' : '○ Run-to-run control off'}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 6 }}>
            Changing tool counts, sampling or APC restarts the run — the line has to be rebuilt from
            an empty state, which is also true of a real one.
          </p>
        </div>
      </div>

      <h2 className="sec">What came out</h2>
      <div className="grid g3">
        <div className="stat">
          <div className="k">Lots completed</div>
          <div className="v">{fmt.n(snap.stats.completed)}</div>
          <div className="sub">{fmt.n(snap.stats.completed * LOT_SIZE)} wafers finished</div>
        </div>
        <div className="stat hi">
          <div className="k">Defect density earned</div>
          <div className="v">{d0 > 0 ? fmt.n(d0, 3) : '—'}</div>
          <div className="sub">defects/cm², from the run</div>
        </div>
        <div className={`stat ${yieldRun && yieldRun.dieYield > 0.7 ? 'ok' : yieldRun ? 'bad' : ''}`}>
          <div className="k">Yield on your die</div>
          <div className="v">{yieldRun ? fmt.pct(yieldRun.dieYield) : '—'}</div>
          <div className="sub">{yieldRun ? `${fmt.n(yieldRun.goodDies)} good dies per wafer` : 'waiting for a completed lot'}</div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>
        The defect density above is not a setting — it is what the line produced, accumulated step by
        step across 560 tool visits, and it is fed straight into the same yield model the yield lab
        uses with the die you configured there. Turn run-to-run control off, or drop the sampling
        rate, and watch it get worse.
      </p>

      <h2 className="sec">Event log</h2>
      <div className="tbl-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table className="tbl">
          <tbody>
            {snap.events.length === 0 && (
              <tr><td className="small" style={{ padding: 14 }}>Nothing has gone wrong yet. Press run.</td></tr>
            )}
            {snap.events.map((e, i) => (
              <tr key={i}>
                <td className="num" style={{ width: 90, color: 'var(--muted)' }}>day {fmt.n(e.t / 24, 0)}</td>
                <td style={{ width: 110 }}>
                  <span className="badge" style={{
                    color: e.kind === 'caught' ? 'var(--ok)' : e.kind === 'excursion' ? 'var(--warn)' : 'var(--bad)',
                    borderColor: e.kind === 'caught' ? 'var(--ok)' : e.kind === 'excursion' ? 'var(--warn)' : 'var(--bad)',
                  }}>{e.kind}</span>
                </td>
                <td className="small">{e.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FootNotes wpm={m.wpm} />
    </div>
  )
}

function FootNotes({ wpm }) {
  return (
    <>
      <h2 className="sec">What this is and is not</h2>
      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Modelled</div>
          <p className="small" style={{ marginTop: 8 }}>
            Lot-level queueing at eight tool groups, 70 mask layers with a real route per layer, tool
            failures on a mean-time-between-failures basis, defect accumulation per step, excursions
            that run undetected until a sampled lot reaches metrology, and run-to-run control damping
            drift. The seed is fixed, so a run is reproducible.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">Not modelled</div>
          <p className="small" style={{ marginTop: 8 }}>
            Dispatch priority and hot lots, reticle and recipe setup time, batch tools that process
            several lots at once, operator and maintenance staffing, reentrant scheduling policy, and
            rework. Every one of those makes a real line worse than this, not better — so treat the
            cycle time here as optimistic.
          </p>
        </div>
      </div>

      <p className="small" style={{ marginTop: 16, maxWidth: '62ch' }}>
        Scale note: this is one line at roughly {fmt.n(wpm, 0)} wafer starts a month. A gigafab runs
        upward of 100,000 — sixty or more of these, side by side, in one building.
      </p>
    </>
  )
}

export default function FabRun({ cfg, onSnapshot }) {
  const [mode, setMode] = useState('line')
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(40)
  const [counts, setCounts] = useState(() => Object.fromEntries(TOOL_GROUPS.map((g) => [g.id, g.tools])))
  const [apc, setApc] = useState(true)
  const [metroSample, setMetroSample] = useState(5)
  const [generation, setGeneration] = useState(0)
  const [narrate, setNarrate] = useState(false)

  // Any configuration change remounts Line, so its state initialiser builds a
  // fresh fab. Remounting is the whole mechanism — no reset effect, and no
  // stale simulation surviving a change to the thing being simulated.
  const key = `${Object.values(counts).join(',')}|${apc}|${metroSample}|${generation}`
  const setCount = (id, v) => setCounts((c) => ({ ...c, [id]: Math.max(1, v) }))

  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <button className={`btn ${mode === 'line' ? 'active' : ''}`} onClick={() => setMode('line')}>
          The line
        </button>
        <button className={`btn ${mode === 'journey' ? 'active' : ''}`} onClick={() => setMode('journey')}>
          Travel path
        </button>
      </div>

      {mode === 'journey' ? (
        <>
          <div className="eyebrow" style={{ marginTop: 16 }}>Travel path</div>
          <h1 className="title">Follow one wafer.<br />Every single step.</h1>
          <p className="lede">
            Not a summary — the full itinerary, from quartz rock to a marked and trayed part. Around
            520 steps, most of them the same ten operations repeated seventy times, each pass aligned
            to the one beneath it within a few nanometres.
          </p>
          <div style={{ marginTop: 18 }}>
            <Journey narrate={narrate} setNarrate={setNarrate} />
          </div>
        </>
      ) : (
        <Line
          key={key} cfg={cfg} counts={counts} apc={apc} metroSample={metroSample}
          running={running} speed={speed} onSnapshot={onSnapshot}
          setRunning={setRunning} setSpeed={setSpeed} setCount={setCount}
          setMetroSample={setMetroSample} setApc={setApc}
          onRestart={() => { setRunning(false); setGeneration((g) => g + 1) }}
        />
      )}
    </div>
  )
}
