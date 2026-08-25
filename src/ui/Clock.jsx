import React, { useState } from 'react'
import {
  LADDER, KINDS, WALLS, THZ_REAL,
  reachPerCycle, period, powerAtFrequency, voltageAtFrequency,
  formatHz, formatWatts, signalVelocity,
} from '../lib/clock.js'
import { fmt } from '../lib/fab.js'
import { coolingFor, stackThermal } from '../lib/thermal.js'
import { DEFAULT_COMPUTE, computeThroughput, ops } from '../lib/compute.js'
import { computeRun } from '../lib/fab.js'

/** The ladder, on a log axis, because it spans six orders of magnitude. */
function Ladder({ pick, onPick }) {
  const W = 900, H = 170, PB = 46
  const lo = Math.log10(5e5), hi = Math.log10(2e12)
  const x = (hz) => 40 + ((Math.log10(hz) - lo) / (hi - lo)) * (W - 80)
  const decades = []
  for (let d = 6; d <= 12; d++) decades.push(Math.pow(10, d))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="190" role="img"
      aria-label="Clock and device frequencies from megahertz to terahertz on a log scale">
      <line x1="40" y1={H - PB} x2={W - 40} y2={H - PB} stroke="var(--border)" strokeWidth="1.4" />
      {decades.map((d) => (
        <g key={d}>
          <line x1={x(d)} y1={H - PB} x2={x(d)} y2={H - PB + 6} stroke="var(--border)" />
          <text x={x(d)} y={H - PB + 20} textAnchor="middle" fill="var(--muted)"
            style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{formatHz(d)}</text>
        </g>
      ))}
      {LADDER.map((l, i) => {
        const on = pick === i
        const yy = H - PB - 14 - (i % 5) * 22
        return (
          <g key={l.name} onClick={() => onPick(i)} style={{ cursor: 'pointer' }}>
            <line x1={x(l.hz)} y1={H - PB} x2={x(l.hz)} y2={yy} stroke={KINDS[l.kind].hue}
              strokeWidth={on ? 2.4 : 1} opacity={on ? 1 : 0.45} />
            <circle cx={x(l.hz)} cy={yy} r={on ? 6 : 4} fill={KINDS[l.kind].hue} opacity={on ? 1 : 0.6} />
          </g>
        )
      })}
    </svg>
  )
}

export default function Clock({ cfg }) {
  const [pick, setPick] = useState(4)
  const [ghz, setGhz] = useState(6)
  const [scaleV, setScaleV] = useState(true)
  const sel = LADDER[pick]

  const hz = ghz * 1e9
  const p = period(hz)
  const reach = reachPerCycle(hz)
  const watts = powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: ghz, scaleVoltage: scaleV })
  const volts = scaleV ? voltageAtFrequency(1.0, 5, ghz) : 1.0

  const areaMm = cfg.dieX * cfg.dieY
  const dieDiag = Math.hypot(cfg.dieX, cfg.dieY)
  const th = stackThermal({ areaMm2: areaMm, wattsTier: watts, tiers: 1, activity: 1 })
  const cool = coolingFor(th.density)
  const crosses = reach >= dieDiag

  // What the extra clock would actually buy, through the site's own model.
  const c = { ...DEFAULT_COMPUTE, ...(cfg.compute || {}), clockGHz: ghz }
  const y = computeRun(cfg)
  const thr = computeThroughput(cfg, c, y)

  return (
    <div>
      <div className="eyebrow">Clock</div>
      <h1 className="title">Transistors passed a terahertz in 2007.<br />Your processor still runs at five gigahertz.</h1>
      <p className="lede">
        The clock stopped climbing in 2005, and the transistors had nothing to do with it. Individual
        devices were already faster than any chip could be clocked, and are now two hundred times
        faster. Everything below computes why that gap exists and why nothing closes it.
      </p>

      <h2 className="sec">Six orders of magnitude</h2>
      <div className="card">
        <Ladder pick={pick} onPick={setPick} />
        <div className="row" style={{ gap: 14, marginBottom: 10 }}>
          {Object.entries(KINDS).map(([k, v]) => (
            <span key={k} className="small" style={{ color: v.hue }}>● {v.label}</span>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <b style={{ fontSize: 'var(--fs-prose)' }}>{sel.name}</b>{' '}
            <span className="badge" style={{ color: KINDS[sel.kind].hue, borderColor: KINDS[sel.kind].hue }}>
              {KINDS[sel.kind].label}
            </span>
          </div>
          <span className="badge on">{formatHz(sel.hz)} · {sel.year}</span>
        </div>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.6 }}>{sel.note}</p>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        The colours are the point. A transistor's maximum oscillation frequency, a radio carrier and a
        processor clock are three different quantities, and almost every claim of a "terahertz chip"
        comes from quietly swapping one for another.
      </p>

      <h2 className="sec">Turn the clock up</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,360px)' }}>
        <div className="grid g3">
          <div className="stat hi">
            <div className="k">Clock period</div>
            <div className="v" style={{ fontSize: 22 }}>{p.label}</div>
            <div className="sub">one tick, at {formatHz(hz)}</div>
          </div>
          <div className={`stat ${watts > 1000 ? 'bad' : ''}`}>
            <div className="k">Power</div>
            <div className="v" style={{ fontSize: 22 }}>{formatWatts(watts)}</div>
            <div className="sub">from 200 W at 5 GHz{scaleV ? `, at ${volts.toFixed(2)} V` : ', fixed voltage'}</div>
          </div>
          <div className={`stat ${crosses ? 'ok' : 'bad'}`}>
            <div className="k">Signal reach per cycle</div>
            <div className="v" style={{ fontSize: 22 }}>{reach < 1 ? `${(reach * 1000).toFixed(0)} µm` : `${reach.toFixed(1)} mm`}</div>
            <div className="sub">{crosses ? `crosses your ${dieDiag.toFixed(1)} mm die` : `cannot cross your ${dieDiag.toFixed(1)} mm die`}</div>
          </div>
          <div className={`stat ${th.beyondAll ? 'bad' : ''}`}>
            <div className="k">Power density</div>
            <div className="v" style={{ fontSize: 22 }}>{th.density > 1000 ? `${fmt.n(th.density / 1000, 1)}k` : fmt.n(th.density, 2)}</div>
            <div className="sub">W/mm² over {fmt.n(areaMm, 0)} mm²</div>
          </div>
          <div className={`stat ${cool ? '' : 'bad'}`}>
            <div className="k">Cooling needed</div>
            <div className="v" style={{ fontSize: 17 }}>{cool ? cool.name : 'Nothing known works'}</div>
            <div className="sub">{cool ? 'available today' : 'past every approach on the 3D tab'}</div>
          </div>
          <div className="stat">
            <div className="k">Compute delivered</div>
            <div className="v" style={{ fontSize: 22 }}>{ops(thr.opsPerDie)}</div>
            <div className="sub">peak {thr.prec.label}, if it could run</div>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="ctl">
            <label><span>Target clock</span><b>{formatHz(hz)}</b></label>
            <input type="range" min="1" max="1000" step="1" value={ghz}
              onChange={(e) => setGhz(+e.target.value)} aria-label="Target clock frequency in GHz" />
            <div className="hint">
              Linear in GHz, so most of the slider is territory nobody has ever reached. Drag it past
              about 20 and watch which figure above turns red first.
            </div>
          </div>
          <div className="row" style={{ gap: 6, marginBottom: 10 }}>
            {[5, 6, 10, 100, 1000].map((g) => (
              <button key={g} className={`btn sm ${ghz === g ? 'active' : ''}`} onClick={() => setGhz(g)}>
                {g >= 1000 ? '1 THz' : `${g} GHz`}
              </button>
            ))}
          </div>
          <button className={`btn sm ${scaleV ? 'active' : ''}`} onClick={() => setScaleV((v) => !v)}>
            {scaleV ? '◉ Voltage scales with clock' : '○ Fixed voltage'}
          </button>
          <p className="hint" style={{ marginTop: 8 }}>
            At fixed voltage P = α·C·V²·f is merely linear. But gate delay scales roughly with supply
            voltage, so going faster requires more of it — and voltage is squared. Scale both and
            power goes as the <b>cube</b> of frequency. That is the difference between {formatWatts(powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: 10, scaleVoltage: false }))} and{' '}
            {formatWatts(powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: 10, scaleVoltage: true }))} at 10 GHz.
          </p>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Clock</th><th>Period</th><th>Reach per cycle</th><th>Power (V scaled)</th><th>W/mm² on your die</th><th>Cooling</th></tr></thead>
          <tbody>
            {[5, 6, 10, 20, 50, 100, 300, 1000].map((g) => {
              const w = powerAtFrequency({ baseWatts: 200, baseGHz: 5, targetGHz: g, scaleVoltage: true })
              const r = reachPerCycle(g * 1e9)
              const t = stackThermal({ areaMm2: areaMm, wattsTier: w, tiers: 1, activity: 1 })
              const cl = coolingFor(t.density)
              return (
                <tr key={g} style={{ background: g === ghz ? 'var(--panel2)' : undefined, cursor: 'pointer' }}
                  onClick={() => setGhz(g)} title={`Set ${g} GHz`}>
                  <td className="num"><b>{g >= 1000 ? '1 THz' : `${g} GHz`}</b></td>
                  <td className="num">{period(g * 1e9).label}</td>
                  <td className="num" style={{ color: r >= dieDiag ? 'var(--ok)' : 'var(--bad)' }}>
                    {r < 1 ? `${(r * 1000).toFixed(0)} µm` : `${r.toFixed(1)} mm`}
                  </td>
                  <td className="num" style={{ color: w > 1000 ? 'var(--bad)' : 'var(--accent)' }}>{formatWatts(w)}</td>
                  <td className="num">{t.density > 1000 ? `${fmt.n(t.density / 1000, 1)}k` : fmt.n(t.density, 2)}</td>
                  <td className="small" style={{ color: cl ? 'var(--muted)' : 'var(--bad)' }}>{cl ? cl.name : 'nothing works'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Signals travel at c/√ε on chip — about {fmt.n(signalVelocity() / 1000, 0)} km per second, roughly
        {' '}{(1 / Math.sqrt(3) * 100).toFixed(0)}% of light in vacuum. And that is the optimistic floor: real
        on-chip wires are RC-limited rather than velocity-limited, and RC delay grows with the square
        of length, so a signal in practice gets nowhere near this far.
      </p>

      <h2 className="sec">Four walls, all hit at once</h2>
      <div className="grid g2">
        {WALLS.map((w) => (
          <div className="card" key={w.k}>
            <div className="eyebrow">{w.k}</div>
            <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.6 }}>{w.what}</p>
            <p className="why" style={{ marginTop: 8 }}>{w.why}</p>
          </div>
        ))}
      </div>

      <h2 className="sec">What is actually terahertz</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Thing</th><th>Status</th><th style={{ width: '62%' }}>What it really is</th></tr></thead>
          <tbody>
            {THZ_REAL.map((t) => (
              <tr key={t.name}>
                <td><b>{t.name}</b></td>
                <td>
                  <span className="badge" style={{
                    color: t.status === 'Shipping' ? 'var(--ok)' : t.status === 'Research' ? 'var(--warn)' : 'var(--bad)',
                    borderColor: t.status === 'Shipping' ? 'var(--ok)' : t.status === 'Research' ? 'var(--warn)' : 'var(--bad)',
                  }}>{t.status}</span>
                </td>
                <td className="small">{t.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec">So where did the performance go?</h2>
      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Sideways, on purpose</div>
          <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.6 }}>
            When the clock stopped, everything else kept going. More cores, wider vector units, deeper
            pipelines, more cache, memory moved onto the package, and — the largest single lever of the
            last few years — narrower arithmetic. Dropping from FP64 to FP4 multiplies throughput by
            sixty-four on identical silicon, which no clock increase was ever going to match.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">The honest summary</div>
          <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.6 }}>
            Clock frequency is the one headline number that has barely moved in twenty years, and it is
            the one most people still use to compare chips. A 2004 Pentium 4 at 3.8 GHz and a modern
            part at 5.5 GHz differ by 45% on the clock and by orders of magnitude in what they
            actually do per second. The clock was never the performance — it was just the number that
            was easy to print on a box.
          </p>
        </div>
      </div>

      <p className="small" style={{ marginTop: 16, maxWidth: '68ch' }}>
        Power figures scale from a 200 W, 5 GHz reference and assume gate delay is linear in supply
        voltage — a first-order model that overstates how gracefully this degrades, since real designs
        hit timing closure and reliability limits well before the arithmetic says so. Device
        frequencies are published f_max figures for indium phosphide research devices, not for
        anything you can buy in volume.
      </p>
    </div>
  )
}
