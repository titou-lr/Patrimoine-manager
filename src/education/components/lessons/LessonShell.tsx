import type { ReactNode } from 'react'

export function LessonShell({
  step,
  totalSteps,
  onBack,
  backLabel = '← Retour',
  children,
}: {
  step: number
  totalSteps: number
  onBack?: () => void
  backLabel?: string
  children: ReactNode
}) {
  return (
    <div className="col" style={{ gap: 20, maxWidth: 720, margin: '0 auto' }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start',
            color: 'var(--ink-subtle)', fontSize: 13, padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {backLabel}
        </button>
      )}
      <div className="row" style={{ gap: 5 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            style={{
              height: 3, flex: 1, borderRadius: 4,
              background: i < step ? 'var(--primary)' : 'var(--hairline-strong)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      {children}
    </div>
  )
}
