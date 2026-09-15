import React, { useState } from 'react'
import {
  ARCHETYPES, MARKETS, marketKey, evaluate, bindingConstraint, ASSUMPTIONS,
  servicesView,
} from '../lib/usecase.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

function Slider({ label, value, set, min, max, step = 1, unit = '', hint, fmtV }) {
  return (
    <div className="ctl">
      <label><span>{label}</span><b>{fmtV ? fmtV(value) : value}{unit}</b></label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

const NODES = ['180 nm', '90 nm', '65 nm', '40 nm', '28 nm', '16 nm', '7 nm', '5 nm', '3 nm', '2 nm']
const usd = (v) => (Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}B`
  : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(0)}M`
  : Math.abs(v) >= 1e3 ? `$${(v / 1e3).toFixed(0)}k` : `$${v.toFixed(2)}`)

export default function UseCase({ goTab }) {
  const [p, setP] = useState(ARCHETYPES[2])
  const [rate, setRate] = useState(120000)
  const [dur, setDur] = useState(2.5)
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }))

  const r = evaluate(p)
  const b = bindingConstraint(r)
  const sv = servicesView({ node: p.node, ratePerEngineerYearUsd: rate, durationYears: dur })

  return (
    <div>
      <div className="eyebrow">Your case</div>
      <h1 className="title">Point all of it<br />at one real part.</h1>
      <p className="lede">
        Every other tab aims one or two models at an example. This one aims all of them at whatever
        you describe — yield, cost, capacity, non-recurring engineering, headcount and the quality
        gate, from a single description. Nothing here is a new model. If a number is wrong, it is
        wrong on the tab it came from too.
      </p>

      <div className="row" style={{ marginTop: 16, marginBottom: 14 }}>
        {ARCHETYPES.map((a) => (
          <button key={a.id} className={`btn iconrow ${p.id === a.id ? 'active' : ''}`} onClick={() => setP(a)}>
            <Icon name={a.icon} size={20} />{a.name}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------- the verdict */}
      <div className="card" style={{ borderColor: b.id === 'none' ? 'var(--ok)' : 'var(--warn)' }}>
        <div className="eyebrow" style={{ color: b.id === 'none' ? 'var(--ok)' : 'var(--warn)' }}>
          What actually binds
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '-.02em', marginTop: 6 }}>
          {b.k}
        </h2>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>{b.what}</p>
        <p className="why" style={{ marginTop: 10 }}>{b.fix}</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(290px,350px)', marginTop: 16 }}>
        <div>
          <div className="grid g3">
            <div className="stat">
              <div className="k">Good dies per wafer</div>
              <div className="v" style={{ fontSize: 23 }}>{fmt.n(r.goodPerWafer, 0)}</div>
              <div className="sub">{fmt.pct(r.run.dieYield, 1)} yield, {fmt.n(r.geo.gross)} gross</div>
            </div>
            <div className="stat">
              <div className="k">Cost per good die</div>
              <div className="v" style={{ fontSize: 23 }}>{usd(r.costPerDie)}</div>
              <div className="sub">against a {usd(p.priceUsd)} price</div>
            </div>
            <div className={`stat ${r.grossMargin > 0.3 ? 'ok' : 'bad'}`}>
              <div className="k">Gross margin</div>
              <div className="v" style={{ fontSize: 23 }}>{fmt.pct(r.grossMargin, 0)}</div>
              <div className="sub">{usd(r.grossPerUnit)} per unit</div>
            </div>
            <div className="stat">
              <div className="k">Wafer starts needed</div>
              <div className="v" style={{ fontSize: 23 }}>{fmt.n(r.wspmNeeded, 0)}</div>
              <div className="sub">per month — {fmt.pct(r.fabShare, 1)} of a large fab</div>
            </div>
            <div className="stat">
              <div className="k">Design cost</div>
              <div className="v" style={{ fontSize: 23 }}>{usd(r.nre.total)}</div>
              <div className="sub">{fmt.n(r.nre.engineerYears)} engineer-years, {r.nre.years.toFixed(1)} years</div>
            </div>
            <div className={`stat ${r.gatePasses ? 'ok' : 'bad'}`}>
              <div className="k">Escapes</div>
              <div className="v" style={{ fontSize: 23 }}>{r.dppm < 1 ? r.dppm.toFixed(2) : fmt.n(r.dppm, 0)}</div>
              <div className="sub">DPPM against a target of {r.marketRow.dppm}</div>
            </div>
          </div>

          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Question</th><th>Answer</th><th style={{ width: '44%' }}>Which tab this comes from</th></tr></thead>
              <tbody>
                <tr>
                  <td>Break-even volume</td>
                  <td className="num">{Number.isFinite(r.breakEven) ? `${fmt.n(r.breakEven / 1e6, 2)}M units` : 'never'}</td>
                  <td className="small">
                    Against {fmt.n(r.lifetimeUnits / 1e6, 1)}M over the product life.
                    <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('business')}>0 → market</button>
                  </td>
                </tr>
                <tr>
                  <td>Lifetime profit after design</td>
                  <td className="num" style={{ color: r.lifetimeProfitUsd > 0 ? 'var(--ok)' : 'var(--bad)' }}>
                    {usd(r.lifetimeProfitUsd)}
                  </td>
                  <td className="small">Gross margin across the life, less the non-recurring cost.</td>
                </tr>
                <tr>
                  <td>Team size at peak</td>
                  <td className="num">{fmt.n(r.team.peak ?? r.team.total ?? 0, 0)}</td>
                  <td className="small">
                    Derived from the same engineer-years as the design cost.
                    <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('teams')}>Teams</button>
                  </td>
                </tr>
                <tr>
                  <td>Dies across the reticle field</td>
                  <td className="num">{(p.dieX * p.dieY).toFixed(0)} mm²</td>
                  <td className="small">
                    The field is 858 mm². Past that it cannot be one die.
                    <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('wafer')}>Yield lab</button>
                  </td>
                </tr>
                <tr>
                  <td>Quality target</td>
                  <td className="num">{r.marketRow.dppm} DPPM</td>
                  <td className="small">
                    {r.marketRow.note}
                    <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('ethics')}>Discipline</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Die width" value={p.dieX} set={(v) => set('dieX', v)} min={1} max={33} step={0.5} unit=" mm" />
          <Slider label="Die height" value={p.dieY} set={(v) => set('dieY', v)} min={1} max={33} step={0.5} unit=" mm" />
          <div className="ctl">
            <label><span>Process node</span><b>{p.node}</b></label>
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              {NODES.map((n) => (
                <button key={n} className={`btn sm ${p.node === n ? 'active' : ''}`} onClick={() => set('node', n)}>{n}</button>
              ))}
            </div>
          </div>
          <Slider label="Units per year" value={Math.log10(p.unitsPerYear)}
            set={(v) => set('unitsPerYear', Math.round(Math.pow(10, v)))}
            min={4} max={9.5} step={0.05} fmtV={(v) => fmt.n(Math.round(Math.pow(10, v)))} />
          <Slider label="Selling price" value={Math.log10(p.priceUsd)}
            set={(v) => set('priceUsd', Math.pow(10, v))}
            min={-1} max={4.5} step={0.02} fmtV={(v) => usd(Math.pow(10, v))} />
          <Slider label="Test coverage" value={(p.testCoverage ?? 0.999) * 100}
            set={(v) => set('testCoverage', v / 100)} min={90} max={99.999} step={0.001} unit="%"
            hint="What fraction of latent defects the test programme catches. The last nines cost the most and are what automotive is buying." />
          <div className="ctl">
            <label><span>Market</span><b>{r.marketRow.market}</b></label>
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              {MARKETS.map((m) => (
                <button key={m.market} className={`btn sm ${marketKey(m) === p.market ? 'active' : ''}`}
                  onClick={() => set('market', marketKey(m))}>{m.market.split(' ')[0]}</button>
              ))}
            </div>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>{p.note}</p>
        </div>
      </div>


      {/* ------------------------------------------------- the other side */}
      <h2 className="sec">The same project, seen from the other side</h2>
      <p className="small" style={{ marginBottom: 14, maxWidth: '68ch' }}>
        Everything above models a company that sells a part. Much of this industry does not — design
        services firms sell engineer-years, carry no mask cost, no wafer cost and no inventory, and
        none of the arithmetic above describes them. The design cost that is a burden on this page is
        their market. Same {p.node} programme, read from the supplier&rsquo;s side.
      </p>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(290px,350px)' }}>
        <div>
          <div className="grid g3">
            <div className="stat">
              <div className="k">Engineering in the programme</div>
              <div className="v" style={{ fontSize: 23 }}>{fmt.n(sv.engineerYears)}</div>
              <div className="sub">engineer-years at {p.node}</div>
            </div>
            <div className="stat">
              <div className="k">Peak headcount</div>
              <div className="v" style={{ fontSize: 23 }}>{fmt.n(sv.peakHeadcount, 0)}</div>
              <div className="sub">over {dur} years</div>
            </div>
            <div className="stat hi">
              <div className="k">Value of the work</div>
              <div className="v" style={{ fontSize: 23 }}>{usd(sv.totalValueUsd)}</div>
              <div className="sub">at {usd(rate)} per engineer-year</div>
            </div>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Service line</th><th>Share</th><th>Engineer-years</th><th>People</th><th>Value</th><th style={{ width: '34%' }}>Why it is that size</th></tr></thead>
              <tbody>
                {sv.lines.map((l) => (
                  <tr key={l.id}>
                    <td><b className="iconrow"><Icon name={l.icon} size={20} />{l.name}</b></td>
                    <td className="num" style={{ color: l.id === 'dv' ? 'var(--accent)' : undefined }}>{fmt.pct(l.share, 0)}</td>
                    <td className="num">{fmt.n(l.engineerYears, 0)}</td>
                    <td className="num">{fmt.n(l.headcount, 0)}</td>
                    <td className="num">{usd(l.valueUsd)}</td>
                    <td className="small">{l.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            Note which line is largest. <b>Verification is roughly half the effort</b> — about two
            engineers checking for every one designing — and that ratio is the most reliable rule of
            thumb in chip development. It exists because a bug found after tapeout costs a mask set
            and a quarter of calendar, which is the same arithmetic the panel above calls
            non-recurring cost.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Rate per engineer-year" value={rate / 1000} set={(v) => setRate(v * 1000)}
            min={40} max={300} step={5} fmtV={(v) => `$${v}k`}
            hint="Varies enormously by region and by whether the work is fixed-price or time and materials." />
          <Slider label="Programme duration" value={dur} set={setDur} min={1} max={5} step={0.5} unit=" years"
            hint="The same engineer-years compressed into less calendar means more people at once, which is usually the harder constraint." />
        </div>
      </div>

      <h2 className="sec">Before you believe any of it</h2>
      <div className="card" style={{ borderColor: 'var(--warn)' }}>
        <ul className="small" style={{ lineHeight: 1.7, paddingLeft: 18, marginTop: 4 }}>
          {ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </div>
      <p className="small" style={{ marginTop: 14, maxWidth: '68ch' }}>
        The number worth taking away is not the cost. It is which line went red first — most chip
        ideas do not fail on the thing their authors were worried about.
      </p>
    </div>
  )
}
