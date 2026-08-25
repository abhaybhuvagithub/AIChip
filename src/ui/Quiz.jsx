import React, { useState } from 'react'
import { QUIZ } from '../data/learn.js'

export default function Quiz() {
  const [answers, setAnswers] = useState({})
  const done = Object.keys(answers).length
  const score = QUIZ.reduce((n, q, i) => n + (answers[i] === q.a ? 1 : 0), 0)

  return (
    <div>
      <div className="eyebrow">Check</div>
      <h1 className="title">Twenty-one questions.</h1>
      <p className="lede">
        Everything you need is on the other seven tabs. Answers explain themselves as soon as you pick one —
        there is nothing to submit.
      </p>

      <div className="row" style={{ margin: '18px 0 16px' }}>
        <span className="badge on">{done} of {QUIZ.length} answered</span>
        {done > 0 && <span className="badge">{score} correct</span>}
        {done > 0 && <button className="btn sm" onClick={() => setAnswers({})}>Start over</button>}
      </div>

      {QUIZ.map((q, i) => {
        const picked = answers[i]
        const answered = picked !== undefined
        return (
          <div className="q" key={i}>
            <div className="qn">Question {String(i + 1).padStart(2, '0')}</div>
            <div className="qt">{q.q}</div>
            {q.opts.map((o, j) => {
              let cls = 'opt'
              if (answered && j === q.a) cls += ' right'
              else if (answered && j === picked) cls += ' wrong'
              return (
                <button key={j} className={cls} disabled={answered}
                  onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}>
                  {o}
                </button>
              )
            })}
            {answered && <div className="why">{q.why}</div>}
          </div>
        )
      })}

      {done === QUIZ.length && (
        <div className="card" style={{ marginTop: 16, borderColor: 'var(--accent)' }}>
          <div className="eyebrow">Result</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-.02em' }}>
            {score} / {QUIZ.length}
          </div>
          <p className="small" style={{ marginTop: 8 }}>
            {score >= 17
              ? 'You could hold your own in a yield review. The remaining gap is which lever to pull first, and that comes from the economics tab.'
              : score >= 11
                ? 'The mechanism is there. Go back through the fab line with the run button — the loop structure is what most of the misses have in common.'
                : 'Worth a second pass. Start with the fab line, then the yield lab, then come back here.'}
          </p>
        </div>
      )}
    </div>
  )
}
