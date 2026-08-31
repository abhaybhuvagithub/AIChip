import React from 'react'

// A drawn icon set for semiconductors, at draughtsman's detail.
//
// The rule throughout: draw the thing as an engineer would sketch it, not as a
// pictogram. A BGA is a cross-section with substrate, die, bond wires, mould
// cap and solder balls — because that is what a BGA is, and someone who knows
// packages should recognise it instantly while someone who does not should
// still read the shape. Where a cross-section is the honest view (packages,
// transistors, stacking) these are cross-sections; where a plan view is
// (wafers, arrays) they are plan views.
//
// Everything strokes in `currentColor` on one 24×24 grid, so a single asset
// works across five palettes and both modes and can take a maker's hue or a
// speed-bin colour without a variant.
//
// The family grammar:
//   • silicon is a solid rounded rectangle
//   • substrate and organic material is a plain rectangle
//   • an IP block is dashed — it is a licensed drawing, not a part
//   • a process tool is drawn as its chamber, with what enters or leaves it

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }
const F = { fill: 'currentColor', stroke: 'none' }
const HAIR = { strokeWidth: 0.7 }
const THIN = { strokeWidth: 0.9 }

/** Repeat an element evenly across a span — bumps, balls, pins, fins, sheets. */
const rep = (n, from, to, fn) =>
  Array.from({ length: n }, (_, i) => fn(from + (i * (to - from)) / Math.max(1, n - 1), i))

/** Gull-wing leads down one side of a package body. */
const leads = (side, n = 4) =>
  rep(n, 7.5, 16.5, (t, i) => side === 'l'
    ? <path key={`l${i}`} d={`M6 ${t} h-2 v1.6`} {...THIN} />
    : <path key={`r${i}`} d={`M18 ${t} h2 v1.6`} {...THIN} />)

export const ICONS = {
  // ============================================================ PACKAGES ==
  // Bare die, plan view: seal ring inside the edge, corner notch for
  // orientation, bond pads down two sides.
  die: (<>
    <rect x="4" y="4.5" width="16" height="15" rx="1" />
    <rect x="6" y="6.5" width="12" height="11" rx="0.5" {...HAIR} />
    <path d="M4 7 L6.5 4.5" {...THIN} />
    {rep(4, 8, 16, (t, i) => <rect key={i} x={t - 0.7} y="7.4" width="1.4" height="1.2" rx="0.2" {...F} />)}
    {rep(4, 8, 16, (t, i) => <rect key={`b${i}`} x={t - 0.7} y="15.4" width="1.4" height="1.2" rx="0.2" {...F} />)}
  </>),

  // Quad flat pack, plan view: body, gull-wing leads on four sides, pin-1 dot.
  qfp: (<>
    <rect x="6" y="6" width="12" height="12" rx="1.2" />
    {leads('l')}{leads('r')}
    {rep(4, 7.5, 16.5, (t, i) => <path key={`t${i}`} d={`M${t} 6 v-2 h-1.6`} {...THIN} />)}
    {rep(4, 7.5, 16.5, (t, i) => <path key={`bb${i}`} d={`M${t} 18 v2 h-1.6`} {...THIN} />)}
    <circle cx="8.6" cy="8.6" r="0.9" {...F} />
  </>),

  // BGA, cross-section: mould cap, die, bond wires, substrate, solder balls.
  // The wires are the tell.
  bga: (<>
    <path d="M3.5 12.5 v-3 a1 1 0 0 1 1 -1 h15 a1 1 0 0 1 1 1 v3" />
    <rect x="3.5" y="12.5" width="17" height="2.6" rx="0.4" />
    <rect x="9" y="9.6" width="6" height="2.4" rx="0.4" {...THIN} />
    <path d="M9 9.8 q-2 -1.6 -3.4 -0.2 M15 9.8 q2 -1.6 3.4 -0.2" {...HAIR} />
    {rep(5, 5.5, 18.5, (t, i) => <circle key={i} cx={t} cy="16.9" r="1.5" {...F} />)}
  </>),

  // Chiplets: two dies on a substrate joined by a silicon bridge, micro-bumps
  // at the bridge and C4 balls beneath.
  chiplet: (<>
    <rect x="2.5" y="14.5" width="19" height="3" rx="0.6" />
    <rect x="4" y="9" width="7" height="5" rx="0.7" />
    <rect x="13" y="9" width="7" height="5" rx="0.7" />
    <rect x="9.5" y="13" width="5" height="1.6" rx="0.3" {...HAIR} />
    {rep(3, 5.5, 9.5, (t, i) => <circle key={`a${i}`} cx={t} cy="14.2" r="0.55" {...F} />)}
    {rep(3, 14.5, 18.5, (t, i) => <circle key={`b${i}`} cx={t} cy="14.2" r="0.55" {...F} />)}
    {rep(5, 4.5, 19.5, (t, i) => <circle key={`c${i}`} cx={t} cy="19" r="1.2" {...F} />)}
  </>),

  // 3D stack, cross-section: logic base die, four memory dies above,
  // through-silicon vias the full height, micro-bumps between each.
  stack: (<>
    <rect x="4" y="17" width="16" height="3" rx="0.6" />
    {rep(4, 14, 5, (t, i) => <rect key={i} x="5.5" y={t} width="13" height="2.2" rx="0.4" {...THIN} />)}
    <path d="M9 5 v12 M15 5 v12" {...HAIR} strokeDasharray="1.2 1" />
    {rep(4, 13.6, 4.6, (t, i) => (
      <g key={`m${i}`}>
        <circle cx="7" cy={t + 2.6} r="0.45" {...F} />
        <circle cx="17" cy={t + 2.6} r="0.45" {...F} />
      </g>
    ))}
  </>),

  // 2.5D: dies on a silicon interposer on a package substrate. Three distinct
  // bump pitches, which is the entire point of the drawing.
  interposer: (<>
    <rect x="2" y="17.5" width="20" height="2.8" rx="0.5" />
    <rect x="3.5" y="13.5" width="17" height="2.6" rx="0.4" />
    <rect x="5" y="8" width="6.5" height="5" rx="0.7" />
    <rect x="13" y="8" width="6" height="5" rx="0.7" />
    {rep(4, 5.8, 10.8, (t, i) => <circle key={`u${i}`} cx={t} cy="13.2" r="0.5" {...F} />)}
    {rep(4, 13.6, 18.6, (t, i) => <circle key={`v${i}`} cx={t} cy="13.2" r="0.5" {...F} />)}
    {rep(6, 4.5, 19.5, (t, i) => <circle key={`w${i}`} cx={t} cy="16.8" r="0.8" {...F} />)}
    <path d="M7 13.5 v2.6 M17 13.5 v2.6" {...HAIR} />
  </>),

  // Hybrid bonding: two dies face to face, copper pads fused directly. No
  // solder, no gap — drawn as a single seam.
  hybrid: (<>
    <rect x="4" y="4.5" width="16" height="6.5" rx="0.8" />
    <rect x="4" y="13" width="16" height="6.5" rx="0.8" />
    <path d="M3 12 h18" strokeWidth="1.8" />
    {rep(6, 6, 18, (t, i) => <rect key={i} x={t - 0.8} y="10.6" width="1.6" height="2.8" rx="0.3" {...F} />)}
  </>),

  // Wafer, plan view: orientation notch, die grid, edge-exclusion ring.
  wafer: (<>
    <circle cx="12" cy="12" r="9.2" />
    <circle cx="12" cy="12" r="7.4" {...HAIR} strokeDasharray="1.6 1.6" />
    <path d="M10.5 21 A9.2 9.2 0 0 0 13.5 21 L12 18.4 Z" {...THIN} />
    <path d="M6.5 8 h11 M6.5 12 h11 M6.5 16 h11 M8 6.5 v11 M12 6.5 v11 M16 6.5 v11" {...HAIR} />
  </>),

  // Wafer-scale: one die filling the wafer, reticle fields stitched across
  // their boundaries rather than diced apart.
  waferscale: (<>
    <circle cx="12" cy="12" r="9.2" />
    <rect x="5" y="5" width="14" height="14" rx="0.8" />
    <path d="M9.7 5 v14 M14.3 5 v14 M5 9.7 h14 M5 14.3 h14" {...HAIR} />
    {rep(3, 9.7, 14.3, (t, i) => <circle key={i} cx={t} cy="12" r="0.5" {...F} />)}
  </>),

  // ========================================================= WHAT IT DOES ==
  cpu: (<>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.2" />
    {leads('l', 3)}{leads('r', 3)}
    <rect x="8.5" y="8.5" width="3.2" height="3.2" rx="0.4" {...THIN} />
    <rect x="12.3" y="8.5" width="3.2" height="3.2" rx="0.4" {...THIN} />
    <rect x="8.5" y="12.3" width="3.2" height="3.2" rx="0.4" {...THIN} />
    <rect x="12.3" y="12.3" width="3.2" height="3.2" rx="0.4" {...THIN} />
    <circle cx="7.4" cy="7.4" r="0.7" {...F} />
  </>),
  gpu: (<>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.2" />
    {leads('l', 3)}{leads('r', 3)}
    {rep(4, 8.2, 14.8, (x, i) => rep(4, 8.2, 14.8, (y, j) => (
      <rect key={`${i}-${j}`} x={x - 0.75} y={y - 0.75} width="1.5" height="1.5" rx="0.2" {...F} />
    )))}
  </>),
  npu: (<>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.2" />
    {leads('l', 3)}{leads('r', 3)}
    <rect x="8" y="8" width="8" height="8" rx="0.4" {...THIN} />
    <path d="M10.6 8 v8 M13.4 8 v8 M8 10.6 h8 M8 13.4 h8" {...HAIR} />
    <path d="M8 8 l8 8" {...HAIR} />
  </>),
  soc: (<>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.2" />
    {leads('l', 3)}{leads('r', 3)}
    <rect x="7.8" y="7.8" width="4" height="4" rx="0.4" {...THIN} />
    <rect x="12.6" y="7.8" width="3.6" height="2.4" rx="0.4" {...THIN} />
    <rect x="12.6" y="11" width="3.6" height="1.8" rx="0.4" {...THIN} />
    <rect x="7.8" y="12.8" width="2.4" height="3.4" rx="0.4" {...THIN} />
    <rect x="11" y="13.6" width="5.2" height="2.6" rx="0.4" {...THIN} />
  </>),
  mcu: (<>
    <rect x="7.5" y="7.5" width="9" height="9" rx="1.2" />
    {rep(3, 9.5, 14.5, (t, i) => <path key={`l${i}`} d={`M7.5 ${t} h-2.5`} {...THIN} />)}
    {rep(3, 9.5, 14.5, (t, i) => <path key={`r${i}`} d={`M16.5 ${t} h2.5`} {...THIN} />)}
    <rect x="10" y="10" width="4" height="4" rx="0.4" {...THIN} />
    <circle cx="9" cy="9" r="0.6" {...F} />
  </>),
  dram: (<>
    <rect x="5.5" y="5.5" width="13" height="13" rx="1.2" />
    {leads('l', 3)}{leads('r', 3)}
    {rep(4, 8.2, 15.8, (t, i) => <path key={i} d={`M8 ${t} h8`} {...THIN} />)}
    <path d="M11 8 v8" {...HAIR} />
  </>),
  nand: (<>
    {rep(5, 5, 17, (t, i) => <rect key={i} x="4.5" y={t} width="15" height="2" rx="0.4" {...THIN} />)}
    <path d="M9 4 v16 M15 4 v16" {...HAIR} strokeDasharray="1.2 1" />
    <circle cx="9" cy="12" r="0.6" {...F} />
    <circle cx="15" cy="12" r="0.6" {...F} />
  </>),
  power: (<>
    <rect x="6" y="6" width="12" height="12" rx="1.2" />
    <path d="M6 9.5 h-3 M6 14.5 h-3 M18 9.5 h3 M18 14.5 h3" strokeWidth="1.9" />
    <path d="M12.9 8.2 L9.6 12.6 h2.5 l-1 3.4 L14.4 11.5 h-2.5 z" {...F} />
  </>),

  // ================================================================= IP ====
  ipcore: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <rect x="8.5" y="9" width="7" height="6" rx="0.6" />
    <path d="M8.5 10.5 h-2 M8.5 13.5 h-2 M15.5 10.5 h2 M15.5 13.5 h2" {...HAIR} />
    <path d="M10.6 9 v6 M13.4 9 v6" {...HAIR} />
  </>),
  ipgpu: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    {rep(5, 7, 17, (t, i) => <rect key={i} x={t - 0.7} y="9" width="1.4" height="6" rx="0.3" {...F} />)}
  </>),
  ipnpu: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <rect x="8" y="8.5" width="8" height="7" rx="0.4" />
    <path d="M10.6 8.5 v7 M13.4 8.5 v7 M8 10.8 h8 M8 13.2 h8" {...HAIR} />
    <path d="M6.5 12 h1.5 M16 12 h1.5" {...HAIR} />
  </>),
  ipdsp: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <path d="M6.5 12 q1.3 -4.2 2.6 0 t2.6 0 t2.6 0 t2.6 0" strokeWidth="1.2" />
    <circle cx="6.5" cy="12" r="0.7" {...F} />
    <circle cx="17.5" cy="12" r="0.7" {...F} />
  </>),
  ipmem: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    {rep(4, 8.5, 15.5, (t, i) => <path key={i} d={`M7.5 ${t} h9`} {...THIN} />)}
    <path d="M10.5 7.5 v9 M13.5 7.5 v9" {...HAIR} />
  </>),
  ipphy: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <path d="M6.5 12 h2 l1.4 -3.4 l2 6.8 l1.4 -3.4 h4.2" strokeWidth="1.2" />
    <path d="M6.5 9 h1.4 M6.5 15 h1.4" {...HAIR} />
  </>),
  ipnoc: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <path d="M7.5 9 h9 M7.5 15 h9 M7.5 9 v6 M12 9 v6 M16.5 9 v6" {...HAIR} />
    {[7.5, 12, 16.5].flatMap((x) => [9, 15].map((y) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" {...F} />
    )))}
  </>),
  ipsec: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <rect x="9.2" y="11.4" width="5.6" height="4.4" rx="0.6" />
    <path d="M10.5 11.4 v-1.6 a1.5 1.5 0 0 1 3 0 v1.6" strokeWidth="1.1" />
    <circle cx="12" cy="13.5" r="0.6" {...F} />
  </>),
  ippll: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <path d="M6.5 14.5 v-5 h2.4 v5 h2.4 v-5 h2.4 v5 h2.4 v-5 h1.4" strokeWidth="1.2" />
  </>),
  ipisp: (<>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.2" strokeDasharray="2.5 2" />
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="12" cy="12" r="1.1" {...F} />
    <path d="M12 8.8 v-1.2 M12 15.2 v1.2 M8.8 12 h-1.4 M15.2 12 h1.4" {...HAIR} />
  </>),
  iplicense: (<>
    <path d="M6 3.5 h8.5 l3.5 3.5 v13.5 h-12 z" />
    <path d="M14.5 3.5 v3.5 h3.5" {...THIN} />
    <path d="M8.5 10 h7 M8.5 12 h4" {...HAIR} />
    <circle cx="12" cy="15.6" r="2.3" {...THIN} />
    <path d="M10.4 17.4 l-0.6 3 l2.2 -1.3 l2.2 1.3 l-0.6 -3" {...THIN} />
  </>),

  // ========================================================== FAB TOOLS ====
  puller: (<>
    <path d="M6 20 h12 v-3 a6 6 0 0 0 -12 0 z" />
    <path d="M9 17 q3 -5 6 0" {...HAIR} />
    <path d="M12 14 v-3" strokeWidth="1.6" />
    <path d="M10.4 11 h3.2 v-3 h-3.2 z" {...THIN} />
    <path d="M12 8 v-4.5" {...THIN} />
    <path d="M9.5 4 h5" {...THIN} />
  </>),
  saw: (<>
    <circle cx="12" cy="12" r="8" {...HAIR} />
    <path d="M4.5 8 h15 M4.5 12 h15 M4.5 16 h15" strokeWidth="1.3" />
    <circle cx="3" cy="6" r="1.6" {...THIN} />
    <circle cx="21" cy="18" r="1.6" {...THIN} />
  </>),
  furnace: (<>
    <rect x="3.5" y="7" width="17" height="10" rx="2" />
    <path d="M7 7 v10 M17 7 v10" {...HAIR} />
    <path d="M9.5 14 q1 -3.5 2.5 0 t2.5 0" {...THIN} />
    <path d="M3.5 12 h-2 M20.5 12 h2" {...THIN} />
    <path d="M6 5 v-2 M12 5 v-2.5 M18 5 v-2" {...HAIR} />
  </>),
  wetbench: (<>
    <path d="M3.5 9 h17 v8 a2 2 0 0 1 -2 2 h-13 a2 2 0 0 1 -2 -2 z" />
    <path d="M4.5 13 q3 -1.6 6 0 t6 0 t3 -0.6" {...THIN} />
    <circle cx="12" cy="6.5" r="2.4" {...THIN} />
    <path d="M12 4.1 v-2" {...HAIR} />
  </>),
  coater: (<>
    <circle cx="12" cy="14" r="6.5" />
    <circle cx="12" cy="14" r="2" {...THIN} />
    <path d="M12 7.5 v-4" {...THIN} />
    <path d="M10.6 3.5 h2.8" {...THIN} />
    <path d="M6.4 10.5 a7 7 0 0 0 -0.8 3" {...HAIR} />
    <circle cx="12" cy="10" r="0.6" {...F} />
  </>),
  scanner: (<>
    <path d="M9 3 h6 v3 h-6 z" {...THIN} />
    <path d="M12 6 v2" strokeWidth="1.6" />
    <path d="M7.5 8 h9 l-2.5 4 h-4 z" />
    <path d="M12 12 v2" strokeWidth="1.6" />
    <ellipse cx="12" cy="17.5" rx="7.5" ry="2.4" />
    <path d="M9 17.2 h6" {...HAIR} />
    <path d="M10 12.6 l-1.2 3.4 M14 12.6 l1.2 3.4" {...HAIR} />
  </>),
  etcher: (<>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M5.5 9 h13" {...THIN} />
    <ellipse cx="12" cy="15.5" rx="6" ry="1.4" {...THIN} />
    {rep(5, 7, 17, (t, i) => <path key={i} d={`M${t} 10 v3.6`} {...HAIR} />)}
    {rep(5, 7, 17, (t, i) => <circle key={`d${i}`} cx={t} cy="13.9" r="0.4" {...F} />)}
  </>),
  implanter: (<>
    <circle cx="6" cy="7" r="2.6" {...THIN} />
    <path d="M8.4 8 q5 3 8 3.5" strokeWidth="1.5" />
    <path d="M13 9.5 v4 M15.5 9.5 v4" {...HAIR} />
    <ellipse cx="18.5" cy="15" rx="4" ry="1.4" />
    <path d="M16.4 11.5 l1.4 2.2 M20.6 11.5 l-1.4 2.2" {...HAIR} />
  </>),
  depo: (<>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M8 5 v3 M12 5 v3 M16 5 v3" {...HAIR} />
    {rep(3, 8, 16, (t, i) => <path key={i} d={`M${t} 8.5 l0 2`} {...THIN} />)}
    {rep(7, 6.5, 17.5, (t, i) => <circle key={`p${i}`} cx={t} cy={11.5 + (i % 2)} r="0.4" {...F} />)}
    <ellipse cx="12" cy="15.5" rx="6.5" ry="1.5" />
    <path d="M5.5 15.5 h13" {...HAIR} />
  </>),
  cmp: (<>
    <circle cx="12" cy="13.5" r="7" />
    <circle cx="9.5" cy="12" r="3.2" {...THIN} />
    <path d="M12 6.5 a7 7 0 0 1 5.6 2.8" strokeWidth="1.6" />
    <path d="M17 5.5 l1.5 -1.5 M19 8 l2 -0.8" {...HAIR} />
    <circle cx="12" cy="13.5" r="0.7" {...F} />
  </>),
  metal: (<>
    <rect x="3.5" y="15" width="17" height="4.5" rx="0.5" />
    <path d="M5.5 15 v-3 h4 v3 M11 15 v-5 h3.5 v5 M16 15 v-7 h3 v7" {...THIN} />
    <path d="M7.5 12 v-2.5 M12.75 10 v-2 M17.5 8 v-2" {...HAIR} />
    <path d="M3.5 19.5 h17" strokeWidth="1.6" />
  </>),
  metrology: (<>
    <path d="M12 3.5 v3" {...THIN} />
    <path d="M9 6.5 h6 l-1.5 4 h-3 z" />
    <path d="M12 10.5 v2.5" strokeWidth="1.5" />
    <ellipse cx="12" cy="16.5" rx="7" ry="2.2" />
    <path d="M10 13.5 l-1.5 2.6 M14 13.5 l1.5 2.6" {...HAIR} />
    <circle cx="12" cy="16.3" r="1" {...THIN} />
  </>),
  prober: (<>
    <circle cx="12" cy="15" r="6.5" />
    <path d="M7 12 h10 M7 15 h10 M7 18 h10 M9 9.5 v11 M12 8.6 v12.8 M15 9.5 v11" {...HAIR} />
    <path d="M12 8.5 v-5" {...THIN} />
    <path d="M10 3.5 h4" {...THIN} />
    <path d="M11 5.5 l1 3 l1 -3" {...THIN} />
  </>),
  dicer: (<>
    <circle cx="12" cy="14" r="7" {...HAIR} />
    <path d="M5.5 10.5 h13 M5.5 14 h13 M5.5 17.5 h13" {...THIN} />
    <path d="M8.5 7.5 v13 M12 7 v14 M15.5 7.5 v13" {...THIN} />
    <circle cx="20" cy="5" r="2.4" />
    <path d="M18.3 6.7 L14.5 10.5" strokeWidth="1.5" />
  </>),
  bonder: (<>
    <rect x="4" y="15" width="16" height="4" rx="0.6" />
    <rect x="9" y="11.5" width="6" height="3.5" rx="0.5" {...THIN} />
    <path d="M9 11.8 q-2.5 -2.5 -4.2 -0.4 M15 11.8 q2.5 -2.5 4.2 -0.4" {...HAIR} />
    <path d="M12 8 v-4.5" {...THIN} />
    <path d="M10.6 8 h2.8 v1.5 h-2.8 z" {...THIN} />
  </>),
  tester: (<>
    <rect x="3.5" y="4.5" width="17" height="11" rx="1.5" />
    <path d="M6 12.5 h2 v-4 h2.2 v6 h2.2 v-5 h2.2 v3 h3.4" {...THIN} />
    <path d="M9 19 h6 M12 15.5 v3.5" {...THIN} />
    <path d="M9.5 21 h5" {...HAIR} />
  </>),

  // ===================================================== MATERIAL CHAIN ====
  quartzite: (<>
    <path d="M4.5 16.5 L8 8 l4.5 3 L16 5.5 l3.5 11 z" />
    <path d="M8 8 l1.5 8.5 M16 5.5 l-1 11" {...HAIR} />
    <path d="M3.5 19.5 h17" {...THIN} />
  </>),
  distill: (<>
    <path d="M9 3.5 h6 v6 l3.5 8 a1.5 1.5 0 0 1 -1.4 2 h-10.2 a1.5 1.5 0 0 1 -1.4 -2 l3.5 -8 z" />
    <path d="M7.4 14 h9.2" {...THIN} />
    <path d="M8.6 17 q1.6 -1.2 3.4 0 t3.4 0" {...HAIR} />
    <path d="M9.5 6 h5" {...HAIR} />
  </>),
  siemens: (<>
    <path d="M5 20 v-9 a7 7 0 0 1 14 0 v9" />
    <path d="M9 20 v-8 M15 20 v-8" strokeWidth="1.8" />
    <path d="M9 12 h6" {...THIN} />
    <path d="M4 20 h16" strokeWidth="1.5" />
    <path d="M6.8 8 l-2 -1.6 M17.2 8 l2 -1.6" {...HAIR} />
  </>),

  // ============================ TRANSISTOR ARCHITECTURES ===================
  // All cross-sections. The gate is the heavy stroke; count how many faces of
  // the channel it touches and the whole roadmap is legible at a glance.
  planar: (<>
    <rect x="2.5" y="15.5" width="19" height="5" rx="0.5" />
    <rect x="6" y="12.5" width="12" height="3" rx="0.3" {...THIN} />
    <rect x="8.5" y="8.5" width="7" height="4" rx="0.4" {...F} />
    <path d="M4.5 12.5 h3 M16.5 12.5 h3" {...HAIR} />
  </>),
  finfet: (<>
    <rect x="2.5" y="17" width="19" height="3.5" rx="0.5" />
    {rep(3, 7, 17, (t, i) => <rect key={i} x={t - 1} y="8" width="2" height="9" {...THIN} />)}
    {rep(3, 7, 17, (t, i) => (
      <path key={`g${i}`} d={`M${t - 3} 17 v-11 h6 v11`} fill="none" strokeWidth="1.6" />
    ))}
  </>),
  nanosheet: (<>
    <rect x="2.5" y="18" width="19" height="2.5" rx="0.5" />
    {rep(3, 6, 14, (t, i) => (
      <g key={i}>
        <rect x="8" y={t} width="8" height="1.8" rx="0.3" {...F} />
        <rect x="6" y={t - 1.6} width="12" height="5" rx="0.8" fill="none" strokeWidth="1.3" />
      </g>
    ))}
  </>),
  forksheet: (<>
    <rect x="2.5" y="18" width="19" height="2.5" rx="0.5" />
    <rect x="11.4" y="5" width="1.2" height="13" {...F} />
    {rep(3, 6.5, 14.5, (t, i) => (
      <g key={i}>
        <rect x="5" y={t} width="5.5" height="1.6" rx="0.3" {...F} />
        <path d={`M11.2 ${t - 1.4} h-7.4 v4.4 h7.4`} fill="none" {...THIN} />
        <rect x="13.5" y={t} width="5.5" height="1.6" rx="0.3" {...F} />
        <path d={`M12.8 ${t - 1.4} h7.4 v4.4 h-7.4`} fill="none" {...THIN} />
      </g>
    ))}
  </>),
  cfet: (<>
    <rect x="2.5" y="19" width="19" height="2" rx="0.4" />
    <path d="M3 12 h18" {...HAIR} strokeDasharray="1.5 1.5" />
    {rep(2, 4, 7.5, (t, i) => (
      <g key={`n${i}`}>
        <rect x="8.5" y={t} width="7" height="1.5" rx="0.3" {...F} />
        <rect x="6.8" y={t - 1.3} width="10.4" height="4.1" rx="0.7" fill="none" {...THIN} />
      </g>
    ))}
    {rep(2, 13.5, 17, (t, i) => (
      <g key={`p${i}`}>
        <rect x="8.5" y={t} width="7" height="1.5" rx="0.3" {...F} />
        <rect x="6.8" y={t - 1.3} width="10.4" height="4.1" rx="0.7" fill="none" {...THIN} />
      </g>
    ))}
  </>),
  twod: (<>
    <rect x="2.5" y="18.5" width="19" height="2" rx="0.4" />
    {rep(3, 6.5, 14.5, (t, i) => (
      <g key={i}>
        <path d={`M8 ${t} h8`} strokeWidth="1.6" />
        <rect x="6" y={t - 2} width="12" height="4" rx="0.7" fill="none" {...THIN} />
      </g>
    ))}
    {rep(5, 8.5, 15.5, (t, i) => <circle key={`a${i}`} cx={t} cy="6.5" r="0.35" {...F} />)}
  </>),

  // =========================================== QUANTUM MODALITIES ==========
  transmon: (<>
    <path d="M4 12 h5" strokeWidth="1.5" />
    <path d="M9 9.5 v5 M11 9.5 v5" strokeWidth="1.5" />
    <path d="M11 12 h3" strokeWidth="1.5" />
    <rect x="14" y="7" width="6.5" height="10" rx="1" {...THIN} />
    <path d="M15.5 9 h3.5 M15.5 12 h3.5 M15.5 15 h3.5" {...HAIR} />
    <path d="M9.6 5.5 l0.8 -2 M10 3.5 l0.8 2" {...HAIR} />
  </>),
  iontrap: (<>
    <rect x="3" y="14.5" width="18" height="3" rx="0.5" />
    <path d="M6 14.5 v-1.5 M10 14.5 v-1.5 M14 14.5 v-1.5 M18 14.5 v-1.5" {...THIN} />
    {rep(3, 8, 16, (t, i) => <circle key={i} cx={t} cy="9" r="1.3" {...F} />)}
    <path d="M2.5 9 h4 M17.5 9 h4" strokeWidth="1.4" />
    <path d="M8 6.5 q4 -2.5 8 0" {...HAIR} />
  </>),
  atomarray: (<>
    {[7, 12, 17].flatMap((x) => [7, 12, 17].map((y) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" {...F} />
    )))}
    {[7, 12, 17].flatMap((x) => [7, 12, 17].map((y) => (
      <circle key={`h${x}-${y}`} cx={x} cy={y} r="2.4" {...HAIR} />
    )))}
    <path d="M12 2.5 v2 M12 19.5 v2" {...HAIR} />
  </>),
  spinqubit: (<>
    <rect x="2.5" y="15" width="19" height="5.5" rx="0.5" />
    {rep(4, 6, 18, (t, i) => <rect key={i} x={t - 1.5} y="10.5" width="3" height="4.5" rx="0.5" {...THIN} />)}
    <circle cx="12" cy="17.5" r="1.4" {...F} />
    <path d="M12 15.6 v-1.4 M11.2 14.8 l0.8 -1 l0.8 1" {...HAIR} />
  </>),
  photonic: (<>
    <path d="M3 8 h6 q3 0 3 4 t3 4 h6" strokeWidth="1.4" />
    <path d="M3 16 h6 q3 0 3 -4" strokeWidth="1.4" />
    <rect x="9" y="9.5" width="6" height="5" rx="0.6" {...HAIR} />
    <circle cx="20" cy="16" r="1.8" {...THIN} />
    <path d="M20 14.2 v-1.5" {...HAIR} />
  </>),

  // ==================================================== NAVIGATION ========
  // A handful of concept icons the technical set does not cover, drawn in the
  // same hand so the sidebar does not look borrowed from elsewhere.
  spark: (<>
    <path d="M12 2.5 l1.8 5.6 l5.7 1.9 l-5.7 1.9 l-1.8 5.6 l-1.8 -5.6 l-5.7 -1.9 l5.7 -1.9 z" />
    <path d="M18.5 15.5 l0.8 2.2 l2.2 0.8 l-2.2 0.8 l-0.8 2.2 l-0.8 -2.2 l-2.2 -0.8 l2.2 -0.8 z" {...THIN} />
  </>),
  chart: (<>
    <path d="M3.5 3.5 v17 h17" {...THIN} />
    <rect x="6.5" y="12" width="2.8" height="5.5" rx="0.4" {...F} />
    <rect x="11" y="8.5" width="2.8" height="9" rx="0.4" {...F} />
    <rect x="15.5" y="5.5" width="2.8" height="12" rx="0.4" {...F} />
  </>),
  money: (<>
    <path d="M3.5 3.5 v17 h17" {...THIN} />
    <path d="M6 17 l3.5 -5 l3.5 2.5 l6 -8.5" strokeWidth="1.6" />
    <path d="M15 5.5 h4 v4" {...THIN} />
  </>),
  clock: (<>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 6.5 v5.5 l3.5 2.2" strokeWidth="1.5" />
    {rep(12, 0, 330, (a, i) => {
      const r = (a * Math.PI) / 180
      return <path key={i} d={`M${12 + 7.2 * Math.sin(r)} ${12 - 7.2 * Math.cos(r)} l${0.9 * Math.sin(r)} ${-0.9 * Math.cos(r)}`} {...HAIR} />
    })}
  </>),
  atom: (<>
    <circle cx="12" cy="12" r="1.9" {...F} />
    <ellipse cx="12" cy="12" rx="9" ry="3.6" {...THIN} />
    <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" {...THIN} />
    <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" {...THIN} />
  </>),
  layers: (<>
    <path d="M12 3 L21 7.5 L12 12 L3 7.5 z" />
    <path d="M3 12 L12 16.5 L21 12" {...THIN} />
    <path d="M3 16.5 L12 21 L21 16.5" {...HAIR} />
  </>),
  timeline: (<>
    <path d="M3 12 h18" {...THIN} />
    {rep(4, 5.5, 18.5, (t, i) => <circle key={i} cx={t} cy="12" r="1.5" {...F} />)}
    <path d="M5.5 10.5 v-4 M18.5 13.5 v4" {...HAIR} />
    <path d="M10 13.5 v3.5 M14 10.5 v-3.5" {...HAIR} />
  </>),
  shield: (<>
    <path d="M12 2.8 l7.5 3 v5.6 c0 4.6 -3.1 8.2 -7.5 9.8 c-4.4 -1.6 -7.5 -5.2 -7.5 -9.8 v-5.6 z" />
    <path d="M8.6 12 l2.4 2.4 l4.4 -4.8" strokeWidth="1.6" />
  </>),
  quiz: (<>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9.2 9.2 a2.8 2.8 0 1 1 3.4 2.7 v1.6" strokeWidth="1.4" />
    <circle cx="12" cy="16.8" r="0.9" {...F} />
  </>),
  route: (<>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="18" cy="18" r="2.4" />
    <path d="M8.4 6 h5.6 a4 4 0 0 1 0 8 h-4 a4 4 0 0 0 0 8 h5.6" strokeDasharray="2.5 2" {...THIN} />
  </>),

  graph: (<>
    <circle cx="12" cy="4.5" r="2.2" />
    <circle cx="5.5" cy="14" r="2.2" />
    <circle cx="18.5" cy="14" r="2.2" />
    <circle cx="12" cy="20.5" r="1.8" {...THIN} />
    <path d="M10.6 6.3 L6.9 12.2 M13.4 6.3 L17.1 12.2" {...THIN} />
    <path d="M6.8 15.6 L10.7 19.4 M17.2 15.6 L13.3 19.4" {...HAIR} />
  </>),
  gauge: (<>
    <path d="M3.5 16.5 a8.5 8.5 0 0 1 17 0" />
    <path d="M3.5 16.5 h17" {...THIN} />
    <path d="M12 16.5 L16.5 10.5" strokeWidth="1.8" />
    <circle cx="12" cy="16.5" r="1.6" {...F} />
    {rep(5, 5.5, 18.5, (t, i) => {
      const a = (Math.PI * (1 - i / 4))
      return <path key={i} d={`M${12 + 7 * Math.cos(a)} ${16.5 - 7 * Math.sin(a)} l${-0.9 * Math.cos(a)} ${0.9 * Math.sin(a)}`} {...HAIR} />
    })}
  </>),
  flask: (<>
    <path d="M9.5 3 v6.5 L4.8 18 a1.6 1.6 0 0 0 1.4 2.4 h11.6 a1.6 1.6 0 0 0 1.4 -2.4 L14.5 9.5 V3" />
    <path d="M8.5 3 h7" {...THIN} />
    <path d="M7.3 14.5 h9.4" {...THIN} />
    <circle cx="10.5" cy="17" r="0.8" {...F} />
    <circle cx="13.5" cy="18" r="0.55" {...F} />
  </>),
  book: (<>
    <path d="M4 4.5 a2 2 0 0 1 2 -2 h13 v16 h-13 a2 2 0 0 0 -2 2 z" />
    <path d="M4 4.5 v15" {...THIN} />
    <path d="M8.5 7 h7 M8.5 10 h7 M8.5 13 h4" {...HAIR} />
  </>),

  // ================================================= INDUSTRY LAYERS ======
  eda: (<>
    <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
    <path d="M9 21 h6 M12 17 v4" {...THIN} />
    <path d="M5.5 11.5 h2 v-3.5 h2.4 v6 h2.4 v-4.6 h2.2 v2.4 h3" {...THIN} />
    <path d="M5.5 14.5 h13" {...HAIR} strokeDasharray="1.5 1.5" />
  </>),
  fabless: (<>
    <rect x="2.5" y="4" width="19" height="13" rx="1.5" />
    <path d="M9 21 h6 M12 17 v4" {...THIN} />
    <rect x="8.5" y="7.5" width="7" height="6" rx="0.8" {...THIN} />
    <path d="M8.5 9 h-2 M8.5 12 h-2 M15.5 9 h2 M15.5 12 h2" {...HAIR} />
    <path d="M10.6 7.5 v6 M13.4 7.5 v6" {...HAIR} />
  </>),
  foundry: (<>
    <path d="M2.5 20.5 v-9 l4.5 3 v-3 l4.5 3 v-3 l4.5 3 V5.5 h5.5 v15 z" />
    <path d="M18 5.5 v-2.5" {...THIN} />
    <path d="M17 3 q1 -1.5 2 0" {...HAIR} />
    {rep(3, 5, 14, (t, i) => <rect key={i} x={t} y="17" width="2" height="3.5" {...HAIR} />)}
  </>),
  equipment: (<>
    <rect x="3.5" y="3" width="17" height="7" rx="1.5" />
    <path d="M6 5.5 h4 M6 7.5 h6" {...HAIR} />
    <path d="M12 10 v3" strokeWidth="1.5" />
    <path d="M8 13 h8 l-1.8 3 h-4.4 z" {...THIN} />
    <ellipse cx="12" cy="19" rx="7" ry="2.2" />
    <path d="M9 18.8 h6" {...HAIR} />
  </>),
  materials: (<>
    <ellipse cx="12" cy="4" rx="3.2" ry="1.3" />
    <path d="M8.8 4 v12 a3.2 3.2 0 0 0 6.4 0 v-12" />
    <path d="M8.8 8.5 h6.4 M8.8 12 h6.4" {...HAIR} strokeDasharray="1.5 1.5" />
    <path d="M12 19.4 v2" {...HAIR} />
  </>),
  osat: (<>
    <rect x="2.5" y="11.5" width="12" height="8" rx="1.2" />
    {rep(4, 5, 12, (t, i) => <path key={i} d={`M${t} 19.5 v2`} {...THIN} />)}
    <rect x="6" y="14" width="5" height="3" rx="0.4" {...HAIR} />
    <path d="M20 2.5 v8.5 l-2.5 3" {...THIN} />
    <circle cx="20" cy="2" r="1.3" {...F} />
    <path d="M16.5 14.5 l1 1" {...HAIR} />
  </>),
}

export const ICON_NAMES = Object.keys(ICONS)

/**
 * @param name  key from ICONS
 * @param size  pixel box. Stroke width does not scale with it, which keeps a
 *              20px icon readable rather than spidery and a 40px one from
 *              looking inflated.
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
