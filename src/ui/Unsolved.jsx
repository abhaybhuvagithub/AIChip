import React, { useMemo, useState } from 'react'
import { PROBLEMS, DOMAINS, STATUS, CAVEAT } from '../data/unsolved.js'
import Icon from './Icon.jsx'
import ChartData from './ChartData.jsx'

const NOW = 2026

/**
 * How long each problem has been open, on a shared axis.
 *
 * This is the whole argument of the tab in one picture: several of these bars
 * are longer than the careers of the people currently working on them.
 */
function OpenFor({ items, sel, onPick }) {
  const W = 760, rowH = 26, PL = 210
  const H = items.length * rowH + 34
  const oldest = Math.max(...items.map((p) => NOW - p.since))
  const x = (yrs) => PL + (yrs / oldest) * (W - PL - 60)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H * 0.92} role="img"
      aria-label="How long each open problem has been recognised">
      {[0, 10, 20, 30].filter((t) => t <= oldest).map((t) => (
        <g key={t}>
          <line x1={x(t)} y1="6" x2={x(t)} y2={H - 24} stroke="var(--border)" opacity=".5" />
          <text x={x(t)} y={H - 8} textAnchor="middle" fill="var(--muted)"
            style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{t} yr</text>
        </g>
      ))}
      {items.map((p, i) => {
        const yrs = NOW - p.since
        const y = 14 + i * rowH
        const on = sel === p.id
        return (
          <g key={p.id} onClick={() => onPick(p.id)} style={{ cursor: 'pointer' }}>
            <rect x="0" y={y - 9} width={W} height={rowH - 4} rx="4"
              fill={on ? 'var(--panel2)' : 'transparent'} />
            <text x={PL - 10} y={y + 5} textAnchor="end" fill={on ? 'var(--text)' : 'var(--muted)'}
              style={{ fontSize: 14.5 }}>{p.short || p.name}</text>
            <rect x={PL} y={y - 5} width={Math.max(2, x(yrs) - PL)} height="11" rx="3"
              fill={DOMAINS[p.domain].hue} opacity={on ? 0.95 : 0.55} />
            <text x={x(yrs) + 8} y={y + 5} fill={DOMAINS[p.domain].hue}
              style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{yrs}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Unsolved() {
  const [domain, setDomain] = useState('all')
  const [sel, setSel] = useState('steep')

  const items = useMemo(() => PROBLEMS
    .filter((p) => domain === 'all' || p.domain === domain)
    .sort((a, b) => a.since - b.since), [domain])
  const p = PROBLEMS.find((x) => x.id === sel) || items[0]
  const years = NOW - p.since
  const median = useMemo(() => {
    const v = PROBLEMS.map((x) => NOW - x.since).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)]
  }, [])

  return (
    <div>
      <div className="eyebrow">Open problems</div>
      <h1 className="title">Eighteen things<br />nobody has solved.</h1>
      <p className="lede">
        Every other tab here explains something that works, which gives a misleading impression of a
        field with a roadmap. A great deal of it is a list of walls people have been running at for
        decades — and the dates below are the honest part.
      </p>

      <div className="grid g3" style={{ marginTop: 20 }}>
        <div className="stat hi">
          <div className="k">Problems listed</div>
          <div className="v">{PROBLEMS.length}</div>
          <div className="sub">across six domains</div>
        </div>
        <div className="stat">
          <div className="k">Median time open</div>
          <div className="v">{median}<span style={{ fontSize: 16 }}> yr</span></div>
          <div className="sub">since recognised as a problem</div>
        </div>
        <div className="stat bad">
          <div className="k">Open for 20 years or more</div>
          <div className="v">{PROBLEMS.filter((x) => NOW - x.since >= 20).length}</div>
          <div className="sub">longer than many careers in the field</div>
        </div>
      </div>

      <h2 className="sec">How long each has been open</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`btn ${domain === 'all' ? 'active' : ''}`} onClick={() => setDomain('all')}>All</button>
        {Object.entries(DOMAINS).map(([k, v]) => (
          <button key={k} className={`btn ${domain === k ? 'active' : ''}`} onClick={() => setDomain(k)}
            style={domain === k ? undefined : { color: v.hue }}>{v.label}</button>
        ))}
      </div>
      <div className="card">
        <OpenFor items={items} sel={sel} onPick={setSel} />
        <ChartData
          caption="How long each problem has been recognised as open, in years."
          columns={['Problem', 'Domain', 'Since', 'Years open', 'Status']}
          rows={items.map((x) => [x.name, DOMAINS[x.domain].label, String(x.since),
            String(NOW - x.since), STATUS[x.status].label])} />
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Dates are when each was first recognised as a distinct open problem, not when it was first
        mentioned — the memory wall from the 1994 paper that named it, carbon nanotube logic from the
        first working device in 1998, magic state distillation from its 2005 proposal. Several of
        these bars are longer than the careers of the people currently working on them.
      </p>

      <h2 className="sec">{p.name}</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="badge" style={{ color: DOMAINS[p.domain].hue, borderColor: DOMAINS[p.domain].hue }}>
          {DOMAINS[p.domain].label}
        </span>
        <span className="badge" style={{ color: STATUS[p.status].hue, borderColor: STATUS[p.status].hue }}>
          {STATUS[p.status].label}
        </span>
        <span className="badge on">Open {years} years — since {p.since}</span>
      </div>
      <div className="detail">
        <div className="card">
          <div className="iconrow" style={{ marginBottom: 8 }}>
            <Icon name={p.icon} size={32} style={{ color: DOMAINS[p.domain].hue }} title={p.name} />
            <span className="eyebrow" style={{ margin: 0 }}>The problem</span>
          </div>
          <p>{p.what}</p>
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>What has been tried</dt><dd>{p.tried}</dd>
          </dl>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Why it is still open</dt><dd style={{ color: 'var(--warn)' }}>{p.hard}</dd>
            <dt>What would count as solved</dt><dd style={{ color: 'var(--ok)' }}>{p.solved}</dd>
            <dt>What it costs meanwhile</dt><dd>{p.costs}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">All of them, in one table</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Problem</th><th>Domain</th><th>Status</th><th>Since</th><th>Open</th><th style={{ width: '34%' }}>What would count as solved</th></tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} style={{ cursor: 'pointer', background: x.id === sel ? 'var(--panel2)' : undefined }}
                onClick={() => setSel(x.id)}>
                <td>
                  <b className="iconrow" style={{ color: DOMAINS[x.domain].hue }}>
                    <Icon name={x.icon} size={21} />{x.name}
                  </b>
                </td>
                <td className="small">{DOMAINS[x.domain].label}</td>
                <td>
                  <span className="badge" style={{ color: STATUS[x.status].hue, borderColor: STATUS[x.status].hue }}>
                    {STATUS[x.status].label}
                  </span>
                </td>
                <td className="num">{x.since}</td>
                <td className="num" style={{ color: NOW - x.since >= 20 ? 'var(--bad)' : 'var(--accent)' }}>
                  {NOW - x.since} yr
                </td>
                <td className="small">{x.solved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec">What the four statuses mean</h2>
      <div className="grid g2">
        {[
          ['Open', 'No demonstrated path. Several approaches are being pursued and none is convincing yet.'],
          ['Partial', 'Works in some regime and does not generalise. Useful, and not a solution.'],
          ['Contained, not solved', 'Managed rather than fixed. The cost is real and it is paid every generation, forever, unless something changes.'],
          ['Stalled', 'Demonstrated long ago, never made practical, and little movement since. These are the ones that have been ten years away for twenty.'],
        ].map(([k, v]) => {
          const st = Object.values(STATUS).find((s) => s.label === k)
          return (
            <div className="card" key={k}>
              <div className="eyebrow" style={{ color: st?.hue }}>{k}</div>
              <p className="small" style={{ marginTop: 8 }}>{v}</p>
              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                {PROBLEMS.filter((x) => STATUS[x.status].label === k).slice(0, 4).map((x) => (
                  <button key={x.id} className="btn sm" onClick={() => setSel(x.id)}>{x.short || x.name}</button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 18, borderColor: 'var(--accent)' }}>
        <div className="eyebrow">The caveat this page owes you</div>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>{CAVEAT}</p>
      </div>

      <p className="small" style={{ marginTop: 16, maxWidth: '68ch' }}>
        Dates are approximate and mark when each became a recognised open problem in the literature
        rather than a first mention. Status is a judgement, not a measurement. The list is not
        exhaustive and never could be — it is the problems large enough that the rest of this site
        keeps running into them.
      </p>
    </div>
  )
}
