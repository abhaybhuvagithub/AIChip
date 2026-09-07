import React, { useState } from 'react'
import { computeRun, fmt } from '../lib/fab.js'
import { PRODUCTS, FOUNDRIES } from '../data/nodes.js'
import Icon from './Icon.jsx'
import {
  FAB_PRESETS, MARGIN_CHECK, fabMargin, breakevenUtilisation, costStack,
} from '../lib/fabecon.js'

function Money({ label, value, set, min, max, step, prefix = '$' }) {
  return (
    <div className="ctl">
      <label><span>{label}</span><b>{prefix}{value.toLocaleString('en-US')}</b></label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} />
    </div>
  )
}

/** Local slider, matching the science, yield and 3D tabs. */
function Slider({ label, value, set, min, max, step = 1, unit = '', hint, fmtV }) {
  return (
    <div className="ctl">
      <label><span>{label}</span><b>{fmtV ? fmtV(value) : value}{unit}</b></label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export default function Economics({ cfg, patch }) {
  const [fabId, setFabId] = useState('n3')
  const [util, setUtil] = useState(0.9)
  const [age, setAge] = useState(0)
  const fab = FAB_PRESETS.find((f) => f.id === fabId)
  const fabArgs = { ...fab, utilisation: util, ageYears: age }
  const fm = fabMargin(fabArgs)
  const be = breakevenUtilisation({ ...fab, ageYears: age })
  const stack = costStack(fabArgs)
  const r = computeRun(cfg)

  return (
    <div>
      <div className="eyebrow">Economics</div>
      <h1 className="title">Nobody runs a fab to yield.<br />They run it to cost per good die.</h1>
      <p className="lede">
        Yield is a means. What decides whether a product exists is what one shippable, packaged,
        tested part costs — and a 40% yield on a cheap wafer routinely beats 80% on an expensive one.
      </p>

      <div className="grid g3" style={{ marginTop: 20 }}>
        <div className="stat hi">
          <div className="k">Cost per good die</div>
          <div className="v">{fmt.usd(r.costPerGoodDie)}</div>
          <div className="sub">silicon + package, before mask amortisation</div>
        </div>
        <div className="stat">
          <div className="k">Shippable per wafer</div>
          <div className="v">{fmt.n(r.packagedGood)}</div>
          <div className="sub">of {fmt.n(r.geo.gross)} gross</div>
        </div>
        <div className="stat">
          <div className="k">Silicon utilisation</div>
          <div className="v">{fmt.pct(r.utilisation)}</div>
          <div className="sub">of wafer area inside countable dies</div>
        </div>
        <div className={`stat ${r.margin != null && r.margin > 0.4 ? 'ok' : r.margin != null && r.margin < 0 ? 'bad' : ''}`}>
          <div className="k">Gross margin</div>
          <div className="v">{r.margin == null ? '—' : fmt.pct(r.margin)}</div>
          <div className="sub">{cfg.asp > 0 ? `at ${fmt.usd(cfg.asp)} selling price` : 'set a price below'}</div>
        </div>
        <div className="stat">
          <div className="k">Revenue per wafer</div>
          <div className="v">{cfg.asp > 0 ? fmt.usd(r.revenue) : '—'}</div>
          <div className="sub">against {fmt.usd(cfg.waferCost)} of processing</div>
        </div>
        <div className="stat">
          <div className="k">Mask layers</div>
          <div className="v">{cfg.layers}</div>
          <div className="sub">a leading-edge mask set runs into eight figures</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="eyebrow">Silicon</div>
          <Money label="Processed wafer cost" value={cfg.waferCost} set={(v) => patch({ waferCost: v, preset: '' })} min={500} max={30000} step={100} />
          <div className="ctl">
            <label><span>Line yield</span><b>{fmt.pct(cfg.lineYield)}</b></label>
            <input type="range" min="0.8" max="1" step="0.005" value={cfg.lineYield} onChange={(e) => patch({ lineYield: +e.target.value })} />
            <div className="hint">Wafers that survive the fab at all — breakage, misprocessing, scrapped lots.</div>
          </div>
          <div className="ctl">
            <label><span>Test / parametric yield</span><b>{fmt.pct(cfg.testYield)}</b></label>
            <input type="range" min="0.7" max="1" step="0.005" value={cfg.testYield} onChange={(e) => patch({ testYield: +e.target.value })} />
            <div className="hint">Dies with no defect that still miss timing, leakage or voltage spec.</div>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">Assembly and market</div>
          <Money label="Package cost per die" value={cfg.packageCost} set={(v) => patch({ packageCost: v, preset: '' })} min={0} max={2000} step={1} />
          <div className="ctl">
            <label><span>Assembly yield</span><b>{fmt.pct(cfg.packageYield)}</b></label>
            <input type="range" min="0.85" max="1" step="0.005" value={cfg.packageYield} onChange={(e) => patch({ packageYield: +e.target.value })} />
            <div className="hint">On a 12-high HBM stack this term stops being a rounding error.</div>
          </div>
          <Money label="Selling price" value={cfg.asp} set={(v) => patch({ asp: v, preset: '' })} min={0} max={30000} step={10} />
        </div>
      </div>

      <h2 className="sec">Eight real products, same model</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '62ch' }}>
        Click any row to load it into the yield lab. Die sizes and wafer prices are public estimates
        and vary by source — they are here to make the shape of the trade-off concrete, not to quote
        anyone's contract.
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Product</th><th>Node</th><th>Die</th><th>Gross</th><th>Yield</th><th>Good</th><th>Cost / good die</th><th style={{ width: '26%' }}>Why it looks like this</th></tr>
          </thead>
          <tbody>
            {PRODUCTS.map((p) => {
              const pr = computeRun({ ...cfg, ...p })
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => patch({ ...p, preset: p.id })}
                  title="Load into the yield lab">
                  <td><b className="iconrow"><Icon name={p.icon} size={22} title={p.name} /> {p.name}</b></td>
                  <td className="num">{p.node}</td>
                  <td className="num">{p.dieX}×{p.dieY}</td>
                  <td className="num">{fmt.n(pr.geo.gross)}</td>
                  <td className="num" style={{ color: pr.dieYield > 0.7 ? 'var(--ok)' : 'var(--warn)' }}>{fmt.pct(pr.dieYield)}</td>
                  <td className="num">{fmt.n(pr.goodDies)}</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{fmt.usd(pr.costPerGoodDie)}</td>
                  <td className="small">{p.blurb}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>


      {/* ------------------------------------------- where a wafer price comes from */}
      <h2 className="sec">Where the wafer price comes from</h2>
      <p className="small" style={{ marginBottom: 14, maxWidth: '68ch' }}>
        Everything above takes the wafer price as given, which is the wrong way round. A wafer price
        is not a number you look up — it is an output of four things, and three of them are fixed the
        moment the building exists. This is the view from inside the fab.
      </p>

      <div className="row" style={{ marginBottom: 12 }}>
        {FAB_PRESETS.map((f) => (
          <button key={f.id} className={`btn ${fabId === f.id ? 'active' : ''}`}
            onClick={() => { setFabId(f.id); setAge(f.ageYears) }}>{f.name}</button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div>
          <div className="grid g3">
            <div className="stat hi">
              <div className="k">Cost per wafer</div>
              <div className="v" style={{ fontSize: 24 }}>${fmt.n(fm.total, 0)}</div>
              <div className="sub">against a ${fmt.n(fab.waferPriceUsd)} price</div>
            </div>
            <div className={`stat ${fm.grossMargin > 0.3 ? 'ok' : 'bad'}`}>
              <div className="k">Gross margin</div>
              <div className="v" style={{ fontSize: 24 }}>{fmt.pct(fm.grossMargin, 1)}</div>
              <div className="sub">at {fmt.pct(util, 0)} utilisation</div>
            </div>
            <div className={`stat ${util > be ? '' : 'bad'}`}>
              <div className="k">Breakeven utilisation</div>
              <div className="v" style={{ fontSize: 24 }}>{fmt.pct(be, 0)}</div>
              <div className="sub">{util > be ? 'currently above it' : 'currently below it — losing money'}</div>
            </div>
          </div>

          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Cost line</th><th>Per wafer</th><th>Share</th><th>Behaviour</th><th style={{ width: '38%' }}>What it is</th></tr></thead>
              <tbody>
                {stack.map((c) => (
                  <tr key={c.k}>
                    <td><b>{c.k}</b></td>
                    <td className="num" style={{ color: c.fixed ? 'var(--bad)' : 'var(--accent)' }}>
                      ${fmt.n(c.v, 0)}
                    </td>
                    <td className="num">{fmt.pct(c.v / fm.total, 0)}</td>
                    <td className="small">{c.fixed ? 'Fixed' : 'Variable'}</td>
                    <td className="small">{c.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Utilisation</th><th>Wafers / month</th><th>Cost per wafer</th><th>Gross margin</th><th style={{ width: 160 }}></th></tr></thead>
              <tbody>
                {[1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map((u) => {
                  const m = fabMargin({ ...fab, utilisation: u, ageYears: age })
                  return (
                    <tr key={u} style={{ cursor: 'pointer', background: Math.abs(u - util) < 0.01 ? 'var(--panel2)' : undefined }}
                      onClick={() => setUtil(u)}>
                      <td className="num"><b>{fmt.pct(u, 0)}</b></td>
                      <td className="num">{fmt.n(m.wafers, 0)}</td>
                      <td className="num">${fmt.n(m.total, 0)}</td>
                      <td className="num" style={{ color: m.grossMargin > 0 ? 'var(--ok)' : 'var(--bad)' }}>
                        {fmt.pct(m.grossMargin, 1)}
                      </td>
                      <td>
                        <div className="bar">
                          <i style={{ width: `${Math.max(0, Math.min(100, m.grossMargin * 150))}%`,
                            background: m.grossMargin > 0 ? 'var(--ok)' : 'var(--bad)' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            Nothing about the process changes down that table. The tools are the same, the recipe is
            the same, the people are the same — the only thing that moved is how many wafers the
            fixed costs are divided by. <b>Depreciation is {fmt.pct(fm.depShare, 0)} of the cost per
            wafer here</b>, and it arrives whether or not a single wafer runs. That one line explains
            take-or-pay contracts, customer prepayments, why foundries chase volume commitments years
            ahead, and most of this industry's cyclicality.
          </p>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Utilisation" value={util * 100} set={(v) => setUtil(v / 100)}
            min={30} max={100} step={1} unit="%"
            hint={`Below ${fmt.pct(be, 0)} this fab loses money however well it is run.`} />
          <Slider label="Fab age" value={age} set={setAge} min={0} max={10} step={1} unit=" years"
            hint="The first question anyone asks about a fab's economics. Once the tools are written off the capital charge simply stops." />
          <div className={`stat ${fm.depreciating ? '' : 'ok'}`} style={{ marginTop: 6 }}>
            <div className="k">Capital charge</div>
            <div className="v" style={{ fontSize: 20 }}>
              {fm.depreciating ? `$${fmt.n(fm.depPerWafer, 0)}/wafer` : 'Written off'}
            </div>
            <div className="sub">
              {fm.depreciating
                ? `${fab.capexUsd / 1e9}B over ${fm.depreciationYears} years`
                : 'the same process, at a fraction of the cost'}
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>{fab.note}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, borderColor: 'var(--accent)' }}>
        <div className="eyebrow">Does this model agree with reality?</div>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          {MARGIN_CHECK.note} This model gives about{' '}
          <b>{fmt.pct(fabMargin({ ...FAB_PRESETS.find((f) => f.id === 'n3'), utilisation: 1, ageYears: 0 }).grossMargin, 0)}</b>{' '}
          for a brand-new 3 nm fab at full utilisation. {MARGIN_CHECK.expectation}
        </p>
        <p style={{ marginTop: 10, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          The gap is the point rather than an error. Slide the fab age past five years above and
          watch the margin on the identical process jump — that is the same effect running in reverse,
          and it is why a node's profitability climbs for years after the process stops changing.
        </p>
      </div>

      <h2 className="sec">Who actually makes them</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Company</th><th>Model</th><th>Leading node</th><th style={{ width: '48%' }}>Position</th></tr></thead>
          <tbody>
            {FOUNDRIES.map((f) => (
              <tr key={f.name}>
                <td><b>{f.name}</b></td>
                <td className="small">{f.role}</td>
                <td className="num" style={{ color: 'var(--accent)' }}>{f.edge}</td>
                <td className="small">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
