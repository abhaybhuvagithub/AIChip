import React, { useMemo, useState } from 'react'
import { SILICON, MAKERS, CATEGORIES, COUNTED } from '../data/silicon.js'
import { computeRun, fmt, RETICLE } from '../lib/fab.js'
import { ops } from '../lib/compute.js'
import Icon from './Icon.jsx'

const density = (s) => (s.transistors > 0 && s.areaMm2 > 0 ? s.transistors / 1e6 / (s.areaMm2 * (s.dies || 1)) : 0)
const totalArea = (s) => s.areaMm2 * (s.dies || 1)

/**
 * Every part drawn at true relative area on the same 300 mm wafer.
 *
 * This is the point of the tab. A phone SoC and a wafer-scale engine are both
 * "a chip", and no table makes the four-hundred-fold difference land the way
 * putting them side by side at scale does.
 */
function ToScale({ parts, sel, onPick }) {
  const R = 150
  const [hover, setHover] = useState(null)

  // Every die is drawn concentric at the origin, which is the correct way to
  // compare areas — and a trap. SVG paints in document order, so whatever came
  // last in the data sat on top and swallowed every click regardless of where
  // you aimed. Painting LARGEST FIRST makes each part's visible ring its own
  // hit area and every part reachable, which is what the nesting implies.
  const known = parts
    .filter((p) => p.areaKnown !== false && p.areaMm2 > 0)
    .sort((a, b) => totalArea(b) - totalArea(a))

  const active = hover || sel
  const activePart = known.find((p) => p.id === active)

  return (
    <svg viewBox="-170 -178 340 356" width="100%" height="auto" style={{ maxHeight: '58vh' }}
      role="img" aria-label="Die sizes drawn to scale on a 300 mm wafer">
      <circle cx="0" cy="0" r={R} fill="var(--panel)" fillOpacity=".45" stroke="var(--border)" strokeWidth="1.2" />
      <rect x={-RETICLE.x / 2} y={-RETICLE.y / 2} width={RETICLE.x} height={RETICLE.y}
        fill="none" stroke="var(--muted)" strokeOpacity=".5" strokeWidth=".6" strokeDasharray="2 2" />

      {known.map((p) => {
        // Square of the same total area — width and height are almost never
        // published, and area is what governs dies per wafer anyway.
        const side = Math.sqrt(totalArea(p))
        const on = sel === p.id
        const hot = hover === p.id
        return (
          <g
            key={p.id}
            onClick={() => onPick(p.id)}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover((h) => (h === p.id ? null : h))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p.id) } }}
            tabIndex={0}
            role="button"
            aria-label={`${p.name}, ${fmt.n(totalArea(p))} square millimetres`}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <rect x={-side / 2} y={-side / 2} width={side} height={side} rx={side > 40 ? 3 : 1}
              fill={MAKERS[p.maker].hue}
              fillOpacity={on ? 0.36 : hot ? 0.2 : 0.07}
              stroke={MAKERS[p.maker].hue}
              strokeOpacity={on ? 1 : hot ? 0.85 : 0.4}
              strokeWidth={on ? 1.8 : hot ? 1.2 : 0.6} />
          </g>
        )
      })}

      {/* Name whatever is under the cursor, so the nesting is readable rather
          than a stack of anonymous squares. */}
      {activePart && (
        <text x="0" y={-R - 8} textAnchor="middle" fill={MAKERS[activePart.maker].hue}
          style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>
          {activePart.name} · {fmt.n(totalArea(activePart))} mm²
        </text>
      )}
      <text x="0" y={-RETICLE.y / 2 - 4} textAnchor="middle" fill="var(--muted)"
        style={{ fontSize: 7.5, fontFamily: 'var(--font-mono)' }}>reticle field</text>
      <text x="0" y={R + 14} textAnchor="middle" fill="var(--muted)"
        style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)' }}>300 mm wafer</text>
    </svg>
  )
}

export default function Silicon({ cfg, patch, goTab }) {
  const [maker, setMaker] = useState('all')
  const [sel, setSel] = useState('h100')

  const parts = useMemo(
    () => SILICON.filter((s) => maker === 'all' || s.maker === maker),
    [maker]
  )
  const s = parts.find((x) => x.id === sel) || parts[0] || SILICON[0]

  // Keep the selection inside the current filter, and do it where the filter
  // changes rather than in an effect reacting to it. Choosing "Apple" while an
  // NVIDIA part was selected used to leave the detail card contradicting the
  // table above it.
  const pickMaker = (k) => {
    setMaker(k)
    const next = SILICON.filter((x) => k === 'all' || x.maker === k)
    if (next.length && !next.some((x) => x.id === sel)) setSel(next[0].id)
  }
  const area = totalArea(s)
  const d = density(s)
  const canLoad = s.areaKnown !== false && s.areaMm2 > 0

  // What the site's own model says about this part, if it can be loaded.
  const side = canLoad ? Math.sqrt(s.areaMm2) : 0
  const run = canLoad ? computeRun({ ...cfg, dieX: side, dieY: side, preset: '' }) : null

  const load = () => {
    if (!canLoad) return
    patch({
      dieX: +side.toFixed(2), dieY: +side.toFixed(2), preset: '',
      compute: { ...(cfg.compute || {}), density: d > 0 ? Math.round(d) : 135 },
    })
    goTab('wafer')
  }

  const maxTr = Math.max(...COUNTED.map((c) => c.transistors))
  const minTr = Math.min(...COUNTED.map((c) => c.transistors))

  return (
    <div>
      <div className="eyebrow">Silicon</div>
      <h1 className="title">Real parts, drawn to scale,<br />on one wafer.</h1>
      <p className="lede">
        Everything else on this site is a model. These are the things the model is about — from a
        phone SoC you could hide under a fingernail to a chip that is an entire wafer. Pick any of
        them and load its geometry into the yield lab.
      </p>

      <div className="row" style={{ margin: '18px 0 14px' }}>
        <button className={`btn ${maker === 'all' ? 'active' : ''}`} onClick={() => pickMaker('all')}>All</button>
        {Object.entries(MAKERS).map(([k, m]) => (
          <button key={k} className={`btn ${maker === k ? 'active' : ''}`} onClick={() => pickMaker(k)}>{m.name}</button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,380px)' }}>
        <div className="wafer-stage">
          <ToScale parts={parts} sel={sel} onPick={setSel} />
          <div className="wafer-legend">
            {Object.entries(MAKERS).map(([k, m]) => (
              <span key={k}><i style={{ background: m.hue }} />{m.name}</span>
            ))}
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="eyebrow" style={{ margin: 0, color: MAKERS[s.maker].hue }}>
              {MAKERS[s.maker].name} · {s.year}
            </div>
            <span className="badge">{CATEGORIES[s.cat]}</span>
          </div>
          <h3 className="iconrow" style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-.02em', marginTop: 6 }}>
            <Icon name={s.icon} size={30} style={{ color: MAKERS[s.maker].hue }} title={s.name} />
            {s.name}
          </h3>
          <div style={{ color: MAKERS[s.maker].hue, fontSize: 17, margin: '4px 0 12px' }}>{s.notable}</div>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>{s.what}</p>

          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Made by</dt><dd>{s.foundry} · {s.node}</dd>
            <dt>Die area</dt>
            <dd>
              {s.areaKnown === false
                ? 'Not disclosed'
                : `${fmt.n(s.areaMm2)} mm²${s.dies > 1 ? ` × ${s.dies} dies = ${fmt.n(area)} mm²` : ''}`}
              {s.est && s.areaKnown !== false && <span className="badge" style={{ marginLeft: 8 }}>estimate</span>}
            </dd>
            <dt>Transistors</dt>
            <dd>{s.transistors > 0
              ? s.transistors >= 1e12 ? `${fmt.n(s.transistors / 1e12, 1)} trillion` : `${fmt.n(s.transistors / 1e9, 1)} billion`
              : 'Not disclosed'}</dd>
            {d > 0 && <><dt>Density</dt><dd>{fmt.n(d, 0)} MTr/mm²</dd></>}
            {s.power > 0 && <><dt>Power</dt><dd>{s.power >= 1000 ? `${fmt.n(s.power / 1000, 1)} kW` : `${fmt.n(s.power)} W`}</dd></>}
            {s.tops > 0 && <><dt>Throughput</dt><dd style={{ color: 'var(--accent)' }}>{ops(s.tops)} {s.precision}</dd></>}
            <dt>Against the reticle</dt>
            <dd style={{ color: s.areaMm2 > RETICLE.area ? 'var(--warn)' : 'var(--ok)' }}>
              {s.areaKnown === false ? '—'
                : s.areaMm2 > RETICLE.area
                  ? `${fmt.n(s.areaMm2 / RETICLE.area, 1)}× the ${RETICLE.area} mm² field — stitched`
                  : `${fmt.pct(s.areaMm2 / RETICLE.area, 0)} of the field`}
            </dd>
          </dl>

          {canLoad ? (
            <>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn primary" onClick={load}>Load into the yield lab</button>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>
                Loads a {side.toFixed(1)} × {side.toFixed(1)} mm square of the same area. Real dies are
                rarely square and the aspect ratio changes the count by a few percent, but area is what
                governs dies per wafer.
              </p>
              {run && (
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="badge on">{fmt.n(run.geo.gross)} per wafer</span>
                  <span className="badge">{fmt.pct(run.dieYield)} yield</span>
                  <span className="badge">{fmt.n(run.goodDies)} good</span>
                </div>
              )}
            </>
          ) : (
            <p className="hint" style={{ marginTop: 14 }}>
              {s.upcoming
                ? 'Not shipped yet — no measured die to load.'
                : 'Die area is not public for this part, so there is nothing honest to load. Pod-level throughput gets published; silicon geometry does not.'}
            </p>
          )}
        </div>
      </div>

      <h2 className="sec">All of it, in one table</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Part</th><th>Year</th><th>Foundry / node</th><th>Die area</th><th>Transistors</th><th>Density</th><th>Per wafer</th></tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const pd = density(p)
              const ok = p.areaKnown !== false && p.areaMm2 > 0
              const gross = ok ? computeRun({ ...cfg, dieX: Math.sqrt(p.areaMm2), dieY: Math.sqrt(p.areaMm2) }).geo.gross : 0
              return (
                <tr key={p.id} style={{ cursor: 'pointer', background: p.id === sel ? 'var(--panel2)' : undefined }}
                  onClick={() => setSel(p.id)}>
                  <td>
                    <b className="iconrow" style={{ color: MAKERS[p.maker].hue }}>
                      <Icon name={p.icon} size={22} title={p.name} />{p.name}
                    </b>
                    {p.dies > 1 && <span className="badge" style={{ marginLeft: 7 }}>{p.dies} dies</span>}</td>
                  <td className="num">{p.year}</td>
                  <td className="small">{p.foundry} {p.node}</td>
                  <td className="num">{ok ? `${fmt.n(totalArea(p))} mm²` : '—'}{p.est && ok ? '*' : ''}</td>
                  <td className="num">{p.transistors > 0
                    ? p.transistors >= 1e12 ? `${fmt.n(p.transistors / 1e12, 1)}T` : `${fmt.n(p.transistors / 1e9, 0)}B`
                    : '—'}</td>
                  <td className="num">{pd > 0 ? fmt.n(pd, 0) : '—'}</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{ok ? (gross > 0 ? fmt.n(gross) : '<1') : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>
        An asterisk marks an area that is a third-party die-shot measurement rather than a vendor
        figure. Apple has never published a die size; Google publishes pod throughput freely and
        silicon geometry almost never. Where nobody outside the company knows, the cell is empty
        rather than guessed.
      </p>

      <h2 className="sec">Transistor counts, on a log scale</h2>
      <div className="card">
        <div className="ladder" style={{ height: 170 }}>
          {[...COUNTED].sort((a, b) => a.year - b.year).map((c) => {
            const h = ((Math.log10(c.transistors) - Math.log10(minTr)) /
              (Math.log10(maxTr) - Math.log10(minTr))) * 92 + 8
            return (
              <div key={c.id} className={`rung ${c.id === sel ? 'on' : ''}`} title={`${c.name} (${c.year})`}
                onClick={() => setSel(c.id)} style={{ cursor: 'pointer' }}>
                <div className="rung-bar" style={{ height: `${h}%`, background: c.id === sel ? undefined : MAKERS[c.maker].hue, opacity: c.id === sel ? 1 : 0.45 }} />
                <div className="rung-lbl">{c.year}</div>
              </div>
            )
          })}
        </div>
        <p className="small" style={{ marginTop: 10 }}>
          Logarithmic, and it still runs off the top. From 6.5 billion on a Ryzen compute die to four
          trillion on a wafer-scale engine is a factor of six hundred — and the wafer-scale part gets
          there not by density but by refusing to dice the wafer.
        </p>
      </div>

      <h2 className="sec">Three answers to the same wall</h2>
      <div className="grid g3">
        <div className="card">
          <div className="eyebrow">Chiplets</div>
          <p className="small" style={{ marginTop: 8 }}>
            Keep each die small so it yields, then assemble in the package. AMD's MI300X puts thirteen
            pieces of silicon on two different nodes into one part; Apple bonds two dies and calls it
            one chip. The yield lab shows why: area punishes you twice.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">Two reticle dies</div>
          <p className="small" style={{ marginTop: 8 }}>
            Build the largest die the scanner can print, then put two of them in a package and present
            them as one device. Blackwell and Rubin both do this. It is the least disruptive answer,
            and it doubles rather than multiplies.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">Stitch the wafer</div>
          <p className="small" style={{ marginTop: 8 }}>
            Print overlapping reticle fields and route signals across what would be a scribe lane, so
            the wafer never gets diced. Cerebras does this, and it only works because defective cores
            are routed around — no conventional yield model survives a 46,000 mm² die.
          </p>
        </div>
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '62ch' }}>
        Figures gathered from vendor announcements and public reporting through mid-2026. Vendors
        count transistors differently and die-shot measurements carry their own error, so read the
        rankings rather than the digits.
      </p>
    </div>
  )
}
