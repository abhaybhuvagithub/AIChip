import React, { useState } from 'react'

/**
 * The numbers behind a chart, as a real table.
 *
 * An audit found sixteen SVGs on this site, every one labelled with WHAT IT IS
 * rather than what it shows. A reader using a screen reader got "Roofline:
 * attainable performance against arithmetic intensity" and no data at all —
 * the charts were decorative to them, which for a site whose entire argument
 * is quantitative means the argument was unavailable.
 *
 * An `aria-label` on an SVG describes the picture. It cannot convey a
 * distribution. The fix is not a better label, it is the underlying numbers in
 * a form a screen reader can walk — which sighted readers wanting the exact
 * figures turn out to want too, so it is not an accessibility tax paid by
 * everyone else.
 */
export default function ChartData({ caption, columns, rows, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!rows?.length) return null

  return (
    <div className="chartdata">
      <button className="btn sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? '▾ Hide the numbers' : '▸ Show the numbers'}
      </button>
      {open && (
        <div className="tbl-wrap" style={{ marginTop: 9 }}>
          <table className="tbl">
            <caption className="chartdata-cap">{caption}</caption>
            <thead>
              <tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    j === 0
                      ? <th key={j} scope="row" style={{ fontWeight: 600, textAlign: 'left' }}>{cell}</th>
                      : <td key={j} className="num">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
