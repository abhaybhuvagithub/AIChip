import React, { useMemo, useState } from 'react'
import WaferMap from './WaferMap.jsx'
import { computeRun, YIELD_MODELS, RETICLE, WAFERS, layoutDies, scatterDefects, killDies, fmt } from '../lib/fab.js'
import { dieFrequencies, binWafer, histogram, worstPathPenalty, BINS, REF_AREA_MM2 } from '../lib/binning.js'
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

/** Fmax distribution across the wafer, with the bin edges drawn on it. */
function SpeedHistogram({ hist, fBase }) {
  const W = 620, H = 170, PB = 34, PL = 34
  if (!hist.bins.length) return null
  const bw = (W - PL - 14) / hist.bins.length
  const x = (f) => PL + ((f - hist.lo) / (hist.hi - hist.lo || 1)) * (W - PL - 14)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="185" role="img"
      aria-label="Distribution of maximum clock frequency across the wafer">
      {hist.bins.map((n, i) => {
        const f = hist.lo + ((i + 0.5) / hist.bins.length) * (hist.hi - hist.lo)
        const b = BINS.find((z) => f / fBase >= z.min)
        const h = (n / hist.peak) * (H - PB - 20)
        return (
          <rect key={i} x={PL + i * bw + 0.5} y={H - PB - h} width={Math.max(1, bw - 1)} height={h}
            fill={b ? b.hue : 'var(--muted)'} opacity={b ? 0.75 : 0.3} />
        )
      })}
      {BINS.map((b) => {
        const f = b.min * fBase
        if (f < hist.lo || f > hist.hi) return null
        return (
          <g key={b.id}>
            <line x1={x(f)} y1={12} x2={x(f)} y2={H - PB} stroke={b.hue} strokeWidth="1.4" strokeDasharray="4 3" />
            <text x={x(f) + 4} y={20} fill={b.hue} style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{b.label}</text>
          </g>
        )
      })}
      <line x1={PL} y1={H - PB} x2={W - 14} y2={H - PB} stroke="var(--border)" />
      {[0, 0.5, 1].map((p) => {
        const f = hist.lo + p * (hist.hi - hist.lo)
        return <text key={p} x={x(f)} y={H - PB + 20} textAnchor="middle" fill="var(--muted)"
          style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{f.toFixed(2)} GHz</text>
      })}
    </svg>
  )
}

export default function YieldLab({ cfg, patch }) {
  const r = computeRun(cfg)
  const models = Object.entries(YIELD_MODELS)
  const [colorBy, setColorBy] = useState('defect')

  // Same layout, same seed, same defects as the map — one source of truth.
  const speed = useMemo(() => {
    const geo = layoutDies(cfg)
    const dead = killDies(geo.dies, scatterDefects({ waferDia: cfg.waferDia, d0: cfg.d0, alpha: cfg.alpha, clustered: cfg.clustered, seed: cfg.seed }))
    const freqs = dieFrequencies(geo.dies, cfg.waferDia, {
      fBase: cfg.fBase ?? 5, dieSigma: cfg.dieSigma ?? 0.035,
      radialAmp: cfg.radialAmp ?? 0.06, radialSign: cfg.radialSign ?? -1, seed: cfg.seed,
    })
    return {
      ...binWafer({ freqs, dead, fBase: cfg.fBase ?? 5, asp: cfg.asp || 0 }),
      hist: histogram(freqs, dead),
      penalty: worstPathPenalty(cfg.dieX * cfg.dieY) / worstPathPenalty(REF_AREA_MM2),
    }
  }, [cfg])
  const fBase = cfg.fBase ?? 5

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
          <div className="row" style={{ marginBottom: 8, gap: 6 }}>
            <button className={`btn sm ${colorBy === 'defect' ? 'active' : ''}`} onClick={() => setColorBy('defect')}>
              Colour by defects
            </button>
            <button className={`btn sm ${colorBy === 'speed' ? 'active' : ''}`} onClick={() => setColorBy('speed')}>
              Colour by speed bin
            </button>
          </div>
          <WaferMap cfg={cfg} clustered={cfg.clustered} seed={cfg.seed} colorBy={colorBy} />
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
              {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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

      <h2 className="sec">The same wafer, sorted by speed</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        A working die is not one product. Every die on the wafer sees slightly different processing,
        so every die has a different maximum clock — and the spread is wide enough that one design
        ships as three or four SKUs at three or four prices. Switch the map above to speed bins and
        the pattern is immediately visible: it is not random, it has a radius.
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(280px,1fr)' }}>
        <div className="card">
          <div className="eyebrow">Maximum clock across the wafer</div>
          <SpeedHistogram hist={speed.hist} fBase={fBase} />
          <div className="row" style={{ gap: 14, marginTop: 4 }}>
            <span className="small">Slowest {speed.minF.toFixed(2)} GHz</span>
            <span className="small">Median {speed.p50.toFixed(2)} GHz</span>
            <span className="small">Fastest {speed.maxF.toFixed(2)} GHz</span>
            <span className="small" style={{ color: 'var(--accent)' }}>
              Spread {fmt.pct((speed.maxF - speed.minF) / (speed.p50 || 1), 0)}
            </span>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="eyebrow">Process variation</div>
          <Slider label="Nominal clock" value={fBase} set={(v) => patch({ fBase: v })}
            min={1} max={8} step={0.1} unit=" GHz"
            hint="Where the process is centred. Bin edges are fixed fractions of this, as SKU timing specs are." />
          <Slider label="Die-to-die spread" value={(cfg.dieSigma ?? 0.035) * 100}
            set={(v) => patch({ dieSigma: v / 100 })} min={0.5} max={10} step={0.5} unit="%"
            hint="Random, roughly Gaussian. Ordinary process noise." />
          <Slider label="Centre-to-edge spread" value={(cfg.radialAmp ?? 0.06) * 100}
            set={(v) => patch({ radialAmp: v / 100 })} min={0} max={20} step={0.5} unit="%"
            hint="Systematic and repeatable — anneal profile, CMP removal rate and litho focus all vary with radius, so the same ring appears on every wafer from that tool." />
          <div className="row" style={{ marginTop: 4 }}>
            <button className="btn sm" onClick={() => patch({ radialSign: (cfg.radialSign ?? -1) * -1 })}>
              {(cfg.radialSign ?? -1) < 0 ? '◉ Edge slower' : '◉ Centre slower'}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            Within-die path count costs a further {fmt.pct(speed.penalty - 1, 2)} on this die size,
            relative to a {REF_AREA_MM2} mm² reference. A die's clock is set by its slowest critical
            path, and the worst of N samples sits about √(2·ln N) deviations out — so more area is
            slower, but only barely. √(ln N) grows very slowly, which is why area is brutal for yield
            and nearly harmless here.
          </p>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead>
            <tr><th>Bin</th><th>Clocks at</th><th>Dies</th><th>Share of good</th><th>Relative price</th><th>Revenue per wafer</th><th style={{ width: 150 }}></th></tr>
          </thead>
          <tbody>
            {BINS.map((b) => {
              const n = speed.counts[b.id]
              return (
                <tr key={b.id}>
                  <td><b style={{ color: b.hue }}>{b.label}</b></td>
                  <td className="num">≥ {(b.min * fBase).toFixed(2)} GHz</td>
                  <td className="num">{fmt.n(n)}</td>
                  <td className="num">{speed.good > 0 ? fmt.pct(n / speed.good, 1) : '—'}</td>
                  <td className="num">{b.priceMult}×</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>
                    {cfg.asp > 0 ? fmt.usd(n * cfg.asp * b.priceMult) : '—'}
                  </td>
                  <td><div className="bar"><i style={{ width: `${speed.good > 0 ? (n / speed.good) * 100 : 0}%`, background: b.hue }} /></div></td>
                </tr>
              )
            })}
            <tr>
              <td><b style={{ color: 'var(--muted)' }}>Too slow to sell</b></td>
              <td className="num">&lt; {(BINS[BINS.length - 1].min * fBase).toFixed(2)} GHz</td>
              <td className="num">{fmt.n(speed.tooSlow)}</td>
              <td className="num">{speed.good > 0 ? fmt.pct(speed.tooSlow / speed.good, 1) : '—'}</td>
              <td className="num">—</td>
              <td className="num">—</td>
              <td><div className="bar"><i style={{ width: `${speed.good > 0 ? (speed.tooSlow / speed.good) * 100 : 0}%`, background: 'var(--muted)' }} /></div></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid g3" style={{ marginTop: 12 }}>
        <div className="stat hi">
          <div className="k">Blended selling price</div>
          <div className="v">{cfg.asp > 0 ? fmt.usd(speed.blendedAsp) : '—'}</div>
          <div className="sub">{cfg.asp > 0 ? `against a ${fmt.usd(cfg.asp)} standard-bin price` : 'set a price on the Economics tab'}</div>
        </div>
        <div className="stat">
          <div className="k">Revenue per wafer</div>
          <div className="v">{cfg.asp > 0 ? fmt.usd(speed.revenue) : '—'}</div>
          <div className="sub">{fmt.n(speed.sellable)} sellable dies across {BINS.length} SKUs</div>
        </div>
        <div className={`stat ${speed.binYield > 0.95 ? 'ok' : 'bad'}`}>
          <div className="k">Bin yield</div>
          <div className="v">{fmt.pct(speed.binYield)}</div>
          <div className="sub">of working dies that meet some SKU's timing</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="eyebrow">Worth trying</div>
        <p style={{ fontSize: 'var(--fs-prose)', lineHeight: 1.62, marginTop: 8 }}>
          Drag the die-to-die spread down and watch the blended price. It often gets <i>worse</i>,
          which surprises people: tightening variation around a median that sits below a bin edge
          just removes your lucky fast dies without promoting anything. Tightening only pays once the
          median is above the edge — so a fab has to centre the process and tighten it, and centring
          usually matters more. That is why "improve variation" is never the whole instruction.
        </p>
        <p className="small" style={{ marginTop: 10 }}>
          Note also which dies are slow. Raise the centre-to-edge spread and the slow ring appears
          outside the fast core — the same edge that loses partial dies and collects defects also
          clocks worst. Edge exclusion is not only about breakage.
        </p>
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
