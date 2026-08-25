import React, { useEffect, useRef, useState } from 'react'
import { ask, SUGGESTIONS } from '../lib/assistant.js'
import { speak, stopSpeaking, canSpeak, canListen, listenOnce } from '../lib/speech.js'

const MISS = "I don't have a grounded answer for that. I only answer from what this app can compute — the running line, your die, the yield and cost models, the material chain and the process steps. I'd rather say that than invent something. Try one of the suggestions below."

export default function Assistant({ cfg, snap, journey, goTab, open, setOpen }) {
  const [log, setLog] = useState([])
  const [input, setInput] = useState('')
  const [voice, setVoice] = useState(false)
  const [listening, setListening] = useState(false)
  const [err, setErr] = useState(null)
  const stopRef = useRef(null)
  const endRef = useRef(null)

  const submit = (text) => {
    const q = String(text || '').trim()
    if (!q) return
    const hit = ask(q, { cfg, snap, journey })
    const answer = hit ? hit.text : MISS
    setLog((l) => [...l, { role: 'you', text: q }, { role: 'fab', text: answer, tab: hit?.tab, grounded: !!hit }])
    setInput('')
    if (voice) speak(answer, { rate: 1.02 })
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [log])
  useEffect(() => () => { stopSpeaking(); stopRef.current?.() }, [])

  const mic = () => {
    if (listening) { stopRef.current?.(); setListening(false); return }
    setErr(null)
    setListening(true)
    stopRef.current = listenOnce({
      onResult: (t) => submit(t),
      onError: (e) => setErr(e === 'not-supported'
        ? 'Voice input needs a Chromium browser. Everything else works here.'
        : e === 'not-allowed' ? 'Microphone permission was declined.' : `Voice input failed: ${e}`),
      onEnd: () => setListening(false),
    })
    if (!stopRef.current) setListening(false)
  }

  if (!open) {
    return (
      <button className="assistant-fab" onClick={() => setOpen(true)} aria-label="Open the fab assistant">
        ✨
      </button>
    )
  }

  return (
    <aside className="assistant" role="dialog" aria-label="Fab assistant">
      <div className="assistant-bar">
        <span><b>Fab assistant</b></span>
        <span className="row" style={{ gap: 5 }}>
          {canSpeak() && (
            <button className={`btn sm ${voice ? 'active' : ''}`}
              onClick={() => { setVoice((v) => !v); stopSpeaking() }}
              aria-label="Toggle spoken answers">{voice ? '🔊' : '🔈'}</button>
          )}
          <button className="btn sm" onClick={() => { stopSpeaking(); setOpen(false) }} aria-label="Close">✕</button>
        </span>
      </div>

      <div className="assistant-log">
        {log.length === 0 && (
          <p className="small">
            Ask about the running line, your die, cost, the material chain or any process step. I read
            the app's live state and compute the answer — there is no server behind this page and no
            language model, so if I don't recognise a question I'll say so rather than guess.
          </p>
        )}
        {log.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
            {m.tab && (
              <button className="btn sm" style={{ marginTop: 7 }} onClick={() => goTab(m.tab)}>
                Open the {m.tab} tab →
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {err && <div className="small" style={{ color: 'var(--warn)', padding: '0 12px 6px' }}>{err}</div>}

      <div className="assistant-chips">
        {SUGGESTIONS.slice(0, log.length ? 3 : 6).map((s) => (
          <button key={s} className="btn sm" onClick={() => submit(s)}>{s}</button>
        ))}
      </div>

      <div className="assistant-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(input) }}
          placeholder="Ask about the line, the die, the cost…"
          aria-label="Ask the fab assistant"
        />
        {canListen() && (
          <button className={`btn sm ${listening ? 'active' : ''}`} onClick={mic}
            aria-label={listening ? 'Stop listening' : 'Ask by voice'}>
            {listening ? '● listening' : '🎤'}
          </button>
        )}
        <button className="btn primary sm" onClick={() => submit(input)}>Ask</button>
      </div>
    </aside>
  )
}
