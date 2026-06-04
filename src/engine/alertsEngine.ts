/**
 * Moteur d'alertes contextuelles — fonctions pures, zéro import React.
 * Analyse le state et génère des suggestions classées par priorité.
 */

import type { Envelope, GlobalParams, Liability, SimulationResult } from '../types'
import { formatEur } from '../utils/format'

export interface Alert {
  id: string
  type: 'warning' | 'tip' | 'success' | 'info'
  priority: 1 | 2 | 3
  title: string
  message: string
  actionLabel?: string
  actionTarget?: 'envelopes' | 'dashboard'
}

const MAX_LIVRET_A = 22_950
const MAX_PEA = 150_000
const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000

export function generateAlerts(
  envelopes: Envelope[],
  results: SimulationResult[],
  globalParams: GlobalParams,
  liabilities?: Liability[]
): Alert[] {
  const alerts: Alert[] = []
  const active = envelopes.filter((e) => e.active)
  const lastResult = results[results.length - 1]
  const tmi = globalParams.tmi ?? 30
  const effort = (globalParams.monthlyIncome * globalParams.investmentRate) / 100
  const nowMs = Date.now()

  // ── Priority 1 — Warnings critiques ──────────────────────────────────────

  // Livret A proche du plafond
  const livretA = active.find((e) => e.type === 'livret_a')
  if (livretA) {
    const current = livretA.currentRealValue ?? livretA.initialCapital
    const cap = livretA.maxContribution ?? MAX_LIVRET_A
    const pct = cap > 0 ? current / cap : 0
    if (pct > 0.9) {
      alerts.push({
        id: 'livret_a_cap',
        type: 'warning',
        priority: 1,
        title: 'Livret A presque plein',
        message: `Votre Livret A est rempli à ${Math.round(pct * 100)}%. Pensez à ouvrir un LDDS pour continuer à épargner sans impôts.`,
        actionLabel: 'Ajouter un LDDS',
        actionTarget: 'envelopes',
      })
    }
  }

  // PEA proche du plafond versements
  const pea = active.find((e) => e.type === 'pea')
  if (pea) {
    const current = pea.currentRealValue ?? pea.initialCapital
    const cap = pea.maxContribution ?? MAX_PEA
    const pct = cap > 0 ? current / cap : 0
    if (pct > 0.9) {
      alerts.push({
        id: 'pea_cap',
        type: 'warning',
        priority: 1,
        title: 'PEA proche du plafond légal',
        message: `Votre PEA approche du plafond légal de 150 000€. Envisagez d'ouvrir un CTO pour la suite.`,
        actionLabel: 'Ajouter un CTO',
        actionTarget: 'envelopes',
      })
    }
  }

  // Fonds d'urgence insuffisant (proxy: 70% du salaire = dépenses estimées)
  const livretTypes = new Set<string>(['livret_a', 'ldds', 'livret_jeune'])
  const livretSum = active
    .filter((e) => livretTypes.has(e.type))
    .reduce((sum, e) => sum + (e.currentRealValue ?? e.initialCapital), 0)
  const estimatedExpenses = globalParams.monthlyIncome * 0.7
  if (livretSum < estimatedExpenses * 3) {
    alerts.push({
      id: 'emergency_fund',
      type: 'warning',
      priority: 1,
      title: 'Épargne de précaution insuffisante',
      message: `Votre épargne de précaution (${formatEur(livretSum)}) couvre moins de 3 mois de dépenses estimées. Priorité recommandée avant d'investir en bourse.`,
      actionLabel: 'Revoir les livrets',
      actionTarget: 'envelopes',
    })
  }

  // Versements incohérents
  const contributionSum = active.reduce((acc, e) => acc + e.monthlyContribution, 0)
  if (effort > 0 && Math.abs(contributionSum - effort) > 1) {
    alerts.push({
      id: 'incoherent_contributions',
      type: 'warning',
      priority: 1,
      title: 'Versements incohérents',
      message: `Le total de vos versements (${formatEur(contributionSum)}) ne correspond pas à votre effort d'investissement (${formatEur(effort)}). La simulation ne peut pas être lancée.`,
      actionLabel: 'Rééquilibrer',
      actionTarget: 'envelopes',
    })
  }

  // ── Priority 2 — Opportunités fiscales ───────────────────────────────────

  // PEA seuil 5 ans
  if (pea?.openedAt) {
    const yearsHeld = (nowMs - new Date(pea.openedAt).getTime()) / MS_PER_YEAR
    if (yearsHeld >= 4.8 && yearsHeld <= 5.2) {
      alerts.push({
        id: 'pea_5y_approaching',
        type: 'tip',
        priority: 2,
        title: 'PEA — seuil fiscal imminent',
        message: `Votre PEA approche des 5 ans — seuil fiscal clé. Les retraits seront bientôt exonérés d'IR (17,2% de PS uniquement).`,
      })
    } else if (yearsHeld > 5.2) {
      alerts.push({
        id: 'pea_5y_reached',
        type: 'success',
        priority: 2,
        title: 'PEA — fiscalité optimale atteinte',
        message: `Votre PEA a plus de 5 ans. Tout retrait n'est taxé qu'à 17,2% de prélèvements sociaux. Fiscalité optimale.`,
      })
    }
  }

  // AV proche des 8 ans
  const av = active.find((e) => e.type === 'assurance_vie')
  if (av?.openedAt) {
    const yearsHeld = (nowMs - new Date(av.openedAt).getTime()) / MS_PER_YEAR
    if (yearsHeld >= 7.8 && yearsHeld <= 8.2) {
      const abattement = globalParams.isCouple ? '9 200' : '4 600'
      alerts.push({
        id: 'av_8y_approaching',
        type: 'tip',
        priority: 2,
        title: 'Assurance-vie — seuil 8 ans',
        message: `Votre assurance-vie approche des 8 ans — seuil de l'abattement fiscal (${abattement}€/an sur les gains). Idéal pour optimiser les rachats.`,
      })
    }
  }

  // PER sous-utilisé
  const per = active.find((e) => e.type === 'per')
  if (per) {
    const annualPER = per.monthlyContribution * 12
    const annualIncome = globalParams.monthlyIncome * 12
    const maxPER = annualIncome * 0.1
    if (annualPER < maxPER) {
      const potential = Math.round(maxPER - annualPER)
      const taxSaving = Math.round(potential * (tmi / 100))
      alerts.push({
        id: 'per_underused',
        type: 'tip',
        priority: 2,
        title: 'Plafond PER non optimisé',
        message: `Vous versez ${formatEur(annualPER)}/an sur votre PER. Plafond = ${formatEur(maxPER)}/an (10% revenus). Économie fiscale potentielle : ${formatEur(taxSaving)}/an.`,
        actionLabel: 'Ajuster le PER',
        actionTarget: 'envelopes',
      })
    }
  }

  // CTO avec TMI faible (barème plus avantageux que flat tax)
  const cto = active.find((e) => e.type === 'cto')
  if (cto && tmi <= 11) {
    alerts.push({
      id: 'cto_low_tmi',
      type: 'tip',
      priority: 2,
      title: 'CTO — barème progressif avantageux',
      message: `Avec votre TMI à ${tmi}%, le barème progressif (${tmi + 17.2}% total) est plus avantageux que la flat tax 30% sur votre CTO.`,
    })
  }

  // ── Priority 3 — Conseils d'optimisation ─────────────────────────────────

  // Aucun PEA
  if (!pea) {
    alerts.push({
      id: 'no_pea',
      type: 'info',
      priority: 3,
      title: 'Pas de PEA dans la simulation',
      message: `Vous n'avez pas de PEA. C'est l'enveloppe la plus efficace fiscalement pour investir en actions sur le long terme (PS 17,2% après 5 ans).`,
      actionLabel: 'Ajouter un PEA',
      actionTarget: 'envelopes',
    })
  }

  // Diversification faible
  if (lastResult && lastResult.totalNominal > 0) {
    for (const env of active) {
      const envCapital = lastResult.byEnvelope[env.id]?.capital ?? 0
      const share = envCapital / lastResult.totalNominal
      if (share > 0.8) {
        alerts.push({
          id: `concentration_${env.id}`,
          type: 'info',
          priority: 3,
          title: 'Concentration patrimoniale élevée',
          message: `${env.label} représente ${Math.round(share * 100)}% de votre patrimoine simulé. Diversifier entre enveloppes réduit le risque fiscal et réglementaire.`,
        })
        break
      }
    }
  }

  // Effort d'investissement faible
  if (globalParams.investmentRate < 10) {
    alerts.push({
      id: 'low_investment_rate',
      type: 'info',
      priority: 3,
      title: `Taux d'épargne faible (${globalParams.investmentRate}%)`,
      message: `Vous investissez ${globalParams.investmentRate}% de votre salaire. La règle des 20% permet d'atteindre l'indépendance financière bien plus tôt.`,
      actionLabel: 'Ajuster le taux',
      actionTarget: 'envelopes',
    })
  }

  // ── Règles dettes / passifs ───────────────────────────────────────────────

  if (liabilities && liabilities.length > 0) {
    const activeLiabilities = liabilities.filter((l) => l.active !== false)
    const totalLiabilities = activeLiabilities.reduce((s, l) => s + l.remainingAmount, 0)
    const totalMonthlyPayments = activeLiabilities.reduce((s, l) => s + l.monthlyPayment, 0)

    if (lastResult && lastResult.totalNominal > 0) {
      const debtRatio = totalLiabilities / lastResult.totalNominal
      if (debtRatio > 0.5) {
        alerts.push({
          id: 'high_debt_ratio',
          type: 'warning',
          priority: 1,
          title: `Ratio d'endettement élevé (${Math.round(debtRatio * 100)}%)`,
          message: `Vos dettes représentent ${Math.round(debtRatio * 100)}% de votre patrimoine simulé. Priorité au remboursement avant d'investir davantage.`,
          actionTarget: 'dashboard',
          actionLabel: 'Voir le bilan net',
        })
      }
    }

    const monthlyIncome = globalParams.monthlyIncome
    if (monthlyIncome > 0 && totalMonthlyPayments > monthlyIncome * 0.35) {
      alerts.push({
        id: 'high_debt_burden',
        type: 'warning',
        priority: 1,
        title: 'Mensualités au-dessus du seuil bancaire',
        message: `Vos mensualités (${formatEur(totalMonthlyPayments)}/mois) dépassent 35% de vos revenus — seuil standard des banques. Attention au reste à vivre.`,
        actionTarget: 'dashboard',
        actionLabel: 'Voir le bilan net',
      })
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority)
}
