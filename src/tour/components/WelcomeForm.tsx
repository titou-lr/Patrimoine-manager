import { useState } from 'react'
import { useTourStore } from '../store/useTourStore'

export default function WelcomeForm() {
  const { completeForm, skipEverything } = useTourStore()
  const [firstName, setFirstName] = useState('')
  const [age, setAge] = useState(28)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    completeForm({ firstName: firstName.trim(), age })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--canvas)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      animation: 'fade-in .25s var(--ease)',
    }}>
      {/* Illustration */}
      <svg width="240" height="80" viewBox="0 0 240 80" fill="none" style={{ marginBottom: 32 }}>
        {[15, 30, 45, 60].map((y) => (
          <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="var(--hairline)" strokeDasharray="3 3" />
        ))}
        <path
          d="M0 72 C30 70 50 60 80 48 C110 36 130 22 160 14 C190 6 210 4 240 2"
          stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none"
        />
        <path
          d="M0 72 C30 70 50 60 80 48 C110 36 130 22 160 14 C190 6 210 4 240 2 L240 80 L0 80 Z"
          fill="var(--primary)" fillOpacity="0.07"
        />
        <circle cx="80" cy="48" r="4" fill="var(--primary)" fillOpacity="0.6" />
        <circle cx="160" cy="14" r="4" fill="var(--primary)" fillOpacity="0.6" />
        <circle cx="240" cy="2" r="5" fill="var(--primary)" />
        <circle cx="240" cy="2" r="10" fill="var(--primary)" fillOpacity="0.15" />
      </svg>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface-2)',
        border: '1px solid var(--hairline-strong)',
        borderRadius: 'var(--r-xl)',
        padding: '32px 28px 28px',
        boxShadow: 'var(--shadow-pop)',
      }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h1 style={{
            margin: '0 0 8px',
            fontSize: 22, fontWeight: 700,
            color: 'var(--ink)', lineHeight: 1.3,
          }}>
            Bienvenue dans votre<br />simulateur patrimoine
          </h1>
          <p className="caption" style={{ margin: 0, lineHeight: 1.5 }}>
            Deux infos pour personnaliser votre visite guidée — tout reste 100 % local.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="col" style={{ gap: 16, marginBottom: 24 }}>
            {/* Prénom */}
            <label className="col" style={{ gap: 6 }}>
              <span className="eyebrow" style={{ fontSize: 11 }}>Prénom (optionnel)</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="ex. Alexandre"
                className="input"
                style={{ height: 40, padding: '0 12px', fontSize: 14, borderRadius: 'var(--r-md)' }}
                autoFocus
              />
            </label>

            {/* Âge */}
            <label className="col" style={{ gap: 6 }}>
              <span className="eyebrow" style={{ fontSize: 11 }}>Âge actuel</span>
              <div className="row gap8" style={{ alignItems: 'center' }}>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Math.max(16, Math.min(80, parseInt(e.target.value) || 28)))}
                  min={16} max={80}
                  className="input mono"
                  style={{ height: 40, padding: '0 12px', fontSize: 14, width: 90, borderRadius: 'var(--r-md)' }}
                />
                <span className="caption">ans</span>
                {/* Quick age picker */}
                <div className="row gap4" style={{ marginLeft: 4 }}>
                  {[25, 30, 35, 40].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAge(a)}
                      style={{
                        height: 28, padding: '0 8px', borderRadius: 'var(--r-sm)',
                        fontSize: 12, border: '1px solid var(--hairline)',
                        background: age === a ? 'var(--primary-tint)' : 'var(--surface-3)',
                        color: age === a ? 'var(--primary-hover)' : 'var(--ink-subtle)',
                        cursor: 'pointer', fontWeight: age === a ? 600 : 400,
                        transition: 'all .12s',
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14, fontWeight: 600 }}
          >
            Commencer la visite guidée →
          </button>
        </form>
      </div>

      <button
        onClick={skipEverything}
        style={{
          marginTop: 16, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--ink-subtle)', fontSize: 13,
          padding: '6px 12px', borderRadius: 'var(--r-sm)',
          transition: 'color .12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-subtle)')}
      >
        Passer l'introduction
      </button>
    </div>
  )
}
