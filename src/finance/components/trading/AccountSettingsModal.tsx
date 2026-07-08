import { useState } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import type { TradingAccount } from '../../types/finance'

interface Props {
  account: TradingAccount
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
  borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
  fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none', width: 100,
}

export default function AccountSettingsModal({ account, onClose }: Props) {
  const { updateTradingAccount, removeTradingAccount, tradingAccounts, setActiveTradingAccount } = useFinanceStore()

  const [name, setName] = useState(account.name)
  const [commissionMode, setCommissionMode] = useState<'percent' | 'flat'>(account.commissionMode ?? 'percent')
  const [feeRate, setFeeRate] = useState(String(account.feeRate * 100))
  const [commissionFlat, setCommissionFlat] = useState(String(account.commissionFlat ?? 1))
  const [slippagePct, setSlippagePct] = useState(String(account.slippagePct ?? 0))
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave() {
    updateTradingAccount(account.id, {
      name: name.trim() || account.name,
      commissionMode,
      feeRate: (parseFloat(feeRate) || 0) / 100,
      commissionFlat: parseFloat(commissionFlat) || 0,
      slippagePct: parseFloat(slippagePct) || 0,
    })
    onClose()
  }

  function handleDelete() {
    removeTradingAccount(account.id)
    const remaining = tradingAccounts.filter(a => a.id !== account.id)
    if (remaining.length > 0) setActiveTradingAccount(remaining[0].id)
    onClose()
  }

  return (
    <div className="scrim" onMouseDown={onClose} style={{ zIndex: 120 }}>
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: 440, maxWidth: '95vw',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'pop .18s var(--ease)',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--hairline)' }}>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            <h2 className="title" style={{ fontSize: 15, flex: 1 }}>Paramètres du compte</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Fermer">✕</button>
          </div>
          <p className="caption" style={{ marginTop: 4 }}>
            Frictions d'exécution : les fills reflètent ces paramètres.
          </p>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Nom du compte</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ ...inputStyle, width: '100%', fontFamily: 'inherit' }}
            />
          </label>

          {/* Commissions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Commissions</span>
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
                <input type="number" value={feeRate} onChange={e => setFeeRate(e.target.value)} min={0} max={5} step={0.05} style={inputStyle} />
              ) : (
                <input type="number" value={commissionFlat} onChange={e => setCommissionFlat(e.target.value)} min={0} step={0.5} style={inputStyle} />
              )}
              <span className="caption">{commissionMode === 'percent' ? '%' : account.currency === 'USD' ? '$' : '€'}</span>
            </div>
          </div>

          {/* Slippage */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>
              Spread bid-ask simulé (%)
              <span
                title="Chaque exécution market paie la moitié de ce spread dans le sens défavorable"
                style={{ marginLeft: 5, cursor: 'help', color: 'var(--ink-subtle)', fontSize: 11 }}
              >?</span>
            </span>
            <input type="number" value={slippagePct} onChange={e => setSlippagePct(e.target.value)} min={0} max={2} step={0.01} style={inputStyle} />
          </label>

          {/* Zone danger */}
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
            {!confirmDelete ? (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', fontSize: 12 }}
                onClick={() => setConfirmDelete(true)}
              >
                Supprimer ce compte…
              </button>
            ) : (
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span className="caption" style={{ color: 'var(--danger)', flex: 1 }}>
                  Positions, ordres et journal seront perdus. Confirmer ?
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Annuler</button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--danger)', color: 'white' }}
                  onClick={handleDelete}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="row" style={{ padding: '12px 20px', borderTop: '1px solid var(--hairline)', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
