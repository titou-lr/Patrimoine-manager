import { useBudgetStore } from '../../store/useBudgetStore'
import { formatEur } from '../../../utils/format'
import type { BudgetTransaction } from '../../types/budget'

interface Props {
  transaction: BudgetTransaction
}

const TYPE_COLORS = { expense: 'var(--danger)', income: 'var(--success)', transfer: 'var(--ink-tertiary)' }

export default function TransactionRow({ transaction }: Props) {
  const { removeTransaction, categories } = useBudgetStore()
  const cat = categories.find((c) => c.id === transaction.categoryId)

  return (
    <div
      className="row gap10"
      style={{
        padding: '8px 0',
        borderBottom: '1px solid var(--hairline)',
        alignItems: 'center',
      }}
    >
      {/* Color dot for category */}
      <span
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: cat?.color ?? 'var(--hairline-strong)',
          flexShrink: 0,
        }}
      />

      {/* Date */}
      <span className="mono caption" style={{ color: 'var(--ink-tertiary)', width: 68, flexShrink: 0 }}>
        {transaction.date.slice(5)}
      </span>

      {/* Label */}
      <div className="col" style={{ flex: 1, overflow: 'hidden' }}>
        <span className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
          {transaction.label}
        </span>
        {cat && (
          <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>{cat.label}</span>
        )}
      </div>

      {/* Amount */}
      <span
        className="mono"
        style={{
          fontWeight: 500, fontSize: 13,
          color: TYPE_COLORS[transaction.type],
          flexShrink: 0,
        }}
      >
        {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : '⇄'}{formatEur(transaction.amount)}
      </span>

      {/* Remove */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => removeTransaction(transaction.id)}
        style={{ padding: '2px 6px', color: 'var(--ink-tertiary)', flexShrink: 0, fontSize: 11 }}
        title="Supprimer"
      >
        ✕
      </button>
    </div>
  )
}
