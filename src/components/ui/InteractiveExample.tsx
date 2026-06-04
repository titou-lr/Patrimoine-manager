import { useState } from 'react'
import NumberInput from './NumberInput'

interface InputDef {
  id: string
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
}

interface OutputDef {
  label: string
  value: string
  highlight?: boolean
}

interface Props {
  title?: string
  inputs: InputDef[]
  compute: (values: Record<string, number>) => OutputDef[]
}

export default function InteractiveExample({ title, inputs, compute }: Props) {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(inputs.map((i) => [i.id, i.value]))
  )

  function handleChange(id: string, val: number) {
    setValues((prev) => ({ ...prev, [id]: val }))
  }

  const outputs = compute(values)

  return (
    <div className="bg-elevated border border-border rounded-xl p-4 flex flex-col gap-3">
      {title && (
        <div className="text-xs font-medium text-foreground">{title}</div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {inputs.map((input) => (
          <label key={input.id} className="flex flex-col gap-1">
            <span className="text-[10px] text-muted">{input.label}</span>
            <NumberInput
              value={values[input.id]}
              onChange={(v) => handleChange(input.id, v)}
              min={input.min}
              max={input.max}
              step={input.step}
              suffix={input.suffix}
              size="md"
            />
          </label>
        ))}
      </div>

      <div className="border-t border-border pt-3 flex flex-wrap gap-4">
        {outputs.map((out) => (
          <div key={out.label} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted">{out.label}</span>
            <span className={`font-mono text-sm tabular-nums ${out.highlight ? 'text-orange font-semibold' : 'text-foreground'}`}>
              {out.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
