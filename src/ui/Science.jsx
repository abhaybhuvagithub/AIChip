import React, { useMemo, useState } from 'react'
import {
  K, SILICON, DIELECTRICS, LITHO, MATERIALS, WEAROUT, CU,
  mobilityVsDoping, mobilityComponents, driftVelocity, saturationField,
  naturalLength, shortChannel, copperResistivity, rcDelay,
  blackMttf, accelerationFactor,
  LEAKAGE_PATHS, STRAIN,
  fermiPotential, depletionWidth, thresholdVoltage, junctionLeakageRatio,
  thermalNoiseV, shotNoiseA, ktcNoiseV, pelgromMismatch,
  confinementEnergyEv, electricalEot, thinFilmConductivity, selfHeating,
  thermalVoltage, bandgap, intrinsicCarriers, carriers,
  oxideCap, eot, physicalForEot,
  drainCurrent, subthresholdCurrent, subthresholdSwing, ssFloor,
  relativeTunnelCurrent, nmPerDecade, dynamicPower,
  resolution, depthOfFocus, photonEnergy, photonStatistics,
  dopantFluctuation,
} from '../lib/physics.js'
import { fmt } from '../lib/fab.js'
import Icon from './Icon.jsx'

const sci = (v, d = 2) => (Number.isFinite(v) ? v.toExponential(d) : '—')

function Slider({ label, value, set, min, max, step, unit = '', hint, fmtV }) {
  return (
    <div className="ctl">
      <label><span>{label}</span><b>{fmtV ? fmtV(value) : value}{unit}</b></label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => set(parseFloat(e.target.value))} aria-label={label} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

/** I–V family. The shape is the device: linear, then it flattens. */
function IVCurve({ vth, wOverL, mu, cox }) {
  const W = 460, H = 260, PL = 52, PB = 34
  const vdsMax = 1.2
  const gates = [0.5, 0.7, 0.9, 1.1]
  const curves = gates.map((vgs) => {
    const pts = []
    for (let i = 0; i <= 60; i++) {
      const vds = (i / 60) * vdsMax
      pts.push([vds, drainCurrent({ vgs, vds, vth, wOverL, mu, cox })])
    }
    return { vgs, pts }
  })
  const iMax = Math.max(1e-9, ...curves.flatMap((c) => c.pts.map((p) => p[1])))
  const x = (v) => PL + (v / vdsMax) * (W - PL - 12)
  const y = (i) => H - PB - (i / iMax) * (H - PB - 16)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="270" role="img"
      aria-label="Drain current against drain voltage for four gate voltages">
      <line x1={PL} y1={H - PB} x2={W - 10} y2={H - PB} stroke="var(--border)" />
      <line x1={PL} y1={12} x2={PL} y2={H - PB} stroke="var(--border)" />
      {curves.map((c, n) => (
        <g key={c.vgs}>
          <polyline points={c.pts.map(([v, i]) => `${x(v)},${y(i)}`).join(' ')}
            fill="none" stroke="var(--accent)" strokeWidth="2" opacity={0.35 + n * 0.22} />
          <text x={W - 14} y={y(c.pts[c.pts.length - 1][1]) - 5} textAnchor="end"
            fill="var(--accent)" opacity={0.5 + n * 0.15}
            style={{ fontSize: 14.5, fontFamily: 'var(--font-mono)' }}>V_GS {c.vgs}</text>
        </g>
      ))}
      {/* The saturation boundary, V_DS = V_GS − V_th. Left of it the device is
          a voltage-controlled resistor; right of it, a current source. */}
      <polyline
        points={gates.filter((g) => g > vth).map((g) => `${x(g - vth)},${y(drainCurrent({ vgs: g, vds: g - vth, vth, wOverL, mu, cox }))}`).join(' ')}
        fill="none" stroke="var(--warn)" strokeWidth="1.4" strokeDasharray="4 3" />
      <text x={PL + 8} y={20} fill="var(--warn)" style={{ fontSize: 14.5, fontFamily: 'var(--font-mono)' }}>
        V_DS = V_GS − V_th
      </text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fill="var(--muted)" style={{ fontSize: 15 }}>Drain voltage V_DS (V)</text>
      <text x={14} y={H / 2} textAnchor="middle" fill="var(--muted)" transform={`rotate(-90 14 ${H / 2})`} style={{ fontSize: 15 }}>
        Drain current — peak {(iMax * 1e6).toFixed(0)} µA
      </text>
    </svg>
  )
}

/** Log-scale subthreshold. The straight line is the Boltzmann tail. */
function SubVtCurve({ n, T, vth }) {
  const W = 460, H = 250, PL = 62, PB = 34
  const decades = 8
  const pts = []
  for (let i = 0; i <= 80; i++) {
    const vgs = (i / 80) * 1.0
    const sub = subthresholdCurrent({ vgs, vth, n, T })
    const above = drainCurrent({ vgs, vds: 1, vth, wOverL: 10, mu: 300, cox: oxideCap(2) })
    pts.push([vgs, Math.max(1e-14, Math.min(sub, 1e-3) + above)])
  }
  const top = 1e-3, bot = top / Math.pow(10, decades)
  const x = (v) => PL + v * (W - PL - 14)
  const y = (i) => {
    const f = (Math.log10(i) - Math.log10(bot)) / decades
    return H - PB - Math.max(0, Math.min(1, f)) * (H - PB - 16)
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="255" role="img"
      aria-label="Drain current on a log scale against gate voltage">
      {Array.from({ length: decades + 1 }, (_, d) => {
        const i = bot * Math.pow(10, d)
        return (
          <g key={d}>
            <line x1={PL} y1={y(i)} x2={W - 12} y2={y(i)} stroke="var(--border)" opacity=".45" />
            <text x={PL - 6} y={y(i) + 4} textAnchor="end" fill="var(--muted)" style={{ fontSize: 14.5, fontFamily: 'var(--font-mono)' }}>
              1e{Math.round(Math.log10(i))}
            </text>
          </g>
        )
      })}
      <polyline points={pts.map(([v, i]) => `${x(v)},${y(i)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2.2" />
      <line x1={x(vth)} y1={16} x2={x(vth)} y2={H - PB} stroke="var(--warn)" strokeDasharray="4 3" />
      <text x={x(vth) + 5} y={26} fill="var(--warn)" style={{ fontSize: 14.5, fontFamily: 'var(--font-mono)' }}>V_th</text>
      <text x={W / 2} y={H - 8} textAnchor="middle" fill="var(--muted)" style={{ fontSize: 15 }}>Gate voltage V_GS (V) — current on a log scale</text>
    </svg>
  )
}

export default function Science() {
  // Device
  const [tox, setTox] = useState(2)
  const [diel, setDiel] = useState('sio2')
  const [wOverL, setWOverL] = useState(10)
  const [vth, setVth] = useState(0.35)
  const [mu, setMu] = useState(300)
  const [nBody, setNBody] = useState(1.3)
  const [T, setT] = useState(300)
  // Optics
  const [tool, setTool] = useState('euv')
  const [k1, setK1] = useState(0.31)
  const [dose, setDose] = useState(30)
  const [feature, setFeature] = useState(16)
  // Transport, short-channel, interconnect and reliability
  const [doping, setDoping] = useState(1e17)
  const [chanL, setChanL] = useState(15)
  const [tbody, setTbody] = useState(5)
  const [gates, setGates] = useState(4)
  const [wireW, setWireW] = useState(20)
  const [wireL, setWireL] = useState(500)
  const [jDens, setJDens] = useState(1e6)
  const [tJunc, setTJunc] = useState(100)
  // Deep sections
  const [na, setNa] = useState(1e17)
  const [phiMs, setPhiMs] = useState(-0.95)
  const [leak, setLeak] = useState('gate')
  const [capF, setCapF] = useState(1)
  const [devW, setDevW] = useState(20)
  const [confT, setConfT] = useState(5)
  const [shPower, setShPower] = useState(2)
  const [shThick, setShThick] = useState(5)

  const d = DIELECTRICS.find((x) => x.id === diel)
  const cox = oxideCap(tox, d.k)
  const eotNm = eot(tox, d.k)
  const ss = subthresholdSwing(nBody, T)
  const floor = ssFloor(T)
  const L = LITHO.find((x) => x.id === tool)
  const res = resolution(L.lambda, L.naMax, k1)
  const dof = depthOfFocus(L.lambda, L.naMax)
  const ph = photonStatistics({ lambdaNm: L.lambda, doseMjCm2: dose, featureNm: feature })
  const phArf = photonStatistics({ lambdaNm: 193, doseMjCm2: dose, featureNm: feature })
  const rdf = useMemo(() => dopantFluctuation({ wNm: 20, lNm: 20 }), [])
  const mob = mobilityComponents({ dopingCm3: doping, T })
  const lam = naturalLength({ toxNm: eotNm, tbodyNm: tbody, gates })
  const sc = shortChannel({ lengthNm: chanL, lambdaNm: lam })
  const cu = copperResistivity({ widthNm: wireW })
  const rc = rcDelay({ widthNm: wireW, lengthUm: wireL })
  const rcFat = rcDelay({ widthNm: wireW * 5, lengthUm: wireL })
  const af = accelerationFactor({ tUse: 328, tStress: tJunc + 273 })
  const vt = thresholdVoltage({ dopingCm3: na, toxNm: eotNm, phiMs })
  const lk = LEAKAGE_PATHS.find((x) => x.id === leak)
  const sh = selfHeating({ powerUw: shPower, thicknessNm: shThick, lengthNm: 20, widthNm: 50 })
  const eEot = electricalEot({ eotNm, inversionNm: 0.4, polyDepletionNm: 0 })
  const eEotPoly = electricalEot({ eotNm, inversionNm: 0.4, polyDepletionNm: 0.4 })
  const cRun = carriers(1e17, 'n', T)

  return (
    <div>
      <div className="eyebrow">The science</div>
      <h1 className="title">Four numbers decide<br />almost everything.</h1>
      <p className="lede">
        A chip is an argument between thermodynamics, quantum mechanics, optics and statistics, and
        each of them sets a hard limit that no amount of engineering removes. Every equation below is
        the real one, computed live — move a slider and watch which wall you hit first.
      </p>

      {/* ---------------------------------------------------- 1. the switch */}
      <h2 className="sec">1 · The switch</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(280px,1fr)' }}>
        <div className="card">
          <div className="eyebrow">Drain current, square-law model</div>
          <IVCurve vth={vth} wOverL={wOverL} mu={mu} cox={cox} />
          <p className="small" style={{ marginTop: 6 }}>
            Below the dashed line the channel is a voltage-controlled resistor. Above it the channel
            pinches off at the drain and the transistor becomes a current source — which is the
            property that makes digital logic possible, because the output stops caring about the
            load.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="ctl">
            <label><span>Gate dielectric</span></label>
            <select value={diel} onChange={(e) => setDiel(e.target.value)}>
              {DIELECTRICS.map((x) => <option key={x.id} value={x.id}>{x.name} (k = {x.k})</option>)}
            </select>
            <div className="hint">{d.note}</div>
          </div>
          <Slider label="Physical thickness" value={tox} set={setTox} min={0.5} max={8} step={0.1} unit=" nm"
            hint={`Equivalent oxide thickness ${eotNm.toFixed(2)} nm · C_ox ${sci(cox)} F/cm²`} />
          <Slider label="W / L" value={wOverL} set={setWOverL} min={1} max={50} step={1} />
          <Slider label="Threshold V_th" value={vth} set={setVth} min={0.1} max={0.7} step={0.01} unit=" V" />
          <Slider label="Channel mobility" value={mu} set={setMu} min={50} max={700} step={10} unit=" cm²/V·s"
            hint={`Bulk silicon is ${SILICON.muElectron} for electrons, ${SILICON.muHole} for holes. An inversion layer is far lower — the vertical field pushes carriers against a rough interface.`} />
          <div className="row" style={{ marginTop: 4 }}>
            <span className="badge on">
              I_sat {(drainCurrent({ vgs: 1.0, vds: 1.0, vth, wOverL, mu, cox }) * 1e6).toFixed(0)} µA
            </span>
          </div>
        </div>
      </div>

      <p className="small" style={{ marginTop: 12, maxWidth: '62ch' }}>
        This is the first-order model and it is wrong below about 100 nm — it ignores velocity
        saturation, channel-length modulation, mobility degradation under the vertical field, and
        every short-channel effect. It is here because every modern model is a correction to it, and
        because the shape it produces is the thing worth recognising.
      </p>

      {/* ------------------------------------------------ 2. the hard floor */}
      <h2 className="sec">2 · The floor nothing gets under</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(280px,1fr)' }}>
        <div className="card">
          <div className="eyebrow">Subthreshold — current on a log scale</div>
          <SubVtCurve n={nBody} T={T} vth={vth} />
          <p className="small" style={{ marginTop: 6 }}>
            Below threshold the transistor does not switch off, it decays exponentially. The slope of
            that straight line is the whole ballgame: it decides how far you can drop the supply
            voltage before the "off" state leaks more than the "on" state delivers.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="eyebrow">Subthreshold swing</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16.5, color: 'var(--accent)', margin: '8px 0 12px' }}>
            SS = n · (kT/q) · ln 10
          </div>
          <Slider label="Temperature" value={T} set={setT} min={77} max={450} step={1} unit=" K"
            hint={`kT/q = ${(thermalVoltage(T) * 1000).toFixed(2)} mV. Silicon's bandgap here is ${bandgap(T).toFixed(3)} eV and n_i is ${sci(intrinsicCarriers(T), 1)} cm⁻³.`} />
          <Slider label="Body factor n" value={nBody} set={setNBody} min={1} max={2} step={0.01}
            hint="n = 1 + C_dep/C_ox. A perfect gate gives n = 1; real devices sit between 1.1 and 1.5." />
          <div className="grid g2" style={{ marginTop: 6 }}>
            <div className="stat hi">
              <div className="k">Your swing</div>
              <div className="v">{(ss * 1000).toFixed(1)}</div>
              <div className="sub">mV per decade</div>
            </div>
            <div className="stat">
              <div className="k">Absolute floor</div>
              <div className="v">{(floor * 1000).toFixed(1)}</div>
              <div className="sub">at n = 1, {T} K</div>
            </div>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            At 300 K that floor is <b>{(ssFloor(300) * 1000).toFixed(1)} mV/decade</b>, and it is not an
            engineering limit — it is the Boltzmann tail of the carrier energy distribution. Beating
            it requires a device that does not switch by thermionic emission at all, which is exactly
            what tunnel FETs and negative-capacitance devices are attempting. Cooling does work: drag
            the temperature to 77 K and watch. That is why cryogenic CMOS keeps being revisited.
          </p>
        </div>
      </div>

      {/* --------------------------------------------- 3. quantum mechanics */}
      <h2 className="sec">3 · Where quantum mechanics arrives uninvited</h2>
      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Gate tunnelling</div>
          <p style={{ marginTop: 8 }}>
            Electrons do not need to go over a barrier if it is thin enough — they appear on the far
            side. The WKB approximation gives current falling as <span style={{ fontFamily: 'var(--font-mono)' }}>exp(−2κt)</span> with
            κ = √(2m*Φ)/ħ, so leakage rises by a factor of ten for every{' '}
            <b>{nmPerDecade().toFixed(2)} nm</b> of SiO₂ you remove.
          </p>
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
            <table className="tbl">
              <thead><tr><th>SiO₂ thickness</th><th>Relative leakage</th><th>Atoms thick</th></tr></thead>
              <tbody>
                {[3, 2.5, 2, 1.5, 1.2, 1].map((t) => (
                  <tr key={t}>
                    <td className="num">{t} nm</td>
                    <td className="num" style={{ color: t <= 1.5 ? 'var(--bad)' : 'var(--accent)' }}>
                      {sci(relativeTunnelCurrent(t), 1)}
                    </td>
                    <td className="num">{Math.round(t / 0.35)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            Around 1.2 nm the oxide is three or four atoms thick and leaking so hard it dominates chip
            power. There is no process fix — the barrier is simply too thin.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">Why hafnium solved it</div>
          <p style={{ marginTop: 8 }}>
            Capacitance is what a gate needs, and capacitance goes as k/t. Use a material with six
            times the permittivity and you can make the film six times thicker for the same
            electrostatic control — while tunnelling, which depends on physical thickness
            exponentially, collapses.
          </p>
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
            <table className="tbl">
              <thead><tr><th>Dielectric</th><th>k</th><th>Physical, for 1 nm EOT</th></tr></thead>
              <tbody>
                {DIELECTRICS.map((x) => (
                  <tr key={x.id} style={x.id === diel ? { background: 'var(--panel2)' } : undefined}>
                    <td><b>{x.name}</b></td>
                    <td className="num">{x.k}</td>
                    <td className="num" style={{ color: 'var(--accent)' }}>{physicalForEot(1, x.k).toFixed(2)} nm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            This is why silicon dioxide was abandoned after forty years. It was not that hafnia is
            better — the SiO₂–silicon interface is still the best in the business — it is that the
            exponent in the tunnelling equation left no choice.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------- 4. optics */}
      <h2 className="sec">4 · Printing something smaller than the light</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Generation</th><th>λ</th><th>NA</th><th>Medium</th><th>Half-pitch</th><th>Depth of focus</th></tr></thead>
              <tbody>
                {LITHO.map((x) => (
                  <tr key={x.id} style={{ cursor: 'pointer', background: x.id === tool ? 'var(--panel2)' : undefined }}
                    onClick={() => setTool(x.id)}>
                    <td><b>{x.name}</b> <span className="badge">{x.year}</span></td>
                    <td className="num">{x.lambda} nm</td>
                    <td className="num">{x.naMax}</td>
                    <td className="small">{x.medium}</td>
                    <td className="num" style={{ color: 'var(--accent)' }}>{resolution(x.lambda, x.naMax, k1).toFixed(1)} nm</td>
                    <td className="num">{depthOfFocus(x.lambda, x.naMax).toFixed(0)} nm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            Rayleigh: resolution = k₁·λ/NA, depth of focus = k₂·λ/NA². Note the square in the second
            one — every gain in resolution costs focus quadratically, and a depth of focus measured in
            tens of nanometres is precisely why CMP exists. Immersion raises NA by putting water
            (n = 1.44) between lens and wafer, since NA = n·sin θ and sin θ cannot exceed 1.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Process factor k₁" value={k1} set={setK1} min={0.25} max={0.8} step={0.01}
            hint="0.25 is the hard physical limit for single exposure; below it the pattern must be split across multiple masks. Aggressive illumination and mask correction get you to about 0.28." />
          <div className="grid g2">
            <div className="stat hi">
              <div className="k">Half-pitch</div>
              <div className="v">{res.toFixed(1)}<span style={{ fontSize: 16.5 }}> nm</span></div>
              <div className="sub">{L.name} at NA {L.naMax}</div>
            </div>
            <div className="stat">
              <div className="k">Depth of focus</div>
              <div className="v">{dof.toFixed(0)}<span style={{ fontSize: 16.5 }}> nm</span></div>
              <div className="sub">total, both sides of best focus</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="sec">5 · Counting photons</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(280px,340px) minmax(0,1fr)' }}>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Exposure dose" value={dose} set={setDose} min={5} max={120} step={1} unit=" mJ/cm²"
            hint="More dose means more photons and less noise, and directly less throughput — the scanner is the constraint, so dose is money." />
          <Slider label="Feature size" value={feature} set={setFeature} min={8} max={60} step={1} unit=" nm" />
          <div className="grid g2" style={{ marginTop: 6 }}>
            <div className={`stat ${ph.n < 500 ? 'bad' : 'hi'}`}>
              <div className="k">{L.name} photons</div>
              <div className="v">{fmt.n(ph.n, 0)}</div>
              <div className="sub">±{(ph.sigmaRel * 100).toFixed(1)}% shot noise</div>
            </div>
            <div className="stat">
              <div className="k">Same dose, ArF</div>
              <div className="v">{fmt.n(phArf.n, 0)}</div>
              <div className="sub">±{(phArf.sigmaRel * 100).toFixed(2)}%</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Why EUV has random failures and DUV does not</div>
          <p style={{ marginTop: 8 }}>
            A photon's energy is hc/λ, so a {L.lambda} nm photon carries{' '}
            <b>{photonEnergy(L.lambda).toFixed(1)} eV</b> against {photonEnergy(193).toFixed(2)} eV for ArF —
            about fourteen times more. Dose is measured in energy per area, so delivering the same
            dose with EUV means delivering roughly fourteen times <i>fewer</i> photons.
          </p>
          <p style={{ marginTop: 8 }}>
            Photon arrivals are Poisson, so the relative noise on a feature goes as 1/√N. At{' '}
            {fmt.n(ph.n, 0)} photons per {feature} nm feature that is {(ph.sigmaRel * 100).toFixed(1)}% — and
            across the billions of features on a wafer, the tail of that distribution means some
            simply fail. Not because of a particle, not because of a misprint: because not enough
            photons happened to land there.
          </p>
          <p className="small" style={{ marginTop: 8 }}>
            This is what "stochastic defects" means, and it is a genuinely new failure mode. You
            cannot inspect it away or clean it away. You can only pay for it in dose, which costs
            throughput on the most expensive tool in the building.
          </p>
        </div>
      </div>

      {/* -------------------------------------------------- 6. statistics */}
      <h2 className="sec">6 · When atoms become countable</h2>
      <div className="grid g2">
        <div className="card">
          <div className="eyebrow">Random dopant fluctuation</div>
          <p style={{ marginTop: 8 }}>
            A 20 × 20 nm channel at 10¹⁸ cm⁻³ doping contains about <b>{rdf.count.toFixed(0)} dopant
            atoms</b>. Not millions — eight. Where they happen to sit shifts the threshold voltage,
            and the variation goes as 1/√N, which here is roughly{' '}
            <b>{(rdf.sigmaRel * 100).toFixed(0)}%</b>.
          </p>
          <p className="small" style={{ marginTop: 8 }}>
            No process control removes this. It is a counting problem, not a cleanliness problem, and
            it is one of the reasons the industry moved to undoped fully-depleted channels — a FinFET
            or nanosheet body has almost no dopants in it to fluctuate.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">Dennard scaling, and why it stopped</div>
          <p style={{ marginTop: 8 }}>
            Dynamic power is <span style={{ fontFamily: 'var(--font-mono)' }}>P = α·C·V²·f</span>. Dennard's
            observation was that shrinking every dimension <i>and</i> the voltage by the same factor
            keeps power per unit area constant — smaller, faster and no hotter, for free.
          </p>
          <p style={{ marginTop: 8 }}>
            It held from 1974 to about 2005, then broke on the section above: threshold voltage cannot
            keep falling, because subthreshold swing has a floor of{' '}
            {(ssFloor(300) * 1000).toFixed(0)} mV/decade and leakage becomes unmanageable. Supply
            voltage stopped scaling, so power density started rising, so clock speeds stopped — and
            the industry went multi-core instead. Every core you own is a consequence of the
            Boltzmann distribution.
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="badge on">
              1 nF at 1 V, 3 GHz, 10% activity = {dynamicPower({ capF: 1e-9, volts: 1, freqHz: 3e9 }).toFixed(2)} W
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------- 7. why silicon */}
      <h2 className="sec">7 · Why silicon, when others are better at conducting</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        Germanium has three times the electron mobility. Gallium arsenide has six. Silicon carbide
        blocks ten times the field. Silicon won anyway, and not on any of the electrical numbers.
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Material</th><th>Bandgap</th><th>Gap type</th><th>µ electrons</th><th>Breakdown</th><th>Thermal</th><th style={{ width: '36%' }}>What it is actually for</th></tr></thead>
          <tbody>
            {MATERIALS.map((m2) => (
              <tr key={m2.id} style={m2.id === 'si' ? { background: 'var(--panel2)' } : undefined}>
                <td><b>{m2.name}</b></td>
                <td className="num">{m2.eg} eV</td>
                <td className="small" style={{ color: m2.gap === 'direct' ? 'var(--accent)' : 'var(--muted)' }}>{m2.gap}</td>
                <td className="num">{fmt.n(m2.muE)}</td>
                <td className="num">{m2.ebd} MV/cm</td>
                <td className="num">{m2.kth} W/m·K</td>
                <td className="small">{m2.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="eyebrow">The indirect gap</div>
          <p style={{ marginTop: 8 }}>
            Silicon's conduction band minimum sits at a different crystal momentum from its valence
            band maximum. An electron cannot fall across that gap by emitting a photon alone — it
            would violate momentum conservation — so it needs a phonon at the same instant, and
            three-body coincidences are rare.
          </p>
          <p style={{ marginTop: 8 }}>
            That single fact is why silicon does not make a laser, why every optical link is built
            from a III–V material, and why silicon photonics still bonds an indium phosphide die on
            top to produce the light it then guides so elegantly.
          </p>
        </div>
        <div className="card">
          <div className="eyebrow">And why it won regardless</div>
          <p style={{ marginTop: 8 }}>
            Silicon grows its own oxide, and the SiO₂–silicon interface is the best in the business —
            defect densities orders of magnitude below anything achievable on germanium or gallium
            arsenide. Germanium's oxide dissolves in water; that argument was over quickly.
          </p>
          <p style={{ marginTop: 8 }}>
            Add abundance, mechanical strength that survives a 300 mm wafer being handled ten thousand
            times, and thermal conductivity three times gallium arsenide's. A semiconductor is not
            chosen on mobility. It is chosen on whether you can build a factory around it.
          </p>
        </div>
      </div>

      {/* ------------------------------------------ 8. carrier transport */}
      <h2 className="sec">8 · Why doping fights itself</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(280px,1fr)' }}>
        <div className="card">
          <div className="eyebrow">Mobility against doping and temperature</div>
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
            <table className="tbl">
              <thead><tr><th>Scattering mechanism</th><th>Mobility alone</th><th>Behaviour</th></tr></thead>
              <tbody>
                <tr>
                  <td><b>Lattice (phonon)</b></td>
                  <td className="num">{fmt.n(mob.lattice, 0)} cm²/V·s</td>
                  <td className="small">Worsens as T rises — more phonons to scatter off. Goes as roughly T⁻².⁴.</td>
                </tr>
                <tr>
                  <td><b>Ionised impurity</b></td>
                  <td className="num">{fmt.n(mob.impurity, 0)} cm²/V·s</td>
                  <td className="small">Improves as T rises — faster carriers spend less time near each ion. Goes as T¹·⁵.</td>
                </tr>
                <tr style={{ background: 'var(--panel2)' }}>
                  <td><b>Combined</b></td>
                  <td className="num" style={{ color: 'var(--accent)' }}>{fmt.n(mob.total, 0)} cm²/V·s</td>
                  <td className="small">Matthiessen's rule: rates add, so mobilities combine reciprocally and the worst mechanism dominates.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            The self-defeating part: the dopant atoms that supply carriers are the ionised impurities
            those carriers scatter off. Above about 10¹⁷ cm⁻³ you are adding carriers and slowing them
            down at the same time, which is one reason modern channels are undoped and the current is
            supplied electrostatically instead.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Doping" value={Math.log10(doping)} set={(v) => setDoping(Math.pow(10, v))}
            min={14} max={20} step={0.1} fmtV={(v) => `10^${v.toFixed(1)} cm⁻³`}
            hint={`Electrons ${fmt.n(mobilityVsDoping(doping), 0)}, holes ${fmt.n(mobilityVsDoping(doping, 'p'), 0)} cm²/V·s. Holes are always slower — the valence band is heavier.`} />
          <div className="grid g2" style={{ marginTop: 4 }}>
            <div className="stat hi">
              <div className="k">Saturation knee</div>
              <div className="v" style={{ fontSize: 21 }}>{sci(saturationField(mob.total), 2)}</div>
              <div className="sub">V/cm — half of v_sat</div>
            </div>
            <div className="stat">
              <div className="k">v at 10⁵ V/cm</div>
              <div className="v" style={{ fontSize: 21 }}>{sci(driftVelocity(1e5, mob.total), 2)}</div>
              <div className="sub">cm/s, against {sci(SILICON.vSat, 1)} ceiling</div>
            </div>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            Carriers stop accelerating once they shed energy to optical phonons as fast as the field
            supplies it. A 20 nm channel at 0.7 V sees over 10⁵ V/cm, so it is already saturated —
            which is why drive current stopped scaling as 1/L and why mobility improvements buy less
            than the number suggests.
          </p>
        </div>
      </div>

      {/* -------------------------------------- 9. short-channel effects */}
      <h2 className="sec">9 · How far the drain reaches into the channel</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(280px,1fr)' }}>
        <div>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--accent)', textAlign: 'center', padding: '4px 0 12px' }}>
              λ = √(ε_si/ε_ox · t_ox · t_body)
            </div>
            <div className="grid g3">
              <div className="stat hi">
                <div className="k">Natural length λ</div>
                <div className="v" style={{ fontSize: 24 }}>{lam.toFixed(2)}<span style={{ fontSize: 15 }}> nm</span></div>
                <div className="sub">how far the drain field penetrates</div>
              </div>
              <div className={`stat ${sc.controlled ? 'ok' : 'bad'}`}>
                <div className="k">Channel in natural lengths</div>
                <div className="v" style={{ fontSize: 24 }}>{sc.ratio.toFixed(1)}λ</div>
                <div className="sub">{sc.controlled ? 'the gate is in charge' : 'the drain is taking over'}</div>
              </div>
              <div className={`stat ${sc.diblMvV < 100 ? '' : 'bad'}`}>
                <div className="k">DIBL</div>
                <div className="v" style={{ fontSize: 24 }}>{sc.diblMvV < 1 ? sc.diblMvV.toFixed(2) : fmt.n(sc.diblMvV, 0)}</div>
                <div className="sub">mV of V_th lost per volt of V_DS</div>
              </div>
            </div>
            <p style={{ marginTop: 12 }}>
              Both threshold roll-off and DIBL fall as exp(−L/2λ) — the drain's influence on the
              channel barrier decays exponentially with channel length measured in natural lengths.
              Real designs sit at roughly seven to ten λ, where DIBL lands in the tens of mV/V.
            </p>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Architecture</th><th>Gated faces</th><th>λ at these dimensions</th><th>Shortest workable channel</th></tr></thead>
              <tbody>
                {[['Planar', 1], ['FinFET', 3], ['Gate-all-around', 4]].map(([n2, g]) => {
                  const l2 = naturalLength({ toxNm: eotNm, tbodyNm: tbody, gates: g })
                  return (
                    <tr key={n2} style={g === gates ? { background: 'var(--panel2)' } : undefined}>
                      <td><b>{n2}</b></td>
                      <td className="num">{g}</td>
                      <td className="num">{l2.toFixed(2)} nm</td>
                      <td className="num" style={{ color: 'var(--accent)' }}>{(l2 * 7).toFixed(0)} nm</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            This is the whole roadmap in one column. Every architecture change on the 3D tab — thinner
            body, more gated faces — exists to shrink λ so that L can shrink with it. Wrapping the
            gate is not elegance; it is the only way to keep the drain out of the channel.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Channel length" value={chanL} set={setChanL} min={5} max={80} step={1} unit=" nm" />
          <Slider label="Body thickness" value={tbody} set={setTbody} min={2} max={30} step={0.5} unit=" nm"
            hint="A thinner body gives the drain less silicon to reach through. It also confines carriers enough that mobility starts to suffer, which is the trade." />
          <div className="ctl">
            <label><span>Gate geometry</span></label>
            <div className="row" style={{ gap: 6 }}>
              {[[1, 'Planar'], [3, 'FinFET'], [4, 'GAA']].map(([g, n2]) => (
                <button key={g} className={`btn sm ${gates === g ? 'active' : ''}`} onClick={() => setGates(g)}>{n2}</button>
              ))}
            </div>
            <div className="hint">Gate oxide is the {eotNm.toFixed(2)} nm EOT set in section 1, so changing the dielectric there moves λ here too.</div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------- 10. the wire wall */}
      <h2 className="sec">10 · The wires stopped cooperating</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(280px,1fr)' }}>
        <div>
          <div className="grid g3">
            <div className="stat bad">
              <div className="k">Effective resistivity</div>
              <div className="v" style={{ fontSize: 24 }}>{cu.rhoWithBarrier.toFixed(1)}</div>
              <div className="sub">µΩ·cm, against {CU.rho0} for bulk copper</div>
            </div>
            <div className="stat">
              <div className="k">Times bulk</div>
              <div className="v" style={{ fontSize: 24 }}>{cu.ratioToBulk.toFixed(1)}×</div>
              <div className="sub">surface + grain + barrier</div>
            </div>
            <div className="stat hi">
              <div className="k">RC delay</div>
              <div className="v" style={{ fontSize: 24 }}>
                {rc.delayPs > 1000 ? `${(rc.delayPs / 1000).toFixed(1)} ns` : `${rc.delayPs.toFixed(1)} ps`}
              </div>
              <div className="sub">over {wireL} µm, unrepeated</div>
            </div>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Wire width</th><th>Surface (FS)</th><th>Grain (MS)</th><th>Barrier</th><th>Total vs bulk</th><th>ρ effective</th></tr></thead>
              <tbody>
                {[100, 60, 40, 30, 20, 15, 12].map((w) => {
                  const c2 = copperResistivity({ widthNm: w })
                  return (
                    <tr key={w} style={w === wireW ? { background: 'var(--panel2)' } : undefined}
                      onClick={() => setWireW(w)} title={`Set ${w} nm`}>
                      <td className="num"><b>{w} nm</b></td>
                      <td className="num">{c2.fs.toFixed(2)}×</td>
                      <td className="num">{c2.ms.toFixed(2)}×</td>
                      <td className="num">{c2.barrierPenalty.toFixed(2)}×</td>
                      <td className="num" style={{ color: c2.ratioToBulk > 4 ? 'var(--bad)' : 'var(--warn)' }}>{c2.ratioToBulk.toFixed(1)}×</td>
                      <td className="num" style={{ color: 'var(--accent)' }}>{c2.rhoWithBarrier.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            Three mechanisms, all worsening together. Electrons scatter off the wire's surfaces once
            it narrows toward copper's {CU.mfpNm} nm mean free path; they scatter off grain
            boundaries, and grains cannot be larger than the wire containing them; and the diffusion
            barrier that stops copper poisoning the silicon takes a fixed thickness off every side
            while carrying almost no current. Transistors kept shrinking. Their wires did not
            cooperate, and that is why backside power delivery and alternative metals are on the
            roadmap.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Wire width" value={wireW} set={setWireW} min={8} max={200} step={1} unit=" nm" />
          <Slider label="Wire length" value={wireL} set={setWireL} min={10} max={2000} step={10} unit=" µm"
            hint="Elmore delay goes as the square of length — double the wire and you quadruple the delay. That square is why long routes are broken up with repeaters and why floorplanning is a timing activity." />
          <div className="grid g2" style={{ marginTop: 4 }}>
            <div className="stat">
              <div className="k">Resistance</div>
              <div className="v" style={{ fontSize: 20 }}>{fmt.n(rc.resistanceOhm, 0)} Ω</div>
              <div className="sub">{fmt.n(rc.rPerMm, 0)} Ω per mm</div>
            </div>
            <div className="stat ok">
              <div className="k">Five times wider</div>
              <div className="v" style={{ fontSize: 20 }}>
                {rcFat.delayPs > 1000 ? `${(rcFat.delayPs / 1000).toFixed(1)} ns` : `${rcFat.delayPs.toFixed(1)} ps`}
              </div>
              <div className="sub">{(rc.delayPs / rcFat.delayPs).toFixed(0)}× faster</div>
            </div>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            This is why a metal stack is not uniform: local levels are tight and slow because they run
            microns, upper levels are fat and fast because they carry clock and power across
            millimetres. Fifteen levels, each a different compromise.
          </p>
        </div>
      </div>

      {/* -------------------------------------------- 11. how it wears out */}
      <h2 className="sec">11 · Nothing here lasts forever</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Mechanism</th><th>Scaling law</th><th style={{ width: '36%' }}>What physically happens</th><th style={{ width: '30%' }}>What is done about it</th></tr></thead>
          <tbody>
            {WEAROUT.map((w) => (
              <tr key={w.id}>
                <td><b>{w.name}</b></td>
                <td className="num" style={{ color: 'var(--accent)', fontSize: 'var(--fs-label)' }}>{w.law}</td>
                <td className="small">{w.what}</td>
                <td className="small">{w.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)', marginTop: 14 }}>
        <div className="card">
          <div className="eyebrow">Electromigration — Black's equation</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--accent)', textAlign: 'center', padding: '8px 0 12px' }}>
            MTTF = A · J⁻² · exp(E_a / kT)
          </div>
          <p>
            Electron momentum physically transports metal atoms along a wire. A void opens upstream of
            a flux divergence and the line goes open; a hillock grows downstream and shorts to its
            neighbour. The exponent on current density is two, so <b>halving the current density
            multiplies lifetime by four</b> — which is why current-density limits appear in every
            design rule deck, and why they tighten as wires narrow.
          </p>
          <p className="small" style={{ marginTop: 10 }}>
            Doubling J from your setting takes the same wire from {fmt.n(blackMttf({ currentDensityAcm2: jDens, T: tJunc + 273 }) / blackMttf({ currentDensityAcm2: jDens * 2, T: tJunc + 273 }), 0)}× the
            lifetime to one. Raising junction temperature from 100 °C to 125 °C costs a further
            factor of {(blackMttf({ currentDensityAcm2: jDens, T: 373 }) / blackMttf({ currentDensityAcm2: jDens, T: 398 })).toFixed(1)}.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Current density" value={Math.log10(jDens)} set={(v) => setJDens(Math.pow(10, v))}
            min={4} max={7} step={0.05} fmtV={(v) => `10^${v.toFixed(2)} A/cm²`} />
          <Slider label="Junction temperature" value={tJunc} set={setTJunc} min={25} max={175} step={5} unit=" °C" />
          <div className="stat hi" style={{ marginTop: 6 }}>
            <div className="k">Acceleration factor</div>
            <div className="v" style={{ fontSize: 22 }}>{af > 1 ? `${fmt.n(af, 0)}×` : `${af.toFixed(2)}×`}</div>
            <div className="sub">stress at {tJunc} °C vs use at 55 °C, E_a = 0.7 eV</div>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            This is what makes qualification possible at all. A part meant to last ten years cannot be
            tested for ten years, so it is run hot and the Arrhenius factor converts weeks of stress
            into years of use. The whole method rests on the activation energy being right — get it
            wrong and the qualification proves nothing, confidently.
          </p>
        </div>
      </div>

      {/* --------------------------------- 12. the MOS capacitor */}
      <h2 className="sec">12 · Where the threshold voltage actually comes from</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        Everything above treats V_th as given. It is not — it is assembled from four physical terms,
        and one of them is a materials property rather than a dimension. That term is why metal gates
        exist.
      </p>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div>
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--accent)', textAlign: 'center', padding: '6px 0 14px' }}>
              V_th = V_FB + 2φ_F + γ·√(2φ_F)
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Term</th><th>Value</th><th style={{ width: '52%' }}>What it is</th></tr></thead>
                <tbody>
                  <tr>
                    <td><b>V_FB</b> flat-band</td>
                    <td className="num" style={{ color: 'var(--bad)' }}>{vt.vfb.toFixed(3)} V</td>
                    <td className="small">The work function difference between gate and channel. A materials property, and the only term you can choose freely.</td>
                  </tr>
                  <tr>
                    <td><b>2φ_F</b> surface potential</td>
                    <td className="num">{(2 * vt.phiF).toFixed(3)} V</td>
                    <td className="small">Band bending needed for strong inversion — where minority carriers at the surface equal majority carriers in the bulk. A convention, not a switch in nature.</td>
                  </tr>
                  <tr>
                    <td><b>γ·√(2φ_F)</b> depletion</td>
                    <td className="num">{vt.depletionTerm.toFixed(3)} V</td>
                    <td className="small">The gate charge spent holding the depletion region open before any inversion charge appears. γ = {vt.gamma.toFixed(4)} V^½.</td>
                  </tr>
                  <tr style={{ background: 'var(--panel2)' }}>
                    <td><b>V_th</b></td>
                    <td className="num" style={{ color: vt.vth > 0.1 ? 'var(--ok)' : 'var(--bad)' }}>{vt.vth.toFixed(3)} V</td>
                    <td className="small">{vt.vth < 0.1
                      ? 'Too low — this device conducts with the gate at zero. It is not a switch.'
                      : 'A usable threshold.'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            Set the work function back to an n⁺ polysilicon gate (−0.95 V) at a modern oxide
            thickness and the arithmetic lands near zero or below — the transistor is on when it
            should be off. Doping the channel harder fixes it and costs mobility and dopant
            fluctuation. <b>Choosing the gate metal's work function fixes it and costs nothing
            electrical</b>, which is the second reason polysilicon was abandoned at 45 nm and the one
            that is usually left out. The depletion region is currently{' '}
            {(depletionWidth({ dopingCm3: na }) * 1e7).toFixed(0)} nm deep.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Channel doping" value={Math.log10(na)} set={(v) => setNa(Math.pow(10, v))}
            min={15} max={19} step={0.05} fmtV={(v) => `10^${v.toFixed(2)} cm⁻³`}
            hint={`φ_F = ${fermiPotential(na).toFixed(3)} V. More doping raises the threshold and lowers mobility — the two are the same knob.`} />
          <Slider label="Gate work function difference" value={phiMs} set={setPhiMs}
            min={-1.1} max={0.3} step={0.05} unit=" V"
            hint="Polysilicon gives you two values, set by which dopant you use. A metal gate gives you a continuum, and with it a threshold you can design rather than accept." />
          <div className="row" style={{ gap: 6 }}>
            {[['n⁺ poly', -0.95], ['Mid-gap metal', -0.15], ['p⁺ poly', 0.15]].map(([n2, v]) => (
              <button key={n2} className={`btn sm ${Math.abs(phiMs - v) < 0.03 ? 'active' : ''}`}
                onClick={() => setPhiMs(v)}>{n2}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------- 13. leakage */}
      <h2 className="sec">13 · Five different ways it leaks</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        "Leakage" is not one thing. There are at least five mechanisms with different physics,
        different temperature behaviour and different fixes — and which one dominates has changed
        twice in twenty years.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        {LEAKAGE_PATHS.map((x) => (
          <button key={x.id} className={`btn sm iconrow ${leak === x.id ? 'active' : ''}`} onClick={() => setLeak(x.id)}>
            <Icon name={x.icon} size={18} />{x.name}
          </button>
        ))}
      </div>
      <div className="detail">
        <div className="card">
          <div className="eyebrow" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{lk.law}</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-.02em', marginTop: 6 }}>{lk.name}</h3>
          <p style={{ marginTop: 8 }}>{lk.what}</p>
        </div>
        <div className="card">
          <dl className="kv">
            <dt>With temperature</dt><dd>{lk.temp}</dd>
            <dt>What is done about it</dt><dd style={{ color: 'var(--ok)' }}>{lk.fix}</dd>
          </dl>
        </div>
      </div>
      <div className="grid g3" style={{ marginTop: 12 }}>
        <div className="stat bad">
          <div className="k">Junction leakage, 25 → 125 °C</div>
          <div className="v" style={{ fontSize: 22 }}>{sci(junctionLeakageRatio(298, 398), 2)}×</div>
          <div className="sub">it goes as n_i², and n_i is exponential in T</div>
        </div>
        <div className="stat">
          <div className="k">Subthreshold, 25 → 125 °C</div>
          <div className="v" style={{ fontSize: 22 }}>{(Math.pow(10, (0.3 / subthresholdSwing(1.3, 298)) - (0.3 / subthresholdSwing(1.3, 398)))).toFixed(0)}×</div>
          <div className="sub">the swing widens with T, so the same V_th leaks more</div>
        </div>
        <div className="stat">
          <div className="k">Gate tunnelling, 25 → 125 °C</div>
          <div className="v" style={{ fontSize: 22 }}>~1×</div>
          <div className="sub">tunnelling barely notices temperature at all</div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        That last column is the useful diagnostic. A leakage current that barely moves with
        temperature is tunnelling through something; one that doubles every eight degrees is thermal.
        You can tell the mechanism from a temperature sweep before you know anything else.
      </p>

      {/* ------------------------------------------- 14. noise */}
      <h2 className="sec">14 · The floor underneath every measurement</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div className="grid g3">
          <div className="stat hi">
            <div className="k">kTC noise on {capF} fF</div>
            <div className="v" style={{ fontSize: 22 }}>{(ktcNoiseV(capF * 1e-15) * 1e3).toFixed(2)}<span style={{ fontSize: 14 }}> mV</span></div>
            <div className="sub">√(kT/C) — independent of the resistance that charged it</div>
          </div>
          <div className="stat">
            <div className="k">Johnson noise, 1 kΩ, 1 MHz</div>
            <div className="v" style={{ fontSize: 22 }}>{(thermalNoiseV(1000, 1e6) * 1e6).toFixed(2)}<span style={{ fontSize: 14 }}> µV</span></div>
            <div className="sub">√(4kTRΔf) — the equipartition theorem, charging a wire</div>
          </div>
          <div className="stat">
            <div className="k">Shot noise, 1 µA, 1 MHz</div>
            <div className="v" style={{ fontSize: 22 }}>{(shotNoiseA(1e-6, 1e6) * 1e9).toFixed(2)}<span style={{ fontSize: 14 }}> nA</span></div>
            <div className="sub">√(2qIΔf) — charge arrives in lumps</div>
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Sampling capacitor" value={capF} set={setCapF} min={0.2} max={50} step={0.2} unit=" fF"
            hint="Halving the capacitor doubles the noise power. Every switched capacitor in a data converter is larger than the signal needs, and this is the entire reason." />
          <p className="hint" style={{ marginTop: 8 }}>
            None of these is an engineering imperfection. Thermal noise is the equipartition theorem;
            shot noise is the discreteness of charge. They are floors in the same sense that 60
            mV/decade is a floor — you design above them or you do not design.
          </p>
        </div>
      </div>

      {/* ------------------------------------------- 15. matching */}
      <h2 className="sec">15 · Why two identical devices are not</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div>
          <div className="card" style={{ borderColor: 'var(--accent)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--accent)', textAlign: 'center', padding: '4px 0 12px' }}>
              σ(ΔV_th) = A_Vth / √(W·L)
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Device</th><th>Area</th><th>σ(ΔV_th)</th><th style={{ width: 150 }}></th><th>What it is used for</th></tr></thead>
                <tbody>
                  {[[2000, 'Analog matched pair'], [500, 'I/O device'], [100, 'Logic gate'], [30, 'Dense logic'], [20, 'SRAM cell']].map(([w, use]) => {
                    const sig = pelgromMismatch({ wNm: w, lNm: w })
                    return (
                      <tr key={w} style={{ cursor: 'pointer', background: w === devW ? 'var(--panel2)' : undefined }}
                        onClick={() => setDevW(w)}>
                        <td className="num"><b>{w} × {w} nm</b></td>
                        <td className="num">{((w * w) / 1e6).toFixed(4)} µm²</td>
                        <td className="num" style={{ color: sig > 50 ? 'var(--bad)' : sig > 15 ? 'var(--warn)' : 'var(--ok)' }}>
                          {sig.toFixed(1)} mV
                        </td>
                        <td><div className="bar"><i style={{ width: `${Math.min(100, sig / 2)}%`, background: sig > 50 ? 'var(--bad)' : 'var(--accent)' }} /></div></td>
                        <td className="small">{use}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            Pelgrom's law is the statistical statement of the dopant fluctuation in section 6: halve
            the area and mismatch grows by √2. At SRAM dimensions σ reaches{' '}
            {pelgromMismatch({ wNm: 20, lNm: 20 }).toFixed(0)} mV against a supply under a volt,
            which is why the six smallest transistors on a die are the ones whose margin fails first
            — and why <b>SRAM stopped shrinking</b> while logic continued. It is also why analog
            designers use devices hundreds of times larger than the process permits: they are not
            being conservative, they are buying √area.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Device size" value={devW} set={setDevW} min={15} max={3000} step={5} unit=" nm square" />
          <div className="stat hi">
            <div className="k">Threshold mismatch</div>
            <div className="v">{pelgromMismatch({ wNm: devW, lNm: devW }).toFixed(1)}<span style={{ fontSize: 15 }}> mV</span></div>
            <div className="sub">one standard deviation, between two neighbours</div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            A six-sigma tail on an SRAM array with a billion cells is not a rare event — it is
            thousands of cells. Redundancy exists because this distribution has tails and the array
            is large enough to find them.
          </p>
        </div>
      </div>

      {/* ------------------------------------------- 16. confinement */}
      <h2 className="sec">16 · The floor under the oxide</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div className="grid g3">
          <div className="stat">
            <div className="k">Drawn EOT</div>
            <div className="v" style={{ fontSize: 22 }}>{eotNm.toFixed(2)}<span style={{ fontSize: 14 }}> nm</span></div>
            <div className="sub">what the dielectric gives you</div>
          </div>
          <div className="stat bad">
            <div className="k">Electrical EOT, metal gate</div>
            <div className="v" style={{ fontSize: 22 }}>{eEot.total.toFixed(2)}<span style={{ fontSize: 14 }}> nm</span></div>
            <div className="sub">{fmt.pct(eEot.penalty - 1, 0)} worse — the inversion layer is not at the surface</div>
          </div>
          <div className="stat bad">
            <div className="k">Electrical EOT, poly gate</div>
            <div className="v" style={{ fontSize: 22 }}>{eEotPoly.total.toFixed(2)}<span style={{ fontSize: 14 }}> nm</span></div>
            <div className="sub">{fmt.pct(eEotPoly.penalty - 1, 0)} worse — poly depletes too</div>
          </div>
          <div className="stat hi">
            <div className="k">Confinement energy at {confT} nm</div>
            <div className="v" style={{ fontSize: 22 }}>{(confinementEnergyEv({ thicknessNm: confT }) * 1000).toFixed(0)}<span style={{ fontSize: 14 }}> meV</span></div>
            <div className="sub">ground state lifted by squeezing the channel</div>
          </div>
          <div className="stat">
            <div className="k">Against thermal energy</div>
            <div className="v" style={{ fontSize: 22 }}>{(confinementEnergyEv({ thicknessNm: confT }) / thermalVoltage(300)).toFixed(1)}×</div>
            <div className="sub">kT/q at room temperature</div>
          </div>
          <div className="stat">
            <div className="k">Threshold shift</div>
            <div className="v" style={{ fontSize: 22 }}>+{(confinementEnergyEv({ thicknessNm: confT }) * 1000).toFixed(0)}<span style={{ fontSize: 14 }}> mV</span></div>
            <div className="sub">roughly, from the subband alone</div>
          </div>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Body thickness" value={confT} set={setConfT} min={2} max={20} step={0.5} unit=" nm"
            hint="E₁ = h²/(8m*t²). The inverse square is what matters — halving the thickness quadruples the shift, so below about 5 nm this stops being a correction and becomes a design parameter." />
          <p className="hint" style={{ marginTop: 8 }}>
            Two things put a floor under how thin a gate stack can electrically be, and neither is
            the dielectric. Carriers sit roughly 0.4 nm below the interface rather than on it, and a
            polysilicon gate depletes on its own side. Together they add nearly a nanometre to an
            oxide you spent a decade thinning — and removing the poly term is the <i>first</i> reason
            metal gates arrived, with the work function being the second.
          </p>
        </div>
      </div>

      {/* ------------------------------------------- 17. strain */}
      <h2 className="sec">17 · Buying mobility back</h2>
      <p className="small" style={{ marginBottom: 12, maxWidth: '68ch' }}>
        When gate-length scaling stopped delivering, the industry improved the material instead —
        by deliberately deforming the crystal. Strain splits the conduction band valleys and warps
        the valence band, lowering the effective mass along the direction of travel and reducing
        inter-valley scattering. It is one of very few times a material property rather than a
        dimension was improved, and it bought roughly a generation.
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Technique</th><th>Helps</th><th>Gain</th><th style={{ width: 130 }}></th><th style={{ width: '34%' }}>How</th><th style={{ width: '24%' }}>Note</th></tr></thead>
          <tbody>
            {STRAIN.map((x) => (
              <tr key={x.id}>
                <td><b>{x.name}</b></td>
                <td className="small">{x.carrier}</td>
                <td className="num" style={{ color: 'var(--accent)' }}>{x.gain}×</td>
                <td><div className="bar"><i style={{ width: `${(x.gain - 1) * 100}%` }} /></div></td>
                <td className="small">{x.how}</td>
                <td className="small">{x.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
        Note the awkwardness in the middle: electrons and holes want <i>opposite</i> strain, and
        opposite crystal orientations. Every strained process therefore does two different things to
        two device types a few tens of nanometres apart, which is a large part of why the module
        count climbed.
      </p>

      {/* ------------------------------------------- 18. self-heating */}
      <h2 className="sec">18 · Thin bodies cook</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(280px,340px)' }}>
        <div>
          <div className="grid g3">
            <div className="stat bad">
              <div className="k">Effective conductivity</div>
              <div className="v" style={{ fontSize: 22 }}>{sh.kEff.toFixed(1)}</div>
              <div className="sub">W/m·K, against 150 for bulk silicon</div>
            </div>
            <div className="stat">
              <div className="k">Thermal resistance</div>
              <div className="v" style={{ fontSize: 22 }}>{sci(sh.rthKperW, 2)}</div>
              <div className="sub">K per watt, channel to contact</div>
            </div>
            <div className={`stat ${sh.deltaTK > 50 ? 'bad' : ''}`}>
              <div className="k">Channel temperature rise</div>
              <div className="v" style={{ fontSize: 22 }}>+{sh.deltaTK.toFixed(0)}<span style={{ fontSize: 14 }}> K</span></div>
              <div className="sub">above the substrate, while switching</div>
            </div>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead><tr><th>Body thickness</th><th>Thermal conductivity</th><th>Fraction of bulk</th><th style={{ width: 200 }}></th></tr></thead>
              <tbody>
                {[150, 50, 20, 10, 5, 3].map((t) => {
                  const k = thinFilmConductivity({ thicknessNm: t })
                  return (
                    <tr key={t} style={{ cursor: 'pointer', background: t === shThick ? 'var(--panel2)' : undefined }}
                      onClick={() => setShThick(t)}>
                      <td className="num"><b>{t} nm</b></td>
                      <td className="num">{k.toFixed(1)} W/m·K</td>
                      <td className="num" style={{ color: k / 150 < 0.1 ? 'var(--bad)' : 'var(--warn)' }}>{fmt.pct(k / 150, 1)}</td>
                      <td><div className="bar"><i style={{ width: `${(k / 150) * 100}%` }} /></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 10, maxWidth: '68ch' }}>
            A film thinner than the phonon mean free path — about 300 nm in silicon — does not
            conduct heat like the bulk it is made of. Phonons scatter off the surfaces before they
            travel far, and conductivity collapses. A 5 nm nanosheet conducts heat at roughly{' '}
            {fmt.pct(thinFilmConductivity({ thicknessNm: 5 }) / 150, 1)} of bulk silicon.
          </p>
          <p className="small" style={{ marginTop: 8, maxWidth: '68ch', color: 'var(--warn)' }}>
            And here is the trap: this worsens with exactly the architectural changes that improve
            electrostatics. Thinner bodies keep the drain out of the channel — section 9 — and cook
            the channel doing it. The gate and the heat want opposite things, and the roadmap has to
            pay both.
          </p>
        </div>
        <div className="card" style={{ alignSelf: 'start' }}>
          <Slider label="Body thickness" value={shThick} set={setShThick} min={3} max={150} step={1} unit=" nm" />
          <Slider label="Device power" value={shPower} set={setShPower} min={0.2} max={20} step={0.2} unit=" µW"
            hint="A single device while switching. Multiply by billions and you get the chip-level problem on the 3D tab — but this is the local one, inside one channel." />
        </div>
      </div>

      {/* ------------------------------------------------------ constants */}
      <h2 className="sec">The numbers themselves</h2>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Quantity</th><th>Value</th><th style={{ width: '46%' }}>Why it matters here</th></tr></thead>
          <tbody>
            <tr><td>Thermal voltage kT/q at 300 K</td><td className="num" style={{ color: 'var(--accent)' }}>{(thermalVoltage(300) * 1000).toFixed(2)} mV</td>
              <td className="small">Sets the subthreshold floor, and therefore the lowest usable supply voltage.</td></tr>
            <tr><td>Subthreshold floor at 300 K</td><td className="num" style={{ color: 'var(--accent)' }}>{(ssFloor(300) * 1000).toFixed(1)} mV/dec</td>
              <td className="small">kT/q × ln 10. The reason Dennard scaling ended and the reason you have multiple cores.</td></tr>
            <tr><td>Silicon bandgap at 300 K</td><td className="num">{bandgap(300).toFixed(3)} eV</td>
              <td className="small">Large enough to be an insulator when you want one, small enough to be a conductor when you do not.</td></tr>
            <tr><td>Intrinsic carriers n_i</td><td className="num">{sci(intrinsicCarriers(300), 2)} cm⁻³</td>
              <td className="small">Against {sci(SILICON.atomicDensity, 1)} silicon atoms — undoped silicon is essentially an insulator.</td></tr>
            <tr><td>Doped at 10¹⁷ cm⁻³</td><td className="num">n = {sci(cRun.n, 1)}, p = {sci(cRun.p, 1)}</td>
              <td className="small">Mass action holds: n·p = n_i² always. Adding one impurity atom per million changes conductivity by orders of magnitude.</td></tr>
            <tr><td>Saturation velocity</td><td className="num">{sci(SILICON.vSat, 1)} cm/s</td>
              <td className="small">Carriers stop accelerating with field. Short channels hit this, so drive current stops scaling with 1/L.</td></tr>
            <tr><td>EUV photon energy</td><td className="num">{photonEnergy(13.5).toFixed(1)} eV</td>
              <td className="small">Far above any chemical bond, which is why EUV is absorbed by everything including air, and why the optics are mirrors.</td></tr>
            <tr><td>Leakage per nm of SiO₂</td><td className="num">{nmPerDecade().toFixed(2)} nm/decade</td>
              <td className="small">From √(2m*Φ)/ħ. Thin the gate oxide by a fifth of a nanometre and leakage rises tenfold.</td></tr>
            <tr><td>Elementary charge</td><td className="num">{sci(K.q, 4)} C</td><td className="small">Exact by definition since the 2019 SI redefinition.</td></tr>
          </tbody>
        </table>
      </div>

      <p className="small" style={{ marginTop: 16, maxWidth: '62ch' }}>
        Every figure on this tab is computed from the constants above by the equations shown, not
        stored. The device model is deliberately first-order and says where it stops being true; the
        optics, tunnelling, photon statistics and dopant counting are exact for the assumptions
        stated.
      </p>
    </div>
  )
}
