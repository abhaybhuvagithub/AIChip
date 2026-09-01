import React, { useMemo } from 'react'
import { computeRun, fmt, RETICLE } from '../lib/fab.js'
import { traceBack, grams } from '../lib/chain.js'
import { computeThroughput, ops, watts, DEFAULT_COMPUTE } from '../lib/compute.js'
import { buildJourney, journeyTotals } from '../lib/journey.js'
import { stackThermal } from '../lib/thermal.js'
import WaferMap from './WaferMap.jsx'

/**
 * Everything, at once.
 *
 * Every other tab isolates one question. This one refuses to: the whole chain
 * from rock to running silicon, with the numbers from every model on the site
 * flowing through a single configuration. It exists because the connections
 * are the interesting part — a bigger die is not just a yield problem, it is
 * more quartzite, more energy, fewer parts per wafer, a different cost per
 * operation and a different cooling class, and no single tab shows that.
 */
const TAB_NAME = {
  sand: 'Sand → silicon', line: 'Fab line', wafer: 'Yield lab', economics: 'Economics',
  science: 'The science', clock: 'Clock', '3d': '3D & beyond', unsolved: 'Open problems',
  chain: 'Value chain', business: '0 → market', teams: 'Teams & roles', operate: 'Run & operate',
}

export default function GodView({ cfg, snap, goTab }) {
  const run = computeRun(cfg)
  const trace = traceBack(cfg, run)
  const c = { ...DEFAULT_COMPUTE, ...(cfg.compute || {}) }
  const thr = computeThroughput(cfg, c, run)
  const journey = useMemo(() => journeyTotals(buildJourney(70)), [])
  const th = stackThermal({ areaMm2: cfg.dieX * cfg.dieY, wattsTier: c.wattsPerDie, tiers: 1, activity: 1 })
  const area = cfg.dieX * cfg.dieY

  const flow = [
    { id: 'sand', label: 'Quartzite', value: trace.ok ? grams(trace.quartzite) : '—', sub: 'per shipped die', tab: 'sand', hue: '#8ea2c0' },
    { id: 'poly', label: 'Polysilicon', value: '9N', sub: '1 impurity per billion', tab: 'sand', hue: '#8ea2c0' },
    { id: 'wafer', label: 'Wafer', value: `${cfg.waferDia} mm`, sub: `${fmt.n(trace.wafer || 0, 0)} g of silicon`, tab: 'sand', hue: '#8ea2c0' },
    { id: 'fab', label: 'Fab', value: `${journey.steps}`, sub: 'process steps', tab: 'run', hue: '#ffb020' },
    { id: 'die', label: 'Die', value: `${fmt.n(area, 0)} mm²`, sub: `${fmt.n(run.geo.gross)} per wafer`, tab: 'wafer', hue: '#a679ff' },
    { id: 'good', label: 'Good dies', value: fmt.n(run.goodDies), sub: fmt.pct(run.dieYield) + ' yield', tab: 'wafer', hue: '#a679ff' },
    { id: 'cost', label: 'Cost', value: fmt.usd(run.costPerGoodDie), sub: 'per shippable part', tab: 'economics', hue: '#31c48d' },
    { id: 'ops', label: 'Compute', value: ops(thr.opsPerDie), sub: `peak ${thr.prec.label}`, tab: 'compute', hue: '#31c48d' },
  ]

  return (
    <div>
      <div className="eyebrow">God view ✨</div>
      <h1 className="title">One configuration.<br />Every consequence.</h1>
      <p className="lede">
        Every other tab isolates a question. This one refuses to. Change the die on the yield lab and
        watch it move the rock, the energy, the parts per wafer, the cost per operation and the
        cooling class together — because in reality they were never separate.
      </p>

      {/* Twenty-four tabs with no order is not a curriculum. Three routes
          through, so a newcomer is not left to guess. */}
      <h2 className="sec">Three ways through</h2>
      <div className="grid g3">
        {[
          { k: 'Never seen a fab', t: ['sand', 'line', 'wafer', 'economics'],
            why: 'Follow the material. Sand becomes a wafer, the wafer goes through the line, most of the dies die, and the survivors have to pay for all of it.' },
          { k: 'Want the physics', t: ['science', 'clock', '3d', 'unsolved'],
            why: 'Start with why a transistor switches, then why it stopped getting faster, then what is being done about it, then what nobody has solved.' },
          { k: 'Here for the industry', t: ['chain', 'business', 'teams', 'operate'],
            why: 'Who does what, what it costs to start, who you would have to hire, and then run one yourself for twenty quarters.' },
        ].map((path) => (
          <div className="card" key={path.k}>
            <div className="eyebrow">{path.k}</div>
            <p className="small" style={{ marginTop: 8 }}>{path.why}</p>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              {path.t.map((id, i) => (
                <React.Fragment key={id}>
                  {i > 0 && <span className="small" style={{ color: 'var(--muted)' }}>→</span>}
                  <button className="btn sm" onClick={() => goTab(id)}>{TAB_NAME[id] || id}</button>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14, borderColor: 'var(--warn)' }}>
        <div className="eyebrow" style={{ color: 'var(--warn)' }}>One thing this site cannot tell you</div>
        <p style={{ marginTop: 8, fontSize: 'var(--fs-prose)', lineHeight: 1.62 }}>
          It has never been read by anyone who does not already know the subject. Every judgement
          about what is clear, what is too dense and what order things belong in has been made by
          the person who wrote it — which is the least reliable possible source for those
          judgements. If something here is confusing, that is information the site does not
          otherwise have, and the repository is the place to say so.
        </p>
      </div>

      {/* The chain, end to end. */}
      <div className="godflow" style={{ marginTop: 22 }}>
        {flow.map((f, i) => (
          <React.Fragment key={f.id}>
            <button className="godnode" onClick={() => goTab(f.tab)} style={{ borderColor: f.hue }}>
              <div className="godnode-l" style={{ color: f.hue }}>{f.label}</div>
              <div className="godnode-v">{f.value}</div>
              <div className="godnode-s">{f.sub}</div>
            </button>
            {i < flow.length - 1 && <div className="godarrow" aria-hidden="true">→</div>}
          </React.Fragment>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(280px,1fr)', marginTop: 20 }}>
        <div>
          <div className="eyebrow">The wafer you configured</div>
          <WaferMap cfg={cfg} clustered={cfg.clustered} seed={cfg.seed} />
        </div>

        <div>
          <div className="eyebrow">The line, right now</div>
          {snap ? (
            <div className="grid g2">
              <div className="stat hi">
                <div className="k">Day</div>
                <div className="v">{fmt.n(snap.day)}</div>
                <div className="sub">{fmt.n(snap.stats.completed)} lots out</div>
              </div>
              <div className="stat">
                <div className="k">WIP</div>
                <div className="v">{fmt.n(snap.metrics.wip)}</div>
                <div className="sub">{fmt.n(snap.metrics.wip * 25)} wafers in the line</div>
              </div>
              <div className="stat">
                <div className="k">Constraint</div>
                <div className="v" style={{ fontSize: 20 }}>{snap.metrics.bottleneckName}</div>
                <div className="sub">{fmt.pct(snap.metrics.bottleneckUtil)} utilised</div>
              </div>
              <div className={`stat ${snap.metrics.xFactor > 3.5 ? 'bad' : ''}`}>
                <div className="k">Cycle time</div>
                <div className="v">{snap.metrics.avgCycleDays > 0 ? fmt.n(snap.metrics.avgCycleDays, 0) : '—'}<span style={{ fontSize: 17 }}> d</span></div>
                <div className="sub">X-factor {snap.metrics.xFactor > 0 ? fmt.n(snap.metrics.xFactor, 2) : '—'}</div>
              </div>
            </div>
          ) : (
            <div className="card">
              <p className="small">
                The line is not running. Start it on the Fab run tab and its live state appears here —
                constraint, WIP, cycle time and whatever has most recently gone wrong.
              </p>
              <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => goTab('run')}>Start the line</button>
            </div>
          )}

          {snap && snap.events.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="eyebrow">Latest from the floor</div>
              {snap.events.slice(0, 4).map((e, i) => (
                <div key={i} className="small" style={{ marginTop: 6 }}>
                  <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 14.5 }}>day {fmt.n(e.t / 24, 0)} </span>
                  {e.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="sec">Every number, one configuration</h2>
      <div className="grid g3">
        <div className="stat hi">
          <div className="k">Die</div>
          <div className="v">{cfg.dieX}×{cfg.dieY}</div>
          <div className="sub">{fmt.n(area, 0)} mm² · {run.reticleFit ? fmt.pct(area / RETICLE.area, 0) + ' of a reticle' : 'over the reticle limit'}</div>
        </div>
        <div className="stat"><div className="k">Gross dies</div><div className="v">{fmt.n(run.geo.gross)}</div><div className="sub">{fmt.n(run.geo.partial)} lost at the edge</div></div>
        <div className={`stat ${run.dieYield > 0.7 ? 'ok' : 'bad'}`}><div className="k">Yield</div><div className="v">{fmt.pct(run.dieYield)}</div><div className="sub">{run.modelMeta.label} at D₀ {cfg.d0}</div></div>
        <div className="stat"><div className="k">Cost per good die</div><div className="v">{fmt.usd(run.costPerGoodDie)}</div><div className="sub">silicon plus package</div></div>
        <div className="stat"><div className="k">Quartzite</div><div className="v">{trace.ok ? grams(trace.quartzite) : '—'}</div><div className="sub">per shipped part</div></div>
        <div className="stat"><div className="k">Energy</div><div className="v">{trace.ok ? fmt.n(trace.energy, 2) : '—'}<span style={{ fontSize: 17 }}> kWh</span></div><div className="sub">materials plus fab</div></div>
        <div className="stat"><div className="k">Compute</div><div className="v" style={{ fontSize: 22 }}>{ops(thr.opsPerDie)}</div><div className="sub">peak {thr.prec.label}</div></div>
        <div className="stat"><div className="k">Per watt</div><div className="v" style={{ fontSize: 22 }}>{ops(thr.opsPerWatt, 2)}</div><div className="sub">{watts(c.wattsPerDie)} per die</div></div>
        <div className={`stat ${th.beyondAll ? 'bad' : ''}`}><div className="k">Cooling class</div><div className="v" style={{ fontSize: 18 }}>{th.needed ? th.needed.name : 'beyond all'}</div><div className="sub">{fmt.n(th.density, 2)} W/mm²</div></div>
        <div className="stat"><div className="k">Journey</div><div className="v">{fmt.n(journey.steps)}</div><div className="sub">steps, {fmt.n(journey.km, 1)} km travelled</div></div>
        <div className="stat"><div className="k">Process time</div><div className="v">{fmt.n(journey.days, 0)}<span style={{ fontSize: 17 }}> d</span></div><div className="sub">before any queueing</div></div>
        <div className="stat"><div className="k">Peak temperature</div><div className="v">{fmt.n(journey.peakTemp)}<span style={{ fontSize: 17 }}> °C</span></div><div className="sub">crystal growth</div></div>
      </div>

      <p className="small" style={{ marginTop: 16, maxWidth: '62ch' }}>
        Nothing here is entered. Every figure is computed from the die on the yield lab tab, the
        compute settings, and — where the line is running — the live simulation. Click any node in
        the chain above to go to the tab that owns it.
      </p>
    </div>
  )
}
