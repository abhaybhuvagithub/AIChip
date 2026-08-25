import React, { useMemo, useState } from 'react'
import { scatterDefects, killDies, layoutDies, fmt } from '../lib/fab.js'
import { dieFrequencies, binWafer, BINS } from '../lib/binning.js'

/**
 * A real shot map, drawn to scale. Dies are placed by the same function that
 * counts them, so the picture and the number can never disagree — which was
 * the whole reason for not using a closed-form die-per-wafer approximation.
 */
export default function WaferMap({ cfg, showDefects = true, clustered = true, seed = 7, colorBy = 'defect' }) {
  const [hover, setHover] = useState(null)
  const { waferDia, dieX, dieY, scribe, edgeExclusion, d0, alpha } = cfg
  const R = waferDia / 2
  const pad = 12
  const vb = `${-(R + pad)} ${-(R + pad)} ${(R + pad) * 2} ${(R + pad) * 2}`

  const { dies, partialRects, defects, dead, bins } = useMemo(() => {
    const geo = layoutDies({ waferDia, dieX, dieY, scribe, edgeExclusion })
    // Partial dies are drawn ghosted so the edge loss is visible rather than
    // just asserted in a number.
    const all = layoutDies({ waferDia, dieX, dieY, scribe, edgeExclusion: -dieY })
    const fullKeys = new Set(geo.dies.map((d) => `${d.x.toFixed(3)},${d.y.toFixed(3)}`))
    const partials = all.dies.filter((d) => !fullKeys.has(`${d.x.toFixed(3)},${d.y.toFixed(3)}`))
    const pts = showDefects ? scatterDefects({ waferDia, d0, alpha, clustered, seed }) : []
    const dead_ = killDies(geo.dies, pts)

    // Speed comes from the same laid-out dies as everything else, so the map,
    // the die count and the bin table can never disagree about which die is
    // which.
    const freqs = dieFrequencies(geo.dies, waferDia, {
      fBase: cfg.fBase ?? 5, dieSigma: cfg.dieSigma ?? 0.035,
      radialAmp: cfg.radialAmp ?? 0.06, radialSign: cfg.radialSign ?? -1, seed,
    })
    const b = binWafer({ freqs, dead: dead_, fBase: cfg.fBase ?? 5, asp: cfg.asp || 0 })

    return { dies: geo.dies, partialRects: partials, defects: pts, dead: dead_, bins: b.perDie }
  }, [waferDia, dieX, dieY, scribe, edgeExclusion, d0, alpha, clustered, seed, showDefects,
      cfg.fBase, cfg.dieSigma, cfg.radialAmp, cfg.radialSign, cfg.asp])

  const dotR = Math.max(0.35, R / 320)

  return (
    <div className="wafer-stage">
      <svg viewBox={vb} role="img" aria-label={`Wafer map: ${dies.length} full dies, ${dead.size} killed by defects`}>
        <circle className="wafer-body" cx="0" cy="0" r={R} />
        {partialRects.map((d, i) => (
          <rect key={`p${i}`} className="die-partial" x={d.x} y={d.y} width={d.w} height={d.h} />
        ))}
        {dies.map((d, i) => {
          const isDead = dead.has(i)
          // In speed mode a dead die stays red — a defect kill outranks a
          // speed bin, and colouring it by a frequency it will never run at
          // would be a lie.
          if (colorBy === 'speed' && !isDead) {
            const b = bins[i]
            return (
              <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h}
                fill={b ? b.hue : 'var(--muted)'} fillOpacity={b ? 0.62 : 0.18}
                stroke={b ? b.hue : 'var(--muted)'} strokeOpacity={0.75} strokeWidth="0.06"
                onMouseEnter={() => setHover({ i, dead: false, bin: b })}
                onMouseLeave={() => setHover(null)} />
            )
          }
          return (
            <rect
              key={i}
              className={isDead ? 'die-dead' : 'die-good'}
              x={d.x} y={d.y} width={d.w} height={d.h}
              onMouseEnter={() => setHover({ i, dead: isDead })}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
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
        {colorBy === 'speed' ? (
          <>
            {BINS.map((b) => <span key={b.id}><i style={{ background: b.hue }} />{b.label}</span>)}
            <span><i style={{ background: 'var(--muted)', opacity: .35 }} />Too slow to sell</span>
            <span><i style={{ background: 'var(--bad)' }} />Killed by defect</span>
          </>
        ) : (
          <>
            <span><i style={{ background: 'var(--accent)', opacity: .5 }} />Good die</span>
            <span><i style={{ background: 'var(--bad)' }} />Killed by defect</span>
            <span><i style={{ background: 'var(--muted)', opacity: .35 }} />Partial — never countable</span>
          </>
        )}
        {hover && (
          <span style={{ color: 'var(--text)' }}>
            {hover.dead ? 'This die failed'
              : hover.bin ? `${hover.bin.label} bin` : colorBy === 'speed' ? 'Works, too slow to sell' : 'This die ships'}
          </span>
        )}
      </div>
      <div className="wafer-legend" style={{ left: 'auto', right: 14, bottom: 14 }}>
        <span>{fmt.n(dies.length)} full · {fmt.n(defects.length)} defects · {fmt.n(dead.size)} dead</span>
      </div>
    </div>
  )
}
