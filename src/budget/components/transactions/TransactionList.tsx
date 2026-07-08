import { useBudgetStore } from '../../store/useBudgetStore'
import TransactionRow from './TransactionRow'

interface Props {
  month: string
  onAddTransaction: () => void
}

export default function TransactionList({ month, onAddTransaction }: Props) {
  const transactions = useBudgetStore((s) => s.transactions)

  const monthTxs = transactions
    .filter((t) => t.date.slice(0, 7) === month)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="panel col gap4" style={{ padding: '16px 20px' }}>
      <div className="row gap8" style={{ alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flex: 1 }}>
          Transactions
          {monthTxs.length > 0 && (
            <span className="caption" style={{ color: 'var(--ink-tertiary)', marginLeft: 8 }}>
              {monthTxs.length}
            </span>
          )}
        </span>
        <button
          data-tour-id="budget-add-transaction-list"
          className="btn btn-ghost btn-sm"
          onClick={onAddTransaction}
          style={{ fontSize: 12 }}
        >
          + Ajouter
        </button>
      </div>

      {monthTxs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-tertiary)', fontSize: 13 }}>
          Aucune transaction ce mois.
        </div>
      )}

      {monthTxs.map((tx) => (
        <TransactionRow key={tx.id} transaction={tx} />
      ))}
    </div>
  )
}
