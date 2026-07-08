/**
 * Coach IA Patrimonial — moteur pur, ZÉRO import React.
 *
 * Construit le contexte envoyé à l'API IA (simulation + patrimoine réel +
 * budget), définit les tools exposés au modèle, valide les LifeEvents
 * proposés et compare deux scénarios de simulation.
 *
 * RÈGLE : ce module ne touche à AUCUN store. L'application des événements
 * (après confirmation utilisateur explicite) est faite par le composant
 * appelant via useStore.addLifeEvent — jamais ici.
 */

import { runSimulation } from '../../engine/simulation'
import { computePatrimoineNet } from '../engine/patrimoineEngine'
import type { Envelope, GlobalParams, LifeEvent, LifeEventType, SimulationResult } from '../../types'
import type { PatrimoineAsset, PatrimoineLiability } from '../types/patrimoine'

// ── Tools exposés au modèle (format Anthropic API) ───────────────────────────

export interface AnthropicTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const COACH_TOOLS: AnthropicTool[] = [
  {
    name: 'get_simulation_context',
    description:
      "Récupère le contexte financier complet de l'utilisateur : paramètres globaux de simulation, enveloppes configurées, événements de vie existants, patrimoine net actuel et données budget. À appeler avant toute analyse ou proposition.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'propose_life_events',
    description:
      "Propose un ou plusieurs événements de vie à ajouter à la simulation. Les événements sont présentés à l'utilisateur pour VALIDATION EXPLICITE — rien n'est appliqué sans sa confirmation. Après confirmation, la simulation est relancée et tu recevras la comparaison avant/après pour la commenter.",
    input_schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          description: 'Événements de vie proposés',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['pause', 'windfall', 'withdrawal', 'expense_increase', 'child', 'custom'],
                description:
                  "pause = arrêt des versements ; windfall = rentrée d'argent ; withdrawal = retrait (ex. apport immobilier) ; expense_increase = hausse de dépenses mensuelles ; child = naissance ; custom = impact mensuel libre (ex. baisse de revenus type 4/5)",
              },
              label: { type: 'string', description: "Libellé court en français" },
              yearOffset: { type: 'number', description: "Dans combien d'années (depuis aujourd'hui)" },
              duration: { type: 'number', description: 'Durée en années (pause, expense_increase, child, custom)' },
              amount: { type: 'number', description: 'Montant en € (windfall, withdrawal)' },
              monthlyImpact: {
                type: 'number',
                description: 'Impact mensuel en €/mois sur la capacité de versement — négatif = réduction (expense_increase, child, custom)',
              },
            },
            required: ['type', 'label', 'yearOffset'],
          },
        },
        rationale: { type: 'string', description: 'Explication courte de la modélisation choisie' },
      },
      required: ['events'],
    },
  },
]

// ── Contexte ─────────────────────────────────────────────────────────────────

export interface CoachContextInput {
  globalParams: GlobalParams
  envelopes: Envelope[]
  events: LifeEvent[]
  retirementAge?: number
  patrimoineAssets: PatrimoineAsset[]
  patrimoineLiabilities: PatrimoineLiability[]
  budgetSummary?: { month: string; totalIncome: number; totalExpenses: number; realSavingsRate: number } | null
}

/** Résumé textuel compact du profil, injecté en tool_result de get_simulation_context */
export function buildCoachContext(input: CoachContextInput): string {
  const { globalParams: p, envelopes, events } = input
  const lines: string[] = [
    '## Paramètres de simulation',
    `- Durée : ${p.duration} ans · âge actuel : ${p.ageActuel} ans${input.retirementAge ? ` · retraite visée : ${input.retirementAge} ans` : ''}`,
    `- Salaire net : ${p.monthlyIncome} €/mois · taux d'épargne cible : ${p.investmentRate} % (${Math.round(p.monthlyIncome * p.investmentRate / 100)} €/mois)`,
    `- Inflation : ${p.inflationRate} %/an · TMI : ${p.tmi ?? 30} %`,
    '',
    '## Enveloppes actives',
  ]
  for (const e of envelopes.filter((x) => x.active)) {
    lines.push(
      `- ${e.label} (${e.type}) : capital initial ${e.currentRealValue ?? e.initialCapital} €, versement ${e.monthlyContribution} €/mois`
    )
  }

  lines.push('', '## Événements de vie déjà planifiés')
  if (events.length === 0) {
    lines.push('- Aucun')
  } else {
    for (const ev of events) {
      lines.push(
        `- [${ev.type}] ${ev.label} — dans ${ev.yearOffset} an(s)` +
        (ev.duration ? `, durée ${ev.duration} an(s)` : '') +
        (ev.amount != null ? `, ${ev.amount} €` : '') +
        (ev.monthlyImpact != null ? `, ${ev.monthlyImpact} €/mois` : '')
      )
    }
  }

  const net = computePatrimoineNet(input.patrimoineAssets, input.patrimoineLiabilities)
  lines.push(
    '',
    '## Patrimoine réel actuel',
    `- Actifs : ${Math.round(net.totalActifs)} € · Passifs : ${Math.round(net.totalPassifs)} € · Net : ${Math.round(net.patrimoineNet)} €`
  )
  if (Object.keys(net.byCategory).length > 0) {
    lines.push(
      '- Par catégorie : ' +
      Object.entries(net.byCategory)
        .map(([k, v]) => `${k} ${Math.round(v)} €`)
        .join(' · ')
    )
  }

  if (input.budgetSummary) {
    const b = input.budgetSummary
    lines.push(
      '',
      '## Budget réel du mois',
      `- ${b.month} : revenus ${Math.round(b.totalIncome)} €, dépenses ${Math.round(b.totalExpenses)} €, taux d'épargne réel ${(b.realSavingsRate * 100).toFixed(0)} %`
    )
  }

  return lines.join('\n')
}

// ── Validation des événements proposés ───────────────────────────────────────

const VALID_EVENT_TYPES: LifeEventType[] = [
  'pause', 'windfall', 'withdrawal', 'expense_increase', 'child', 'custom',
]

export interface RawProposedEvent {
  type?: string
  label?: string
  yearOffset?: number
  duration?: number
  amount?: number
  monthlyImpact?: number
  envelopeId?: string
}

/**
 * Valide et normalise les événements proposés par le modèle.
 * Rejette silencieusement les entrées invalides (type inconnu, horizon absurde).
 */
export function sanitizeProposedEvents(raw: RawProposedEvent[], maxDuration: number): LifeEvent[] {
  const out: LifeEvent[] = []
  for (const [i, r] of raw.entries()) {
    const type = VALID_EVENT_TYPES.includes(r.type as LifeEventType)
      ? (r.type as LifeEventType)
      : null
    if (!type || !r.label) continue
    const yearOffset = Number(r.yearOffset)
    if (!Number.isFinite(yearOffset) || yearOffset < 0 || yearOffset > maxDuration) continue
    const ev: LifeEvent = {
      id: `ev_coach_${Date.now()}_${i}`,
      type,
      label: String(r.label).slice(0, 80),
      yearOffset: Math.round(yearOffset),
    }
    if (Number.isFinite(Number(r.duration)) && Number(r.duration) > 0) ev.duration = Math.round(Number(r.duration))
    if (Number.isFinite(Number(r.amount))) ev.amount = Number(r.amount)
    if (Number.isFinite(Number(r.monthlyImpact))) ev.monthlyImpact = Number(r.monthlyImpact)
    if (r.envelopeId) ev.envelopeId = String(r.envelopeId)
    out.push(ev)
  }
  return out
}

// ── Comparaison de scénarios ─────────────────────────────────────────────────

export interface ScenarioComparison {
  baseFinal: number
  newFinal: number
  deltaFinal: number
  deltaPct: number
  baseFinalReal: number
  newFinalReal: number
  baseGains: number
  newGains: number
  baseContributed: number
  newContributed: number
  /** Revenus passifs projetés (règle des 4 %) avant/après */
  basePassiveMonthly: number
  newPassiveMonthly: number
  years: number
}

/**
 * Relance la simulation (fonction pure) avec et sans les événements proposés,
 * et synthétise les écarts clés. N'écrit rien nulle part.
 */
export function compareScenarios(
  envelopes: Envelope[],
  globalParams: GlobalParams,
  baseEvents: LifeEvent[],
  proposedEvents: LifeEvent[],
  withdrawalRate = 4
): { base: SimulationResult[]; withEvents: SimulationResult[]; comparison: ScenarioComparison } {
  const base = runSimulation(envelopes, globalParams, baseEvents)
  const withEvents = runSimulation(envelopes, globalParams, [...baseEvents, ...proposedEvents])

  const lastBase = base[base.length - 1]
  const lastNew = withEvents[withEvents.length - 1]
  const deltaFinal = lastNew.totalNominal - lastBase.totalNominal

  const comparison: ScenarioComparison = {
    baseFinal: lastBase.totalNominal,
    newFinal: lastNew.totalNominal,
    deltaFinal,
    deltaPct: lastBase.totalNominal !== 0 ? (deltaFinal / lastBase.totalNominal) * 100 : 0,
    baseFinalReal: lastBase.totalReal,
    newFinalReal: lastNew.totalReal,
    baseGains: lastBase.totalGains,
    newGains: lastNew.totalGains,
    baseContributed: lastBase.totalContributed,
    newContributed: lastNew.totalContributed,
    basePassiveMonthly: (lastBase.totalNominal * withdrawalRate) / 100 / 12,
    newPassiveMonthly: (lastNew.totalNominal * withdrawalRate) / 100 / 12,
    years: base.length,
  }
  return { base, withEvents, comparison }
}

/** Sérialise la comparaison pour le tool_result renvoyé au modèle */
export function comparisonToToolResult(c: ScenarioComparison, appliedEvents: LifeEvent[]): string {
  return [
    `Événements appliqués et simulation relancée (horizon ${c.years} ans).`,
    '',
    `Scénario de base : capital final ${Math.round(c.baseFinal)} € (${Math.round(c.baseFinalReal)} € en euros constants), versé ${Math.round(c.baseContributed)} €, gains nets ${Math.round(c.baseGains)} €, revenus passifs potentiels ${Math.round(c.basePassiveMonthly)} €/mois (règle des 4 %).`,
    `Nouveau scénario : capital final ${Math.round(c.newFinal)} € (${Math.round(c.newFinalReal)} € constants), versé ${Math.round(c.newContributed)} €, gains nets ${Math.round(c.newGains)} €, revenus passifs potentiels ${Math.round(c.newPassiveMonthly)} €/mois.`,
    `Écart : ${c.deltaFinal >= 0 ? '+' : ''}${Math.round(c.deltaFinal)} € (${c.deltaPct >= 0 ? '+' : ''}${c.deltaPct.toFixed(1)} %).`,
    '',
    `Événements : ${appliedEvents.map((e) => `${e.label} (année +${e.yearOffset})`).join(' ; ')}.`,
    'Présente maintenant ces résultats à l\'utilisateur en langage naturel, avec les métriques clés et une recommandation.',
  ].join('\n')
}
