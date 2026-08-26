import React, { useMemo, useState } from 'react'
import {
  NODES, LAYERS, QUESTIONS, node, ancestry, descendants, principalPath, reach, roots,
} from '../data/trace.js'

const layerOf = (id) => LAYERS.find((l) => l.id === node(id).layer)

/**
 * The layered map. Every fact on the site, arranged by how far it is from
 * nature, with the traced chain lit up through it.
 *
 * This is the signature element and it is deliberately not a force-directed
 * graph. A hairball is impressive and unreadable; strata are legible and make
 * the actual claim — that causes flow one way, from constants outward.
 */
function Strata({ sel, up, down, onPick }) {
  const rows = LAYERS.map((l) => ({ ...l, nodes: NODES.filter((n) => n.layer === l.id) }))
  const W = 900
  const rowH = 62
  const H = rows.length * rowH + 16

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H * 0.86} role="img"
      aria-label="All facts arranged by distance from first principles, with the traced chain highlighted">
      {rows.map((r, ri) => {
        const y = 20 + ri * rowH
        const cw = (W - 150) / Math.max(1, r.nodes.length)
        return (
          <g key={r.id}>
            <text x="8" y={y + 5} fill={r.hue} style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>
              {r.label}
            </text>
            {r.nodes.map((n, i) => {
              const x = 140 + i * cw + cw / 2
              const isSel = n.id === sel
              const isUp = up.includes(n.id) && !isSel
              const isDown = down.includes(n.id)
              const lit = isSel || isUp || isDown
              return (
                <g key={n.id} onClick={() => onPick(n.id)} style={{ cursor: 'pointer' }}
                  tabIndex={0} role="button" aria-label={n.label}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(n.id) } }}>
                  <title>{n.label}</title>
                  <circle cx={x} cy={y} r={isSel ? 8 : lit ? 5.5 : 3.4}
                    fill={r.hue}
                    fillOpacity={isSel ? 1 : isUp ? 0.85 : isDown ? 0.4 : 0.16}
                    stroke={r.hue} strokeOpacity={lit ? 1 : 0.25}
                    strokeWidth={isSel ? 2.5 : 1} />
                </g>
              )
            })}
          </g>
        )
      })}
      {/* Edges of the traced chain only. Drawing all 90 would be the hairball
          this layout exists to avoid. */}
      {up.map((id, i) => {
        if (i === 0) return null
        const a = up[i - 1], b = id
        const pos = (nid) => {
          const l = LAYERS.findIndex((x) => x.id === node(nid).layer)
          const peers = NODES.filter((n) => n.layer === node(nid).layer)
          const idx = peers.findIndex((n) => n.id === nid)
          const cw = (W - 150) / Math.max(1, peers.length)
          return [140 + idx * cw + cw / 2, 20 + l * rowH]
        }
        const [x1, y1] = pos(a), [x2, y2] = pos(b)
        return <path key={`${a}-${b}`} d={`M${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
          fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeOpacity=".7" />
      })}
    </svg>
  )
}

export default function Trace({ goTab }) {
  const [sel, setSel] = useState('multicore')

  const chain = useMemo(() => principalPath(sel), [sel])
  const up = useMemo(() => ancestry(sel), [sel])
  const down = useMemo(() => descendants(sel), [sel])

  const rootReach = useMemo(() => roots()
    .map((r) => ({ id: r, label: node(r).label, n: reach(r) }))
    .sort((a, b) => b.n - a.n), [])

  return (
    <div>
      <div className="eyebrow">Trace</div>
      <h1 className="title">Everything here is downstream<br />of about a dozen numbers.</h1>
      <p className="lede">
        Fifteen tabs on this site answer fifteen questions, which makes them look like fifteen
        separate facts. They are not. The number of cores in your laptop, the existence of chiplets,
        the fact that one company on Earth makes EUV scanners and the reason most chips avoid the
        newest node are all consequences — and if you walk any of them backwards far enough you
        arrive at constants of nature and a few accidents of chemistry. Pick one and walk it back.
      </p>

      <h2 className="sec">Start with a question</h2>
      <div className="trace-qs">
        {QUESTIONS.map((q) => (
          <button key={q.node} className={`trace-q ${sel === q.node ? 'on' : ''}`} onClick={() => setSel(q.node)}>
            {q.q}
          </button>
        ))}
      </div>

      <h2 className="sec">Because…</h2>
      <div className="trace-chain">
        {chain.map((id, i) => {
          const c = node(id)
          const l = layerOf(id)
          const last = i === chain.length - 1
          return (
            <div key={id} className={`trace-step ${last ? 'end' : ''}`} onClick={() => setSel(id)}>
              <div className="trace-rail">
                <span className="trace-dot" style={{ background: l.hue }} />
                {!last && <span className="trace-line" />}
              </div>
              <div className="trace-body">
                <div className="trace-layer" style={{ color: l.hue }}>{l.label}</div>
                <div className="trace-label">{c.label}</div>
                <p className="trace-note">{c.note}</p>
                {c.tab && (
                  <button className="btn sm" onClick={(e) => { e.stopPropagation(); goTab(c.tab) }}>
                    See the {c.tab} tab →
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="small" style={{ marginTop: 12, maxWidth: '68ch' }}>
        This is the longest chain to that fact, not the shortest — when the question is <i>why</i>,
        the fullest explanation is the right answer rather than the tersest. There are{' '}
        <b>{up.length - 1}</b> facts upstream of this one in total, and{' '}
        <b>{down.length}</b> downstream of it.
      </p>

      {down.length > 0 && (
        <>
          <h2 className="sec">…and here is what follows from it</h2>
          <div className="row" style={{ gap: 7 }}>
            {down.map((id) => (
              <button key={id} className="btn sm" onClick={() => setSel(id)}
                style={{ color: layerOf(id).hue, borderColor: layerOf(id).hue }}>
                {node(id).label}
              </button>
            ))}
          </div>
        </>
      )}

      <h2 className="sec">The whole graph</h2>
      <div className="card">
        <Strata sel={sel} up={up} down={down} onPick={setSel} />
        <p className="small" style={{ marginTop: 6 }}>
          {NODES.length} facts, arranged by distance from first principles. Causes flow downward and
          never back — this is a strict hierarchy, not a web, and a verify check enforces it. The lit
          path is what you selected; the dimmer points below it are its consequences.
        </p>
      </div>

      <h2 className="sec">How far each constant reaches</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>First principle</th><th>Facts downstream</th><th style={{ width: 220 }}>Share of the graph</th><th style={{ width: '34%' }}>What it is</th></tr></thead>
          <tbody>
            {rootReach.map((r) => (
              <tr key={r.id} style={{ cursor: 'pointer', background: r.id === sel ? 'var(--panel2)' : undefined }}
                onClick={() => setSel(r.id)}>
                <td><b style={{ color: layerOf(r.id).hue }}>{r.label}</b></td>
                <td className="num" style={{ color: 'var(--accent)' }}>{r.n}</td>
                <td><div className="bar"><i style={{ width: `${(r.n / NODES.length) * 100}%` }} /></div></td>
                <td className="small">{node(r.id).note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Boltzmann's constant sits upstream of {reach('boltzmann')} of the {NODES.length} facts here —
        more than half. It is not a metaphor: the reason your processor has many cores rather than one
        fast one is a chain of eight steps that begins with the width of a thermal energy
        distribution, and every link in it is on this site with the arithmetic attached.
      </p>

      <div className="card" style={{ marginTop: 18, borderColor: 'var(--accent)' }}>
        <div className="eyebrow">What this graph is not</div>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          It is an argument, not a proof. Real causation in a field this size is a thicket — there are
          contingencies here that could have gone another way, and edges a specialist would draw
          differently. What it does claim is narrower and, I think, defensible: that these facts are
          connected, that the direction of the connection runs from physics outward rather than the
          reverse, and that a surprising amount of what looks like commercial or political history is
          a consequence of a small number of things nobody chose.
        </p>
      </div>
    </div>
  )
}
