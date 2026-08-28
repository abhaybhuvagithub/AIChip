import React, { useMemo, useState } from 'react'
import { newCompany, runToEnd, MARKETS, POLICY } from '../lib/javy.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

const usd = (v) => {
  const a = Math.abs(v), sign = v < 0 ? '−' : ''
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`
  return `${sign}$${(a / 1e3).toFixed(0)}k`
}

/** Cash and standing across the run — the two things that end a company. */
function Trace({ log }) {
  const W = 780, H = 220, PL = 62, PB = 32
  if (!log.length) return null
  const lo = Math.min(0, ...log.map((l) => l.cash))
  const hi = Math.max(...log.map((l) => l.cash), 1)
  const x = (i) => PL + (i / Math.max(1, log.length - 1)) * (W - PL - 20)
  const y = (v) => H - PB - ((v - lo) / (hi - lo || 1)) * (H - PB - 18)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="228" role="img"
      aria-label="Cash and standing across the run">
      <line x1={PL} y1={y(0)} x2={W - 20} y2={y(0)} stroke="var(--border)" strokeWidth="1.4" />
      {log.map((l, i) => l.gated && (
        <rect key={i} x={x(i) - 5} y="12" width="10" height={H - PB - 12}
          fill="var(--warn)" opacity=".14" />
      ))}
      <polyline points={log.map((l, i) => `${x(i)},${y(l.cash)}`).join(' ')}
        fill="none" stroke="var(--accent)" strokeWidth="2.4" />
      <polyline points={log.map((l, i) => `${x(i)},${H - PB - (l.standing ?? 1) * (H - PB - 18)}`).join(' ')}
        fill="none" stroke="var(--ok)" strokeWidth="1.4" strokeDasharray="4 3" />
      <text x={PL - 8} y={y(hi) + 4} textAnchor="end" fill="var(--muted)"
        style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{usd(hi)}</text>
      <text x={PL - 8} y={y(0) + 4} textAnchor="end" fill="var(--muted)"
        style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>0</text>
      <text x={W / 2} y={H - 6} textAnchor="middle" fill="var(--muted)" style={{ fontSize: 9.5 }}>
        Quarters — shaded where Javy held shipment
      </text>
    </svg>
  )
}

export default function Javy({ goTab }) {
  const [market, setMarket] = useState('automotive')
  const [capital, setCapital] = useState(340)
  const [override, setOverride] = useState(false)
  const [rule, setRule] = useState('gate')

  // Both runs are always computed, because the comparison below is the point
  // of the tab. `result` is simply whichever one the override switch selects,
  // rather than a third run of the same thing.
  const held = useMemo(
    () => runToEnd(newCompany({ market, cashUsd: capital * 1e6 })), [market, capital])
  const shipped = useMemo(() => {
    const ovs = {}
    for (let q = 0; q < 40; q++) ovs[q] = { shipAnyway: true }
    return runToEnd(newCompany({ market, cashUsd: capital * 1e6 }), ovs)
  }, [market, capital])
  const result = override ? shipped : held

  const m = MARKETS.find((x) => x.id === market)
  const p = POLICY.find((x) => x.id === rule)
  const last = result.log[result.log.length - 1]
  const gatedQuarters = result.log.filter((l) => l.gated).length

  return (
    <div>
      <div className="eyebrow">Javy</div>
      <h1 className="title">An operator you can read.</h1>
      <p className="lede">
        Javy runs a chip company. Each quarter it observes the state, applies a stated policy, and
        acts — releasing wafers, booking capacity, pricing, buying yield and test coverage, and
        deciding whether the parts are good enough to ship at all. Then you can override it and see
        what that costs.
      </p>

      <div className="card" style={{ borderColor: 'var(--accent)', marginTop: 16 }}>
        <div className="eyebrow">What Javy is, plainly</div>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          Javy is <b>not a language model</b>, and there is none behind it. This site is static —
          no server, no API key, nothing to call, and a build check that asserts as much. Javy is a
          deterministic policy engine: it observes, applies the six rules below, and acts.
        </p>
        <p style={{ marginTop: 10, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          That is a smaller claim than the marketing version and a better property. Every rule is
          written out, in order, and the same state always produces the same decision with the same
          stated reason. You cannot say that of a language model — and for something running a
          factory, legibility beats eloquence. Javy can also fail, and does. Those runs are left in.
        </p>
      </div>

      {/* ------------------------------------------------------ the run */}
      <h2 className="sec">Give it a company</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {MARKETS.map((x) => (
          <button key={x.id} className={`btn ${market === x.id ? 'active' : ''}`}
            onClick={() => { setMarket(x.id); setCapital(Math.round(x.cash / 1e6)) }}>{x.name}</button>
        ))}
        <button className={`btn ${override ? 'active' : ''}`} onClick={() => setOverride((v) => !v)}>
          {override ? '◉ Override the quality gate' : '○ Override the quality gate'}
        </button>
      </div>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>{m.note}</p>

      <div className="ctl" style={{ maxWidth: 420, marginBottom: 14 }}>
        <label><span>Starting capital</span><b>${capital}M</b></label>
        <input type="range" min="60" max="500" step="10" value={capital}
          onChange={(e) => setCapital(+e.target.value)} aria-label="Starting capital" />
        <div className="hint">
          There is a cliff rather than a slope. Below it the company dies holding the gate; above it,
          the same policy produces a business.
        </div>
      </div>

      <div className="grid g3">
        <div className={`stat ${result.cash > 0 && !result.endedWhy?.includes('Designed') ? 'ok' : 'bad'}`}>
          <div className="k">Outcome</div>
          <div className="v" style={{ fontSize: 17 }}>{result.endedWhy || 'Running'}</div>
          <div className="sub">after {result.quarter} quarters</div>
        </div>
        <div className={`stat ${result.cash > 0 ? '' : 'bad'}`}>
          <div className="k">Cash at the end</div>
          <div className="v" style={{ fontSize: 24 }}>{usd(result.cash)}</div>
          <div className="sub">from {usd(result.raised)} raised</div>
        </div>
        <div className="stat">
          <div className="k">Revenue</div>
          <div className="v" style={{ fontSize: 24 }}>{usd(result.revenue)}</div>
          <div className="sub">{fmt.n(result.shipped / 1e6, 1)}M units shipped</div>
        </div>
        <div className={`stat ${result.escapes > m.tolerance * 0.5 ? 'bad' : 'ok'}`}>
          <div className="k">Escapes to customers</div>
          <div className="v" style={{ fontSize: 24 }}>{fmt.n(result.escapes)}</div>
          <div className="sub">tolerance is {fmt.n(m.tolerance)} before the socket is lost</div>
        </div>
        <div className="stat">
          <div className="k">Quarters held</div>
          <div className="v" style={{ fontSize: 24 }}>{gatedQuarters}</div>
          <div className="sub">shipment stopped at the gate</div>
        </div>
        <div className="stat">
          <div className="k">Final escape rate</div>
          <div className="v" style={{ fontSize: 24 }}>{last ? last.dppm.toFixed(2) : '—'}</div>
          <div className="sub">DPPM, against a target of {m.dppmTarget}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <Trace log={result.log} />
        <div className="row" style={{ gap: 14 }}>
          <span className="small" style={{ color: 'var(--accent)' }}>— cash</span>
          <span className="small" style={{ color: 'var(--ok)' }}>┄ standing with the customer</span>
          <span className="small" style={{ color: 'var(--warn)' }}>▨ shipment held</span>
        </div>
      </div>

      {/* ------------------------------------------------ the comparison */}
      <h2 className="sec">What the gate is worth</h2>
      <div className="grid g2">
        <div className="card" style={{ borderColor: 'var(--ok)' }}>
          <div className="eyebrow" style={{ color: 'var(--ok)' }}>Gate held</div>
          <div className="v" style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>{usd(held.cash)}</div>
          <p className="small" style={{ marginTop: 8 }}>
            {held.endedWhy} {fmt.n(held.escapes)} escapes across {fmt.n(held.shipped / 1e6, 1)}M units.
          </p>
        </div>
        <div className="card" style={{ borderColor: 'var(--bad)' }}>
          <div className="eyebrow" style={{ color: 'var(--bad)' }}>Gate overridden</div>
          <div className="v" style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>{usd(shipped.cash)}</div>
          <p className="small" style={{ marginTop: 8 }}>
            {shipped.endedWhy} {fmt.n(shipped.escapes)} escapes across {fmt.n(shipped.shipped / 1e6, 1)}M units.
          </p>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Switch between the markets and watch this comparison change sign. In consumer the gate barely
        binds and shipping marginal parts often does pay in the short run — that is uncomfortable and
        it is true. In automotive, shipping escapes costs the socket, and a supplier who loses a
        platform does not get the next one. The discipline is not a moral position bolted onto the
        model; it falls out of who the customer is.
        <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('ethics')}>See the discipline tab</button>
      </p>

      {/* --------------------------------------------------- the policy */}
      <h2 className="sec">The six rules, in order</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {POLICY.map((x) => (
          <button key={x.id} className={`btn sm iconrow ${rule === x.id ? 'active' : ''}`} onClick={() => setRule(x.id)}>
            <Icon name={x.icon} size={18} />{x.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <h3 className="iconrow" style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-.02em' }}>
            <Icon name={p.icon} size={28} style={{ color: 'var(--accent)' }} title={p.name} />{p.name}
          </h3>
          <p style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-data)', color: 'var(--accent)' }}>
            {p.rule}
          </p>
        </div>
        <div className="card">
          <dl className="kv"><dt>Why this rule</dt><dd>{p.why}</dd></dl>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        The order is load-bearing. The quality gate is evaluated before anything commercial, so no
        cash consideration can reach past it — a gate that yields to pressure is not a gate. Every
        other rule is allowed to bend.
      </p>

      {/* ------------------------------------------------ quarter by quarter */}
      <h2 className="sec">Every decision it made</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Q</th><th>Cash</th><th>D₀</th><th>Coverage</th><th>DPPM</th><th>Sold</th><th>Price</th><th style={{ width: '38%' }}>What Javy did, and why</th></tr>
          </thead>
          <tbody>
            {result.log.map((l) => (
              <tr key={l.q} style={l.gated ? { background: 'color-mix(in srgb, var(--warn) 10%, transparent)' } : undefined}>
                <td className="num"><b>{l.q}</b></td>
                <td className="num" style={{ color: l.cash < 0 ? 'var(--bad)' : 'var(--accent)' }}>{usd(l.cash)}</td>
                <td className="num">{l.d0.toFixed(3)}</td>
                <td className="num">{(l.coverage * 100).toFixed(3)}%</td>
                <td className="num" style={{ color: l.dppm > m.dppmTarget ? 'var(--bad)' : 'var(--ok)' }}>{l.dppm.toFixed(2)}</td>
                <td className="num">{(l.sold / 1e6).toFixed(2)}M</td>
                <td className="num">${l.price.toFixed(0)}</td>
                <td>
                  {l.decisions.map((d, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <b style={{ fontSize: 'var(--fs-label)' }}>{d.what}</b>
                      <div className="small" style={{ marginTop: 1 }}>{d.why}</div>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '68ch' }}>
        The simulation is calibrated to be plausible rather than predictive — demand, price erosion,
        yield learning and escape cost are all models built from the same figures the rest of this
        site uses, and a real company has a hundred variables this one does not. What it is honest
        about is its own mechanism: no hidden state, no randomness beyond a seeded demand wobble, and
        a policy you can read in full before you run it.
      </p>
    </div>
  )
}
