import { useState, useRef, useEffect, useCallback } from 'react'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import ApiKeyModal from './ApiKeyModal'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  error?: boolean
}

const MAX_HISTORY = 10

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  return lines.flatMap((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    const rendered = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${li}-${i}`}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={`${li}-${i}`}
            style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', borderRadius: 3, padding: '1px 4px', fontSize: '0.9em' }}
          >
            {part.slice(1, -1)}
          </code>
        )
      }
      return <span key={`${li}-${i}`}>{part}</span>
    })
    return li < lines.length - 1 ? [...rendered, <br key={`br-${li}`} />] : rendered
  })
}

const QUICK_QUESTIONS = [
  'Analyse technique de cet actif',
  'Mon trade est-il rentable ?',
  'Explique-moi le RSI',
  'Quelle stratégie pour un marché baissier ?',
  'Évalue mon portefeuille',
]

export default function AIChatTab() {
  const {
    aiApiKey, selectedAssetId, positions, trades,
    tradingAccounts, activeTradingAccountId,
  } = useFinanceStore()

  const [showApiModal, setShowApiModal] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const buildContext = useCallback(() => {
    const asset = selectedAssetId ? getAssetById(selectedAssetId) : null
    const accountId = activeTradingAccountId ?? ''
    const account = tradingAccounts.find(a => a.id === accountId)
    const accountPositions = positions[accountId] ?? []
    const accountTrades = trades[accountId] ?? []

    const position = asset ? accountPositions.find(p => p.assetId === asset.id) : null
    const totalValue = account
      ? (account.cashBalance + accountPositions.reduce((s, p) => s + p.totalInvested + p.unrealizedPnL, 0))
      : null
    const totalPnL = accountTrades.length > 0
      ? accountTrades.reduce((s, t) => s + t.realizedPnL, 0)
      : null
    const totalPnLPct = totalValue && account && totalPnL != null
      ? (totalPnL / account.initialCapital) * 100
      : null

    return {
      asset: asset ? { name: asset.name, ticker: asset.ticker } : null,
      position: position ? {
        quantity: position.quantity,
        avgEntry: position.avgEntryPrice,
        unrealizedPnL: position.unrealizedPnL,
        currentPrice: position.currentPrice,
      } : null,
      account: account ? {
        totalValue: totalValue ?? 0,
        cashBalance: account.cashBalance,
        totalPnLPct: totalPnLPct ?? 0,
      } : null,
    }
  }, [selectedAssetId, activeTradingAccountId, tradingAccounts, positions, trades])

  function buildSystemPrompt(ctx: ReturnType<typeof buildContext>): string {
    const lines: string[] = [
      "Tu es un assistant financier expert intégré dans une application de gestion de patrimoine.",
      "Tu analyses les données en temps réel de l'utilisateur et réponds de façon concise et pédagogique.",
      "Tu ne donnes pas de conseils d'investissement fermes — tu éduques et analyses.",
      "Réponds toujours en français.",
      "",
      "Contexte actuel de l'utilisateur :",
    ]

    if (ctx.asset) {
      lines.push(`- Actif affiché : ${ctx.asset.name} (${ctx.asset.ticker})`)
    } else {
      lines.push('- Aucun actif sélectionné')
    }

    if (ctx.position) {
      const pnlSign = ctx.position.unrealizedPnL >= 0 ? '+' : ''
      lines.push(`- Position ouverte : ${ctx.position.quantity} unités, entrée à ${ctx.position.avgEntry.toFixed(2)}, prix actuel ${ctx.position.currentPrice.toFixed(2)}, P&L : ${pnlSign}${ctx.position.unrealizedPnL.toFixed(2)}`)
    } else {
      lines.push('- Pas de position ouverte sur cet actif')
    }

    if (ctx.account) {
      const pnlSign = ctx.account.totalPnLPct >= 0 ? '+' : ''
      lines.push(`- Compte de trading : valeur totale ${ctx.account.totalValue.toFixed(0)} €, cash ${ctx.account.cashBalance.toFixed(0)} €, P&L total ${pnlSign}${ctx.account.totalPnLPct.toFixed(2)}%`)
    }

    return lines.join('\n')
  }

  async function sendMessage(userMessage: string) {
    if (!userMessage.trim() || loading) return
    if (!aiApiKey) { setShowApiModal(true); return }

    const userMsg: ChatMessage = { role: 'user', content: userMessage.trim(), timestamp: Date.now() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const ctx = buildContext()
    const systemPrompt = buildSystemPrompt(ctx)

    const historyToSend = newMessages
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-3-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages: historyToSend,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: { message?: string } }).error?.message ?? `Erreur HTTP ${response.status}`)
      }

      const data = await response.json() as { content: Array<{ type: string; text: string }> }
      const text = data.content.find(c => c.type === 'text')?.text ?? ''
      setMessages(prev => [...prev, { role: 'assistant', content: text, timestamp: Date.now() }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erreur : ${msg}`,
        timestamp: Date.now(),
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleQuickQuestion(q: string) {
    const ctx = buildContext()
    const resolved = q === 'Analyse technique de cet actif' && ctx.asset
      ? `Analyse technique de ${ctx.asset.name} (${ctx.asset.ticker})`
      : q
    sendMessage(resolved)
  }

  if (!aiApiKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>IA Finance</h2>
          <p className="caption">Assistant contextuel alimenté par Claude Haiku</p>
        </div>
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
          <div className="title" style={{ marginBottom: 8 }}>Configurez votre clé API</div>
          <p className="caption" style={{ maxWidth: 360, margin: '0 auto 20px' }}>
            L'assistant IA nécessite une clé API Anthropic pour fonctionner. Votre clé reste stockée localement sur votre appareil.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowApiModal(true)}
            style={{ fontSize: 13, padding: '8px 20px' }}
          >
            Configurer ma clé API
          </button>
        </div>
        {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
      </div>
    )
  }

  const ctx = buildContext()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 200px)', minHeight: 480 }}>
      {/* Header */}
      <div className="row" style={{ alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>IA Finance</h2>
          <p className="caption">Assistant contextuel — Claude Haiku</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowApiModal(true)} title="Paramètres API">
          ⚙️
        </button>
      </div>

      {/* Context pills */}
      <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {ctx.asset ? (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', color: 'var(--primary)' }}>
            📈 {ctx.asset.name}
          </span>
        ) : (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', color: 'var(--ink-subtle)' }}>
            Aucun actif sélectionné
          </span>
        )}
        {ctx.position && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', color: ctx.position.unrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {ctx.position.quantity} × {ctx.asset?.ticker ?? ''} {ctx.position.unrealizedPnL >= 0 ? '▲' : '▼'} {ctx.position.unrealizedPnL.toFixed(2)} €
          </span>
        )}
        {ctx.account && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', color: 'var(--ink-secondary)' }}>
            Compte : {ctx.account.totalValue.toFixed(0)} €
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        className="panel"
        style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-subtle)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 13 }}>Posez une question sur les marchés ou votre portefeuille</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-elevated)',
                color: msg.role === 'user' ? '#fff' : msg.error ? 'var(--danger)' : 'var(--ink)',
                fontSize: 13,
                lineHeight: 1.5,
                border: msg.role === 'assistant' ? '1px solid var(--hairline)' : 'none',
              }}
            >
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-subtle)', marginTop: 3, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ padding: '10px 16px', borderRadius: '12px 12px 12px 4px', background: 'var(--bg-elevated)', border: '1px solid var(--hairline)' }}>
              <span style={{ display: 'inline-flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-subtle)',
                      display: 'inline-block',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick questions */}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '10px 0 6px' }}>
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => handleQuickQuestion(q)}
            disabled={loading}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, borderRadius: 20 }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
          }}
          placeholder="Posez une question… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
          rows={2}
          disabled={loading}
          style={{
            flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 13,
            color: 'var(--ink)', outline: 'none', resize: 'none', lineHeight: 1.4,
            fontFamily: 'inherit',
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{ fontSize: 13, padding: '10px 16px', alignSelf: 'stretch' }}
        >
          Envoyer
        </button>
      </div>

      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
    </div>
  )
}
