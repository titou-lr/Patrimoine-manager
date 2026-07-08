import { useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import type { FinanceTab } from '../types/finance'
import MarketTab from './market/MarketTab'
import AnalysisTab from './analysis/AnalysisTab'
import TradingTab from './trading/TradingTab'
import JournalTab from './journal/JournalTab'
import ReplayTab from './replay/ReplayTab'
import ScreenerTab from './screener/ScreenerTab'
import AIChatTab from './ai/AIChatTab'
import PriceAlertsTab from './alerts/PriceAlertsTab'
import HelpButton from '../../help/components/HelpButton'

const TABS: Array<{ id: FinanceTab; label: string }> = [
  { id: 'market', label: 'Marché' },
  { id: 'analysis', label: 'Analyse' },
  { id: 'trading', label: 'Trading' },
  { id: 'journal', label: 'Journal' },
  { id: 'replay', label: 'Replay' },
  { id: 'screener', label: 'Screener' },
  { id: 'ai', label: 'IA' },
  { id: 'alerts', label: 'Alertes' },
]

export default function FinancePage() {
  const { activeTab, setActiveTab, priceAlerts } = useFinanceStore()
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const triggeredCount = priceAlerts.filter(a => a.triggered).length

  return (
    <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }} data-tour-id="finance-page-header">
        <div style={{ flex: 1 }}>
          <h1 className="title" style={{ fontSize: 22, marginBottom: 4 }}>Finance</h1>
          <p className="caption">Marchés financiers, analyses et alertes en temps réel</p>
        </div>
        <HelpButton page="finance" />
      </div>

      {/* Sub-tabs — scrollable horizontally */}
      <div
        style={{
          marginBottom: 24,
          borderBottom: '1px solid var(--hairline)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="row" style={{ gap: 2, paddingBottom: 0, minWidth: 'max-content' }}>
          {TABS.map((tab) => {
            const isAlerts = tab.id === 'alerts'
            const badgeCount = isAlerts ? triggeredCount : 0

            return (
              <button
                key={tab.id}
                data-tour-id={`finance-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                  padding: '8px 14px',
                  marginBottom: -1,
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? 'var(--ink)' : 'var(--ink-subtle)',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                {tab.label}
                {badgeCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      background: 'var(--danger)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      lineHeight: 1,
                    }}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'market' && <MarketTab onAlertToast={showToast} />}
      {activeTab === 'analysis' && <AnalysisTab />}
      {activeTab === 'trading' && <TradingTab />}
      {activeTab === 'journal' && <JournalTab />}
      {activeTab === 'replay' && <ReplayTab />}
      {activeTab === 'screener' && <ScreenerTab />}
      {activeTab === 'ai' && <AIChatTab />}
      {activeTab === 'alerts' && <PriceAlertsTab />}

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 300,
            background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
            borderRadius: 'var(--r-lg)', padding: '12px 18px',
            fontSize: 13, color: 'var(--ink)', boxShadow: 'var(--shadow-pop)',
            maxWidth: 360,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
