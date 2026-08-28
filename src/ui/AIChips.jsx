import React, { useState } from 'react'
import { ARCHITECTURES, WORKLOADS, LEVERS } from '../data/aichips.js'
import {
  KERNELS, ENERGY_PJ, ridgePoint, roofline, gemmIntensity,
  kvCacheBytes, weightBytes, decodeTokensPerSecond, trainFlops,
} from '../lib/roofline.js'
import { fmt } from '../lib/fab.js'
import { ops } from '../lib/compute.js'
import Icon from './Icon.jsx'

const gb = (b) => (b >= 1e12 ? `${(b / 1e12).toFixed(2)} TB` : `${(b / 1e9).toFixed(1)} GB`)

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

/**
 * The roofline, on log-log axes.
 *
 * The single most useful picture in accelerator engineering: a sloped line
 * where memory bandwidth limits you, a flat line where arithmetic does, and
 * every real kernel plotted against it. Almost all of them sit on the slope.
 */
function Roofline({ peakFlops, bandwidthBps, sel, onPick }) {
  const W = 760, H = 340, PL = 68, PB = 44
  const xMin = 0.2, xMax = 5000
  const yMin = peakFlops / 3000, yMax = peakFlops * 1.5
  const lx = (v) => PL + ((Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * (W - PL - 20)
  const ly = (v) => H - PB - ((Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * (H - PB - 20)
  const ridge = ridgePoint({ peakFlops, bandwidthBps })

  const pts = []
  for (let i = 0; i <= 60; i++) {
    const x = Math.pow(10, Math.log10(xMin) + (i / 60) * (Math.log10(xMax) - Math.log10(xMin)))
    pts.push(`${lx(x)},${ly(Math.max(yMin, Math.min(peakFlops, x * bandwidthBps)))}`)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="345" role="img"
      aria-label="Roofline: attainable performance against arithmetic intensity">
      {[0.1, 1, 10, 100, 1000].filter((v) => v >= xMin && v <= xMax).map((v) => (
        <g key={v}>
          <line x1={lx(v)} y1="14" x2={lx(v)} y2={H - PB} stroke="var(--border)" opacity=".4" />
          <text x={lx(v)} y={H - PB + 18} textAnchor="middle" fill="var(--muted)"
            style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{v}</text>
        </g>
      ))}
      {[1, 10, 100, 1000].map((d) => {
        const v = peakFlops / d
        if (v < yMin || v > yMax) return null
        return (
          <g key={d}>
            <line x1={PL} y1={ly(v)} x2={W - 20} y2={ly(v)} stroke="var(--border)" opacity=".3" />
            <text x={PL - 8} y={ly(v) + 4} textAnchor="end" fill="var(--muted)"
              style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{(v / 1e12).toFixed(v / 1e12 < 10 ? 1 : 0)}T</text>
          </g>
        )
      })}

      <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.4" />
      <line x1={lx(ridge)} y1="14" x2={lx(ridge)} y2={H - PB} stroke="var(--warn)" strokeDasharray="4 3" />
      <text x={lx(ridge) + 5} y="26" fill="var(--warn)" style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>
        ridge {ridge.toFixed(0)}
      </text>

      {KERNELS.map((k) => {
        const r = roofline({ peakFlops, bandwidthBps, intensity: k.intensity })
        const on = sel === k.id
        return (
          <g key={k.id} onClick={() => onPick(k.id)} style={{ cursor: 'pointer' }}
            tabIndex={0} role="button" aria-label={k.name}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(k.id) } }}>
            <title>{k.name}</title>
            <circle cx={lx(k.intensity)} cy={ly(r.attainable)} r={on ? 7 : 4.5}
              fill={r.bound === 'memory' ? 'var(--bad)' : 'var(--ok)'}
              fillOpacity={on ? 1 : 0.7} stroke="var(--bg)" strokeWidth="1.4" />
            {on && (
              <text x={lx(k.intensity) + 11} y={ly(r.attainable) + 4} fill="var(--text)"
                style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{k.name}</text>
            )}
          </g>
        )
      })}

      <text x={W / 2} y={H - 6} textAnchor="middle" fill="var(--muted)" style={{ fontSize: 9.5 }}>
        Arithmetic intensity — operations per byte moved
      </text>
      <text x={16} y={H / 2} textAnchor="middle" fill="var(--muted)"
        transform={`rotate(-90 16 ${H / 2})`} style={{ fontSize: 9.5 }}>Attainable throughput</text>
    </svg>
  )
}

export default function AIChips() {
  const [peakTf, setPeakTf] = useState(989)
  const [bwTb, setBwTb] = useState(3.35)
  const [kernel, setKernel] = useState('decode')
  const [arch, setArch] = useState('systolic')
  const [work, setWork] = useState('decode')
  const [params, setParams] = useState(70)
  const [bpp, setBpp] = useState(2)
  const [seq, setSeq] = useState(8192)
  const [batch, setBatch] = useState(32)
  const [kvHeads, setKvHeads] = useState(8)

  const peakFlops = peakTf * 1e12
  const bandwidthBps = bwTb * 1e12
  const ridge = ridgePoint({ peakFlops, bandwidthBps })
  const k = KERNELS.find((x) => x.id === kernel) || KERNELS[0]
  const r = roofline({ peakFlops, bandwidthBps, intensity: k.intensity })
  const a = ARCHITECTURES.find((x) => x.id === arch)
  const w = WORKLOADS.find((x) => x.id === work)

  const wBytes = weightBytes(params, bpp)
  const kv = kvCacheBytes({ layers: 80, kvHeads, headDim: 128, bytesPerElement: bpp, seqLen: seq, batch })
  const total = wBytes + kv.totalBytes
  const tps = decodeTokensPerSecond({ paramsB: params, bytesPerParam: bpp, bandwidthBps })

  return (
    <div>
      <div className="eyebrow">AI chips</div>
      <h1 className="title">A thousand teraflops,<br />and three of them in use.</h1>
      <p className="lede">
        What makes an accelerator an accelerator is not the number of multipliers — anyone can add
        multipliers. It is how they are fed. Almost every AI workload is limited by memory rather
        than arithmetic, and the gap between the headline figure and what you experience is entirely
        explained by one chart.
      </p>

      {/* ------------------------------------------------------- roofline */}
      <h2 className="sec">The roofline</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(280px,1fr)' }}>
        <div className="card">
          <Roofline peakFlops={peakFlops} bandwidthBps={bandwidthBps} sel={kernel} onPick={setKernel} />
          <div className="row" style={{ gap: 14, marginTop: 4 }}>
            <span className="small" style={{ color: 'var(--bad)' }}>● memory-bound</span>
            <span className="small" style={{ color: 'var(--ok)' }}>● compute-bound</span>
            <span className="small" style={{ color: 'var(--warn)' }}>┆ ridge point</span>
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="grid g2">
            <div className="stat hi">
              <div className="k">Ridge point</div>
              <div className="v" style={{ fontSize: 24 }}>{ridge.toFixed(0)}</div>
              <div className="sub">operations per byte, to saturate</div>
            </div>
            <div className={`stat ${r.utilisation < 0.3 ? 'bad' : 'ok'}`}>
              <div className="k">Chip in use</div>
              <div className="v" style={{ fontSize: 24 }}>{fmt.pct(r.utilisation, 1)}</div>
              <div className="sub">{r.bound}-bound at intensity {k.intensity}</div>
            </div>
          </div>
          <Slider label="Peak throughput" value={peakTf} set={setPeakTf} min={50} max={5000} step={10} unit=" TFLOPS" />
          <Slider label="Memory bandwidth" value={bwTb} set={setBwTb} min={0.2} max={20} step={0.05} unit=" TB/s"
            hint={`Ridge point is peak divided by bandwidth. Raising FLOPS without raising bandwidth moves the ridge right, which makes more of your workloads memory-bound — adding arithmetic can make a chip worse at real work.`} />
          <div className="row" style={{ gap: 5 }}>
            {[['H100-class', 989, 3.35], ['B200-class', 2250, 8], ['Edge NPU', 100, 0.2]].map(([n, p, b]) => (
              <button key={n} className="btn sm" onClick={() => { setPeakTf(p); setBwTb(b) }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Kernel</th><th>Intensity</th><th>Attainable</th><th>Chip in use</th><th style={{ width: 130 }}></th><th style={{ width: '34%' }}>Why</th></tr></thead>
          <tbody>
            {KERNELS.map((x) => {
              const rr = roofline({ peakFlops, bandwidthBps, intensity: x.intensity })
              return (
                <tr key={x.id} style={{ cursor: 'pointer', background: x.id === kernel ? 'var(--panel2)' : undefined }}
                  onClick={() => setKernel(x.id)}>
                  <td><b className="iconrow"><Icon name={x.icon} size={20} />{x.name}</b></td>
                  <td className="num">{x.intensity}</td>
                  <td className="num">{(rr.attainable / 1e12).toFixed(1)} TF</td>
                  <td className="num" style={{ color: rr.utilisation < 0.3 ? 'var(--bad)' : 'var(--ok)' }}>
                    {fmt.pct(rr.utilisation, 1)}
                  </td>
                  <td><div className="bar"><i style={{ width: `${rr.utilisation * 100}%`, background: rr.utilisation < 0.3 ? 'var(--bad)' : 'var(--ok)' }} /></div></td>
                  <td className="small">{x.note}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Read the bottom two rows again. Generating a single token from a language model has an
        arithmetic intensity of about one, against a ridge point of {ridge.toFixed(0)} — it uses
        roughly <b>one part in {fmt.n(ridge, 0)}</b> of the arithmetic on the chip. The multipliers
        are not slow. They are idle, waiting for weights to arrive from memory, and no amount of
        additional arithmetic changes that. A large GEMM is the only common kernel that clears the
        ridge, which is why every optimisation in this field is ultimately an attempt to turn your
        workload into one.
      </p>

      {/* ------------------------------------------------------- memory */}
      <h2 className="sec">Inference is a memory problem</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div className="grid g3">
          <div className="stat">
            <div className="k">Weights</div>
            <div className="v" style={{ fontSize: 24 }}>{gb(wBytes)}</div>
            <div className="sub">{params}B parameters at {bpp} bytes each</div>
          </div>
          <div className="stat">
            <div className="k">KV cache</div>
            <div className="v" style={{ fontSize: 24 }}>{gb(kv.totalBytes)}</div>
            <div className="sub">{(kv.perTokenBytes / 1024).toFixed(0)} kB per token, × {fmt.n(seq * batch)} tokens</div>
          </div>
          <div className={`stat ${total > 80e9 ? 'bad' : 'ok'}`}>
            <div className="k">Total footprint</div>
            <div className="v" style={{ fontSize: 24 }}>{gb(total)}</div>
            <div className="sub">{total > 80e9 ? 'will not fit one 80 GB accelerator' : 'fits a single accelerator'}</div>
          </div>
          <div className="stat hi">
            <div className="k">Accelerators needed</div>
            <div className="v" style={{ fontSize: 24 }}>{Math.ceil(total / 80e9)}</div>
            <div className="sub">at 80 GB each, for memory alone</div>
          </div>
          <div className="stat">
            <div className="k">Single-stream decode</div>
            <div className="v" style={{ fontSize: 24 }}>{tps.toFixed(0)}</div>
            <div className="sub">tokens per second, bandwidth-limited</div>
          </div>
          <div className="stat">
            <div className="k">Training this model</div>
            <div className="v" style={{ fontSize: 20 }}>{ops(trainFlops(params, 15000))}</div>
            <div className="sub">on 15 trillion tokens, at 6 FLOPs per parameter-token</div>
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Model size" value={params} set={setParams} min={1} max={700} step={1} unit="B params" />
          <Slider label="Bytes per weight" value={bpp} set={setBpp} min={0.5} max={4} step={0.5}
            hint="Quantisation is an inference technique before it is a compute one. On a memory-bound workload, halving the bytes per weight doubles the tokens per second — the arithmetic was never the constraint." />
          <Slider label="Context length" value={seq} set={setSeq} min={512} max={131072} step={512} unit=" tokens"
            fmtV={(v) => (v >= 1024 ? `${(v / 1024).toFixed(0)}k` : v)} />
          <Slider label="Concurrent requests" value={batch} set={setBatch} min={1} max={256} step={1} />
          <Slider label="Key-value heads" value={kvHeads} set={setKvHeads} min={1} max={64} step={1}
            hint="Grouped-query attention shares key-value heads across query heads. Dropping from 64 to 8 cuts the cache eightfold — a memory decision that changed how models are designed." />
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Two things fall out of this that surprise people. The KV cache can exceed the model itself at
        long context and high concurrency, so serving capacity is set by memory rather than by
        compute. And single-stream decode throughput is simply bandwidth divided by model size — the
        FLOPS figure on the datasheet does not enter the calculation at all.
      </p>

      {/* ------------------------------------------------------- energy */}
      <h2 className="sec">Why moving data is the whole problem</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Operation</th><th>Energy</th><th>Against an FP16 multiply-add</th><th style={{ width: 220 }}></th></tr></thead>
          <tbody>
            {ENERGY_PJ.map((e) => (
              <tr key={e.id}>
                <td><b>{e.name}</b><div className="small">{e.where}</div></td>
                <td className="num" style={{ color: 'var(--accent)' }}>{e.pj} pJ</td>
                <td className="num" style={{ color: e.pj / 0.4 > 100 ? 'var(--bad)' : 'var(--muted)' }}>
                  {(e.pj / 0.4).toFixed(e.pj / 0.4 < 10 ? 2 : 0)}×
                </td>
                <td><div className="bar"><i style={{ width: `${Math.min(100, (Math.log10(e.pj / 0.03) / Math.log10(640 / 0.03)) * 100)}%` }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Reading an operand from DRAM costs several hundred times the arithmetic performed on it.
        Data movement, not computation, is where the energy goes — which is the entire argument for
        on-chip memory, for locality, and for caring about arithmetic intensity at all. These are the
        widely-cited figures measured at 45 nm; the absolute values have improved and the ratios have
        held remarkably well.
      </p>

      {/* --------------------------------------------------- architectures */}
      <h2 className="sec">Five bets on how to feed the multipliers</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {ARCHITECTURES.map((x) => (
          <button key={x.id} className={`btn iconrow ${arch === x.id ? 'active' : ''}`} onClick={() => setArch(x.id)}>
            <Icon name={x.icon} size={20} />{x.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="eyebrow" style={{ margin: 0 }}>{a.example}</div>
          </div>
          <h3 className="iconrow" style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-.02em', marginTop: 4 }}>
            <Icon name={a.icon} size={32} style={{ color: 'var(--accent)' }} title={a.name} />{a.name}
          </h3>
          <div className="one">{a.one}</div>
          <p style={{ marginTop: 10 }}>{a.how}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>What it wins</dt><dd style={{ color: 'var(--ok)' }}>{a.good}</dd>
            <dt>What it costs</dt><dd style={{ color: 'var(--warn)' }}>{a.bad}</dd>
            <dt>Verdict</dt><dd style={{ color: 'var(--accent)' }}>{a.verdict}</dd>
          </dl>
        </div>
      </div>

      {/* ------------------------------------------------------ workloads */}
      <h2 className="sec">Three workloads, three different chips</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        {WORKLOADS.map((x) => (
          <button key={x.id} className={`btn iconrow ${work === x.id ? 'active' : ''}`} onClick={() => setWork(x.id)}>
            <Icon name={x.icon} size={20} />{x.name}
          </button>
        ))}
      </div>
      <div className="card">
        <dl className="kv">
          <dt>What the work looks like</dt><dd>{w.shape}</dd>
          <dt>What binds</dt><dd style={{ color: 'var(--warn)' }}>{w.binds}</dd>
          <dt>What memory holds</dt><dd>{w.memory}</dd>
          <dt>What the hardware should be</dt><dd style={{ color: 'var(--accent)' }}>{w.wants}</dd>
        </dl>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        These are different enough that building one chip for all three is a compromise, which is why
        the eighth generation of Google's TPU split into separate training and inference parts and
        why inference-specific silicon keeps appearing.
      </p>

      {/* --------------------------------------------------------- levers */}
      <h2 className="sec">Six ways to climb the roofline</h2>
      <div className="grid g2">
        {LEVERS.map((l) => (
          <div className="card" key={l.k}>
            <div className="eyebrow">{l.k}</div>
            <p className="small" style={{ marginTop: 8 }}>{l.what}</p>
          </div>
        ))}
      </div>

      <p className="small" style={{ marginTop: 18, maxWidth: '68ch' }}>
        Arithmetic intensities are representative rather than measured, and vary with shape, fusion
        and implementation — a large GEMM at 4096³ genuinely reaches {gemmIntensity(4096).toFixed(0)}{' '}
        operations per byte, and everything below it depends on how well the kernel was written.
        Transformer arithmetic uses the conventional rules of thumb: two operations per parameter per
        token for a forward pass, six for training.
      </p>
    </div>
  )
}
