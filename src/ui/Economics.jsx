import React from 'react'
import { computeRun, fmt } from '../lib/fab.js'
import { PRODUCTS, FOUNDRIES } from '../data/nodes.js'

function Money({ label, value, set, min, max, step, prefix = '$' }) {
  return (
    <div className="ctl">
      <label><span>{label}</span><b>{prefix}{value.toLocaleString('en-US')}</b></label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} />
    </div>
  )
}

export default function Economics({ cfg, patch }) {
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
                  <td><b>{p.icon} {p.name}</b></td>
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
