import type { Bank, EnvelopeInfo } from '../../types/data'

interface Props {
  banks: Bank[]
  onClose: () => void
}

type EnvKey = keyof Bank['envelopes']

const SECTIONS: { key: EnvKey; label: string; fields: (keyof EnvelopeInfo)[] }[] = [
  { key: 'pea',           label: 'PEA',            fields: ['orderFees', 'custodyFees', 'minOrder'] },
  { key: 'cto',           label: 'CTO',             fields: ['orderFees', 'custodyFees'] },
  { key: 'assurance_vie', label: 'Assurance-vie',   fields: ['entryFees', 'managementFees', 'arbitrageFees'] },
  { key: 'per',           label: 'PER',             fields: ['entryFees', 'managementFees'] },
  { key: 'livret_a',      label: 'Livret A',        fields: ['fees'] },
]

const FIELD_LABELS: Partial<Record<keyof EnvelopeInfo, string>> = {
  orderFees:      'Frais de courtage',
  custodyFees:    'Frais de garde',
  minOrder:       'Ordre minimum (€)',
  entryFees:      "Frais d'entrée",
  managementFees: 'Frais de gestion',
  arbitrageFees:  "Frais d'arbitrage",
  fees:           'Frais',
}

export default function BankCompareOverlay({ banks, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-base/80 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-sm">Comparatif</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground w-6 h-6 flex items-center justify-center rounded"
          >
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-xs text-muted font-medium w-48">Critère</th>
                {banks.map((b) => (
                  <th key={b.id} className="text-left py-2 px-3 text-xs font-semibold text-foreground">
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">

              {/* Note globale */}
              <tr>
                <td className="py-2 pr-4 text-[11px] text-muted/70 font-medium">Note globale</td>
                {banks.map((b) => (
                  <td key={b.id} className="py-2 px-3 text-[11px] font-semibold text-purple">
                    {b.rating} / 5
                  </td>
                ))}
              </tr>

              {/* Sections par enveloppe */}
              {SECTIONS.map((section) =>
                section.fields.map((field) => {
                  const label = FIELD_LABELS[field]
                  if (!label) return null
                  return (
                    <tr key={`${section.key}-${field}`}>
                      <td className="py-2 pr-4 text-[11px] text-muted/60">
                        <span className="text-muted/40">{section.label} — </span>
                        {label}
                      </td>
                      {banks.map((b) => {
                        const env = b.envelopes[section.key]
                        if (!env.available) {
                          return (
                            <td key={b.id} className="py-2 px-3 text-[11px] text-muted/30">
                              N/A
                            </td>
                          )
                        }
                        const val = env[field]
                        return (
                          <td key={b.id} className={`py-2 px-3 text-[11px] font-medium ${
                            val === 0 ? 'text-success' : 'text-foreground'
                          }`}>
                            {val !== undefined && val !== null
                              ? field === 'minOrder'
                                ? `${val} €`
                                : `${val} %`
                              : '—'
                            }
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}

              {/* Pros */}
              <tr>
                <td className="py-2 pr-4 text-[11px] text-muted/70 font-medium">Points forts</td>
                {banks.map((b) => (
                  <td key={b.id} className="py-2 px-3 text-[11px] text-success/80 align-top">
                    {b.pros.slice(0, 2).map((p) => (
                      <div key={p}>+ {p}</div>
                    ))}
                  </td>
                ))}
              </tr>

              {/* Cons */}
              <tr>
                <td className="py-2 pr-4 text-[11px] text-muted/70 font-medium">Points faibles</td>
                {banks.map((b) => (
                  <td key={b.id} className="py-2 px-3 text-[11px] text-danger/80 align-top">
                    {b.cons.slice(0, 2).map((c) => (
                      <div key={c}>− {c}</div>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
