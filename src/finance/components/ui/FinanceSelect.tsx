import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
}

export function FinanceSelect({ value, onChange, options, placeholder, disabled, style }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-2)',
          color: selected ? 'var(--ink)' : 'var(--ink-subtle)',
          border: open ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '7px 12px',
          fontSize: 13,
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => {
          if (!disabled && !open) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'
        }}
        onMouseLeave={e => {
          if (!open) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
        }}
      >
        <span>{selected?.label ?? placeholder ?? 'Sélectionner…'}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="var(--ink-subtle)" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'var(--surface-2)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          overflow: 'hidden',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  color: 'var(--ink)',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(94,106,210,0.25)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
