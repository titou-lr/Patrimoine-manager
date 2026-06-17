import { useState } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'

interface Props {
  onClose: () => void
}

export default function ApiKeyModal({ onClose }: Props) {
  const { aiApiKey, setAiApiKey } = useFinanceStore()
  const [value, setValue] = useState(aiApiKey)
  const [show, setShow] = useState(false)

  function handleSave() {
    setAiApiKey(value.trim())
    onClose()
  }

  function handleDelete() {
    setAiApiKey('')
    setValue('')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: 420, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="title" style={{ fontSize: 16, marginBottom: 4 }}>Clé API Anthropic</h2>
          <p className="caption">Nécessaire pour activer l'assistant IA Finance.</p>
        </div>

        {/* Key input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="caption" style={{ fontWeight: 600 }}>Clé API</label>
          <div className="row" style={{ gap: 0, border: '1px solid var(--hairline)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                flex: 1, background: 'var(--bg-elevated)', border: 'none',
                padding: '8px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            />
            <button
              onClick={() => setShow(v => !v)}
              style={{
                background: 'var(--bg-elevated)', border: 'none', borderLeft: '1px solid var(--hairline)',
                padding: '0 12px', cursor: 'pointer', color: 'var(--ink-subtle)', fontSize: 12,
              }}
            >
              {show ? '👁' : '🔒'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
            Modèle utilisé : <strong>claude-haiku-3-5</strong> — ultra-rapide, ~0,001 € par message
          </div>
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: 'var(--primary)' }}
          >
            Obtenir une clé → console.anthropic.com
          </a>
        </div>

        {/* Warning */}
        <div style={{
          background: 'rgba(235, 87, 87, 0.10)',
          border: '1px solid rgba(235, 87, 87, 0.3)',
          borderRadius: 6, padding: '10px 12px', fontSize: 12, color: 'var(--ink-secondary)',
        }}>
          ⚠️ Votre clé est stockée uniquement en localStorage sur votre appareil. Elle n'est jamais envoyée ailleurs que directement à l'API Anthropic.
        </div>

        {/* Actions */}
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          {aiApiKey && (
            <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--danger)', fontSize: 12 }}>
              Supprimer la clé
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 12 }}>
            Annuler
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!value.trim()} style={{ fontSize: 12 }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
