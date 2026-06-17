import { useState } from 'react'

export interface QuizQuestion {
  text: string
  options: string[]
  correct: number
  explanation: string
}

export function QuizScreen({
  questions,
  onPass,
}: {
  questions: QuizQuestion[]
  onPass: () => void
}) {
  // activeItems: original question indices shown in the current round
  const [activeItems, setActiveItems] = useState<number[]>(() => questions.map((_, i) => i))
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [totalPassed, setTotalPassed] = useState(0)

  const allAnswered = activeItems.every(i => answers[i] !== undefined)

  function pick(qi: number, oi: number) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qi]: oi }))
  }

  function submit() {
    setSubmitted(true)
    const newlyPassed = activeItems.filter(i => answers[i] === questions[i].correct)
    const newTotal = totalPassed + newlyPassed.length
    if (newTotal === questions.length) {
      setTotalPassed(newTotal)
      // small pause so user sees all-green before advancing
      setTimeout(onPass, 500)
    } else {
      setTotalPassed(newTotal)
    }
  }

  function retry() {
    const failed = activeItems.filter(i => answers[i] !== questions[i].correct)
    setActiveItems(failed)
    setAnswers({})
    setSubmitted(false)
  }

  const allCorrectThisRound = submitted && activeItems.every(i => answers[i] === questions[i].correct)

  return (
    <div className="col" style={{ gap: 16 }}>
      {activeItems.map(qi => {
        const q = questions[qi]
        const sel = answers[qi]
        const isCorrect = submitted && sel === q.correct
        const isWrong = submitted && sel !== undefined && sel !== q.correct

        return (
          <div key={qi} className="panel" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>
              {qi + 1}. {q.text}
            </div>
            <div className="col" style={{ gap: 7 }}>
              {q.options.map((opt, oi) => {
                const isSel = sel === oi
                return (
                  <button
                    key={oi}
                    onClick={() => pick(qi, oi)}
                    disabled={submitted}
                    style={{
                      textAlign: 'left', padding: '9px 13px', borderRadius: 8, fontSize: 13,
                      cursor: submitted ? 'default' : 'pointer',
                      border: `1px solid ${
                        isCorrect && isSel ? 'var(--success)'
                        : isWrong && isSel ? 'var(--danger)'
                        : isSel ? 'var(--primary)'
                        : 'var(--hairline)'
                      }`,
                      background: isCorrect && isSel ? 'rgba(76,183,130,0.1)'
                        : isWrong && isSel ? 'rgba(235,87,87,0.1)'
                        : isSel ? 'rgba(94,106,210,0.12)'
                        : 'var(--surface-2)',
                      color: isCorrect && isSel ? 'var(--success)'
                        : isWrong && isSel ? 'var(--danger)'
                        : 'var(--ink)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 8, opacity: 0.6 }}>
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>

            {isWrong && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: 'var(--surface-3)', borderLeft: '3px solid var(--primary)',
                color: 'var(--ink-subtle)', lineHeight: 1.5,
              }}>
                Pas tout à fait — relis le cours et réessaie !
              </div>
            )}
            {isCorrect && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: 'var(--surface-3)', borderLeft: '3px solid var(--success)',
                color: 'var(--ink-subtle)', lineHeight: 1.5,
              }}>
                💡 {q.explanation}
              </div>
            )}
          </div>
        )
      })}

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {submitted ? (
          <span style={{ fontSize: 13, fontWeight: 500, color: allCorrectThisRound ? 'var(--success)' : 'var(--ink-muted)' }}>
            {totalPassed}/{questions.length} {allCorrectThisRound ? '— Parfait !' : '— Continue…'}
          </span>
        ) : <span />}

        {!submitted && (
          <button
            onClick={submit}
            disabled={!allAnswered}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 18px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500,
              cursor: allAnswered ? 'pointer' : 'not-allowed',
              background: allAnswered ? 'var(--primary)' : 'var(--surface-3)',
              color: allAnswered ? '#fff' : 'var(--ink-muted)',
            }}
          >
            Valider mes réponses
          </button>
        )}
        {submitted && !allCorrectThisRound && (
          <button
            onClick={retry}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 18px',
              borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 13, fontWeight: 500,
              background: 'var(--surface-2)', color: 'var(--ink)', cursor: 'pointer',
            }}
          >
            Réessayer les erreurs
          </button>
        )}
      </div>
    </div>
  )
}
