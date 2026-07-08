import { useState, useRef, useEffect, useCallback } from 'react'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { useStore, selectActiveSim } from '../../../store/useStore'
import { usePatrimoineStore } from '../../../patrimoine/store/usePatrimoineStore'
import { useBudgetStore } from '../../../budget/store/useBudgetStore'
import { computeMonthlySnapshot } from '../../../budget/engine/budgetEngine'
import {
  COACH_TOOLS,
  buildCoachContext,
  sanitizeProposedEvents,
  compareScenarios,
  comparisonToToolResult,
  type RawProposedEvent,
} from '../../../patrimoine/ai/coachEngine'
import { formatEur } from '../../../utils/format'
import type { LifeEvent } from '../../../types'
import ApiKeyModal from './ApiKeyModal'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  error?: boolean
}

// ── Format API Anthropic (content blocks) ────────────────────────────────────

interface ToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
interface TextBlock { type: 'text'; text: string }
interface ToolResultBlock { type: 'tool_result'; tool_use_id: string; content: string }
type ContentBlock = ToolUseBlock | TextBlock
interface ApiMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[] | ToolResultBlock[]
}

/** Proposition d'événements en attente de validation utilisateur */
interface PendingProposal {
  toolUseId: string
  events: LifeEvent[]
  rationale?: string
  /** tool_results des autres tools du même tour, à renvoyer ensemble */
  priorResults: ToolResultBlock[]
}

const MAX_AGENT_ITERATIONS = 5
const MAX_API_MESSAGES = 24

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
  'Évalue mon patrimoine global',
  'Que devient ma retraite si je passe à 4/5 dans 2 ans ?',
  'Quel impact si j\'achète un bien à 300 000 € dans 3 ans ?',
  'Explique-moi le RSI',
]

const EVENT_EMOJI: Record<string, string> = {
  pause: '⏸', windfall: '💰', withdrawal: '🏠',
  expense_increase: '📈', child: '👶', custom: '✏️',
}

/** Tronque l'historique API sans casser les paires tool_use / tool_result */
function trimApiHistory(messages: ApiMessage[]): ApiMessage[] {
  if (messages.length <= MAX_API_MESSAGES) return messages
  let start = messages.length - MAX_API_MESSAGES
  // Avancer jusqu'à un message user "simple" (texte) pour ne pas ouvrir sur un tool_result orphelin
  while (start < messages.length) {
    const m = messages[start]
    if (m.role === 'user' && typeof m.content === 'string') break
    start++
  }
  return messages.slice(start)
}

export default function AIChatTab() {
  const {
    aiApiKey, selectedAssetId, positions, trades,
    tradingAccounts, activeTradingAccountId,
  } = useFinanceStore()
  const activeSim = useStore(selectActiveSim)
  const addLifeEvent = useStore((s) => s.addLifeEvent)
  const { assets: patAssets, liabilities: patLiabilities } = usePatrimoineStore()
  const {
    transactions: budgetTxs, envelopes: budgetEnvs, selectedMonth,
  } = useBudgetStore()

  const [showApiModal, setShowApiModal] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingProposal, setPendingProposal] = useState<PendingProposal | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  // Historique API brut (avec blocs tool_use/tool_result) — distinct de l'affichage
  const apiMessagesRef = useRef<ApiMessage[]>([])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, pendingProposal])

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

  /** Contexte coach — construit côté moteur (coachEngine), pas dans le composant */
  const buildCoachContextString = useCallback(() => {
    const hasBudget = budgetEnvs.length > 0 || budgetTxs.length > 0
    const snapshot = hasBudget ? computeMonthlySnapshot(budgetTxs, budgetEnvs, selectedMonth) : null
    return buildCoachContext({
      globalParams: activeSim.globalParams,
      envelopes: activeSim.envelopes,
      events: activeSim.events ?? [],
      retirementAge: activeSim.retirementParams?.ageRetirement,
      patrimoineAssets: patAssets,
      patrimoineLiabilities: patLiabilities,
      budgetSummary: snapshot
        ? {
            month: snapshot.month,
            totalIncome: snapshot.totalIncome,
            totalExpenses: snapshot.totalExpenses,
            realSavingsRate: snapshot.realSavingsRate,
          }
        : null,
    })
  }, [activeSim, patAssets, patLiabilities, budgetTxs, budgetEnvs, selectedMonth])

  function buildSystemPrompt(ctx: ReturnType<typeof buildContext>): string {
    const lines: string[] = [
      "Tu es un coach patrimonial expert intégré dans une application de gestion de patrimoine.",
      "Tu analyses les données réelles de l'utilisateur (simulation long terme, patrimoine actuel, budget, trading) et réponds de façon concise et pédagogique.",
      "Tu ne donnes pas de conseils d'investissement fermes — tu éduques, analyses et simules.",
      "Réponds toujours en français.",
      "",
      "Capacités agentiques :",
      "- Appelle get_simulation_context AVANT toute analyse patrimoniale ou proposition de scénario.",
      "- Quand l'utilisateur décrit un projet de vie (temps partiel, achat immobilier, naissance, héritage…), traduis-le en événements de vie via propose_life_events. L'utilisateur validera ou refusera — ne considère JAMAIS un événement comme appliqué avant d'avoir reçu le résultat de simulation.",
      "- Après confirmation, tu recevras la comparaison avant/après : présente les métriques clés (capital final, euros constants, revenus passifs) et une recommandation.",
      "",
      "Contexte trading actuel :",
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

  async function callApi(systemPrompt: string): Promise<{
    content: ContentBlock[]
    stop_reason: string
  }> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiApiKey!,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-3-5',
        max_tokens: 1024,
        system: systemPrompt,
        tools: COACH_TOOLS,
        messages: trimApiHistory(apiMessagesRef.current),
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `Erreur HTTP ${response.status}`)
    }
    return await response.json() as { content: ContentBlock[]; stop_reason: string }
  }

  function pushAssistantDisplay(text: string, error = false) {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'assistant', content: text, timestamp: Date.now(), error }])
  }

  /**
   * Boucle agentique : appelle l'API, exécute les tools read-only
   * automatiquement, et s'arrête sur propose_life_events (validation requise).
   */
  async function runAgentLoop() {
    const systemPrompt = buildSystemPrompt(buildContext())
    setLoading(true)
    try {
      for (let iter = 0; iter < MAX_AGENT_ITERATIONS; iter++) {
        const data = await callApi(systemPrompt)

        // Affiche les blocs texte
        const text = data.content.filter((b): b is TextBlock => b.type === 'text').map(b => b.text).join('\n')
        pushAssistantDisplay(text)

        // Mémorise la réponse assistant brute
        apiMessagesRef.current = [...apiMessagesRef.current, { role: 'assistant', content: data.content }]

        if (data.stop_reason !== 'tool_use') break

        const toolUses = data.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')
        const results: ToolResultBlock[] = []
        let paused = false

        for (const tu of toolUses) {
          if (tu.name === 'get_simulation_context') {
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: buildCoachContextString() })
          } else if (tu.name === 'propose_life_events') {
            const raw = (tu.input.events ?? []) as RawProposedEvent[]
            const events = sanitizeProposedEvents(raw, activeSim.globalParams.duration)
            if (events.length === 0) {
              results.push({
                type: 'tool_result', tool_use_id: tu.id,
                content: 'Aucun événement valide — vérifie les types et les horizons (yearOffset entre 0 et la durée de simulation).',
              })
            } else {
              // Pause : validation utilisateur obligatoire avant toute écriture
              setPendingProposal({
                toolUseId: tu.id,
                events,
                rationale: typeof tu.input.rationale === 'string' ? tu.input.rationale : undefined,
                priorResults: results.slice(),
              })
              paused = true
              break
            }
          } else {
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: `Tool inconnu : ${tu.name}` })
          }
        }

        if (paused) return // reprise via handleProposalDecision

        apiMessagesRef.current = [...apiMessagesRef.current, { role: 'user', content: results }]
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      pushAssistantDisplay(`❌ Erreur : ${msg}`, true)
    } finally {
      setLoading(false)
    }
  }

  /** Confirmation ou annulation d'une proposition d'événements */
  async function handleProposalDecision(confirmed: boolean) {
    const proposal = pendingProposal
    if (!proposal) return
    setPendingProposal(null)

    let resultContent: string
    if (confirmed) {
      // Application au store (action utilisateur explicite) + re-simulation
      const baseEvents = activeSim.events ?? []
      for (const ev of proposal.events) addLifeEvent(ev)
      const { comparison } = compareScenarios(
        activeSim.envelopes,
        activeSim.globalParams,
        baseEvents,
        proposal.events,
        activeSim.retirementParams?.withdrawalRate ?? 4
      )
      resultContent = comparisonToToolResult(comparison, proposal.events)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ ${proposal.events.length} événement${proposal.events.length > 1 ? 's' : ''} ajouté${proposal.events.length > 1 ? 's' : ''} à la simulation active. Le tableau de bord simulation affichera le nouveau scénario au prochain lancement.`,
        timestamp: Date.now(),
      }])
    } else {
      resultContent = "L'utilisateur a REFUSÉ la proposition. Aucun événement n'a été ajouté. Propose une alternative ou demande des précisions."
    }

    apiMessagesRef.current = [
      ...apiMessagesRef.current,
      {
        role: 'user',
        content: [
          ...proposal.priorResults,
          { type: 'tool_result', tool_use_id: proposal.toolUseId, content: resultContent },
        ],
      },
    ]
    await runAgentLoop()
  }

  async function sendMessage(userMessage: string) {
    if (!userMessage.trim() || loading || pendingProposal) return
    if (!aiApiKey) { setShowApiModal(true); return }

    const trimmed = userMessage.trim()
    setMessages(prev => [...prev, { role: 'user', content: trimmed, timestamp: Date.now() }])
    apiMessagesRef.current = [...apiMessagesRef.current, { role: 'user', content: trimmed }]
    setInput('')
    await runAgentLoop()
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
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Coach IA</h2>
          <p className="caption">Coach patrimonial agentique alimenté par Claude Haiku</p>
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
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Coach IA</h2>
          <p className="caption">Coach patrimonial agentique — peut simuler vos projets de vie (avec votre validation)</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowApiModal(true)} title="Paramètres API">
          ⚙️
        </button>
      </div>

      {/* Context pills */}
      <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', color: 'var(--ink-secondary)' }}>
          🎯 Simulation : {activeSim.name}
        </span>
        {ctx.asset && (
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', color: 'var(--primary)' }}>
            📈 {ctx.asset.name}
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
            <div style={{ fontSize: 13 }}>
              Posez une question sur votre patrimoine, vos projets de vie ou les marchés.<br />
              Le coach peut simuler des scénarios — rien n'est appliqué sans votre confirmation.
            </div>
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

        {/* Carte de proposition — validation obligatoire avant toute écriture */}
        {pendingProposal && (
          <div style={{
            alignSelf: 'flex-start', maxWidth: '88%',
            border: '1px solid var(--primary)', borderRadius: 12,
            background: 'var(--bg-elevated)', padding: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-hover)', marginBottom: 8 }}>
              Proposition d'événements de vie — votre validation est requise
            </div>
            {pendingProposal.rationale && (
              <div className="caption" style={{ fontSize: 11.5, marginBottom: 10 }}>{pendingProposal.rationale}</div>
            )}
            <div className="col gap8" style={{ marginBottom: 12 }}>
              {pendingProposal.events.map((ev) => (
                <div key={ev.id} className="row gap8" style={{ alignItems: 'center', fontSize: 12.5 }}>
                  <span>{EVENT_EMOJI[ev.type] ?? '📅'}</span>
                  <span className="grow">{ev.label}</span>
                  <span className="mono caption" style={{ fontSize: 11 }}>
                    année +{ev.yearOffset}
                    {ev.duration ? ` · ${ev.duration} an(s)` : ''}
                    {ev.amount != null ? ` · ${formatEur(ev.amount)}` : ''}
                    {ev.monthlyImpact != null ? ` · ${ev.monthlyImpact > 0 ? '+' : ''}${ev.monthlyImpact} €/mois` : ''}
                  </span>
                </div>
              ))}
            </div>
            <div className="row gap8">
              <button className="btn btn-primary btn-sm" onClick={() => handleProposalDecision(true)}>
                Confirmer et simuler
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleProposalDecision(false)}>
                Annuler
              </button>
            </div>
          </div>
        )}

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
            disabled={loading || !!pendingProposal}
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
          placeholder={pendingProposal
            ? 'Validez ou annulez la proposition ci-dessus pour continuer…'
            : 'Posez une question… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)'}
          rows={2}
          disabled={loading || !!pendingProposal}
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
          disabled={!input.trim() || loading || !!pendingProposal}
          style={{ fontSize: 13, padding: '10px 16px', alignSelf: 'stretch' }}
        >
          Envoyer
        </button>
      </div>

      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
    </div>
  )
}
