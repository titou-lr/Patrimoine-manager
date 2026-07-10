import { useRef, useState } from 'react'

interface Props {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  isWarning?: boolean
  className?: string
}

const SIZES = {
  sm: { input: 'px-2 py-1 pr-5 text-xs', suffix: 'text-[10px] right-1' },
  md: { input: 'px-2.5 py-1.5 pr-9 text-xs', suffix: 'text-[10px] right-2' },
  lg: { input: 'px-3 py-2 pr-10 text-sm', suffix: 'text-xs right-3' },
}

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
  placeholder,
  size = 'md',
  disabled = false,
  isWarning = false,
  className = '',
}: Props) {
  const [rawValue, setRawValue] = useState('')
  const [focused, setFocused] = useState(false)
  const prevValue = useRef(value)

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    prevValue.current = value
    setRawValue(String(value))
    setFocused(true)
    e.target.select()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRawValue(e.target.value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
    if (e.key === 'Escape') {
      setRawValue(String(prevValue.current))
      ;(e.target as HTMLInputElement).blur()
    }
  }

  function handleBlur() {
    setFocused(false)
    const parsed = parseFloat(rawValue.replace(',', '.'))
    if (isNaN(parsed)) {
      onChange(prevValue.current)
      return
    }
    let clamped = parsed
    if (min !== undefined) clamped = Math.max(min, clamped)
    if (max !== undefined) clamped = Math.min(max, clamped)
    onChange(clamped)
  }

  const parsedRaw = parseFloat(rawValue.replace(',', '.'))
  const dirty = focused && rawValue !== String(value)
  const outOfBounds =
    focused &&
    !isNaN(parsedRaw) &&
    ((min !== undefined && parsedRaw < min) || (max !== undefined && parsedRaw > max))

  const borderClass = outOfBounds
    ? 'border-danger focus:ring-danger/20'
    : dirty
      ? 'border-orange focus:ring-orange/20'
      : isWarning
        ? 'border-orange focus:ring-orange/20'
        : 'border-border focus:border-orange focus:ring-orange/20'

  const { input: inputClass, suffix: suffixClass } = SIZES[size]

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        value={focused ? rawValue : String(value)}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-label={suffix ? `valeur en ${suffix}` : undefined}
        className={`w-full bg-elevated border rounded-lg font-mono text-foreground focus:outline-none focus:ring-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed tabular-nums ${inputClass} ${borderClass}`}
      />
      {suffix && (
        <span
          aria-hidden="true"
          className={`absolute top-1/2 -translate-y-1/2 text-muted pointer-events-none ${suffixClass}`}
        >
          {suffix}
        </span>
      )}
    </div>
  )
}
