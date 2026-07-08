import { useMemo, useState } from 'react'
import { useBudgetStore } from '../store/useBudgetStore'
import { useStore, selectActiveSim } from '../../store/useStore'
import { computeMonthlySnapshot, compareToSimulationAssumption, addMonths, currentYearMonth } from '../engine/budgetEngine'
import BudgetOverviewPanel from './BudgetOverviewPanel'
import BudgetVsSimulationBanner from './BudgetVsSimulationBanner'
import EnvelopeGrid from './envelopes/EnvelopeGrid'
import TransactionList from './transactions/TransactionList'
import AddTransactionModal from './transactions/AddTransactionModal'
import CategoryManagerModal from './categories/CategoryManagerModal'
import CsvImportModal from './import/CsvImportModal'
import RecurringRulesPanel from './recurring/RecurringRulesPanel'
import CashflowForecastChart from './forecast/CashflowForecastChart'
import SubscriptionsPanel from './subscriptions/SubscriptionsPanel'
import PaymentCalendar from './calendar/PaymentCalendar'
import SavingsGoalsPanel from './goals/SavingsGoalsPanel'
import DebtPlanPanel from './debts/DebtPlanPanel'
import HelpButton from '../../help/components/HelpButton'

type BudgetTab = 'overview' | 'transactions' | 'recurring' | 'subscriptions' | 'calendar' | 'goals' | 'debts' | 'forecast'

interface Props {
  onGoToEnvelopes: () => void
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

const TABS: { id: BudgetTab; label: string }[] = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'recurring', label: 'Récurrences' },
  { id: 'subscriptions', label: 'Abonnements' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'goals', label: 'Objectifs' },
  { id: 'debts', label: 'Dettes' },
  { id: 'forecast', label: 'Prévisions' },
]

export default function BudgetPage({ onGoToEnvelopes }: Props) {
  const { transactions, envelopes, selectedMonth, setSelectedMonth } = useBudgetStore()
  const mainStore = useStore()
  const activeSim = selectActiveSim(mainStore)
  const globalParams = activeSim.globalParams

  const [activeTab, setActiveTab] = useState<BudgetTab>('overview')
  const [showAddTx, setShowAddTx] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)

  // Build snapshot for current month and previous month (for rollover)
  const prevMonth = addMonths(selectedMonth, -1)

  const prevSnapshot = useMemo(
    () => computeMonthlySnapshot(transactions, envelopes, prevMonth),
    [transactions, envelopes, prevMonth]
  )

  const snapshot = useMemo(
    () => computeMonthlySnapshot(transactions, envelopes, selectedMonth, prevSnapshot),
    [transactions, envelopes, selectedMonth, prevSnapshot]
  )

  const gap = useMemo(
    () => compareToSimulationAssumption(snapshot, globalParams),
    [snapshot, globalParams]
  )

  const isCurrentMonth = selectedMonth === currentYearMonth()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--surface-1)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <BudgetIcon />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            Budget
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 1 }}>
            Pilotez vos dépenses mois par mois et comparez à vos hypothèses de simulation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HelpButton page="budget" />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowCategories(true)}
            style={{ fontSize: 12 }}
          >
            Catégories
          </button>
          <button
            data-tour-id="budget-add-transaction"
            className="btn btn-sm"
            onClick={() => setShowAddTx(true)}
          >
            + Transaction
          </button>
        </div>
      </div>

      {/* Month selector + tabs */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--surface-1)',
        }}
      >
        {/* Month nav */}
        <div
          data-tour-id="budget-month-selector"
          style={{
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))}
            style={{ padding: '4px 10px' }}
          >
            ‹
          </button>
          <span style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize', minWidth: 140, textAlign: 'center' }}>
            {monthLabel(selectedMonth)}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            style={{ padding: '4px 10px' }}
            disabled={isCurrentMonth}
          >
            ›
          </button>
          {!isCurrentMonth && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedMonth(currentYearMonth())}
              style={{ fontSize: 11 }}
            >
              Aujourd'hui
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 24px', gap: 2 }} data-tour-id="budget-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? 'var(--ink)' : 'var(--ink-tertiary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="scroll" style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Gap banner — visible on all tabs when income data present */}
        {snapshot.totalIncome > 0 && activeTab !== 'forecast' && (
          <BudgetVsSimulationBanner gap={gap} onGoToEnvelopes={onGoToEnvelopes} />
        )}

        {/* Tab: Vue d'ensemble */}
        {activeTab === 'overview' && (
          <div className="col gap16">
            <div data-tour-id="budget-overview-panel">
              <BudgetOverviewPanel snapshot={snapshot} />
            </div>
            <div data-tour-id="budget-envelope-grid">
              <EnvelopeGrid snapshot={snapshot} />
            </div>
          </div>
        )}

        {/* Tab: Transactions */}
        {activeTab === 'transactions' && (
          <div className="col gap16">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCsvImport(true)}
                style={{ fontSize: 12 }}
              >
                Importer un relevé
              </button>
            </div>
            <TransactionList month={selectedMonth} onAddTransaction={() => setShowAddTx(true)} />
          </div>
        )}

        {/* Tab: Récurrences */}
        {activeTab === 'recurring' && (
          <RecurringRulesPanel />
        )}

        {/* Tab: Abonnements */}
        {activeTab === 'subscriptions' && (
          <SubscriptionsPanel />
        )}

        {/* Tab: Calendrier de prélèvements */}
        {activeTab === 'calendar' && (
          <PaymentCalendar month={selectedMonth} />
        )}

        {/* Tab: Objectifs d'épargne */}
        {activeTab === 'goals' && (
          <SavingsGoalsPanel />
        )}

        {/* Tab: Plan de remboursement de dettes */}
        {activeTab === 'debts' && (
          <DebtPlanPanel />
        )}

        {/* Tab: Prévisions */}
        {activeTab === 'forecast' && (
          <CashflowForecastChart />
        )}
      </div>

      {showAddTx && (
        <AddTransactionModal
          month={selectedMonth}
          onClose={() => setShowAddTx(false)}
        />
      )}

      {showCategories && (
        <CategoryManagerModal onClose={() => setShowCategories(false)} />
      )}

      {showCsvImport && (
        <CsvImportModal onClose={() => setShowCsvImport(false)} />
      )}
    </div>
  )
}

function BudgetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-tertiary)"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 7h6M5 10h4" />
      <path d="M8 3V1.5" />
    </svg>
  )
}
