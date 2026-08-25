import React from 'react'

// A blank page tells the user nothing and tells us less. If a render throws,
// say what broke and give them a way back in.
export default class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) { console.error('FabSim render error', err, info) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="page">
        <div className="eyebrow">Something broke</div>
        <h1 className="title">This view failed to render.</h1>
        <p className="lede">
          The configuration in the address bar may be out of range. Reset it and the studio will
          come back with its defaults.
        </p>
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn primary" onClick={() => { window.location.hash = ''; window.location.reload() }}>
            Reset and reload
          </button>
        </div>
        <pre className="small" style={{ marginTop: 20, whiteSpace: 'pre-wrap', opacity: .7 }}>
          {String(this.state.err?.message || this.state.err)}
        </pre>
      </div>
    )
  }
}
