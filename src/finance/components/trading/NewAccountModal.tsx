import { useState } from 'react'
import { FinanceSelect } from '../ui/FinanceSelect'
import type { TradingAccount } from '../../types/finance'
import { useFinanceStore } from '../../store/useFinanceStore'

interface Props {
  onClose: () => void
}

export default function NewAccountModal({ onClose }: Props) {
  const { addTradingAccount, setActiveTradingAccount } = useFinanceStore()

  const [name, setName] = useState('')
  const [capital, setCapital] = useState('')
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR')
  const [commissionMode, setCommissionMode] = useState<'percent' | 'flat'>('percent')
  const [feeRate, setFeeRate] = useState('0.1')
  const [commissionFlat, setCommissionFlat] = useState('1')
  const [slippagePct, setSlippagePct] = useState('0.05')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)

  const isValid = name.trim().length > 0 && parseFloat(capital) > 0

  function handleCreate() {
    if (!isValid) return
    const cap = parseFloat(capital)
    const account: TradingAccount = {
      id: `account-${Date.now()}`,
      name: name.trim(),
      initialCapital: cap,
      cashBalance: cap,
      createdAt: Date.now(),
      currency,
      feeRate: (parseFloat(feeRate) || 0) / 100,
      commissionMode,
      commissionFlat: parseFloat(commissionFlat) || 0,
      slippagePct: parseFloat(slippagePct) || 0,
      autoRefreshEnabled: autoRefresh,
      autoRefreshInterval: refreshInterval,
    }
    addTradingAccount(account)
    setActiveTradingAccount(account.id)
    onClose()
  }

  return (
    <div
      className="scrim"
      onMouseDown={onClose}
      style={{ zIndex: 120 }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '95vw',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'pop .18s var(--ease)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--hairline)' }}>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            <h2 className="title" style={{ fontSize: 15, flex: 1 }}>Nouveau compte de trading</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Fermer">✕</button>
          </div>
          <p className="caption" style={{ marginTop: 4 }}>Créez un compte virtuel pour simuler vos trades.</p>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Nom du compte *</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Portefeuille principal"
              autoFocus
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--r)',
                padding: '7px 10px',
                fontSize: 13,
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </label>

          {/* Capital initial */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Capital initial *</span>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="number"
                value={capital}
                onChange={e => setCapital(e.target.value)}
                placeholder="10 000"
                min={1}
                style={{
                  flex: 1,
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${parseFloat(capital) > 0 || capital === '' ? 'var(--hairline)' : 'var(--danger)'}`,
                  borderRadius: 'var(--r)',
                  padding: '7px 10px',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              <FinanceSelect
                value={currency}
                onChange={v => setCurrency(v as 'EUR' | 'USD')}
                options={[
                  { value: 'EUR', label: 'EUR €' },
                  { value: 'USD', label: 'USD $' },
                ]}
                style={{ width: 96 }}
              />
            </div>
          </label>

          {/* Commissions simulées */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>
              Commissions simulées
              <span
                title="Frais de courtage appliqués à chaque ordre — pourcentage du montant ou forfait fixe"
                style={{ marginLeft: 5, cursor: 'help', color: 'var(--ink-subtle)', fontSize: 11 }}
              >?</span>
            </span>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <div className="row" style={{ gap: 0, borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                {(['percent', 'flat'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setCommissionMode(m)}
                    style={{
                      padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: commissionMode === m ? 'var(--primary)' : 'var(--bg-elevated)',
                      color: commissionMode === m ? 'white' : 'var(--ink-subtle)',
                    }}
                  >
                    {m === 'percent' ? '% du montant' : 'Forfait / ordre'}
                  </button>
                ))}
              </div>
              {commissionMode === 'percent' ? (
                <input
                  type="number"
                  value={feeRate}
                  onChange={e => setFeeRate(e.target.value)}
                  min={0}
                  max={5}
                  step={0.05}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
                    borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
                    fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none', width: 80,
                  }}
                />
              ) : (
                <input
                  type="number"
                  value={commissionFlat}
                  onChange={e => setCommissionFlat(e.target.value)}
                  min={0}
                  step={0.5}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
                    borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
                    fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none', width: 80,
                  }}
                />
              )}
              <span className="caption">{commissionMode === 'percent' ? '%' : currency === 'USD' ? '$' : '€'}</span>
            </div>
          </div>

          {/* Slippage simulé */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>
              Spread bid-ask simulé (%)
              <span
                title="Slippage : chaque exécution market paie la moitié de ce spread dans le sens défavorable"
                style={{ marginLeft: 5, cursor: 'help', color: 'var(--ink-subtle)', fontSize: 11 }}
              >?</span>
            </span>
            <input
              type="number"
              value={slippagePct}
              onChange={e => setSlippagePct(e.target.value)}
              min={0}
              max={2}
              step={0.01}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--r)',
                padding: '7px 10px',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                color: 'var(--ink)',
                outline: 'none',
                width: 100,
              }}
            />
          </label>

          {/* Auto-refresh */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <span className="caption" style={{ fontWeight: 600, flex: 1 }}>Auto-refresh des prix</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: autoRefresh ? 'var(--primary)' : 'var(--hairline-strong)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.15s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: autoRefresh ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.15s',
                  }}
                />
              </button>
            </div>
            {autoRefresh && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="caption">Intervalle :</span>
                <FinanceSelect
                  value={String(refreshInterval)}
                  onChange={v => setRefreshInterval(Number(v))}
                  options={[
                    { value: '10', label: '10 secondes' },
                    { value: '30', label: '30 secondes' },
                    { value: '60', label: '1 minute' },
                    { value: '300', label: '5 minutes' },
                  ]}
                />
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="row"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--hairline)',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCreate}
            disabled={!isValid}
          >
            Créer le compte
          </button>
        </div>
      </div>
    </div>
  )
}
