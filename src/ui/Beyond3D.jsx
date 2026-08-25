import React, { useState } from 'react'
import { ARCH, STATUS, BACKSIDE, STACKING, BEYOND_CMOS, THERMAL_LIMITS } from '../data/arch3d.js'
import { areaReduction, stackThermal } from '../lib/thermal.js'
import { fmt } from '../lib/fab.js'
import { DEFAULT_COMPUTE, watts } from '../lib/compute.js'

/**
 * Cross-sections, drawn rather than photographed.
 *
 * The whole argument of this tab is geometric, so the diagram has to carry it:
 * how many faces of the channel the gate touches, and — from forksheet onward
 * — how the n and p devices are arranged relative to each other. Photographs
 * of TEM cross-sections would look impressive and explain nothing.
 */
function Section({ id }) {
  const gate = 'var(--accent)'
  const chan = 'var(--muted)'
  const wall = 'var(--warn)'
  const sub = 'var(--panel2)'
  return (
    <svg viewBox="0 0 200 120" width="100%" height="200" role="img" aria-label={`Cross-section: ${id}`}>
      <rect x="0" y="98" width="200" height="22" fill={sub} />
      <text x="6" y="113" fill="var(--muted)" style={{ fontSize: 7, fontFamily: 'var(--font-mono)' }}>substrate</text>

      {id === 'planar' && (<>
        <rect x="30" y="86" width="140" height="12" fill={chan} opacity=".55" />
        <rect x="55" y="72" width="90" height="14" fill={gate} />
        <text x="100" y="66" textAnchor="middle" fill={gate} style={{ fontSize: 8, fontFamily: 'var(--font-mono)' }}>gate on 1 side</text>
      </>)}

      {id === 'finfet' && (<>
        {[45, 95, 145].map((x) => (
          <g key={x}>
            <rect x={x - 5} y="46" width="10" height="52" fill={chan} opacity=".55" />
            <path d={`M ${x - 13} 98 L ${x - 13} 38 L ${x + 13} 38 L ${x + 13} 98`} fill="none" stroke={gate} strokeWidth="7" />
          </g>
        ))}
        <text x="100" y="28" textAnchor="middle" fill={gate} style={{ fontSize: 8, fontFamily: 'var(--font-mono)' }}>gate on 3 sides · fins</text>
      </>)}

      {id === 'nanosheet' && (<>
        {[42, 60, 78].map((y) => (
          <g key={y}>
            <rect x="62" y={y} width="76" height="8" fill={chan} opacity=".55" />
            <rect x="56" y={y - 6} width="88" height="20" fill="none" stroke={gate} strokeWidth="4" rx="4" />
          </g>
        ))}
        <text x="100" y="30" textAnchor="middle" fill={gate} style={{ fontSize: 8, fontFamily: 'var(--font-mono)' }}>gate wraps all 4 sides</text>
      </>)}

      {id === 'forksheet' && (<>
        <rect x="97" y="34" width="6" height="64" fill={wall} />
        {[44, 62, 80].map((y) => (
          <g key={y}>
            <rect x="40" y={y} width="50" height="8" fill={chan} opacity=".55" />
            <path d={`M 97 ${y - 6} L 34 ${y - 6} L 34 ${y + 14} L 97 ${y + 14}`} fill="none" stroke={gate} strokeWidth="3.5" />
            <rect x="110" y={y} width="50" height="8" fill={chan} opacity=".55" />
            <path d={`M 103 ${y - 6} L 166 ${y - 6} L 166 ${y + 14} L 103 ${y + 14}`} fill="none" stroke={gate} strokeWidth="3.5" />
          </g>
        ))}
        <text x="100" y="26" textAnchor="middle" fill={wall} style={{ fontSize: 8, fontFamily: 'var(--font-mono)' }}>dielectric wall between n and p</text>
      </>)}

      {id === 'cfet' && (<>
        {[30, 44].map((y) => (
          <g key={y}>
            <rect x="66" y={y} width="68" height="7" fill={chan} opacity=".55" />
            <rect x="60" y={y - 5} width="80" height="17" fill="none" stroke={gate} strokeWidth="3" rx="3" />
          </g>
        ))}
        <text x="150" y="42" fill={gate} style={{ fontSize: 7, fontFamily: 'var(--font-mono)' }}>n</text>
        <line x1="30" y1="64" x2="170" y2="64" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 2" />
        {[70, 84].map((y) => (
          <g key={y}>
            <rect x="66" y={y} width="68" height="7" fill={chan} opacity=".55" />
            <rect x="60" y={y - 5} width="80" height="17" fill="none" stroke={gate} strokeWidth="3" rx="3" />
          </g>
        ))}
        <text x="150" y="82" fill={gate} style={{ fontSize: 7, fontFamily: 'var(--font-mono)' }}>p</text>
        <text x="100" y="20" textAnchor="middle" fill={gate} style={{ fontSize: 8, fontFamily: 'var(--font-mono)' }}>n stacked on p — one cell, two levels</text>
      </>)}

      {id === '2d' && (<>
        {[40, 58, 76].map((y) => (
          <g key={y}>
            <rect x="64" y={y} width="72" height="2" fill="var(--accent)" />
            <rect x="58" y={y - 7} width="84" height="16" fill="none" stroke={gate} strokeWidth="3" rx="3" />
          </g>
        ))}
        <text x="100" y="28" textAnchor="middle" fill={gate} style={{ fontSize: 8, fontFamily: 'var(--font-mono)' }}>monolayer channel — 3 atoms thick</text>
      </>)}
    </svg>
  )
}

export default function Beyond3D({ cfg }) {
  const [sel, setSel] = useState('nanosheet')
  const [tiers, setTiers] = useState(2)
  const [activity, setActivity] = useState(0.7)

  const a = ARCH.find((x) => x.id === sel) || ARCH[0]
  const c = { ...DEFAULT_COMPUTE, ...(cfg.compute || {}) }
  const areaMm2 = cfg.dieX * cfg.dieY
  const th = stackThermal({ areaMm2, wattsTier: c.wattsPerDie, tiers, activity })
  const maxCell = Math.max(...ARCH.map((x) => x.cellArea))

  return (
    <div>
      <div className="eyebrow">3D and beyond</div>
      <h1 className="title">Scaling stopped meaning smaller.<br />It started meaning taller.</h1>
      <p className="lede">
        Since 2011 every major step has been a move into the vertical axis: stand the channel up, wrap
        it completely, put a wall beside it, then stack one device on top of another. Meanwhile the
        wafer is growing a second side, and whole circuits are being bonded on top of each other.
      </p>

      <h2 className="sec">The ladder</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {ARCH.map((x) => (
          <button key={x.id} className={`btn ${sel === x.id ? 'active' : ''}`} onClick={() => setSel(x.id)}>{x.name}</button>
        ))}
      </div>

      <div className="detail">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="eyebrow" style={{ margin: 0 }}>{a.era}</div>
            <span className="badge" style={{ color: STATUS[a.status].hue, borderColor: STATUS[a.status].hue }}>
              {STATUS[a.status].label}
            </span>
          </div>
          <div className="wafer-stage" style={{ minHeight: 0, marginTop: 10, padding: 8 }}>
            <Section id={a.id} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-.02em', marginTop: 12 }}>{a.name}</h3>
          <div className="one">{a.one}</div>
          <p>{a.what}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Why it exists</dt><dd>{a.why}</dd>
            <dt>What it costs to make</dt><dd style={{ color: 'var(--warn)' }}>{a.cost}</dd>
            <dt>Where you find it</dt><dd>{a.node}</dd>
            <dt>Gated faces of the channel</dt>
            <dd style={{ color: 'var(--accent)' }}>{a.gated} of 4</dd>
            <dt>Relative cell footprint</dt>
            <dd style={{ color: 'var(--accent)' }}>
              {fmt.pct(a.cellArea, 0)} of planar
              {a.id !== 'planar' && ` — ${fmt.pct(areaReduction('planar', a.id), 0)} smaller`}
            </dd>
          </dl>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="eyebrow">Standard-cell footprint down the ladder</div>
        <div className="ladder" style={{ height: 150 }}>
          {ARCH.map((x) => (
            <div key={x.id} className={`rung ${x.id === sel ? 'on' : ''}`} onClick={() => setSel(x.id)}
              style={{ cursor: 'pointer' }} title={`${x.name}: ${fmt.pct(x.cellArea, 0)}`}>
              <div className="rung-bar" style={{
                height: `${(x.cellArea / maxCell) * 100}%`,
                background: x.id === sel ? undefined : STATUS[x.status].hue,
                opacity: x.id === sel ? 1 : 0.4,
              }} />
              <div className="rung-lbl">{fmt.pct(x.cellArea, 0)}</div>
            </div>
          ))}
        </div>
        <p className="small" style={{ marginTop: 10 }}>
          Relative standard-cell area at iso-node, planar as the baseline. These are approximate
          figures drawn from vendor and imec publications and they vary by cell and by claimant —
          read the ratio between generations, not the digits. The interesting one is CFET: it is the
          first step that shrinks the cell without shrinking any dimension, because one device moves
          under the other.
        </p>
      </div>

      <h2 className="sec">The wafer grows a back side</h2>
      <div className="grid g2">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="eyebrow" style={{ margin: 0 }}>Backside power delivery</div>
            <span className="badge" style={{ color: STATUS[BACKSIDE.status].hue, borderColor: STATUS[BACKSIDE.status].hue }}>
              {STATUS[BACKSIDE.status].label}
            </span>
          </div>
          <p style={{ fontSize: 14.5, lineHeight: 1.62, marginTop: 10 }}>{BACKSIDE.what}</p>
          <p className="phys" style={{ fontSize: 14.5, lineHeight: 1.62 }}>{BACKSIDE.how}</p>
        </div>
        <div className="card">
          <dl className="kv">
            {BACKSIDE.gains.map(([k, v]) => (
              <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>
            ))}
            <dt>What it costs</dt><dd style={{ color: 'var(--warn)' }}>{BACKSIDE.cost}</dd>
            <dt>Who ships it</dt><dd style={{ color: 'var(--accent)' }}>{BACKSIDE.where}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">Stacking whole circuits</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Approach</th><th>Connection pitch</th><th>Status</th><th style={{ width: '42%' }}>What it is</th><th>Note</th></tr></thead>
          <tbody>
            {STACKING.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b></td>
                <td className="num" style={{ color: 'var(--accent)' }}>{s.pitch}</td>
                <td><span className="badge" style={{ color: STATUS[s.status].hue, borderColor: STATUS[s.status].hue }}>{STATUS[s.status].label}</span></td>
                <td className="small">{s.what}</td>
                <td className="small">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec">The wall nobody scales past</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '62ch' }}>
        Stacking multiplies transistors per unit of footprint. It multiplies power per unit of
        footprint by the same factor. The surface available to remove heat does not change at all.
        That is arithmetic, and it is the reason 3D memory shipped a decade before 3D logic.
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(260px,340px)' }}>
        <div className="grid g3">
          <div className="stat hi">
            <div className="k">Power density</div>
            <div className="v">{fmt.n(th.density, 2)}<span style={{ fontSize: 15 }}> W/mm²</span></div>
            <div className="sub">{watts(th.totalW)} over {fmt.n(areaMm2, 0)} mm²</div>
          </div>
          <div className="stat">
            <div className="k">Density gain</div>
            <div className="v">{th.densityGain}×</div>
            <div className="sub">transistors per unit footprint</div>
          </div>
          <div className={`stat ${th.beyondAll ? 'bad' : 'ok'}`}>
            <div className="k">Cooling required</div>
            <div className="v" style={{ fontSize: 17 }}>{th.needed ? th.needed.name : 'Nothing known'}</div>
            <div className="sub">{th.beyondAll ? 'beyond every approach listed' : `${fmt.n(th.headroom, 1)}× headroom`}</div>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="ctl">
            <label><span>Tiers stacked</span><b>{tiers}</b></label>
            <input type="range" min="1" max="8" step="1" value={tiers}
              onChange={(e) => setTiers(+e.target.value)} aria-label="Tiers stacked" />
            <div className="hint">Each tier is the die you configured in the yield lab, at the power set on the compute tab.</div>
          </div>
          <div className="ctl">
            <label><span>Simultaneous activity</span><b>{fmt.pct(activity, 0)}</b></label>
            <input type="range" min="0.05" max="1" step="0.05" value={activity}
              onChange={(e) => setActivity(+e.target.value)} aria-label="Simultaneous activity" />
            <div className="hint">
              The honest escape hatch. Stacked DRAM works because most of it is idle most of the time.
              Stacked logic is much harder precisely because it is not — drag this down and watch the
              problem disappear, which is exactly the trick memory plays.
            </div>
          </div>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Cooling approach</th><th>Roughly handles</th><th>Tiers possible here</th><th style={{ width: 160 }}>Against current density</th></tr></thead>
          <tbody>
            {THERMAL_LIMITS.map((l) => {
              const maxTiers = activity > 0
                ? Math.max(1, Math.floor(1 + ((l.wPerMm2 * areaMm2) / c.wattsPerDie - 1) / activity))
                : 99
              return (
                <tr key={l.id} style={th.needed?.id === l.id ? { background: 'var(--panel2)' } : undefined}>
                  <td><b>{l.name}</b>{th.needed?.id === l.id && <span className="badge on" style={{ marginLeft: 8 }}>needed</span>}</td>
                  <td className="num">{l.wPerMm2} W/mm²</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{maxTiers >= 8 ? '8+' : maxTiers}</td>
                  <td><div className="bar"><i style={{ width: `${Math.min(100, (th.density / l.wPerMm2) * 100)}%`, background: th.density > l.wPerMm2 ? 'var(--bad)' : 'var(--ok)' }} /></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Cooling capabilities are approximate order-of-magnitude bands, not product specifications —
        real limits depend on hot-spot distribution, not just average density. The shape is what
        matters: each rung buys you roughly one to two more tiers, and there are not many rungs left.
      </p>

      <h2 className="sec">And after that?</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '62ch' }}>
        Everything above still switches charge through a silicon channel with a gate. These do not.
        All four have been researched for decades, none is on a production roadmap, and the honest note
        under each says why.
      </p>
      <div className="grid g2">
        {BEYOND_CMOS.map((b) => (
          <div className="card" key={b.name}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="eyebrow" style={{ margin: 0 }}>{b.name}</div>
              <span className="badge" style={{ color: STATUS[b.status].hue, borderColor: STATUS[b.status].hue }}>
                {STATUS[b.status].label}
              </span>
            </div>
            <p className="small" style={{ marginTop: 8 }}>{b.idea}</p>
            <p className="small" style={{ color: 'var(--ok)', marginTop: 6 }}>{b.why}</p>
            <p className="why" style={{ marginTop: 8 }}>{b.honest}</p>
          </div>
        ))}
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '62ch' }}>
        Roadmap positions are drawn from imec, IEDM and vendor publications through 2026. The gap
        between a working device at IEDM and a shipping product is routinely five to ten years, and
        the status badge on each entry is the most important thing on it.
      </p>
    </div>
  )
}
