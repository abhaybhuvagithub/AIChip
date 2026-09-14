import React, { useState } from 'react'
import { DISCIPLINES, ETHICS, PRINCIPLES } from '../data/ethics.js'
import {
  perStepYield, ppmPerStep, lineYieldFrom, sigmaFromDpmo,
  escapes, ESCAPE_STAGES, DPPM_TARGETS,
} from '../lib/rigor.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'
import { EVENTS, CASES, DEFENCES, recovery } from '../lib/disaster.js'
import { SOURCES } from '../data/sources.js'

const money = (v) => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`
  return `$${v}`
}

export default function Ethics() {
  const [evt, setEvt] = useState('fire')
  const [caseId, setCaseId] = useState('renesas')
  const [cycle, setCycle] = useState(90)
  const disaster = EVENTS.find((x) => x.id === evt)
  const base = { wafersPerDay: 1700, cycleTimeDays: cycle, waferPriceUsd: 6000 }
  const rec = recovery({ ...base, ...disaster })
  const kase = CASES.find((c) => c.id === caseId)
  const [steps, setSteps] = useState(700)
  const [target, setTarget] = useState(0.99)
  const [disc, setDisc] = useState('copy')
  const [eth, setEth] = useState('integrity')
  const [coverage, setCoverage] = useState(0.985)
  const [defective, setDefective] = useState(0.02)
  const [shipped, setShipped] = useState(100)

  const y = perStepYield(steps, target)
  const ppm = ppmPerStep(steps, target)
  const d = DISCIPLINES.find((x) => x.id === disc)
  const e = ETHICS.find((x) => x.id === eth)
  const esc = escapes({ defectiveFraction: defective, testCoverage: coverage, unitsShipped: shipped * 1e6 })

  return (
    <div>
      <div className="eyebrow">Discipline and ethics</div>
      <h1 className="title">Flawless is the wrong target.<br />Here is the right one.</h1>
      <p className="lede">
        A culture that expects perfection is a culture where problems get hidden, because admitting
        one marks you out. The disciplines below exist because failure is certain — they are built to
        make it detectable, contained and recoverable. The best fabs are not the ones without
        excursions. They are the ones that find an excursion in hours rather than weeks.
      </p>

      {/* ------------------------------------------- why discipline is math */}
      <h2 className="sec">Why this cannot be done by being careful</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,360px)' }}>
        <div>
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--accent)', textAlign: 'center', padding: '4px 0 12px' }}>
              per-step yield = (line yield)<sup>1/steps</sup>
            </div>
            <div className="grid g3">
              <div className="stat hi">
                <div className="k">Every step must succeed</div>
                <div className="v" style={{ fontSize: 24 }}>{(y * 100).toFixed(4)}%</div>
                <div className="sub">to finish {fmt.pct(target, 0)} of wafers</div>
              </div>
              <div className="stat">
                <div className="k">Defect budget per step</div>
                <div className="v" style={{ fontSize: 24 }}>{ppm.toFixed(1)}</div>
                <div className="sub">parts per million, per step</div>
              </div>
              <div className="stat">
                <div className="k">Equivalent sigma</div>
                <div className="v" style={{ fontSize: 24 }}>{sigmaFromDpmo(ppm).toFixed(2)}σ</div>
                <div className="sub">six sigma is 3.4 per million</div>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: 'var(--fs-prose)', lineHeight: 1.6 }}>
              No amount of care, talent or motivation delivers {ppm.toFixed(0)} parts per million by
              attention alone. That is the entire argument for procedure, control charts, automation
              and the refusal to let anyone make an undocumented change. It is not bureaucracy — it is
              the only mechanism that works at this scale, and everything below follows from it.
            </p>
          </div>

          <div className="tbl-wrap" style={{ marginTop: 14 }}>
            <table className="tbl">
              <thead><tr><th>If every step succeeds…</th><th>…the line finishes</th><th style={{ width: 190 }}></th></tr></thead>
              <tbody>
                {[0.9999, 0.99995, 0.99999, 0.999986, 0.999995, 0.999999].map((sy) => {
                  const ly = lineYieldFrom(steps, sy)
                  return (
                    <tr key={sy}>
                      <td className="num">{(sy * 100).toFixed(4)}%</td>
                      <td className="num" style={{ color: ly > 0.9 ? 'var(--ok)' : ly > 0.5 ? 'var(--warn)' : 'var(--bad)' }}>
                        {fmt.pct(ly, 1)} of wafers
                      </td>
                      <td><div className="bar"><i style={{ width: `${ly * 100}%`, background: ly > 0.9 ? 'var(--ok)' : ly > 0.5 ? 'var(--warn)' : 'var(--bad)' }} /></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            The gap between 99.99% and 99.999% per step looks like nothing written down. Across{' '}
            {steps} steps it is the difference between losing most of your wafers and losing almost
            none. This is why an engineer who improves one step by a factor nobody can see on a chart
            has done something that shows up in the quarterly numbers.
          </p>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="ctl">
            <label><span>Process steps</span><b>{fmt.n(steps)}</b></label>
            <input type="range" min="50" max="1500" step="10" value={steps}
              onChange={(e2) => setSteps(+e2.target.value)} aria-label="Number of process steps" />
            <div className="hint">A mature-node flow is a few hundred. A leading-edge logic flow is 700 to 1,500.</div>
          </div>
          <div className="ctl">
            <label><span>Target line yield</span><b>{fmt.pct(target, 0)}</b></label>
            <input type="range" min="0.5" max="0.999" step="0.005" value={target}
              onChange={(e2) => setTarget(+e2.target.value)} aria-label="Target line yield" />
            <div className="hint">
              Wafers that survive the fab at all — separate from the defect-density yield on the yield
              lab tab, which is about dies rather than wafers.
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- the disciplines */}
      <h2 className="sec">Nine disciplines</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {DISCIPLINES.map((x) => (
          <button key={x.id} className={`btn iconrow ${disc === x.id ? 'active' : ''}`} onClick={() => setDisc(x.id)}>
            <Icon name={x.icon} size={19} />{x.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <h3 className="iconrow" style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-.02em' }}>
            <Icon name={d.icon} size={32} style={{ color: 'var(--accent)' }} title={d.name} />{d.name}
          </h3>
          <div className="one" style={{ marginTop: 6 }}>{d.one}</div>
          <p style={{ marginTop: 10 }}>{d.what}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Why it exists</dt><dd>{d.why}</dd>
            <dt>What happens without it</dt><dd style={{ color: 'var(--warn)' }}>{d.without}</dd>
          </dl>
        </div>
      </div>

      {/* ------------------------------------------------ cost of an escape */}
      <h2 className="sec">What a missed defect costs, by where it is found</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Found at</th><th>Relative cost</th><th style={{ width: '56%' }}>What that actually means</th></tr></thead>
          <tbody>
            {ESCAPE_STAGES.map((st) => (
              <tr key={st.id}>
                <td><b>{st.name}</b></td>
                <td className="num" style={{ color: st.cost >= 1e4 ? 'var(--bad)' : st.cost >= 1e2 ? 'var(--warn)' : 'var(--ok)' }}>
                  {st.cost >= 1e3 ? `${money(st.cost)}×` : `${st.cost}×`}
                </td>
                <td className="small">{st.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Roughly an order of magnitude per stage — the rule of ten. Figures are the conventional
        illustrative ratios, not accounting. The point is the shape: every gate you are tempted to
        skip is between two and five orders of magnitude cheaper than the gate after it.
      </p>

      {/* ------------------------------------------------------- escapes */}
      <h2 className="sec">Test coverage is never one</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,360px)' }}>
        <div className="grid g3">
          <div className="stat hi">
            <div className="k">Escape rate</div>
            <div className="v" style={{ fontSize: 24 }}>{esc.dppm.toFixed(0)}</div>
            <div className="sub">defective parts per million shipped</div>
          </div>
          <div className={`stat ${esc.badPartsShipped > 1e4 ? 'bad' : ''}`}>
            <div className="k">Bad parts shipped</div>
            <div className="v" style={{ fontSize: 24 }}>{fmt.n(esc.badPartsShipped)}</div>
            <div className="sub">across {shipped}M units</div>
          </div>
          <div className="stat">
            <div className="k">Meets which market</div>
            <div className="v" style={{ fontSize: 17 }}>
              {[...DPPM_TARGETS].reverse().find((t) => esc.dppm <= t.dppm)?.market || 'None of them'}
            </div>
            <div className="sub">at this escape rate</div>
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="ctl">
            <label><span>Test coverage</span><b>{(coverage * 100).toFixed(1)}%</b></label>
            <input type="range" min="0.9" max="0.9999" step="0.0005" value={coverage}
              onChange={(e2) => setCoverage(+e2.target.value)} aria-label="Test coverage" />
            <div className="hint">
              The last fraction of a percent is the expensive part, and it is where burn-in and
              system-level test earn their cost.
            </div>
          </div>
          <div className="ctl">
            <label><span>Defective fraction reaching test</span><b>{fmt.pct(defective, 1)}</b></label>
            <input type="range" min="0.001" max="0.2" step="0.001" value={defective}
              onChange={(e2) => setDefective(+e2.target.value)} aria-label="Defective fraction" />
          </div>
          <div className="ctl">
            <label><span>Units shipped</span><b>{shipped}M</b></label>
            <input type="range" min="1" max="500" step="1" value={shipped}
              onChange={(e2) => setShipped(+e2.target.value)} aria-label="Units shipped" />
          </div>
        </div>
      </div>
      <div className="tbl-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Market</th><th>Target</th><th>Bad parts at {shipped}M units</th><th style={{ width: '46%' }}>Why that target</th></tr></thead>
          <tbody>
            {DPPM_TARGETS.map((t) => (
              <tr key={t.market}>
                <td><b>{t.market}</b></td>
                <td className="num">{t.dppm} DPPM</td>
                <td className="num" style={{ color: 'var(--accent)' }}>{fmt.n((t.dppm / 1e6) * shipped * 1e6)}</td>
                <td className="small">{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --------------------------------------------------------- ethics */}

      {/* ------------------------------------------- when it is not in control */}
      <h2 className="sec">And when it is not in control at all</h2>
      <p className="small" style={{ marginBottom: 14, maxWidth: '68ch' }}>
        Everything above is about keeping a line in control. This is what happens when it goes out of
        control entirely — and the part outsiders consistently underestimate is not the damage. It is
        that a fab is a pipeline three months deep, so you lose the days it was down <i>plus</i> the
        time to refill a pipeline that is now empty. After a full restart the first wafer arrives one
        cycle time later, and nothing makes that faster.
      </p>

      <div className="row" style={{ marginBottom: 12 }}>
        {EVENTS.map((x) => (
          <button key={x.id} className={`btn sm iconrow ${evt === x.id ? 'active' : ''}`} onClick={() => setEvt(x.id)}>
            <Icon name={x.icon} size={18} />{x.name}
          </button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div>
          <div className="grid g3">
            <div className="stat">
              <div className="k">Days down</div>
              <div className="v" style={{ fontSize: 24 }}>{disaster.downtimeDays}</div>
              <div className="sub">the number everyone quotes</div>
            </div>
            <div className="stat bad">
              <div className="k">Days to full output</div>
              <div className="v" style={{ fontSize: 24 }}>{Math.round(rec.daysToFull)}</div>
              <div className="sub">
                {disaster.downtimeDays > 0
                  ? `${(rec.daysToFull / disaster.downtimeDays).toFixed(1)}× the downtime`
                  : 'nothing was damaged at all'}
              </div>
            </div>
            <div className="stat hi">
              <div className="k">Output lost</div>
              <div className="v" style={{ fontSize: 24 }}>{fmt.n(rec.wafersLost / 1000, 0)}k</div>
              <div className="sub">wafers, worth {fmt.usd(rec.revenueLostUsd)}</div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>{disaster.what}</p>
            <p className="why" style={{ marginTop: 10 }}>{disaster.why}</p>
            <p className="small" style={{ marginTop: 10 }}>
              Recovery here is paced by <b>{rec.bindingConstraint}</b>. Downtime is only{' '}
              {fmt.pct(rec.downtimeShare, 0)} of the time to full output.
            </p>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Event</th><th>Down</th><th>To full output</th><th>Work in progress lost</th><th>Paced by</th></tr></thead>
              <tbody>
                {EVENTS.map((x) => {
                  const r = recovery({ ...base, ...x })
                  return (
                    <tr key={x.id} style={{ cursor: 'pointer', background: x.id === evt ? 'var(--panel2)' : undefined }}
                      onClick={() => setEvt(x.id)}>
                      <td><b className="iconrow"><Icon name={x.icon} size={20} />{x.name}</b></td>
                      <td className="num">{x.downtimeDays} d</td>
                      <td className="num" style={{ color: 'var(--bad)' }}>{Math.round(r.daysToFull)} d</td>
                      <td className="num">{fmt.pct(x.wipLossFraction, 0)}</td>
                      <td className="small">{r.bindingConstraint}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="ctl">
            <label><span>Cycle time</span><b>{cycle} days</b></label>
            <input type="range" min="30" max="150" step="5" value={cycle}
              onChange={(e) => setCycle(+e.target.value)} aria-label="Cycle time" />
            <div className="hint">
              How deep the pipeline is. A longer cycle time means a longer refill, so the same
              incident costs more at the leading edge than on a mature line — the fab that takes
              three months to make anything takes three months to start making it again.
            </div>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            Modelled on a 50,000-wafer-a-month fab at $6,000 a wafer. The ramp is treated as linear,
            which is optimistic — real restarts are lumpier than this.
          </p>
        </div>
      </div>

      <h2 className="sec">Two that actually happened</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {CASES.map((c) => (
          <button key={c.id} className={`btn iconrow ${caseId === c.id ? 'active' : ''}`} onClick={() => setCaseId(c.id)}>
            <Icon name={c.icon} size={20} />{c.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <div className="eyebrow">{kase.date}</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 23, letterSpacing: '-.02em', marginTop: 4 }}>{kase.name}</h3>
          <p style={{ marginTop: 8 }}>{kase.what}</p>
          <p style={{ marginTop: 10 }}>{kase.recovery}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>What it cost</dt><dd style={{ color: 'var(--warn)' }}>{kase.cost}</dd>
            <dt>What it shows</dt><dd style={{ color: 'var(--accent)' }}>{kase.lesson}</dd>
            <dt>Source</dt><dd className="small">{SOURCES[kase.source].author}, {SOURCES[kase.source].venue}.</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">What is actually done about it</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        Every one of these works, and every one has a limit that is usually the reason it was not in
        place when it was needed.
      </p>
      <div className="grid g2">
        {DEFENCES.map((d) => (
          <div className="card" key={d.k}>
            <div className="iconrow" style={{ marginBottom: 6 }}>
              <Icon name={d.icon} size={24} style={{ color: 'var(--accent)' }} />
              <span className="eyebrow" style={{ margin: 0 }}>{d.k}</span>
            </div>
            <p className="small" style={{ marginTop: 4 }}>{d.what}</p>
            <p className="why" style={{ marginTop: 8 }}>{d.limit}</p>
          </div>
        ))}
      </div>

      <h2 className="sec">Eight places the judgement is real</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {ETHICS.map((x) => (
          <button key={x.id} className={`btn iconrow ${eth === x.id ? 'active' : ''}`} onClick={() => setEth(x.id)}>
            <Icon name={x.icon} size={19} />{x.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <h3 className="iconrow" style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-.02em' }}>
            <Icon name={e.icon} size={32} style={{ color: 'var(--accent)' }} title={e.name} />{e.name}
          </h3>
          <div className="one" style={{ marginTop: 6 }}>{e.stake}</div>
          <p style={{ marginTop: 10 }}>{e.what}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>What good looks like</dt><dd style={{ color: 'var(--ok)' }}>{e.good}</dd>
          </dl>
        </div>
      </div>
      {e.case && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--warn)' }}>
          <div className="eyebrow" style={{ color: 'var(--warn)' }}>A documented case</div>
          <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>{e.case}</p>
        </div>
      )}

      {/* ------------------------------------------------------ principles */}
      <h2 className="sec">Four things worth carrying out of here</h2>
      <div className="grid g2">
        {PRINCIPLES.map((p) => (
          <div className="card" key={p.k}>
            <div className="eyebrow">{p.k}</div>
            <p style={{ marginTop: 8 }}>{p.what}</p>
          </div>
        ))}
      </div>

      <p className="small" style={{ marginTop: 16, maxWidth: '68ch' }}>
        The arithmetic on this tab is exact. The disciplines are drawn from published industry
        practice and are described in general terms rather than attributed to any one company's
        internal procedure. The escape-cost ratios are the conventional illustrative figures. The
        case study is documented in contemporaneous reporting and includes the company's own
        statements, and it is presented with the causal question left where the parties left it —
        contested — because that is the honest position and because long-latency occupational disease
        is genuinely hard to attribute, which is the reason it needs handling carefully rather than
        confidently.
      </p>
    </div>
  )
}
