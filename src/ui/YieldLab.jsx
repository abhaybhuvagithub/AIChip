import React from 'react'
import WaferMap from './WaferMap.jsx'
import { computeRun, YIELD_MODELS, RETICLE, WAFERS, fmt } from '../lib/fab.js'
import { PRODUCTS } from '../data/nodes.js'

function Slider({ label, value, set, min, max, step = 1, unit = '', hint }) {
  return (
    <div className="ctl">
      <label>
        <span>{label}</span>
        <b>{value}{unit}</b>
      </label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export default function YieldLab({ cfg, patch }) {
  const r = computeRun(cfg)
  const models = Object.entries(YIELD_MODELS)

  return (
    <div>
      <div className="eyebrow">Yield lab</div>
      <h1 className="title">Drag the die bigger.<br />Watch it get punished twice.</h1>
      <p className="lede">
        The map is drawn from the same layout that produces the numbers, so what you see is what is
        counted. Red dies contain at least one defect. Grey dies at the edge were never whole.
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(260px,1fr)', marginTop: 20 }}>
        <div>
          <WaferMap cfg={cfg} clustered={cfg.clustered} seed={cfg.seed} />
          <div className="grid g3" style={{ marginTop: 12 }}>
            <div className="stat hi">
              <div className="k">Gross dies</div>
              <div className="v">{fmt.n(r.geo.gross)}</div>
              <div className="sub">{fmt.n(r.geo.partial)} partial dies lost at the edge</div>
            </div>
            <div className={`stat ${r.dieYield > 0.7 ? 'ok' : 'bad'}`}>
              <div className="k">Die yield</div>
              <div className="v">{fmt.pct(r.dieYield)}</div>
              <div className="sub">{r.modelMeta.label} × line × test</div>
            </div>
            <div className="stat">
              <div className="k">Good dies / wafer</div>
              <div className="v">{fmt.n(r.goodDies)}</div>
              <div className="sub">{fmt.n(r.lossToDefects)} lost after sort</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="eyebrow">Controls</div>
          <div className="ctl">
            <label><span>Product preset</span></label>
            <select value={cfg.preset || ''} onChange={(e) => {
              const p = PRODUCTS.find((x) => x.id === e.target.value)
              if (p) patch({ ...p, preset: p.id })
            }}>
              <option value="">Custom</option>
              {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </div>

          <div className="ctl">
            <label><span>Wafer</span></label>
            <select value={cfg.waferDia} onChange={(e) => patch({ waferDia: +e.target.value, preset: '' })}>
              {Object.values(WAFERS).map((w) => <option key={w.dia} value={w.dia}>{w.label}</option>)}
            </select>
            <div className="hint">{WAFERS[cfg.waferDia]?.note}</div>
          </div>

          <Slider label="Die width" value={cfg.dieX} set={(v) => patch({ dieX: v, preset: '' })} min={1} max={26} step={0.5} unit=" mm" />
          <Slider label="Die height" value={cfg.dieY} set={(v) => patch({ dieY: v, preset: '' })} min={1} max={33} step={0.5} unit=" mm"
            hint={r.reticleFit
              ? `${fmt.n(r.areaMm, 1)} mm² — fits the ${RETICLE.x}×${RETICLE.y} mm reticle field.`
              : `${fmt.n(r.areaMm, 1)} mm² exceeds the ${RETICLE.area} mm² reticle field. This part cannot be one die — it has to be chiplets.`} />

          <Slider label="Defect density D₀" value={cfg.d0} set={(v) => patch({ d0: v, preset: '' })} min={0.01} max={1} step={0.01} unit=" /cm²"
            hint="A mature leading-edge line runs about 0.05–0.10. A new node starts several times higher and comes down over quarters." />

          <Slider label="Edge exclusion" value={cfg.edgeExclusion} set={(v) => patch({ edgeExclusion: v })} min={0} max={10} step={0.5} unit=" mm"
            hint="A ring at the wafer edge where uniformity cannot be held. Nothing there is countable." />

          <Slider label="Scribe lane" value={cfg.scribe} set={(v) => patch({ scribe: v })} min={0.04} max={0.2} step={0.01} unit=" mm"
            hint="The alley the dicing blade or laser runs down, plus the test structures that live in it." />

          <div className="ctl">
            <label><span>Yield model</span></label>
            <select value={cfg.model} onChange={(e) => patch({ model: e.target.value })}>
              {models.map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
            <div className="hint" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginTop: 6 }}>{r.modelMeta.formula}</div>
            <div className="hint">{r.modelMeta.note}</div>
          </div>

          {cfg.model === 'negbinom' && (
            <Slider label="Clustering α" value={cfg.alpha} set={(v) => patch({ alpha: v })} min={0.5} max={10} step={0.5}
              hint="Low α means heavily clustered defects and a higher yield than Poisson would predict. High α converges on Poisson." />
          )}

          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn sm" onClick={() => patch({ clustered: !cfg.clustered })}>
              {cfg.clustered ? '◉ Clustered defects' : '○ Uniform defects'}
            </button>
            <button className="btn sm" onClick={() => patch({ seed: Math.floor(Math.random() * 9999) })}>
              ⟳ New wafer
            </button>
          </div>
        </div>
      </div>

      <h2 className="sec">The same wafer, through four models</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '62ch' }}>
        Identical die area and identical defect density. The spread between these is not academic —
        pick Poisson for a 600 mm² part and you will conclude the product is impossible.
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Model</th><th>Formula</th><th>Yield</th><th>Good dies</th><th style={{ width: '32%' }}>What it assumes</th></tr>
          </thead>
          <tbody>
            {models.map(([k, m]) => {
              const y = Math.max(0, Math.min(1, m.fn(r.areaCm, cfg.d0, cfg.alpha)))
              return (
                <tr key={k} style={k === cfg.model ? { background: 'var(--panel2)' } : undefined}>
                  <td><b>{m.label}</b>{k === cfg.model && <span className="badge on" style={{ marginLeft: 8 }}>in use</span>}</td>
                  <td className="num" style={{ color: 'var(--muted)' }}>{m.formula}</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{fmt.pct(y)}</td>
                  <td className="num">{fmt.n(r.geo.gross * y)}</td>
                  <td className="small">{m.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="sec">Why area is the cruellest variable</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Die</th><th>Area</th><th>Gross dies</th><th>Yield</th><th>Good dies</th><th style={{ width: 140 }}>Relative output</th></tr></thead>
          <tbody>
            {[4, 8, 12, 16, 20, 24].map((s) => {
              const rr = computeRun({ ...cfg, dieX: s, dieY: s, preset: '' })
              const base = computeRun({ ...cfg, dieX: 4, dieY: 4, preset: '' })
              const pct = base.goodDies > 0 ? rr.goodDies / base.goodDies : 0
              return (
                <tr key={s}>
                  <td className="num">{s} × {s} mm</td>
                  <td className="num">{s * s} mm²</td>
                  <td className="num">{fmt.n(rr.geo.gross)}</td>
                  <td className="num">{fmt.pct(rr.dieYield)}</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{fmt.n(rr.goodDies)}</td>
                  <td><div className="bar"><i style={{ width: `${Math.min(100, pct * 100)}%` }} /></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Six times the area does not cost you six times the dies. It costs you the area and the yield
        together, and the two multiply. Splitting one large die into four small ones and wiring them
        together in the package is not a packaging trick — it is arithmetic.
      </p>
    </div>
  )
}
