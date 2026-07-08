import { useHelpStore } from '../store/useHelpStore'
import type { HelpPageKey } from '../types/help'

/**
 * Bouton d'aide discret « ? » — à placer dans le header de chaque page.
 * Ouvre l'overlay d'aide de la page correspondante.
 */
export default function HelpButton({ page }: { page: HelpPageKey }) {
  const open = useHelpStore((s) => s.open)
  return (
    <button
      onClick={() => open(page)}
      title="Aide sur cette page"
      aria-label="Aide sur cette page"
      style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        border: '1px solid var(--hairline-strong)', background: 'transparent',
        color: 'var(--ink-tertiary)', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 600, lineHeight: 1,
        transition: 'color .12s, border-color .12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--ink)'
        e.currentTarget.style.borderColor = 'var(--ink-tertiary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--ink-tertiary)'
        e.currentTarget.style.borderColor = 'var(--hairline-strong)'
      }}
    >
      ?
    </button>
  )
}
