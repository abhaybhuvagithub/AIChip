import React, { useState } from 'react'
import {
  estimateResources, physicalPerLogical, logicalErrorRate, requiredDistance,
  THRESHOLD, ALGORITHMS, MODALITIES, FAB_DIFFERENCES, SHARED,
} from '../lib/quantum.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

function dur(s) {
  if (!Number.isFinite(s)) return '—'
  if (s < 60) return `${s.toFixed(1)} s`
  if (s < 3600) return `${(s / 60).toFixed(1)} min`
  if (s < 86400) return `${(s / 3600).toFixed(1)} hours`
  if (s < 86400 * 365) return `${(s / 86400).toFixed(1)} days`
  const y = s / (86400 * 365)
  return y > 1e6 ? `${y.toExponential(1)} years` : `${fmt.n(y, 0)} years`
}

/** The code lattice, drawn. Distance is the number of cells on a side, and
 *  that is also the number of errors it takes to cross it undetected. */
function Lattice({ d }) {
  const n = Math.min(d, 15)
  const cell = 100 / n
  const cells = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells.push([x, y])
  return (
    <svg viewBox="0 0 100 100" width="100%" height="180" role="img" aria-label={`Surface code lattice at distance ${d}`}>
      {cells.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x * cell} y={y * cell} width={cell} height={cell}
          fill={(x + y) % 2 ? 'var(--accent)' : 'transparent'} fillOpacity={(x + y) % 2 ? 0.16 : 0}
          stroke="var(--border)" strokeWidth="0.4" />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={i * cell + cell / 2} cy={i * cell + cell / 2} r={cell * 0.13} fill="var(--bad)" />
      ))}
      <path d={`M ${cell / 2} ${cell / 2} L ${(n - 1) * cell + cell / 2} ${(n - 1) * cell + cell / 2}`}
        stroke="var(--bad)" strokeWidth="0.7" strokeDasharray="2 2" fill="none" />
    </svg>
  )
}

export default function Quantum() {
  const [p, setP] = useState(0.001)
  const [algo, setAlgo] = useState('shor')
  const [factory, setFactory] = useState(1.5)
  const [cycleUs, setCycleUs] = useState(1)
  const [modality, setModality] = useState('transmon')

  const a = ALGORITHMS.find((x) => x.id === algo)
  const est = estimateResources({ p, logicalQubits: a.logical, tGates: a.t, factoryOverhead: factory, cycleUs })
  const m = MODALITIES.find((x) => x.id === modality)
  const above = p >= THRESHOLD

  return (
    <div>
      <div className="eyebrow">Quantum</div>
      <h1 className="title">The other kind of chip,<br />built on the same tools.</h1>
      <p className="lede">
        A quantum processor comes out of a cleanroom that would be recognisable to anyone who has
        worked in a fab — the same scanners, the same etchers, the same discipline. Almost everything
        else is different, starting with the fact that a good chip has a thousand devices rather than
        a hundred billion.
      </p>

      <h2 className="sec">What a qubit costs</h2>
      <p className="small" style={{ marginBottom: 14, maxWidth: '62ch' }}>
        Qubit counts in headlines are physical qubits. Algorithms need logical ones, and the exchange
        rate is set by how good your hardware is. Move the error rate below and watch it.
      </p>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(260px,340px)' }}>
        <div>
          <div className="grid g3">
            <div className={`stat ${above ? 'bad' : 'hi'}`}>
              <div className="k">Physical qubits needed</div>
              <div className="v">{est.ok ? fmt.n(est.totalQubits) : '∞'}</div>
              <div className="sub">{est.ok ? `${fmt.n(est.perLogical)} per logical qubit` : 'error correction cannot help here'}</div>
            </div>
            <div className="stat">
              <div className="k">Code distance</div>
              <div className="v">{est.ok ? est.d : '—'}</div>
              <div className="sub">{est.ok ? `survives ${Math.floor((est.d - 1) / 2)} simultaneous errors` : '—'}</div>
            </div>
            <div className="stat">
              <div className="k">Runtime</div>
              <div className="v" style={{ fontSize: 24 }}>{est.ok ? dur(est.seconds) : '—'}</div>
              <div className="sub">{fmt.n(a.t)} T gates, serially</div>
            </div>
            <div className="stat">
              <div className="k">Logical qubits</div>
              <div className="v">{fmt.n(a.logical)}</div>
              <div className="sub">what the algorithm actually asks for</div>
            </div>
            <div className="stat">
              <div className="k">Logical error rate</div>
              <div className="v" style={{ fontSize: 24 }}>{est.ok ? est.achievedPL.toExponential(1) : '—'}</div>
              <div className="sub">target {est.targetPL.toExponential(1)}</div>
            </div>
            <div className="stat">
              <div className="k">Overhead</div>
              <div className="v">{est.ok ? `${fmt.n(est.totalQubits / a.logical)}×` : '—'}</div>
              <div className="sub">physical per logical, all in</div>
            </div>
          </div>

          {above && (
            <div className="card" style={{ marginTop: 12, borderColor: 'var(--bad)' }}>
              <div className="eyebrow" style={{ color: 'var(--bad)' }}>Above threshold</div>
              <p style={{ fontSize: 18, lineHeight: 1.6, marginTop: 6 }}>
                At {fmt.pct(p, 2)} per operation you are above the surface code threshold of {fmt.pct(THRESHOLD, 0)}.
                Adding qubits now makes things <i>worse</i>: the correction machinery introduces more errors
                than it removes. This is the wall the entire hardware effort exists to get under, and
                getting under it is a physics problem, not a manufacturing one.
              </p>
            </div>
          )}

          {est.ok && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="eyebrow">The lattice at distance {est.d}</div>
              <Lattice d={est.d} />
              <p className="small" style={{ marginTop: 8 }}>
                One logical qubit is a patch of {est.d}×{est.d} data qubits with a measurement qubit between
                each pair — {fmt.n(est.perLogical)} physical qubits in total. An undetected logical error requires
                a chain of {Math.ceil((est.d + 1) / 2)} physical errors to cross the patch, which is why increasing the
                distance by two buys an order of magnitude rather than a few percent.
              </p>
            </div>
          )}
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="eyebrow">Controls</div>
          <div className="ctl">
            <label><span>Algorithm</span></label>
            <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
              {ALGORITHMS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <div className="hint">{a.note}</div>
          </div>

          <div className="ctl">
            <label><span>Physical error rate</span><b>{(p * 100).toFixed(3)}%</b></label>
            <input type="range" min="0.00005" max="0.02" step="0.00005" value={p}
              onChange={(e) => setP(parseFloat(e.target.value))} aria-label="Physical error rate" />
            <div className="hint">
              The best two-qubit gates demonstrated sit near 0.1–0.5%. The threshold is 1%. Every factor
              of ten below it removes roughly a factor of four from the qubit count.
            </div>
          </div>

          <div className="ctl">
            <label><span>Magic state overhead</span><b>{factory.toFixed(1)}×</b></label>
            <input type="range" min="1" max="10" step="0.1" value={factory}
              onChange={(e) => setFactory(parseFloat(e.target.value))} aria-label="Magic state overhead" />
            <div className="hint">
              The surface code cannot do T gates directly; they are distilled in dedicated factories that
              often dominate the chip. Published estimates for the same algorithm differ tenfold mostly
              because of this one factor.
            </div>
          </div>

          <div className="ctl">
            <label><span>Correction cycle</span><b>{cycleUs} µs</b></label>
            <input type="range" min="0.1" max="20" step="0.1" value={cycleUs}
              onChange={(e) => setCycleUs(parseFloat(e.target.value))} aria-label="Correction cycle time" />
            <div className="hint">Superconducting qubits cycle in about a microsecond. Trapped ions are a hundred times slower, and it shows up directly in the runtime above.</div>
          </div>
        </div>
      </div>

      <h2 className="sec">Error rate against qubit count</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Physical error</th><th>Distance</th><th>Per logical qubit</th><th>Total for this algorithm</th><th>Logical error</th></tr></thead>
          <tbody>
            {[0.0001, 0.0005, 0.001, 0.002, 0.005, 0.008, 0.012].map((pp) => {
              const e = estimateResources({ p: pp, logicalQubits: a.logical, tGates: a.t, factoryOverhead: factory, cycleUs })
              const d = requiredDistance(pp, e.targetPL)
              return (
                <tr key={pp} style={Math.abs(pp - p) < 0.00006 ? { background: 'var(--panel2)' } : undefined}>
                  <td className="num">{(pp * 100).toFixed(2)}%</td>
                  <td className="num">{d ?? '—'}</td>
                  <td className="num">{d ? fmt.n(physicalPerLogical(d)) : '—'}</td>
                  <td className="num" style={{ color: e.ok ? 'var(--accent)' : 'var(--bad)' }}>
                    {e.ok ? fmt.n(e.totalQubits) : 'impossible'}
                  </td>
                  <td className="num">{d ? logicalErrorRate(pp, d).toExponential(1) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Note what happens between 0.8% and 1.2%. The cost is not gradual — it goes vertical as the error
        rate approaches threshold, and past it there is no number of qubits that works. Hardware quality
        is not one input among many; it decides whether the machine can exist at all.
      </p>

      <h2 className="sec">Five ways to build one</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {MODALITIES.map((x) => (
          <button key={x.id} className={`btn iconrow ${modality === x.id ? 'active' : ''}`} onClick={() => setModality(x.id)}>
            <Icon name={x.icon} size={20} />{x.short || x.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <div className="eyebrow">How it is made</div>
          <h3 className="iconrow"><Icon name={m.icon} size={32} style={{ color: 'var(--accent)' }} title={m.name} />{m.name}</h3>
          <p style={{ marginTop: 10 }}>{m.fab}</p>
          <p className="phys">{m.hard}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Operating temperature</dt><dd>{m.temp}</dd>
            <dt>Gate time</dt><dd>{m.gate}</dd>
            <dt>Coherence time</dt><dd>{m.coherence}</dd>
            <dt>Argument for</dt><dd style={{ color: 'var(--ok)' }}>{m.pro}</dd>
            <dt>Argument against</dt><dd style={{ color: 'var(--warn)' }}>{m.con}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">Classical fab against quantum fab</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th></th><th>Logic chip</th><th>Quantum chip</th><th style={{ width: '44%' }}>Why it differs</th></tr></thead>
          <tbody>
            {FAB_DIFFERENCES.map((f) => (
              <tr key={f.k}>
                <td><b>{f.k}</b></td>
                <td className="small">{f.classical}</td>
                <td className="small" style={{ color: 'var(--accent)' }}>{f.quantum}</td>
                <td className="small">{f.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="sec">What the two share</h2>
      <div className="card">
        <p className="small" style={{ marginBottom: 10 }}>
          Superconducting and spin qubits are made on equipment that came from the semiconductor
          industry, by people trained in it. The transferable part is large:
        </p>
        <dl className="kv"><dd><ul>{SHARED.map((s) => <li key={s}>{s}</li>)}</ul></dd></dl>
        <p className="small" style={{ marginTop: 12 }}>
          What does not transfer is the thing a fab is best at. Semiconductor manufacturing is a
          statistical discipline: make a hundred billion devices, accept that some fail, design around
          it. A quantum processor has no defect budget in that sense — the surface code assumes a
          working lattice, and there is no binning, no redundancy, and no lower-grade SKU for a chip
          with a bad qubit in the middle of it.
        </p>
      </div>
    </div>
  )
}
