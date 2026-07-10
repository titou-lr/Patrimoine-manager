import { useState } from 'react'
import { FinanceSelect } from '../ui/FinanceSelect'
import { useFinanceStore, getAssetById, useAllAssets } from '../../store/useFinanceStore'
import type { AlertCondition, PriceAlert } from '../../types/finance'
import { conditionDisplay } from '../../services/alertsService'

const CONDITION_OPTIONS: { value: AlertCondition; label: string }[] = [
  { value: 'above', label: 'Prix passe au-dessus de X' },
  { value: 'below', label: 'Prix passe en-dessous de X' },
  { value: 'change_pct_up', label: 'Variation +X% sur 24h' },
  { value: 'change_pct_down', label: 'Variation -X% sur 24h' },
]

function genId() {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export default function PriceAlertsTab() {
  const { priceAlerts, addPriceAlert, removePriceAlert } = useFinanceStore()

  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [condition, setCondition] = useState<AlertCondition>('above')
  const [threshold, setThreshold] = useState('')
  const [note, setNote] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const allAssets = useAllAssets()
  const filteredAssets = allAssets.filter(a =>
    assetSearch.length > 0 &&
    (a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
     a.ticker.toLowerCase().includes(assetSearch.toLowerCase()))
  ).slice(0, 10)

  const selectedAsset = selectedAssetId ? getAssetById(selectedAssetId) : null

  function handleCreateAlert() {
    if (!selectedAssetId || !threshold) return
    const alert: PriceAlert = {
      id: genId(),
      assetId: selectedAssetId,
      condition,
      threshold: parseFloat(threshold),
      triggered: false,
      createdAt: Date.now(),
      note: note.trim() || undefined,
    }
    addPriceAlert(alert)
    setSelectedAssetId('')
    setAssetSearch('')
    setThreshold('')
    setNote('')
  }

  const activeAlerts = priceAlerts.filter(a => !a.triggered)
  const triggeredAlerts = priceAlerts.filter(a => a.triggered)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Alertes Prix</h2>
          <p className="caption">Soyez notifié quand un actif atteint votre seuil</p>
        </div>
        {activeAlerts.length > 0 && (
          <span style={{
            marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 20,
            background: 'var(--primary)', color: '#fff', fontWeight: 600,
          }}>
            {activeAlerts.length} active{activeAlerts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Creation form */}
      <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 className="title" style={{ fontSize: 14, marginBottom: 0 }}>Créer une alerte</h3>

        {/* Asset search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
          <label className="caption" style={{ fontWeight: 600 }}>Actif</label>
          <input
            type="text"
            placeholder="Rechercher un actif…"
            value={selectedAsset ? selectedAsset.name : assetSearch}
            onChange={e => { setAssetSearch(e.target.value); setSelectedAssetId(''); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 13,
              color: 'var(--ink)', outline: 'none',
            }}
          />
          {showDropdown && filteredAssets.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'var(--surface-2)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', maxHeight: 200, overflowY: 'auto',
              boxShadow: 'var(--shadow-pop)',
            }}>
              {filteredAssets.map(a => (
                <button
                  key={a.id}
                  onMouseDown={() => { setSelectedAssetId(a.id); setAssetSearch(''); setShowDropdown(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 12px',
                    textAlign: 'left', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hairline)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontWeight: 500 }}>{a.name}</span>
                  <span className="caption" style={{ marginLeft: 8 }}>{a.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Condition */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="caption" style={{ fontWeight: 600 }}>Condition</label>
          <FinanceSelect
            value={condition}
            onChange={v => setCondition(v as AlertCondition)}
            options={CONDITION_OPTIONS}
          />
        </div>

        {/* Threshold */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="caption" style={{ fontWeight: 600 }}>
            Seuil {condition.includes('change_pct') ? '(%)' : '(prix)'}
          </label>
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
            placeholder={condition.includes('change_pct') ? 'ex: 5' : 'ex: 150.00'}
            min={0}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 13,
              fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none',
            }}
          />
        </div>

        {/* Note */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="caption" style={{ fontWeight: 600 }}>Note (optionnelle)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="ex: Résistance clé, support long terme…"
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 13,
              color: 'var(--ink)', outline: 'none',
            }}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCreateAlert}
          disabled={!selectedAssetId || !threshold}
          style={{ fontSize: 13, alignSelf: 'flex-start' }}
        >
          Créer l'alerte
        </button>
      </div>

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="eyebrow">Alertes actives ({activeAlerts.length})</span>
          </div>
          {activeAlerts.map(alert => {
            const asset = getAssetById(alert.assetId)
            return (
              <div
                key={alert.id}
                className="row"
                style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--hairline)',
                  alignItems: 'center', gap: 12,
                }}
              >
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(94,106,210,0.15)', color: 'var(--primary)', fontWeight: 700 }}>
                  ACTIVE
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{asset?.name ?? alert.assetId}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-subtle)', fontFamily: 'var(--font-mono)' }}>
                      {asset?.ticker}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    {conditionDisplay(alert.condition, alert.threshold)}
                  </div>
                  {alert.note && (
                    <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginTop: 2 }}>{alert.note}</div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', whiteSpace: 'nowrap' }}>
                  {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                </div>
                <button
                  onClick={() => removePriceAlert(alert.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-subtle)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                  title="Supprimer"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden', opacity: 0.7 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="eyebrow">Alertes déclenchées ({triggeredAlerts.length})</span>
          </div>
          {triggeredAlerts.map(alert => {
            const asset = getAssetById(alert.assetId)
            return (
              <div
                key={alert.id}
                className="row"
                style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--hairline)',
                  alignItems: 'center', gap: 12,
                }}
              >
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--hairline)', color: 'var(--ink-subtle)', fontWeight: 700 }}>
                  DÉCLENCHÉ
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{asset?.name ?? alert.assetId}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-subtle)', fontFamily: 'var(--font-mono)' }}>
                      {asset?.ticker}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 2 }}>
                    {conditionDisplay(alert.condition, alert.threshold)}
                  </div>
                  {alert.note && (
                    <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginTop: 2 }}>{alert.note}</div>
                  )}
                </div>
                {alert.triggeredAt && (
                  <div style={{ fontSize: 11, color: 'var(--ink-subtle)', whiteSpace: 'nowrap' }}>
                    {new Date(alert.triggeredAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}
                <button
                  onClick={() => removePriceAlert(alert.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-subtle)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                  title="Supprimer"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {priceAlerts.length === 0 && (
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
          <div className="title" style={{ marginBottom: 6 }}>Aucune alerte configurée</div>
          <p className="caption" style={{ maxWidth: 320, margin: '0 auto' }}>
            Créez une alerte ci-dessus pour être notifié quand un actif atteint votre seuil de prix.
          </p>
        </div>
      )}
    </div>
  )
}
