import React, { useMemo, useState } from 'react'
import { SOURCES, KINDS, IDS, format } from '../data/sources.js'
import Icon from './Icon.jsx'

const KIND_ICON = { paper: 'book', standard: 'iplicense', vendor: 'foundry', analyst: 'chart', press: 'graph' }

export default function Sources() {
  const [kind, setKind] = useState('all')

  const list = useMemo(() => IDS
    .filter((id) => kind === 'all' || SOURCES[id].kind === kind)
    .sort((a, b) => SOURCES[b].year - SOURCES[a].year), [kind])

  const counts = useMemo(() => {
    const c = {}
    for (const id of IDS) c[SOURCES[id].kind] = (c[SOURCES[id].kind] || 0) + 1
    return c
  }, [])

  const withUrl = IDS.filter((id) => SOURCES[id].url).length

  return (
    <div>
      <div className="eyebrow">Sources</div>
      <h1 className="title">Where the numbers come from.</h1>
      <p className="lede">
        This page exists because the site was failing its own standard. It insists on saying what is
        estimated, what is contested and what nobody knows — and then asked you to take several
        hundred factual claims entirely on trust. An audit found exactly zero citations across every
        data file on the site.
      </p>

      <div className="card" style={{ borderColor: 'var(--accent)', marginTop: 16 }}>
        <div className="eyebrow">Two rules, both of which cost coverage</div>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          <b>No link unless it is real.</b> A citation with a fabricated URL is worse than one
          without a link, because it looks checkable and is not. {withUrl} of these {IDS.length}{' '}
          entries carry a URL; the rest give author, title, venue and year, which is enough to find
          the work and is all I can honestly stand behind.
        </p>
        <p style={{ marginTop: 10, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          <b>Coverage is partial, and says so.</b> Around thirty claims are sourced here — not all of
          them. The device physics, the yield models and the standards are well covered. The industry
          cost figures are the weakest link on the whole site and are labelled as such below, rather
          than dressed up.
        </p>
      </div>

      <h2 className="sec">Weigh these differently</h2>
      <div className="grid g2">
        {Object.entries(KINDS).map(([k, v]) => (
          <div className="card" key={k}>
            <div className="iconrow" style={{ marginBottom: 4 }}>
              <Icon name={KIND_ICON[k]} size={24} style={{ color: v.hue }} />
              <span className="eyebrow" style={{ margin: 0, color: v.hue }}>{v.label} · {counts[k] || 0}</span>
            </div>
            <p className="small" style={{ marginTop: 6 }}>{v.note}</p>
          </div>
        ))}
      </div>

      <h2 className="sec">The list</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`btn sm ${kind === 'all' ? 'active' : ''}`} onClick={() => setKind('all')}>
          All {IDS.length}
        </button>
        {Object.entries(KINDS).map(([k, v]) => (
          <button key={k} className={`btn sm iconrow ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}
            style={kind === k ? undefined : { color: v.hue }}>
            <Icon name={KIND_ICON[k]} size={17} />{v.label} {counts[k] || 0}
          </button>
        ))}
      </div>

      <div className="src-list">
        {list.map((id) => {
          const s = SOURCES[id]
          const k = KINDS[s.kind]
          return (
            <div className="src" key={id}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span className="badge" style={{ color: k.hue, borderColor: k.hue }}>{k.label}</span>
                <span className="src-year">{s.year}</span>
              </div>
              <div className="src-title">{s.title}</div>
              <div className="src-cite">{format(id)}</div>
              <p className="src-supports"><b>Supports:</b> {s.supports}</p>
              {s.caveat && <p className="src-caveat">{s.caveat}</p>}
              {s.url && (
                <a className="btn sm" href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ marginTop: 8, display: 'inline-block' }}>Open →</a>
              )}
            </div>
          )
        })}
      </div>

      <h2 className="sec">What is still unsourced</h2>
      <div className="card">
        <p style={{ fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          Being specific is more useful than an apology. The following carry no citation and should
          be read as the site's own modelling rather than as reported fact: the fab simulation's
          calibration figures, the staffing shares by discipline, the escape-cost and standing model
          on Run &amp; Operate, the arithmetic intensities on the AI chips tab, and the causal graph
          on Trace — which is explicitly an argument rather than a finding, and says so on its own
          page.
        </p>
        <p style={{ fontSize: 'var(--fs-prose)', lineHeight: 1.62, marginTop: 10 }}>
          Every equation on the science tab is a textbook relation and is checked against
          hand-computed values in the build, which is a different kind of assurance from a citation
          and worth distinguishing: it proves the arithmetic is right, not that the model is the one
          reality uses.
        </p>
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '68ch' }}>
        If a figure here is wrong, it is wrong in this repository and can be corrected there. That is
        the point of writing them down.
      </p>
    </div>
  )
}
