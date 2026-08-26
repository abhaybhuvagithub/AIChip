import React, { useMemo, useRef, useState } from 'react'
import { ACRONYMS, CATEGORIES, searchAcronyms } from '../data/acronyms.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

export default function Acronyms({ goTab }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const inputRef = useRef(null)

  const results = useMemo(() => {
    const hits = searchAcronyms(q)
    const scoped = cat === 'all' ? hits : hits.filter((a) => a.category === cat)
    // Exact and prefix matches on the acronym itself come first — searching
    // "IP" should not bury the entry under everything whose description
    // happens to contain the letters.
    const term = q.trim().toLowerCase()
    return [...scoped].sort((a, b) => {
      const ac = a.acronym.toLowerCase(), bc = b.acronym.toLowerCase()
      if (term) {
        const rank = (x) => (x === term ? 0 : x.startsWith(term) ? 1 : 2)
        const d = rank(ac) - rank(bc)
        if (d) return d
      }
      return ac.localeCompare(bc)
    })
  }, [q, cat])

  const counts = useMemo(() => {
    const c = {}
    for (const a of ACRONYMS) c[a.category] = (c[a.category] || 0) + 1
    return c
  }, [])

  return (
    <div>
      <div className="eyebrow">Glossary</div>
      <h1 className="title">{ACRONYMS.length} acronyms,<br />expanded and explained.</h1>
      <p className="lede">
        Most glossaries stop at the expansion, which is the least useful part. Knowing that DIBL is
        "drain-induced barrier lowering" tells you nothing; knowing it is the drain stealing control
        of the channel from the gate, and why short channels leak, tells you what you needed. Every
        entry here carries both.
      </p>

      <div className="acro-search">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search — try DIBL, EUV, or 'why short channels leak'"
          aria-label="Search acronyms"
          autoComplete="off"
        />
        {q && <button className="btn sm" onClick={() => { setQ(''); inputRef.current?.focus() }}>Clear</button>}
      </div>

      <div className="row" style={{ margin: '12px 0 14px' }}>
        <button className={`btn sm ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
          All {ACRONYMS.length}
        </button>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <button key={k} className={`btn sm iconrow ${cat === k ? 'active' : ''}`} onClick={() => setCat(k)}
            style={cat === k ? undefined : { color: v.hue }}>
            <Icon name={v.icon} size={17} />{v.label} {counts[k]}
          </button>
        ))}
      </div>

      <p className="small" style={{ marginBottom: 12 }}>
        {results.length === ACRONYMS.length
          ? `Showing all ${ACRONYMS.length}.`
          : `${fmt.n(results.length)} of ${ACRONYMS.length}${q ? ` matching “${q}”` : ''}.`}
      </p>

      {results.length === 0 ? (
        <div className="card">
          <p>
            Nothing matches “{q}”. The search covers the acronym, its expansion and its description,
            so a plain-English phrase usually finds something — but this glossary is not exhaustive
            and never could be.
          </p>
          <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => { setQ(''); setCat('all') }}>
            Show everything
          </button>
        </div>
      ) : (
        <div className="acro-grid">
          {results.map((a) => (
            <div className="acro" key={a.acronym + a.category}>
              <div className="acro-head">
                <b className="acro-key" style={{ color: CATEGORIES[a.category].hue }}>{a.acronym}</b>
                <span className="acro-exp">{a.expansion}</span>
              </div>
              <p className="acro-mean">{a.meaning}</p>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <span className="badge iconrow" style={{ color: CATEGORIES[a.category].hue, borderColor: CATEGORIES[a.category].hue }}>
                  <Icon name={CATEGORIES[a.category].icon} size={15} />
                  {CATEGORIES[a.category].label}
                </span>
                {a.tab && (
                  <button className="btn sm" onClick={() => goTab(a.tab)}>Explained on the {a.tab} tab →</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="small" style={{ marginTop: 20, maxWidth: '68ch' }}>
        {ACRONYMS.filter((a) => a.tab).length} of these link to a tab that explains the thing
        properly rather than in a sentence. The list covers what this site uses plus the terms you
        would meet reading about the industry — it is not exhaustive, and a genuinely complete
        semiconductor glossary would run to thousands of entries and be useless.
      </p>
    </div>
  )
}
