import React, { useState } from 'react'
import { NODES, ARCHITECTURES } from '../data/nodes.js'
import { fmt } from '../lib/fab.js'

/** A small cross-section, drawn rather than photographed, because the point
 *  is how many sides of the channel the gate touches. */
function Cross({ sides }) {
  const gate = 'var(--accent)'
  return (
    <svg viewBox="0 0 120 74" width="100%" height="82" role="img" aria-label={`Gate wraps ${sides} side(s)`}>
      <rect x="0" y="56" width="120" height="18" fill="var(--panel2)" />
      {sides === 1 && (<>
        <rect x="18" y="44" width="84" height="12" fill="var(--muted)" opacity=".55" />
        <rect x="34" y="34" width="52" height="10" fill={gate} />
      </>)}
      {sides === 3 && (<>
        {[30, 56, 82].map((x) => <rect key={x} x={x} y="22" width="10" height="34" fill="var(--muted)" opacity=".55" />)}
        {[30, 56, 82].map((x) => (
          <path key={`g${x}`} d={`M ${x - 6} 56 L ${x - 6} 18 L ${x + 16} 18 L ${x + 16} 56`} fill="none" stroke={gate} strokeWidth="5" />
        ))}
      </>)}
      {sides === 4 && (<>
        {[16, 30, 44].map((y) => <rect key={y} x="30" y={y} width="60" height="7" fill="var(--muted)" opacity=".55" />)}
        {[16, 30, 44].map((y) => <rect key={`g${y}`} x="26" y={y - 4} width="68" height="15" fill="none" stroke={gate} strokeWidth="3" rx="3" />)}
      </>)}
    </svg>
  )
}

export default function Nodes() {
  const [arch, setArch] = useState('gaa')
  const a = ARCHITECTURES.find((x) => x.id === arch)
  const maxD = Math.max(...NODES.map((n) => n.mtr))

  return (
    <div>
      <div className="eyebrow">Nodes</div>
      <h1 className="title">The numbers stopped being measurements<br />around 2011.</h1>
      <p className="lede">
        "22 nm" does not describe anything you could put a ruler on. What kept improving is density
        and the shape of the transistor — planar, then a fin, then a stack of sheets with the gate
        wrapped completely around. One more side of the channel each time.
      </p>

      <div className="row" style={{ margin: '20px 0 12px' }}>
        {ARCHITECTURES.map((x) => (
          <button key={x.id} className={`btn ${arch === x.id ? 'active' : ''}`} onClick={() => setArch(x.id)}>{x.name}</button>
        ))}
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Cross-section</div>
          <Cross sides={a.gateSides} />
          <div className="row" style={{ marginTop: 10, gap: 16 }}>
            <span className="small"><span style={{ color: 'var(--accent)' }}>▬</span> gate</span>
            <span className="small"><span style={{ color: 'var(--muted)' }}>▬</span> channel</span>
            <span className="badge on">{a.gateSides} of 4 sides controlled</span>
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">{a.years}</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 25, letterSpacing: '-.02em' }}>{a.name}</h3>
          <p style={{ fontSize: 16.5, lineHeight: 1.62, marginTop: 10 }}>{a.why}</p>
        </div>
      </div>

      <h2 className="sec">Twenty-six years, one table</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Node</th><th>Year</th><th>Transistor</th><th>Lithography</th><th style={{ width: 150 }}>Density</th><th style={{ width: '34%' }}>What changed</th></tr>
          </thead>
          <tbody>
            {NODES.map((n) => (
              <tr key={n.node}>
                <td><b style={{ color: 'var(--accent)' }}>{n.node}</b></td>
                <td className="num">{n.year}</td>
                <td className="small">{n.arch}</td>
                <td className="small">{n.litho}</td>
                <td>
                  <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <div className="bar" style={{ flex: 1 }}><i style={{ width: `${(n.mtr / maxD) * 100}%` }} /></div>
                    <span className="num" style={{ fontSize: 14, color: 'var(--muted)', minWidth: 38, textAlign: 'right' }}>{fmt.n(n.mtr, n.mtr < 10 ? 1 : 0)}</span>
                  </div>
                </td>
                <td className="small">{n.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Density is millions of transistors per mm², from published claims. Vendors count differently
        and none of it is measured here, so read the column as a ranking rather than a spec.
      </p>

      <h2 className="sec">The two walls</h2>
      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Patterning</div>
          <p style={{ fontSize: 16.5, lineHeight: 1.62 }}>
            Immersion DUV runs 193 nm light through water and stops around 38 nm half-pitch. Below
            that, the pattern has to be split across two, three or four masks and re-printed —
            multiplying cost and stacking overlay error. EUV at 13.5 nm does the same pitch in one
            exposure, which is why a node with EUV can have <i>fewer</i> masks than the one before it.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">Interconnect</div>
          <p style={{ fontSize: 16.5, lineHeight: 1.62 }}>
            Transistors kept shrinking; wires stopped cooperating. As copper lines narrow, electrons
            scatter off grain boundaries and the diffusion barrier, so resistance climbs faster than
            cross-section falls. Delay is now dominated by wiring, not switching — which is what
            pushed the industry toward backside power delivery and alternative metals.
          </p>
        </div>
      </div>
    </div>
  )
}
