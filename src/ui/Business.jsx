import React, { useState } from 'react'
import {
  PHASES, NODE_COSTS, MARKETS, RULES,
  totalNre, breakEvenUnits, cashFlow, d0AtQuarter,
} from '../lib/business.js'
import { computeRun, fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

const NRE_ICON = {
  'Mask set': 'wafer', Engineering: 'eda', 'EDA licences': 'eda',
  'IP licensing': 'iplicense', Respins: 'die', 'Total NRE': 'foundry',
}

const usd = (v) => {
  if (!Number.isFinite(v)) return '—'
  const s = v < 0 ? '−' : ''
  const a = Math.abs(v)
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}k`
  return `${s}$${a.toFixed(2)}`
}
const units = (v) => {
  if (!Number.isFinite(v)) return 'never'
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`
  return v.toFixed(0)
}

/** Cumulative cash. The shape is the story: a long hole, then maybe a climb. */
function CashChart({ cf }) {
  const W = 700, H = 240, PL = 62, PB = 34
  const rows = cf.rows
  const lo = Math.min(0, ...rows.map((r) => r.cum))
  const hi = Math.max(0, ...rows.map((r) => r.cum))
  const span = hi - lo || 1
  const x = (i) => PL + (i / (rows.length - 1)) * (W - PL - 16)
  const y = (v) => H - PB - ((v - lo) / span) * (H - PB - 18)
  const zero = y(0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="255" role="img"
      aria-label="Cumulative cash flow across the product lifetime">
      <rect x={PL} y="14" width={x(cf.devQuarters - 1) - PL} height={H - PB - 14}
        fill="var(--bad)" opacity=".07" />
      <text x={PL + 8} y="28" fill="var(--bad)" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
        development — money out only
      </text>
      <line x1={PL} y1={zero} x2={W - 16} y2={zero} stroke="var(--border)" strokeWidth="1.4" />
      <polyline points={rows.map((r, i) => `${x(i)},${y(r.cum)}`).join(' ')}
        fill="none" stroke="var(--accent)" strokeWidth="2.4" />
      {cf.payback !== null && (
        <g>
          <line x1={x(cf.payback)} y1="14" x2={x(cf.payback)} y2={H - PB} stroke="var(--ok)" strokeDasharray="4 3" />
          <text x={x(cf.payback) + 5} y="44" fill="var(--ok)" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>
            payback Q{cf.payback}
          </text>
        </g>
      )}
      <text x={PL - 8} y={y(hi) + 5} textAnchor="end" fill="var(--muted)" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{usd(hi)}</text>
      <text x={PL - 8} y={zero + 5} textAnchor="end" fill="var(--muted)" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>0</text>
      <text x={PL - 8} y={y(lo) + 5} textAnchor="end" fill="var(--muted)" style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{usd(lo)}</text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fill="var(--muted)" style={{ fontSize: 14 }}>
        Quarters from programme start
      </text>
    </svg>
  )
}

export default function Business({ cfg, goTab }) {
  const [node, setNode] = useState('5 nm')
  const [market, setMarket] = useState('phone')
  const [engCost, setEngCost] = useState(250)
  const [respins, setRespins] = useState(1)
  const [baseRespin, setBaseRespin] = useState(true)
  const [phase, setPhase] = useState('rtl')

  const m = MARKETS.find((x) => x.id === market)
  const nre = totalNre({
    node, engineerCostUsd: engCost * 1000, respins, respinIsBase: baseRespin,
  })
  const run = computeRun(cfg)
  const costPerUnit = Number.isFinite(run.costPerGoodDie) ? run.costPerGoodDie : 0
  const asp = cfg.asp > 0 ? cfg.asp : 0
  const be = breakEvenUnits(nre.total, asp, costPerUnit)
  const cf = cashFlow({
    nre: nre.total, asp: asp || 1, costPerUnit,
    peakUnitsPerQ: m.peakUnitsPerQ, lifeQuarters: m.life,
    erosionPerYear: m.erosion,
  })
  const p = PHASES.find((x) => x.id === phase)
  const totalMonths = PHASES.reduce((n, x) => n + x.months, 0)
  const published = NODE_COSTS.find((x) => x.node === node)

  return (
    <div>
      <div className="eyebrow">Business</div>
      <h1 className="title">Zero to market.<br />Four years and half a billion dollars.</h1>
      <p className="lede">
        Every other tab answers whether a chip can be made. This one answers whether it should be —
        a different question, and usually the one that kills a programme. A design that yields
        beautifully is still a bad idea if the money to get there can never be earned back.
      </p>

      <h2 className="sec">The seven phases</h2>
      <div className="bizline">
        {PHASES.map((x) => (
          <button
            key={x.id}
            className={`bizphase ${phase === x.id ? 'on' : ''}`}
            style={{ flex: x.months }}
            onClick={() => setPhase(x.id)}
            aria-pressed={phase === x.id}
            // Blocks are sized by duration, so the one-month tapeout is
            // necessarily narrow and its label has to truncate. The tooltip
            // carries the full text on hover and on keyboard focus; the
            // aria-label carries it for screen readers, which never see the
            // truncation in the first place.
            data-tip={`${x.name} — ${x.months} months, ${fmt.pct(x.cashShare, 0)} of the budget`}
            aria-label={`${x.name}, ${x.months} months, ${fmt.pct(x.cashShare, 0)} of the budget`}
          >
            <span className="bizphase-n iconrow">
              <Icon name={x.icon} size={17} />
              <span className="bizphase-t">{x.name}</span>
            </span>
            <span className="bizphase-m">{x.months} mo · {fmt.pct(x.cashShare, 0)}</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
        <span className="small">Concept</span>
        <span className="small" style={{ color: 'var(--accent)' }}>
          {totalMonths} months — {(totalMonths / 12).toFixed(1)} years before the first part ships
        </span>
        <span className="small">First revenue</span>
      </div>

      <div className="detail" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="eyebrow">{p.months} months · {fmt.pct(p.cashShare, 0)} of the budget</div>
          <h3 className="iconrow" style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-.02em', marginTop: 6 }}>
            <Icon name={p.icon} size={30} style={{ color: 'var(--accent)' }} title={p.name} />{p.name}
          </h3>
          <p style={{ marginTop: 10 }}>{p.what}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>What can go wrong</dt><dd style={{ color: 'var(--warn)' }}>{p.risk}</dd>
            <dt>What kills programmes here</dt><dd>{p.kills}</dd>
            <dt>Spend in this phase</dt>
            <dd style={{ color: 'var(--accent)' }}>{usd(nre.total * p.cashShare)}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">What it costs before you sell anything</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,360px)' }}>
        <div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Non-recurring cost</th><th>Amount</th><th>Share</th><th style={{ width: 160 }}></th></tr></thead>
              <tbody>
                {[
                  ['Mask set', nre.mask, `${node} — sixty to eighty reticles, written once, non-refundable`],
                  ['Engineering', nre.people, `${nre.engineerYears} engineer-years at $${engCost}k fully loaded`],
                  ['EDA licences', nre.eda, `A full tool flow with enough seats, over ${nre.years.toFixed(1)} years`],
                  ['IP licensing', nre.ip, 'Cores, PHYs, controllers — plus per-unit royalties on top'],
                  ...(nre.respin > 0 ? [['Respins', nre.respin, `${respins} × ${baseRespin ? 'base-layer' : 'metal-only'}`]] : []),
                ].map(([k, v, note]) => (
                  <tr key={k}>
                    <td>
                      <b className="iconrow"><Icon name={NRE_ICON[k]} size={22} />{k}</b>
                      <div className="small" style={{ marginTop: 2 }}>{note}</div>
                    </td>
                    <td className="num" style={{ color: 'var(--accent)' }}>{usd(v)}</td>
                    <td className="num">{fmt.pct(v / nre.total, 0)}</td>
                    <td><div className="bar"><i style={{ width: `${(v / nre.total) * 100}%` }} /></div></td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--panel2)' }}>
                  <td><b>Total NRE</b></td>
                  <td className="num" style={{ color: 'var(--accent)' }}><b>{usd(nre.total)}</b></td>
                  <td className="num">100%</td>
                  <td className="small">before one part is sold</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            For comparison, commonly cited analyst estimates put total design cost at this node around{' '}
            <b>{usd(published.designUsd)}</b>. This build-up lands near that, which is reassuring rather
            than authoritative — published figures vary by a factor of two between sources, and no
            company publishes its real mask bill.
          </p>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="ctl">
            <label><span>Process node</span></label>
            <select value={node} onChange={(e) => setNode(e.target.value)}>
              {NODE_COSTS.map((n) => <option key={n.node} value={n.node}>{n.node}</option>)}
            </select>
            <div className="hint">
              Moving from 28 nm to 3 nm multiplies the mask bill by more than ten and the engineering
              by more than ten again. Most of the world's chips are made on nodes nobody writes
              articles about, and that is a rational choice.
            </div>
          </div>
          <div className="ctl">
            <label><span>Engineer cost</span><b>${engCost}k</b></label>
            <input type="range" min="40" max="400" step="10" value={engCost}
              onChange={(e) => setEngCost(+e.target.value)} aria-label="Fully loaded engineer cost" />
            <div className="hint">Fully loaded, per year. The single largest line in the table above at any leading-edge node.</div>
          </div>
          <div className="ctl">
            <label><span>Respins</span><b>{respins}</b></label>
            <input type="range" min="0" max="3" step="1" value={respins}
              onChange={(e) => setRespins(+e.target.value)} aria-label="Number of respins" />
            <div className="hint">
              Industry surveys have long put first-silicon success at roughly a third of designs, so
              one respin is closer to the expected case than the bad one.
            </div>
          </div>
          <button className={`btn sm ${baseRespin ? 'active' : ''}`} onClick={() => setBaseRespin((v) => !v)}>
            {baseRespin ? '◉ Base-layer respin' : '○ Metal-only respin'}
          </button>
          <p className="hint" style={{ marginTop: 8 }}>
            A metal-only fix re-writes a few upper layers and costs roughly a quarter of a mask set. A
            base-layer respin is effectively the whole thing again, plus three months.
          </p>
        </div>
      </div>

      <h2 className="sec">The one calculation</h2>
      <div className="card" style={{ borderColor: 'var(--accent)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 19, color: 'var(--accent)', textAlign: 'center', padding: '6px 0 14px' }}>
          break-even units = NRE ÷ (price − cost per unit)
        </div>
        <div className="grid g3">
          <div className="stat">
            <div className="k">NRE</div>
            <div className="v" style={{ fontSize: 24 }}>{usd(nre.total)}</div>
            <div className="sub">at {node}, {respins} respin{respins === 1 ? '' : 's'}</div>
          </div>
          <div className="stat">
            <div className="k">Cost per unit</div>
            <div className="v" style={{ fontSize: 24 }}>{usd(costPerUnit)}</div>
            <div className="sub">
              from your {cfg.dieX}×{cfg.dieY} mm die
              <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('wafer')}>change</button>
            </div>
          </div>
          <div className={`stat ${be.margin > 0 ? 'ok' : 'bad'}`}>
            <div className="k">Margin per unit</div>
            <div className="v" style={{ fontSize: 24 }}>{asp > 0 ? usd(be.margin) : '—'}</div>
            <div className="sub">
              {asp > 0 ? `at a ${usd(asp)} price` : 'set a price on the Economics tab'}
              {asp <= 0 && <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => goTab('economics')}>set</button>}
            </div>
          </div>
        </div>
        <div className="grid g2" style={{ marginTop: 12 }}>
          <div className={`stat ${Number.isFinite(be.units) ? 'hi' : 'bad'}`}>
            <div className="k">Units to break even</div>
            <div className="v">{units(be.units)}</div>
            <div className="sub">
              {Number.isFinite(be.units)
                ? `${fmt.n((be.units / m.peakUnitsPerQ), 1)} quarters at peak volume for ${m.name.toLowerCase()}`
                : 'the price does not cover the unit cost — no volume fixes this'}
            </div>
          </div>
          <div className="stat">
            <div className="k">Wafers required</div>
            <div className="v">{run.goodDies > 0 && Number.isFinite(be.units) ? units(be.units / run.goodDies) : '—'}</div>
            <div className="sub">at {fmt.n(run.goodDies)} good dies per wafer</div>
          </div>
        </div>
      </div>

      <h2 className="sec">The hole before the climb</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {MARKETS.map((x) => (
          <button key={x.id} className={`btn ${market === x.id ? 'active' : ''}`} onClick={() => setMarket(x.id)}>{x.name}</button>
        ))}
      </div>
      <div className="card">
        <CashChart cf={cf} />
        <p className="small" style={{ marginTop: 6 }}>{m.note}</p>
      </div>
      <div className="grid g3" style={{ marginTop: 12 }}>
        <div className={`stat ${cf.payback !== null ? 'ok' : 'bad'}`}>
          <div className="k">Payback</div>
          <div className="v">{cf.payback !== null ? `Q${cf.payback}` : 'Never'}</div>
          <div className="sub">{cf.payback !== null ? `${(cf.payback / 4).toFixed(1)} years from programme start` : 'this product never earns its NRE back'}</div>
        </div>
        <div className="stat bad">
          <div className="k">Deepest the hole gets</div>
          <div className="v" style={{ fontSize: 24 }}>{usd(cf.peakDeficit)}</div>
          <div className="sub">peak financing requirement</div>
        </div>
        <div className={`stat ${cf.everProfitable ? 'ok' : 'bad'}`}>
          <div className="k">Lifetime result</div>
          <div className="v" style={{ fontSize: 24 }}>{usd(cf.finalCum)}</div>
          <div className="sub">{units(cf.totalUnits)} units, {usd(cf.totalRevenue)} revenue</div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Prices erode at {fmt.pct(m.erosion, 0)} a year in this market while unit cost falls as yield
        learns — defect density typically starts several times its mature value and halves every few
        quarters, from about {d0AtQuarter(0).toFixed(2)} to {d0AtQuarter(12).toFixed(2)} defects/cm²
        over three years. The two race each other, and if price wins the margin window closes. This is
        why a two-quarter launch slip can be fatal rather than merely embarrassing.
      </p>

      <h2 className="sec">Try changing the node</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Node</th><th>Mask set</th><th>Total NRE</th><th>Break-even units</th><th>Payback</th><th>Lifetime result</th></tr></thead>
          <tbody>
            {NODE_COSTS.map((n) => {
              const nn = totalNre({ node: n.node, engineerCostUsd: engCost * 1000, respins, respinIsBase: baseRespin })
              const bb = breakEvenUnits(nn.total, asp, costPerUnit)
              const cc = cashFlow({
                nre: nn.total, asp: asp || 1, costPerUnit,
                peakUnitsPerQ: m.peakUnitsPerQ, lifeQuarters: m.life, erosionPerYear: m.erosion,
              })
              return (
                <tr key={n.node} style={{ cursor: 'pointer', background: n.node === node ? 'var(--panel2)' : undefined }}
                  onClick={() => setNode(n.node)}>
                  <td><b>{n.node}</b></td>
                  <td className="num">{usd(n.maskUsd)}</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{usd(nn.total)}</td>
                  <td className="num">{units(bb.units)}</td>
                  <td className="num" style={{ color: cc.payback !== null ? 'var(--ok)' : 'var(--bad)' }}>
                    {cc.payback !== null ? `Q${cc.payback}` : 'never'}
                  </td>
                  <td className="num" style={{ color: cc.finalCum > 0 ? 'var(--ok)' : 'var(--bad)' }}>{usd(cc.finalCum)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Note the column that flips. For a low-price, high-volume part there is a node above which the
        programme never pays back — not because the chip is worse, but because the NRE cannot be
        amortised over the units the market will absorb. The older node makes the better product, and
        that is the honest reason most silicon is not leading-edge.
      </p>

      <h2 className="sec">Four things that are always true</h2>
      <div className="grid g2">
        {RULES.map((r) => (
          <div className="card" key={r.k}>
            <div className="eyebrow">{r.k}</div>
            <p style={{ marginTop: 8 }}>{r.what}</p>
          </div>
        ))}
      </div>

      <p className="small" style={{ marginTop: 16, maxWidth: '68ch' }}>
        Every cost here is a widely-cited industry estimate, and they vary by a factor of two or more
        between sources and between companies. The ratios between nodes are more reliable than any
        single figure, and the shape of the cash curve is more reliable than either. Unit cost and
        wafer economics come from the die you configured in the yield lab, so changing it changes
        this.
      </p>
    </div>
  )
}
