import React, { useState } from 'react'
import { LAYERS, ARM, MODELS, FAB_TIERS, TERAFAB } from '../data/value-chain.js'
import Icon from './Icon.jsx'
import { computeRun, fmt } from '../lib/fab.js'
import { computeThroughput, ops, watts, DEFAULT_COMPUTE } from '../lib/compute.js'
import { waferMass, grams } from '../lib/chain.js'

export default function ValueChain({ cfg }) {
  const [layer, setLayer] = useState('foundry')
  const [tier, setTier] = useState('gigafab')
  const [model, setModel] = useState('fabless')

  const l = LAYERS.find((x) => x.id === layer) || LAYERS[0]
  const t = FAB_TIERS.find((x) => x.id === tier) || FAB_TIERS[1]
  const m = MODELS.find((x) => x.id === model) || MODELS[1]

  // Fab scale, costed through the site's own model rather than asserted.
  const y = computeRun(cfg)
  const c = { ...DEFAULT_COMPUTE, ...(cfg.compute || {}) }
  const thr = computeThroughput(cfg, c, y)
  const wafersYear = t.wpm * 12
  const diesYear = wafersYear * y.goodDies
  const siYear = wafersYear * waferMass(cfg.waferDia)
  const opsYear = diesYear * thr.opsPerDie
  const powerIfAllRun = diesYear * c.wattsPerDie

  return (
    <div>
      <div className="eyebrow">Value chain</div>
      <h1 className="title">Nobody makes a chip.<br />A dozen industries do.</h1>
      <p className="lede">
        Every other tab treats the chip as an object. This one is about the structure that produces
        it — seven layers deep, most with fewer than five viable suppliers, and at least one with
        exactly one. It is the most specialised supply chain on Earth, and there is now a serious bet
        against it.
      </p>

      <h2 className="sec">The layers</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {LAYERS.map((x) => (
          <button key={x.id} className={`btn iconrow ${layer === x.id ? 'active' : ''}`} onClick={() => setLayer(x.id)}>
            <Icon name={x.icon} size={19} />{x.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <div className="iconrow" style={{ marginBottom: 6 }}>
            <Icon name={l.icon} size={30} style={{ color: 'var(--accent)' }} />
            <span className="eyebrow" style={{ margin: 0 }}>{l.name}</span>
          </div>
          <p style={{ fontSize: 18, lineHeight: 1.62, marginTop: 8 }}>{l.what}</p>
          <p className="phys" style={{ fontSize: 18, lineHeight: 1.62 }}>{l.capture}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Who is in it</dt>
            <dd><ul>{l.who.map((w) => <li key={w}>{w}</li>)}</ul></dd>
            <dt>How concentrated</dt>
            <dd style={{ color: 'var(--warn)' }}>{l.concentration}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">Arm: selling the design, not the chip</h2>
      <div className="card">
        <p style={{ fontSize: 18, lineHeight: 1.62 }}>{ARM.what}</p>
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        {ARM.licences.map((x) => (
          <div className="card" key={x.k}>
            <div className="iconrow" style={{ marginBottom: 4 }}>
              <Icon name={x.icon} size={26} style={{ color: 'var(--accent)' }} />
              <span className="eyebrow" style={{ margin: 0 }}>{x.k}</span>
            </div>
            <p className="small" style={{ marginTop: 8 }}>{x.what}</p>
          </div>
        ))}
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <div className="eyebrow">The licensor becomes a supplier</div>
          <p style={{ fontSize: 18, lineHeight: 1.62, marginTop: 8 }}>{ARM.ownSilicon}</p>
        </div>
        <div className="card">
          <div className="eyebrow">And the pressure from below</div>
          <p style={{ fontSize: 18, lineHeight: 1.62, marginTop: 8 }}>{ARM.tension}</p>
        </div>
      </div>

      <h2 className="sec">Three ways to be in this business</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {MODELS.map((x) => (
          <button key={x.id} className={`btn ${model === x.id ? 'active' : ''}`} onClick={() => setModel(x.id)}>{x.name}</button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <div className="eyebrow">{m.who}</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-.02em' }}>{m.name}</h3>
          <p style={{ fontSize: 18, lineHeight: 1.62, marginTop: 10 }}>{m.how}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Argument for</dt><dd style={{ color: 'var(--ok)' }}>{m.pro}</dd>
            <dt>Argument against</dt><dd style={{ color: 'var(--warn)' }}>{m.con}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">How big is a fab, in chips?</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '62ch' }}>
        Wafer starts per month is how capacity is actually quoted. Run it through the die you
        configured in the yield lab and it turns into something you can picture.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        {FAB_TIERS.map((x) => (
          <button key={x.id} className={`btn ${tier === x.id ? 'active' : ''}`} onClick={() => setTier(x.id)}>
            {x.name}{!x.real && ' *'}
          </button>
        ))}
      </div>
      <div className="grid g3">
        <div className="stat hi">
          <div className="k">Wafer starts</div>
          <div className="v">{fmt.n(t.wpm / 1000)}k<span style={{ fontSize: 18.5 }}>/mo</span></div>
          <div className="sub">{fmt.n(wafersYear / 1e6, 2)} million a year</div>
        </div>
        <div className="stat">
          <div className="k">Good dies a year</div>
          <div className="v">{diesYear >= 1e9 ? `${fmt.n(diesYear / 1e9, 1)}B` : `${fmt.n(diesYear / 1e6, 0)}M`}</div>
          <div className="sub">at {fmt.n(y.goodDies)} per wafer</div>
        </div>
        <div className="stat">
          <div className="k">Silicon consumed</div>
          <div className="v">{grams(siYear)}</div>
          <div className="sub">polished wafer mass a year</div>
        </div>
        <div className="stat">
          <div className="k">Compute produced</div>
          <div className="v" style={{ fontSize: 24 }}>{ops(opsYear)}</div>
          <div className="sub">peak, if every die shipped and ran</div>
        </div>
        <div className="stat">
          <div className="k">Power to run a year's output</div>
          <div className="v" style={{ fontSize: 24 }}>{watts(powerIfAllRun)}</div>
          <div className="sub">not the fab — the chips it made</div>
        </div>
        <div className={`stat ${t.real ? '' : 'bad'}`}>
          <div className="k">Status</div>
          <div className="v" style={{ fontSize: 21 }}>{t.real ? 'Exists' : 'Proposed'}</div>
          <div className="sub">{t.real ? 'operating today' : 'illustrative figure only'}</div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>{t.note}</p>

      <h2 className="sec">Terafab</h2>
      <div className="card" style={{ borderColor: 'var(--warn)' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="eyebrow" style={{ margin: 0, color: 'var(--warn)' }}>Status</div>
          <span className="badge">{TERAFAB.status}</span>
        </div>
        <p style={{ fontSize: 18, lineHeight: 1.62, marginTop: 10 }}>{TERAFAB.why}</p>
      </div>

      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="eyebrow" style={{ color: 'var(--ok)' }}>Committed and reported</div>
          <table className="tbl" style={{ marginTop: 6 }}>
            <tbody>
              {TERAFAB.confirmed.map(([k, v]) => (
                <tr key={k}><td style={{ width: '38%', color: 'var(--muted)' }}>{k}</td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="eyebrow" style={{ color: 'var(--warn)' }}>Stated ambition, not yet demonstrated</div>
          <table className="tbl" style={{ marginTop: 6 }}>
            <tbody>
              {TERAFAB.ambitions.map(([k, v]) => (
                <tr key={k}><td style={{ width: '38%', color: 'var(--muted)' }}>{k}</td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="eyebrow">The case against</div>
        <p style={{ fontSize: 18, lineHeight: 1.62, marginTop: 8 }}>{TERAFAB.against}</p>
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '62ch' }}>
        Terafab figures are drawn from company announcements and public reporting through August 2026.
        Nothing here is a specification — the project has a site, permits and incentive agreements,
        and no wafers. The distinction between the two tables above is the point.
      </p>
    </div>
  )
}
