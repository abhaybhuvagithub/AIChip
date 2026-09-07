import React, { useState } from 'react'
import { STEPS, HARD, WORDS, NEXT, CLOSING } from '../data/guide.js'
import Icon from './Icon.jsx'

const TAB_NAME = {
  sand: 'Sand → silicon', line: 'Fab line', wafer: 'Yield lab',
  economics: 'Economics', science: 'The science', matters: 'Why it matters',
}

export default function Guide({ goTab }) {
  const [open, setOpen] = useState(null)

  return (
    <div className="guide">
      <div className="eyebrow">Start here</div>
      <h1 className="title">How a chip is made,<br />in about five minutes.</h1>
      <p className="lede">
        No background needed and nothing here assumes any. Every technical word is explained where it
        appears, and the numbers are given in things you can picture. Read it once and you will be
        able to explain a chip to someone else — which is a higher bar than following along, and the
        one this page is written to.
      </p>

      {/* --------------------------------------------- the short version */}
      <div className="card guide-tldr">
        <div className="eyebrow">If you read nothing else</div>
        <p>
          A chip is a slice of extremely pure silicon with a pattern printed onto it — about seventy
          times over, each layer lined up with the last to within a few atoms. The pattern makes tens
          of billions of tiny switches. It takes around seven hundred steps and three months, a few
          of the chips come out broken, and the rest are sorted and sold. Everything difficult about
          this industry comes from one of those facts.
        </p>
      </div>

      {/* ------------------------------------------------------ the steps */}
      <h2 className="sec">The whole thing, in ten steps</h2>
      <ol className="guide-steps">
        {STEPS.map((s) => (
          <li key={s.n} className={open === s.n ? 'on' : ''}>
            <button onClick={() => setOpen(open === s.n ? null : s.n)} aria-expanded={open === s.n}>
              <span className="gs-n">{s.n}</span>
              <span className="gs-body">
                <span className="gs-title">
                  <Icon name={s.icon} size={22} />{s.title}
                </span>
                <span className="gs-what">{s.what}</span>
                {open === s.n && <span className="gs-detail">{s.detail}</span>}
              </span>
              <span className="gs-more" aria-hidden="true">{open === s.n ? '−' : '+'}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="small" style={{ marginTop: 10, maxWidth: '66ch' }}>
        Tap any step for a little more. Nothing below depends on having opened them.
      </p>

      {/* ------------------------------------------------------ why hard */}
      <h2 className="sec">Why it is so hard</h2>
      <p className="small" style={{ marginBottom: 14, maxWidth: '66ch' }}>
        Five reasons. If you understand these, most of the rest of this site is a consequence of one
        of them.
      </p>
      <div className="grid g2">
        {HARD.map((h, i) => (
          <div className="card" key={h.k}>
            <div className="iconrow" style={{ marginBottom: 6 }}>
              <Icon name={h.icon} size={26} style={{ color: 'var(--accent)' }} />
              <span className="eyebrow" style={{ margin: 0 }}>{i + 1}. {h.k}</span>
            </div>
            <p style={{ marginTop: 4 }}>{h.what}</p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------- glossary */}
      <h2 className="sec">The words you will keep meeting</h2>
      <div className="guide-words">
        {WORDS.map((w) => (
          <div className="guide-word" key={w.w}>
            <b>{w.w}</b>
            <span>{w.d}</span>
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------- closing */}
      <div className="card guide-close">
        <p>{CLOSING}</p>
      </div>

      {/* ----------------------------------------------------- what next */}
      <h2 className="sec">Where to go from here</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '66ch' }}>
        Pick by what you want to know, not by what the tab is called.
      </p>
      <div className="guide-next">
        {NEXT.map((n) => (
          <button key={n.tab} className="guide-nextcard" onClick={() => goTab(n.tab)}>
            <span className="gn-want">“{n.want}”</span>
            <span className="gn-why">{n.why}</span>
            <span className="gn-tab">{TAB_NAME[n.tab]} →</span>
          </button>
        ))}
      </div>

      <p className="small" style={{ marginTop: 20, maxWidth: '66ch' }}>
        Everything on this page is simplified but not, as far as I can manage, made wrong. Where a
        comparison would have to be un-taught later it was cut instead. The rest of the site is the
        same material without the simplifying.
      </p>
    </div>
  )
}
