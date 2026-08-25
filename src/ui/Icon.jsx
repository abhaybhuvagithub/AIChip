import React from 'react'

// A drawn icon set for chips, packages, IP blocks and the industry layers.
//
// Line art on a 24×24 grid, stroked in `currentColor`, so an icon inherits
// whatever colour it sits in — accent, muted, a maker's hue, a bin colour —
// and works in every palette and both modes without a second asset. That is
// the whole reason for drawing these rather than reaching for an icon font or
// emoji: emoji carry their own colours and their own cultural baggage, and a
// font is a network request for glyphs that were never designed for silicon.
//
// The grammar is consistent so the set reads as one family:
//   • a chip is a rounded square with connections on its edges
//   • what a chip DOES is shown by what fills it
//   • an IP block is a dashed outline — it is a licensed drawing, not a part
//   • industry layers are drawn as the object that layer actually handles

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
const F = { fill: 'currentColor', stroke: 'none' }

/** Pins along an edge — the thing that makes a square read as a chip. */
const pins = (side, n = 3, len = 2.5) => {
  const out = []
  for (let i = 0; i < n; i++) {
    const t = 7 + (i * 10) / Math.max(1, n - 1)
    if (side === 'l') out.push(<line key={`l${i}`} x1={6 - len} y1={t} x2="6" y2={t} />)
    if (side === 'r') out.push(<line key={`r${i}`} x1="18" y1={t} x2={18 + len} y2={t} />)
    if (side === 't') out.push(<line key={`t${i}`} x1={t} y1={6 - len} x2={t} y2="6" />)
    if (side === 'b') out.push(<line key={`b${i}`} x1={t} y1="18" x2={t} y2={18 + len} />)
  }
  return out
}
const body = (r = 2) => <rect x="6" y="6" width="12" height="12" rx={r} />
const allPins = () => <>{pins('l')}{pins('r')}{pins('t')}{pins('b')}</>

export const ICONS = {
  // ---------------------------------------------------------- packages --
  die: (<>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M4 8 L8 4" />
  </>),
  qfp: (<>{body()}{allPins()}</>),
  bga: (<>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    {[8, 12, 16].flatMap((x) => [8, 12, 16].map((y) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" {...F} />
    )))}
  </>),
  chiplet: (<>
    <rect x="2.5" y="7" width="19" height="10" rx="1.5" />
    <rect x="5" y="9.5" width="6" height="5" rx="0.8" />
    <rect x="13" y="9.5" width="6" height="5" rx="0.8" />
    <line x1="11" y1="12" x2="13" y2="12" />
  </>),
  stack: (<>
    <rect x="5" y="14.5" width="14" height="4" rx="1" />
    <rect x="6" y="10.5" width="12" height="3.5" rx="1" />
    <rect x="7" y="6.5" width="10" height="3.5" rx="1" />
    <line x1="12" y1="6.5" x2="12" y2="18.5" strokeDasharray="1.5 1.5" />
  </>),
  interposer: (<>
    <rect x="2.5" y="13" width="19" height="5" rx="1" />
    <rect x="4.5" y="6.5" width="7" height="6" rx="1" />
    <rect x="13" y="6.5" width="6.5" height="6" rx="1" />
    {[6, 9, 15, 17.5].map((x) => <line key={x} x1={x} y1="12.5" x2={x} y2="13" />)}
  </>),
  wafer: (<>
    <circle cx="12" cy="12" r="9" />
    <path d="M10.4 20.9 A9 9 0 0 0 13.6 20.9 L12 18.2 Z" />
    <path d="M7 7 h4 v4 h-4 z M13 7 h4 v4 h-4 z M7 13 h4 v4 h-4 z M13 13 h4 v4 h-4 z" />
  </>),
  waferscale: (<>
    <circle cx="12" cy="12" r="9" />
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <path d="M9 6 v12 M15 6 v12 M6 9 h12 M6 15 h12" strokeWidth="0.8" />
  </>),

  // -------------------------------------------------------- what it is --
  cpu: (<>{body()}{allPins()}<rect x="9" y="9" width="6" height="6" rx="0.8" /></>),
  gpu: (<>{body()}{allPins()}
    {[8.5, 11, 13.5].flatMap((x) => [8.5, 11, 13.5].map((y) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" rx="0.3" {...F} />
    )))}
  </>),
  npu: (<>{body()}{allPins()}
    <path d="M8.5 8.5 h7 v7 h-7 z" strokeWidth="1" />
    <path d="M11 8.5 v7 M13 8.5 v7 M8.5 11 h7 M8.5 13 h7" strokeWidth="0.7" />
  </>),
  soc: (<>{body()}{allPins()}
    <rect x="8.5" y="8.5" width="3.5" height="3.5" rx="0.4" />
    <rect x="13" y="8.5" width="2.5" height="2" rx="0.4" />
    <rect x="8.5" y="13" width="2" height="2.5" rx="0.4" />
    <rect x="11.5" y="12.5" width="4" height="3" rx="0.4" />
  </>),
  mcu: (<>
    <rect x="8" y="8" width="8" height="8" rx="1.5" />
    {pins('l', 2, 2)}{pins('r', 2, 2)}
    <rect x="10.5" y="10.5" width="3" height="3" rx="0.5" />
  </>),
  dram: (<>{body()}{pins('l')}{pins('r')}
    <path d="M8.5 9.5 h7 M8.5 12 h7 M8.5 14.5 h7" strokeWidth="1.1" />
  </>),
  nand: (<>
    <rect x="6" y="5" width="12" height="2.4" rx="0.6" />
    <rect x="6" y="8.2" width="12" height="2.4" rx="0.6" />
    <rect x="6" y="11.4" width="12" height="2.4" rx="0.6" />
    <rect x="6" y="14.6" width="12" height="2.4" rx="0.6" />
    <line x1="12" y1="4" x2="12" y2="18" strokeDasharray="1.5 1.5" />
  </>),
  power: (<>{body()}
    {pins('l', 2, 3.2)}{pins('r', 2, 3.2)}
    <path d="M12.8 8.5 L10 12.3 h2.2 L11.4 15.6 L14.2 11.6 h-2.2 z" {...F} />
  </>),

  // -------------------------------------------------------------- IP --
  // Dashed outline throughout: an IP block is a licensed drawing, not silicon.
  ipcore: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <rect x="8.5" y="9.5" width="7" height="5" rx="0.8" />
    <path d="M7 9.5 v5 M17 9.5 v5" strokeWidth="1" />
  </>),
  ipgpu: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    {[8, 10.5, 13, 15.5].map((x) => <rect key={x} x={x} y="9.5" width="1.6" height="5" rx="0.3" {...F} />)}
  </>),
  ipnpu: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <path d="M8 9.5 h8 v5 h-8 z" strokeWidth="1" />
    <path d="M10.7 9.5 v5 M13.3 9.5 v5 M8 12 h8" strokeWidth="0.7" />
  </>),
  ipdsp: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <path d="M7 12 q1.6 -4 3.2 0 t3.2 0 t3.2 0" strokeWidth="1.2" />
  </>),
  ipmem: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <path d="M8 9.5 h8 M8 12 h8 M8 14.5 h8" strokeWidth="1.1" />
    <path d="M10 8 v8" strokeWidth="0.7" />
  </>),
  ipphy: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <path d="M7.5 12 h2 l1.5 -3 l2 6 l1.5 -3 h2" strokeWidth="1.2" />
  </>),
  ipnoc: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    {[8, 12, 16].flatMap((x) => [9.5, 14.5].map((y) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" {...F} />
    )))}
    <path d="M8 9.5 h8 M8 14.5 h8 M8 9.5 v5 M12 9.5 v5 M16 9.5 v5" strokeWidth="0.7" />
  </>),
  ipsec: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <rect x="9.5" y="11.5" width="5" height="4" rx="0.7" />
    <path d="M10.7 11.5 v-1.4 a1.3 1.3 0 0 1 2.6 0 v1.4" strokeWidth="1.1" />
  </>),
  ippll: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <path d="M7.5 14 v-4 h2.2 v4 h2.2 v-4 h2.2 v4 h2.4" strokeWidth="1.2" />
  </>),
  ipisp: (<>
    <rect x="4" y="6" width="16" height="12" rx="1.5" strokeDasharray="2.5 2" />
    <circle cx="12" cy="12" r="2.6" />
    <circle cx="12" cy="12" r="0.9" {...F} />
  </>),
  iplicense: (<>
    <path d="M6.5 3.5 h8 l3 3 v14 h-11 z" />
    <path d="M14.5 3.5 v3 h3" />
    <circle cx="12" cy="14" r="2.4" />
    <path d="M10.4 16 l-0.6 3 l2.2 -1.2 l2.2 1.2 l-0.6 -3" />
  </>),

  // ------------------------------------------------------- industry --
  eda: (<>
    <rect x="3" y="5" width="18" height="12" rx="1.5" />
    <path d="M9 21 h6 M12 17 v4" />
    <path d="M6 12.5 h2 v-3 h2.4 v5 h2.4 v-4 h2.2 v2 h1.5" strokeWidth="1.1" />
  </>),
  foundry: (<>
    <path d="M3 20 v-8 l4.5 3 v-3 l4.5 3 v-3 l4.5 3 V6 h4.5 v14 z" />
    <path d="M17.5 3 v3" strokeWidth="1.1" />
  </>),
  equipment: (<>
    <rect x="4" y="3.5" width="16" height="7" rx="1.5" />
    <path d="M12 10.5 v3" />
    <path d="M8 13.5 h8 l-1.5 2.5 h-5 z" />
    <ellipse cx="12" cy="18.5" rx="6.5" ry="2" />
  </>),
  materials: (<>
    <path d="M9 3.5 h6 v13 a3 3 0 0 1 -6 0 z" />
    <ellipse cx="12" cy="3.5" rx="3" ry="1.2" />
    <path d="M9 9 h6" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
  </>),
  osat: (<>
    <rect x="3" y="12" width="12" height="8" rx="1.5" />
    {[6, 9, 12].map((x) => <line key={x} x1={x} y1="20" x2={x} y2="22" />)}
    <path d="M19 3.5 v7 l-2 2.5" />
    <circle cx="19" cy="3" r="1.2" {...F} />
  </>),
  fabless: (<>
    <rect x="3" y="5" width="18" height="12" rx="1.5" />
    <path d="M9 21 h6 M12 17 v4" />
    <rect x="9" y="8.5" width="6" height="5" rx="0.8" />
    {[9, 15].map((x) => <line key={x} x1={x === 9 ? 7.5 : 15} y1="11" x2={x === 9 ? 9 : 16.5} y2="11" />)}
  </>),
}

export const ICON_NAMES = Object.keys(ICONS)

/**
 * @param name  key from ICONS
 * @param size  pixel box; the stroke does not scale, which keeps small icons
 *              legible rather than spidery
 */
export default function Icon({ name, size = 20, title, style, className }) {
  const glyph = ICONS[name]
  if (!glyph) return null
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size}
      className={className}
      style={{ flex: '0 0 auto', verticalAlign: '-0.15em', ...style }}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      {...S}
    >
      {title && <title>{title}</title>}
      {glyph}
    </svg>
  )
}
