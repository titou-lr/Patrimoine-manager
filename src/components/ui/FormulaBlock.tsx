interface FormulaBlockProps {
  formula: string
  variables?: { symbol: string; definition: string }[]
  note?: string
}

export default function FormulaBlock({ formula, variables, note }: FormulaBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <pre className="bg-elevated border border-border rounded-lg px-4 py-3 font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed overflow-x-auto">
        {formula}
      </pre>

      {variables && variables.length > 0 && (
        <div className="flex flex-col gap-1 pl-1">
          {variables.map(({ symbol, definition }) => (
            <div key={symbol} className="flex items-baseline gap-2 text-xs">
              <span className="font-mono text-orange shrink-0 w-20 text-right">{symbol}</span>
              <span className="text-border/60 shrink-0">—</span>
              <span className="text-secondary">{definition}</span>
            </div>
          ))}
        </div>
      )}

      {note && (
        <p className="text-xs text-muted italic pl-1">{note}</p>
      )}
    </div>
  )
}
