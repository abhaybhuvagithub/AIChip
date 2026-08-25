import React from 'react'
import { computeThroughput, ops, watts, PRECISIONS, LADDER, SCALE_NAMES, DEFAULT_COMPUTE } from '../lib/compute.js'
import { computeRun, fmt } from '../lib/fab.js'

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

export default function Compute({ cfg, patch }) {
  const c = { ...DEFAULT_COMPUTE, ...(cfg.compute || {}) }
  const setC = (d) => patch({ compute: { ...c, ...d } })
  const y = computeRun(cfg)
  const r = computeThroughput(cfg, c, y)

  return (
    <div>
      <div className="eyebrow">Compute</div>
      <h1 className="title">A trillion operations a second<br />is the floor, not the ceiling.</h1>
      <p className="lede">
        Everything on the other tabs decides how much silicon you get. This one turns that silicon into
        operations — and shows why the headline numbers grew faster than transistor counts ever did.
        The die here is the one you configured in the yield lab.
      </p>

      <div className="grid g3" style={{ marginTop: 20 }}>
        <div className="stat hi">
          <div className="k">Peak, one die</div>
          <div className="v">{ops(r.opsPerDie)}</div>
          <div className="sub">{r.prec.label}{c.sparsity > 1 ? ', with sparsity' : ', dense'}</div>
        </div>
        <div className="stat">
          <div className="k">Achieved on real work</div>
          <div className="v">{ops(r.achieved)}</div>
          <div className="sub">at {fmt.pct(c.utilisation, 0)} of peak</div>
        </div>
        <div className="stat">
          <div className="k">At {r.rung.label.toLowerCase()}</div>
          <div className="v">{ops(r.peakAtScale)}</div>
          <div className="sub">{watts(r.powerAtScale)} to run it</div>
        </div>
        <div className="stat">
          <div className="k">Per wafer</div>
          <div className="v">{ops(r.opsPerWafer)}</div>
          <div className="sub">across {fmt.n(r.goodDies)} good dies</div>
        </div>
        <div className="stat">
          <div className="k">Per watt</div>
          <div className="v">{ops(r.opsPerWatt, 2)}</div>
          <div className="sub">the number that actually limits a datacentre</div>
        </div>
        <div className="stat">
          <div className="k">Per dollar of silicon</div>
          <div className="v">{ops(r.opsPerDollar, 2)}</div>
          <div className="sub">against {fmt.usd(y.costPerGoodDie)} per good die</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="eyebrow">The die</div>
          <Slider label="Transistor density" value={c.density} set={(v) => setC({ density: v })}
            min={1} max={400} step={1} unit=" MTr/mm²"
            hint={`${fmt.n(r.transistors / 1e9, 1)} billion transistors on ${fmt.n(r.areaMm, 0)} mm². Change the die size on the yield lab tab.`} />

          <Slider label="Transistors per delivered MAC" value={c.trPerMac} set={(v) => setC({ trPerMac: v })}
            min={20000} max={600000} step={5000} fmtV={(v) => fmt.n(v)}
            hint="Amortised across the whole die. A tensor MAC lane is a few thousand transistors, but each one needs SRAM, scheduling and memory bandwidth around it — and that is most of the die." />

          <Slider label="Clock" value={c.clockGHz} set={(v) => setC({ clockGHz: v })}
            min={0.5} max={5} step={0.1} unit=" GHz" />

          <Slider label="Power" value={c.wattsPerDie} set={(v) => setC({ wattsPerDie: v })}
            min={5} max={2000} step={5} unit=" W"
            hint="Above roughly 700 W a die needs liquid cooling. Above 1 kW the package, not the silicon, is the engineering problem." />

          <div className="row">
            <span className="badge">{fmt.n(r.macs)} MAC lanes</span>
            <span className="badge on">{ops(r.opsPerDie)}</span>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">How you count</div>
          <div className="ctl">
            <label><span>Precision</span></label>
            <select value={c.precision} onChange={(e) => setC({ precision: e.target.value })}>
              {PRECISIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <div className="hint">{r.prec.use}</div>
          </div>

          <div className="ctl">
            <label><span>Sparsity</span><b>{c.sparsity}×</b></label>
            <div className="row">
              <button className={`btn sm ${c.sparsity === 1 ? 'active' : ''}`} onClick={() => setC({ sparsity: 1 })}>Dense</button>
              <button className={`btn sm ${c.sparsity === 2 ? 'active' : ''}`} onClick={() => setC({ sparsity: 2 })}>2:4 structured</button>
            </div>
            <div className="hint">Structured sparsity skips half the multiplies, and vendors count the skipped ones. It doubles the number on the datasheet without adding a transistor.</div>
          </div>

          <Slider label="Achieved utilisation" value={c.utilisation} set={(v) => setC({ utilisation: v })}
            min={0.05} max={1} step={0.01} fmtV={(v) => fmt.pct(v, 0)}
            hint="Peak assumes every lane is fed every cycle. Real training runs land between 30% and 60%; memory bandwidth, not arithmetic, is usually why." />

          <div className="ctl">
            <label><span>Scale</span></label>
            <select value={c.scale} onChange={(e) => setC({ scale: e.target.value })}>
              {LADDER.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <div className="hint">{r.rung.note}</div>
          </div>
        </div>
      </div>

      <h2 className="sec">The same silicon, counted six ways</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '62ch' }}>
        Not one transistor changes between these rows. Dropping from FP64 to FP4 multiplies the headline
        figure by sixty-four, because a narrower number needs a smaller multiplier and you can fit more
        of them. This is most of why accelerator throughput has outrun Moore's law — the arithmetic got
        cheaper, not just denser.
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Precision</th><th>Relative</th><th>Peak per die</th><th>Per rack</th><th style={{ width: '38%' }}>Where it is used</th></tr></thead>
          <tbody>
            {PRECISIONS.map((p) => {
              const rr = computeThroughput(cfg, { ...c, precision: p.id }, y)
              return (
                <tr key={p.id} style={p.id === c.precision ? { background: 'var(--panel2)' } : undefined}>
                  <td><b>{p.label}</b>{p.id === c.precision && <span className="badge on" style={{ marginLeft: 8 }}>in use</span>}</td>
                  <td className="num">{p.mult < 1 ? `1/${Math.round(1 / p.mult)}×` : `${p.mult}×`}</td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{ops(rr.opsPerDie)}</td>
                  <td className="num">{ops(rr.opsPerDie * 144)}</td>
                  <td className="small">{p.use}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="sec">Where the trillions add up</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Scale</th><th>Dies</th><th>Peak</th><th>Power</th><th style={{ width: '40%' }}>What it is</th></tr></thead>
          <tbody>
            {LADDER.map((l) => (
              <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setC({ scale: l.id })}>
                <td><b>{l.label}</b></td>
                <td className="num">{fmt.n(l.mult)}</td>
                <td className="num" style={{ color: 'var(--accent)' }}>{ops(r.opsPerDie * l.mult)}</td>
                <td className="num">{watts(c.wattsPerDie * l.mult)}</td>
                <td className="small">{l.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec">The names for the big numbers</h2>
      <div className="grid g2">
        {SCALE_NAMES.map((s) => {
          const reached = r.peakAtScale >= Math.pow(10, s.exp)
          return (
            <div className="card" key={s.prefix} style={reached ? { borderColor: 'var(--accent)' } : undefined}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="eyebrow" style={{ margin: 0 }}>10<sup>{s.exp}</sup> · {s.unit}</div>
                <span className={`badge ${reached ? 'on' : ''}`}>{reached ? 'reached' : 'not yet'}</span>
              </div>
              <p className="small" style={{ marginTop: 8 }}>{s.what}</p>
            </div>
          )
        })}
      </div>

      <h2 className="sec">Why the number keeps growing after the node stops</h2>
      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Three levers, not one</div>
          <p style={{ fontSize: 16.5, lineHeight: 1.62 }}>
            Density is the slowest of the three and the only one that needs a new node. Narrowing
            precision and counting sparsity are both available on existing silicon, and both were
            spent aggressively over the last few years. That is why a datasheet figure can quadruple
            between generations that are one node apart.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">And why it will stop</div>
          <p style={{ fontSize: 16.5, lineHeight: 1.62 }}>
            Precision has a floor — below four bits the arithmetic stops being useful for most work —
            and sparsity can only be claimed once. After that, throughput growth comes back to
            density, packaging and power, which is where the reticle limit and the wall socket are
            waiting. Set precision to FP4 above and there is nowhere left to go.
          </p>
        </div>
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '62ch' }}>
        This is a first-order model. The transistors-per-MAC figure is calibrated against a
        well-documented 4 nm accelerator rather than derived from a floorplan, and real designs vary
        by a factor of two either way. Treat it as the shape of the trade-off.
      </p>
    </div>
  )
}
