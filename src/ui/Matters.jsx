import React, { useState } from 'react'
import { LEVERAGE, SHORTAGE, DEPENDENCE, AGAINST, WHY_UNDERSTAND } from '../data/matters.js'
import { SOURCES } from '../data/sources.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

const usd = (v) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`
  return `$${v}`
}

export default function Matters({ goTab }) {
  const [pick, setPick] = useState('car')
  const l = LEVERAGE.find((x) => x.id === pick)
  const ratio = l.valueUsd / l.contentUsd
  const share = l.contentUsd / l.valueUsd

  return (
    <div>
      <div className="eyebrow">Why it matters</div>
      <h1 className="title">Almost never the expensive part.<br />Always the part it stops without.</h1>
      <p className="lede">
        Semiconductors are rarely a large fraction of what anything costs. They are the fraction
        without which the rest does not function, and that asymmetry — not the technology — is why
        this industry ended up at the centre of everything. Every claim below is a number.
      </p>

      {/* ---------------------------------------------------- leverage */}
      <h2 className="sec">The ratio</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {LEVERAGE.map((x) => (
          <button key={x.id} className={`btn sm iconrow ${pick === x.id ? 'active' : ''}`} onClick={() => setPick(x.id)}>
            <Icon name={x.icon} size={18} />{x.name}
          </button>
        ))}
      </div>

      <div className="grid g3">
        <div className="stat">
          <div className="k">Semiconductor content</div>
          <div className="v" style={{ fontSize: 24 }}>{usd(l.contentUsd)}</div>
          <div className="sub">across roughly {fmt.n(l.chips)} devices</div>
        </div>
        <div className="stat">
          <div className="k">What the thing sells for</div>
          <div className="v" style={{ fontSize: 24 }}>{usd(l.valueUsd)}</div>
          <div className="sub">{fmt.pct(share, 1)} of it is silicon</div>
        </div>
        <div className={`stat ${ratio > 50 ? 'hi' : ''}`}>
          <div className="k">Leverage</div>
          <div className="v" style={{ fontSize: 24 }}>{ratio < 2 ? ratio.toFixed(1) : fmt.n(ratio, 0)}×</div>
          <div className="sub">value controlled per dollar of silicon</div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>{l.note}</p>

      <div className="tbl-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Product</th><th>Chips</th><th>Silicon content</th><th>Value</th><th>Silicon share</th><th>Leverage</th><th style={{ width: 150 }}></th></tr></thead>
          <tbody>
            {[...LEVERAGE].sort((a, b) => (b.valueUsd / b.contentUsd) - (a.valueUsd / a.contentUsd)).map((x) => {
              const r = x.valueUsd / x.contentUsd
              return (
                <tr key={x.id} style={{ cursor: 'pointer', background: x.id === pick ? 'var(--panel2)' : undefined }}
                  onClick={() => setPick(x.id)}>
                  <td><b className="iconrow"><Icon name={x.icon} size={20} />{x.name}</b></td>
                  <td className="num">{fmt.n(x.chips)}</td>
                  <td className="num">{usd(x.contentUsd)}</td>
                  <td className="num">{usd(x.valueUsd)}</td>
                  <td className="num">{fmt.pct(x.contentUsd / x.valueUsd, 1)}</td>
                  <td className="num" style={{ color: r > 50 ? 'var(--accent)' : 'var(--muted)' }}>
                    {r < 2 ? r.toFixed(1) : fmt.n(r, 0)}×
                  </td>
                  <td><div className="bar"><i style={{ width: `${Math.min(100, (Math.log10(r) / Math.log10(500)) * 100)}%` }} /></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        A pacemaker is four hundred times its silicon content; a car is sixty. Then look at the
        bottom row, where the ratio collapses to one — in an AI server the chips are not a component
        of the product, they are essentially the entire product. That inversion happened within about
        a decade, and most of the industry's recent economics follow from it.
      </p>

      {/* ---------------------------------------------------- shortage */}
      <h2 className="sec">What it looks like when the cheap part is missing</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div className="card">
          <p style={{ fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>{SHORTAGE.what}</p>
          <p style={{ fontSize: 'var(--fs-prose)', lineHeight: 1.62, marginTop: 10 }}>{SHORTAGE.why}</p>
          <p className="why" style={{ marginTop: 10 }}>{SHORTAGE.lesson}</p>
          <p className="small" style={{ marginTop: 10 }}>
            {SOURCES[SHORTAGE.source].author}, {SOURCES[SHORTAGE.source].venue}.
            <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => goTab('sources')}>Sources</button>
          </p>
        </div>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div className="stat bad">
            <div className="k">Vehicles not built</div>
            <div className="v">{(SHORTAGE.vehiclesLost / 1e6).toFixed(1)}M</div>
            <div className="sub">in {SHORTAGE.year} alone</div>
          </div>
          <div className="stat bad">
            <div className="k">Revenue lost</div>
            <div className="v">{usd(SHORTAGE.revenueLostUsd)}</div>
            <div className="sub">{usd(SHORTAGE.revenueLostUsd / SHORTAGE.vehiclesLost)} per vehicle</div>
          </div>
          <div className="stat">
            <div className="k">Caused by parts costing</div>
            <div className="v" style={{ fontSize: 22 }}>a few dollars</div>
            <div className="sub">on nodes twenty years old</div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- dependence */}
      <h2 className="sec">What actually depends on the newest silicon</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        Conflating these three is the commonest error in public argument about this industry. The
        leading edge matters enormously for a narrow set of things and hardly at all for most of what
        a society runs on.
      </p>
      <div className="grid g3">
        {DEPENDENCE.map((d) => (
          <div className="card" key={d.id}>
            <div className="iconrow" style={{ marginBottom: 6 }}>
              <Icon name={d.icon} size={26} style={{ color: 'var(--accent)' }} />
              <span className="eyebrow" style={{ margin: 0 }}>{d.name}</span>
            </div>
            <div className="one">{d.node}</div>
            <p className="small" style={{ marginTop: 8 }}>{d.what}</p>
            <p className="why" style={{ marginTop: 8 }}>{d.stakes}</p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------- counterweight */}
      <h2 className="sec">Now the case against this page</h2>
      <div className="grid g2">
        {AGAINST.map((a) => (
          <div className="card" key={a.k} style={{ borderColor: 'var(--warn)' }}>
            <div className="eyebrow" style={{ color: 'var(--warn)' }}>{a.k}</div>
            <p style={{ marginTop: 8 }}>{a.what}</p>
          </div>
        ))}
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        The discipline tab goes further into the parts of this the industry finds least comfortable.
        <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => goTab('ethics')}>Discipline →</button>
      </p>

      {/* ------------------------------------------------ why understand */}
      <h2 className="sec">And why understand it, rather than just know it matters</h2>
      <div className="card" style={{ borderColor: 'var(--accent)' }}>
        <p style={{ fontSize: 'var(--fs-prose)', lineHeight: 1.65 }}>{WHY_UNDERSTAND}</p>
        <div className="row" style={{ gap: 6, marginTop: 12 }}>
          <button className="btn sm" onClick={() => goTab('trace')}>Trace anything back →</button>
          <button className="btn sm" onClick={() => goTab('wafer')}>Watch yield fall with area →</button>
          <button className="btn sm" onClick={() => goTab('chain')}>See where the chokepoints are →</button>
        </div>
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '68ch' }}>
        Chip counts and content figures are order-of-magnitude estimates assembled from public
        teardowns and industry reporting; the ratios are the argument, not the digits. The shortage
        figures are a consultancy forecast made during the event and revised sharply upward once
        already — read them as the scale of the disruption rather than a settled number.
      </p>
    </div>
  )
}
