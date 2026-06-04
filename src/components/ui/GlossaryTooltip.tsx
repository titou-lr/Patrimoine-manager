import { useState, useRef, useEffect } from 'react'
import { GLOSSARY_BY_ID } from '../../data/glossary'

interface Props {
  termId: string
  children: React.ReactNode
  onOpenModal?: (termId: string) => void
}

export default function GlossaryTooltip({ termId, children, onOpenModal }: Props) {
  const term = GLOSSARY_BY_ID[termId]
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!visible) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [visible])

  if (!term) return <>{children}</>

  return (
    <span ref={ref} className="relative inline-flex items-center gap-0.5 group">
      <span
        className="border-b border-dashed border-muted/50 cursor-help hover:border-orange/60 hover:text-orange transition-colors duration-150"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => onOpenModal?.(termId)}
      >
        {children}
      </span>

      {visible && (
        <span
          className="absolute bottom-full left-0 mb-1.5 z-50 bg-surface border border-border rounded-xl shadow-xl p-3 w-64 pointer-events-none"
          style={{ minWidth: '200px' }}
        >
          <span className="block text-xs font-semibold text-foreground mb-1">{term.term}</span>
          <span className="block text-xs text-muted leading-relaxed">{term.shortDef}</span>
          {onOpenModal && (
            <span className="block text-[10px] text-orange mt-1.5 pointer-events-auto cursor-pointer hover:underline" onClick={() => onOpenModal(termId)}>
              En savoir plus →
            </span>
          )}
        </span>
      )}
    </span>
  )
}
