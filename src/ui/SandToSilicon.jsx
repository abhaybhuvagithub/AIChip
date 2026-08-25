import React, { useEffect, useRef, useState } from 'react'
import { CHAIN, AUTOMATION, WHY_NO_HUMANS } from '../data/sand.js'
import { traceBack, nines, impurityPpb, grams } from '../lib/chain.js'
import { computeRun, fmt } from '../lib/fab.js'

const STEP_MS = 3600

export default function SandToSilicon({ cfg }) {
  const [i, setI] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const raf = useRef(0)
  const t0 = useRef(0)

  // Autoplay is the default, because the tab is about a process that runs
  // without anyone driving it. Pause exists so a reader can stop and look —
  // the only human intervention on offer, which is roughly true of the real
  // thing as well.
  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
    if (!playing || reduced) return

    t0.current = performance.now() - progress * (STEP_MS / speed)
    const tick = (now) => {
      const p = (now - t0.current) / (STEP_MS / speed)
      if (p >= 1) {
        t0.current = now
        setProgress(0)
        setI((v) => (v + 1) % CHAIN.length)
      } else {
        setProgress(p)
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
    // progress is deliberately not a dependency — it would restart the loop
    // on every frame and the animation would never advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, i])

  const s = CHAIN[i]
  const y = computeRun(cfg)
  const trace = traceBack(cfg, y)
  const traceStage = trace.stages?.find((x) => x.id === s.id)
  const maxPpb = 1e7

  // Setting `i` re-runs the animation effect, which resets the clock itself —
  // so this must not also touch t0, or the two writes race on the same frame.
  const go = (n) => { setI(n); setProgress(0) }

  return (
    <div>
      <div className="eyebrow">Sand to silicon</div>
      <h1 className="title">Rock in one end.<br />Nobody touches it again.</h1>
      <p className="lede">
        Eight refinements, running here without you. The chain takes quartz at 99% pure to silicon at
        99.9999999% and then spends that purity putting impurities back in the exact places a
        transistor needs them — and from the furnace onward, no hand goes near the material.
      </p>

      <div className="row" style={{ margin: '18px 0 14px' }}>
        <button className="btn primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? '❙❙ Pause' : '▶ Resume'}
        </button>
        <div className="row" style={{ gap: 6 }}>
          {[0.5, 1, 2, 4].map((v) => (
            <button key={v} className={`btn sm ${speed === v ? 'active' : ''}`} onClick={() => setSpeed(v)}>{v}×</button>
          ))}
        </div>
        <span className="badge">Stage {i + 1} of {CHAIN.length}</span>
        <span className="badge on">Human contacts: 0</span>
      </div>

      {/* The chain. It advances by itself; clicking a stage is optional. */}
      <div className="chain">
        {CHAIN.map((c, n) => (
          <button key={c.id} className={`link ${n === i ? 'on' : ''} ${n < i ? 'past' : ''}`}
            onClick={() => go(n)} aria-current={n === i} aria-label={c.name}>
            <div className="link-fill" style={{ width: n < i ? '100%' : n === i ? `${progress * 100}%` : '0%' }} />
            <span className="link-n">{String(n + 1).padStart(2, '0')}</span>
            <span className="link-nm">{c.name}</span>
            <span className="link-p">{nines(c.purity)}</span>
          </button>
        ))}
      </div>

      {/* Purity ladder — the signature of this tab. Impurity on a log scale,
          falling seven orders of magnitude across the chain. */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="eyebrow" style={{ margin: 0 }}>Impurity, log scale</div>
          <span className="badge on">{nines(s.purity)} · {fmt.n(impurityPpb(s.purity), impurityPpb(s.purity) < 10 ? 1 : 0)} ppb</span>
        </div>
        <div className="ladder">
          {CHAIN.map((c, n) => {
            const ppb = Math.max(1, impurityPpb(c.purity))
            const h = Math.max(3, (Math.log10(ppb) / Math.log10(maxPpb)) * 100)
            return (
              <div key={c.id} className={`rung ${n === i ? 'on' : ''}`} title={`${c.name}: ${nines(c.purity)}`}>
                <div className="rung-bar" style={{ height: `${h}%` }} />
                <div className="rung-lbl">{nines(c.purity)}</div>
              </div>
            )
          })}
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Each column is one stage. Height is impurity concentration on a logarithmic scale, so the
          drop between trichlorosilane and the Siemens reactor is a factor of a hundred, not a
          fraction of the bar it looks like. Nine nines is one foreign atom per billion — at that
          point the material conducts almost nothing, which is precisely the blank slate a
          semiconductor needs.
        </p>
      </div>

      <div className="detail" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="eyebrow">Stage {String(i + 1).padStart(2, '0')} · {s.temp}</div>
          <h3>{s.name}</h3>
          <div className="one" style={{ fontFamily: 'var(--font-mono)' }}>{s.formula}</div>
          <p style={{ color: 'var(--accent)', fontSize: 17, marginBottom: 12 }}>{s.one}</p>
          <p>{s.what}</p>
          <p className="phys">{s.chem}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>Runs without people because</dt>
            <dd>{s.autonomy}</dd>
            <dt>Purity here</dt>
            <dd style={{ color: 'var(--accent)' }}>{nines(s.purity)} — {fmt.n(impurityPpb(s.purity), 0)} impurity atoms per billion</dd>
            <dt>Mass at this point, per die</dt>
            <dd>{traceStage ? grams(traceStage.massG) : '—'}</dd>
            <dt>Energy</dt>
            <dd>{s.energyKwhPerKg > 0 ? `${fmt.n(s.energyKwhPerKg)} kWh per kg processed` : 'Negligible by mass'}</dd>
            <dt>Worth knowing</dt>
            <dd style={{ color: 'var(--accent)' }}>{s.stat}</dd>
          </dl>
        </div>
      </div>

      <h2 className="sec">How much rock is one chip?</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '62ch' }}>
        Worked backwards from the die you configured in the yield lab, through each stage's losses.
        Change the die size or defect density there and these move.
      </p>
      <div className="grid g3">
        <div className="stat hi">
          <div className="k">Quartzite per die</div>
          <div className="v">{grams(trace.quartzite)}</div>
          <div className="sub">to ship one good {cfg.dieX}×{cfg.dieY} mm part</div>
        </div>
        <div className="stat">
          <div className="k">Silicon in the die</div>
          <div className="v">{grams(trace.dieMass)}</div>
          <div className="sub">{fmt.n(trace.wafer, 0)} g wafer over {fmt.n(trace.goodDies)} good dies</div>
        </div>
        <div className="stat">
          <div className="k">Mass ratio</div>
          <div className="v">{trace.dieMass > 0 ? `${fmt.n(trace.quartzite / trace.dieMass, 1)}×` : '—'}</div>
          <div className="sub">rock in, silicon out</div>
        </div>
        <div className="stat">
          <div className="k">Energy per die</div>
          <div className="v">{fmt.n(trace.energy, 2)} kWh</div>
          <div className="sub">materials chain plus fab processing</div>
        </div>
        <div className="stat">
          <div className="k">Per wafer</div>
          <div className="v">{fmt.n(trace.energy * trace.goodDies, 0)} kWh</div>
          <div className="sub">roughly a fortnight of a household</div>
        </div>
        <div className="stat">
          <div className="k">Elapsed</div>
          <div className="v">~3 mo</div>
          <div className="sub">quarry to finished part</div>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginTop: 14 }}>
        <table className="tbl">
          <thead><tr><th>Stage</th><th>Mass per die</th><th>Purity</th><th>Impurity</th><th style={{ width: 150 }}>Mass</th></tr></thead>
          <tbody>
            {trace.stages?.map((st, n) => (
              <tr key={st.id} style={{ cursor: 'pointer', background: n === i ? 'var(--panel2)' : undefined }} onClick={() => go(n)}>
                <td><b>{st.name}</b></td>
                <td className="num" style={{ color: 'var(--accent)' }}>{grams(st.massG)}</td>
                <td className="num">{nines(st.purity)}</td>
                <td className="num">{fmt.n(impurityPpb(st.purity), 0)} ppb</td>
                <td><div className="bar"><i style={{ width: `${(st.massG / trace.quartzite) * 100}%` }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '62ch' }}>
        Loss factors are published rough figures and vary by producer — wire-saw kerf alone destroys
        30–40% of a finished crystal as dust. Read the ratio, not the digits.
      </p>

      <h2 className="sec">What replaces the people</h2>
      <div className="grid g2">
        {AUTOMATION.map((a) => (
          <div className="card" key={a.k}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="eyebrow" style={{ margin: 0 }}>{a.k}</div>
              <span className="badge">{a.name}</span>
            </div>
            <p className="small" style={{ marginTop: 8 }}>{a.what}</p>
          </div>
        ))}
      </div>

      <h2 className="sec">Why they are kept out</h2>
      <div className="card">
        <dl className="kv"><dd><ul>{WHY_NO_HUMANS.map((w) => <li key={w} style={{ marginBottom: 7 }}>{w}</li>)}</ul></dd></dl>
        <p className="small" style={{ marginTop: 12 }}>
          The people are still there — several thousand of them at a large site. They write recipes,
          diagnose excursions, qualify tools and argue about yield. What they do not do is move
          wafers, and a fab that requires them to would not reach the yield needed to pay for itself.
        </p>
      </div>
    </div>
  )
}
