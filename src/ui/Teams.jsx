import React, { useMemo, useState } from 'react'
import { GROUPS, ROLES, FAB_ROLES, PROJECTS } from '../data/teams.js'
import { staffing, teamCost, PEAK_MULTIPLIER } from '../lib/staffing.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

const usd = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(0)}M`)

/** When each discipline is engaged, across the life of the programme. */
function Gantt({ groups }) {
  const W = 820, rowH = 34, PL = 190
  const H = groups.length * rowH + 30
  // Phase windows in months, matching the seven phases on the business tab.
  const SPAN = { arch: [0, 9], design: [6, 24], verif: [6, 30], phys: [14, 32],
    analog: [3, 28], silicon: [24, 44], sw: [9, 44], infra: [0, 46] }
  const max = 46
  const x = (m) => PL + (m / max) * (W - PL - 30)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H * 0.9} role="img"
      aria-label="When each discipline is engaged across the programme">
      {[0, 12, 24, 36, 46].map((m) => (
        <g key={m}>
          <line x1={x(m)} y1="6" x2={x(m)} y2={H - 22} stroke="var(--border)" opacity=".5" />
          <text x={x(m)} y={H - 6} textAnchor="middle" fill="var(--muted)"
            style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}>
            {m === 0 ? 'start' : `${m} mo`}
          </text>
        </g>
      ))}
      {groups.map((g, i) => {
        const [a, b] = SPAN[g.id] || [0, max]
        const y = 16 + i * rowH
        return (
          <g key={g.id}>
            <text x={PL - 10} y={y + 12} textAnchor="end" fill="var(--text)" style={{ fontSize: 9.5 }}>
              {g.label}
            </text>
            <rect x={x(a)} y={y + 2} width={x(b) - x(a)} height="14" rx="4"
              fill={g.hue} opacity=".55" />
            <text x={x(a) + 7} y={y + 13} fill="var(--bg)"
              style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {Math.round(g.peak)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Teams({ goTab }) {
  const [proj, setProj] = useState('flagship')
  const [scale, setScale] = useState(1)
  const [group, setGroup] = useState('verif')
  const [role, setRole] = useState('dv')

  const s = useMemo(() => staffing(proj, scale), [proj, scale])
  const g = GROUPS.find((x) => x.id === group)
  const inGroup = ROLES.filter((r) => r.group === group)
  const r = ROLES.find((x) => x.id === role) || inGroup[0]

  const pickGroup = (id) => {
    setGroup(id)
    const first = ROLES.find((x) => x.group === id)
    if (first) setRole(first.id)
  }

  return (
    <div>
      <div className="eyebrow">Teams</div>
      <h1 className="title">It takes a few hundred people.<br />Most never touch each other's work.</h1>
      <p className="lede">
        The business tab prices a programme in engineer-years, which hides the actual answer. This is
        the answer: which disciplines, how many of each, when they are engaged and what each one owns.
        The headcounts below come from the same engineer-year figures the cost model uses, so the two
        cannot disagree.
      </p>

      <h2 className="sec">Pick a programme</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {PROJECTS.map((p) => (
          <button key={p.id} className={`btn iconrow ${proj === p.id ? 'active' : ''}`} onClick={() => setProj(p.id)}>
            <Icon name={p.icon} size={20} />{p.short || p.name}
          </button>
        ))}
      </div>

      <div className="grid g3">
        <div className="stat hi">
          <div className="k">Peak headcount</div>
          <div className="v">{fmt.n(s.peakHeadcount, 0)}</div>
          <div className="sub">engineers, at the busiest point</div>
        </div>
        <div className="stat">
          <div className="k">Average headcount</div>
          <div className="v">{fmt.n(s.avgHeadcount, 0)}</div>
          <div className="sub">over {s.durationYears} years</div>
        </div>
        <div className="stat">
          <div className="k">Engineer-years</div>
          <div className="v">{fmt.n(s.engineerYears, 0)}</div>
          <div className="sub">at {s.project.node}</div>
        </div>
        <div className="stat">
          <div className="k">Team cost</div>
          <div className="v">{usd(teamCost(s.engineerYears))}</div>
          <div className="sub">
            fully loaded
            <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('business')}>see the NRE</button>
          </div>
        </div>
        <div className="stat">
          <div className="k">Largest discipline</div>
          <div className="v" style={{ fontSize: 19, color: s.groups[0].hue }}>{s.groups[0].label}</div>
          <div className="sub">{fmt.pct(s.groups[0].share, 0)} of the team</div>
        </div>
        <div className="stat">
          <div className="k">Peak over average</div>
          <div className="v">{PEAK_MULTIPLIER}×</div>
          <div className="sub">a programme ramps, peaks, then sheds</div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>{s.project.note}</p>

      <div className="ctl" style={{ maxWidth: 420, marginTop: 14 }}>
        <label><span>Programme scale</span><b>{scale.toFixed(1)}×</b></label>
        <input type="range" min="0.3" max="2.5" step="0.1" value={scale}
          onChange={(e) => setScale(+e.target.value)} aria-label="Programme scale" />
        <div className="hint">A larger or smaller effort of the same kind. Cost scales with it; the shape of the team does not.</div>
      </div>

      <h2 className="sec">Who, and how many</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Discipline</th><th>Peak</th><th>Average</th><th>Share</th><th style={{ width: 150 }}></th><th style={{ width: '32%' }}>What they own</th></tr>
          </thead>
          <tbody>
            {s.groups.map((x) => (
              <tr key={x.id} style={{ cursor: 'pointer', background: x.id === group ? 'var(--panel2)' : undefined }}
                onClick={() => pickGroup(x.id)}>
                <td><b style={{ color: x.hue }}>{x.label}</b><div className="small">{x.phase}</div></td>
                <td className="num" style={{ color: 'var(--accent)' }}>{fmt.n(x.peak, 0)}</td>
                <td className="num">{fmt.n(x.avg, 0)}</td>
                <td className="num">{fmt.pct(x.share, 0)}</td>
                <td><div className="bar"><i style={{ width: `${x.share * 100 * 3}%`, background: x.hue }} /></div></td>
                <td className="small">{x.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Two things surprise people here, and both are real. <b>Verification is the largest
        discipline</b> on almost every programme — the people who prove the chip works outnumber the
        people who make it work, and that ratio is why respins are rare rather than routine. And on an
        accelerator, <b>software rivals design</b>: a compiler team that cannot extract the
        performance the architecture promised has left you with a benchmark nobody can reproduce.
      </p>

      <h2 className="sec">When each is engaged</h2>
      <div className="card">
        <Gantt groups={s.groups} />
        <p className="small" style={{ marginTop: 6 }}>
          Numbers on the bars are peak headcount for that discipline. Architecture is finished before
          most people arrive; silicon and yield engineers join around the time everyone else is
          hoping to leave.
        </p>
      </div>

      <h2 className="sec">The roles themselves</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {GROUPS.map((x) => (
          <button key={x.id} className={`btn ${group === x.id ? 'active' : ''}`} onClick={() => pickGroup(x.id)}
            style={group === x.id ? undefined : { color: x.hue }}>{x.label}</button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        {inGroup.map((x) => (
          <button key={x.id} className={`btn sm iconrow ${role === x.id ? 'active' : ''}`} onClick={() => setRole(x.id)}>
            <Icon name={x.icon} size={18} />{x.title}
          </button>
        ))}
      </div>

      {r && (
        <>
          <div className="detail">
            <div className="card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="eyebrow" style={{ margin: 0, color: g.hue }}>{g.label} · {g.phase}</div>
                <span className="badge">{r.seniority}</span>
              </div>
              <h3 className="iconrow" style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-.02em', marginTop: 6 }}>
                <Icon name={r.icon} size={30} style={{ color: g.hue }} title={r.title} />{r.title}
              </h3>
              <p style={{ marginTop: 10 }}>{r.jd}</p>
              <p className="why" style={{ marginTop: 10 }}>{r.note}</p>
            </div>
            <div className="card">
              <dl className="kv">
                <dt>Responsible for</dt>
                <dd><ul>{r.owns.map((o) => <li key={o}>{o}</li>)}</ul></dd>
                <dt>What the job needs</dt>
                <dd><ul>{r.skills.map((k) => <li key={k}>{k}</li>)}</ul></dd>
                <dt>Lives in</dt>
                <dd>{r.tools.join(' · ')}</dd>
              </dl>
            </div>
          </div>
        </>
      )}

      <h2 className="sec">And if you own the fab</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        Everything above is a design programme. A company that manufactures adds these, and they are
        counted per fab rather than per project — a fab is staffed continuously whether or not any
        particular chip is being designed.
      </p>
      <div className="grid g2">
        {FAB_ROLES.map((f) => (
          <div className="card" key={f.title}>
            <div className="eyebrow">{f.title}</div>
            <p className="small" style={{ marginTop: 8 }}>{f.what}</p>
          </div>
        ))}
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '68ch' }}>
        Discipline shares are typical for a fabless SoC programme and vary substantially by company
        and product — the tilts per archetype are judgements, not survey data. Headcount is derived
        from the engineer-year figures on the business tab, which are themselves widely-cited industry
        estimates. Read the ratios rather than the digits.
      </p>
    </div>
  )
}
