import React, { useMemo, useState } from 'react'
import { scatterDefects, killDies, layoutDies, fmt } from '../lib/fab.js'

/**
 * A real shot map, drawn to scale. Dies are placed by the same function that
 * counts them, so the picture and the number can never disagree — which was
 * the whole reason for not using a closed-form die-per-wafer approximation.
 */
export default function WaferMap({ cfg, showDefects = true, clustered = true, seed = 7 }) {
  const [hover, setHover] = useState(null)
  const { waferDia, dieX, dieY, scribe, edgeExclusion, d0, alpha } = cfg
  const R = waferDia / 2
  const pad = 12
  const vb = `${-(R + pad)} ${-(R + pad)} ${(R + pad) * 2} ${(R + pad) * 2}`

  const { dies, partialRects, defects, dead } = useMemo(() => {
    const geo = layoutDies({ waferDia, dieX, dieY, scribe, edgeExclusion })
    // Partial dies are drawn ghosted so the edge loss is visible rather than
    // just asserted in a number.
    const all = layoutDies({ waferDia, dieX, dieY, scribe, edgeExclusion: -dieY })
    const fullKeys = new Set(geo.dies.map((d) => `${d.x.toFixed(3)},${d.y.toFixed(3)}`))
    const partials = all.dies.filter((d) => !fullKeys.has(`${d.x.toFixed(3)},${d.y.toFixed(3)}`))
    const pts = showDefects ? scatterDefects({ waferDia, d0, alpha, clustered, seed }) : []
    return { dies: geo.dies, partialRects: partials, defects: pts, dead: killDies(geo.dies, pts) }
  }, [waferDia, dieX, dieY, scribe, edgeExclusion, d0, alpha, clustered, seed, showDefects])

  const dotR = Math.max(0.35, R / 320)

  return (
    <div className="wafer-stage">
      <svg viewBox={vb} role="img" aria-label={`Wafer map: ${dies.length} full dies, ${dead.size} killed by defects`}>
        <circle className="wafer-body" cx="0" cy="0" r={R} />
        {partialRects.map((d, i) => (
          <rect key={`p${i}`} className="die-partial" x={d.x} y={d.y} width={d.w} height={d.h} />
        ))}
        {dies.map((d, i) => (
          <rect
            key={i}
            className={dead.has(i) ? 'die-dead' : 'die-good'}
            x={d.x} y={d.y} width={d.w} height={d.h}
            onMouseEnter={() => setHover({ i, dead: dead.has(i) })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {defects.map(([x, y], i) => (
          <circle key={`d${i}`} className="defect" cx={x} cy={y} r={dotR} />
        ))}
        <circle className="excl-ring" cx="0" cy="0" r={Math.max(0, R - edgeExclusion)} />
        <circle className="wafer-edge" cx="0" cy="0" r={R} />
        {/* Orientation notch — every wafer has one, and it is how the tools
            know which way the crystal lattice is pointing. */}
        <path className="wafer-edge" d={`M ${-R * 0.055} ${R} A ${R} ${R} 0 0 0 ${R * 0.055} ${R} L 0 ${R * 0.945} Z`} fill="var(--bg)" />
      </svg>
      <div className="wafer-legend">
        <span><i style={{ background: 'var(--accent)', opacity: .5 }} />Good die</span>
        <span><i style={{ background: 'var(--bad)' }} />Killed by defect</span>
        <span><i style={{ background: 'var(--muted)', opacity: .35 }} />Partial — never countable</span>
        {hover && <span style={{ color: 'var(--text)' }}>{hover.dead ? 'This die failed' : 'This die ships'}</span>}
      </div>
      <div className="wafer-legend" style={{ left: 'auto', right: 14, bottom: 14 }}>
        <span>{fmt.n(dies.length)} full · {fmt.n(defects.length)} defects · {fmt.n(dead.size)} dead</span>
      </div>
    </div>
  )
}
