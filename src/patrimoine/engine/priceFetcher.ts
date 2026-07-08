/**
 * Fetch des prix de marché pour les actifs patrimoniaux avec ticker.
 *
 * Réutilise EXACTEMENT l'infrastructure du module Finance :
 * fetchQuotes() de finance/services/priceService — même API Yahoo Finance
 * (/v8/finance/chart via yahooUrl(), proxy Vite en dev, appel direct en
 * prod/Electron), même cache localStorage `finance-quote-cache` (TTL 5 min),
 * même timeout et échecs réseau avalés silencieusement (Promise.allSettled
 * par batch de 10). Aucune nouvelle dépendance, aucune nouvelle API.
 *
 * S'y ajoute un TTL propre au patrimoine : un actif dont
 * metadata.lastPriceFetchAt date de moins d'1 h n'est pas refetché
 * (évite les appels répétés si l'utilisateur relance l'app rapidement).
 */

import { fetchQuotes } from '../../finance/services/priceService'
import type { PatrimoineAsset } from '../types/patrimoine'

/** TTL du refetch par actif — 1 h, basé sur metadata.lastPriceFetchAt */
export const PRICE_FETCH_TTL_MS = 60 * 60 * 1000

export type PrixActifResult =
  | { prix: number; fetchedAt: string }
  | { erreur: string }

function assetTicker(asset: PatrimoineAsset): string {
  const t = asset.metadata?.ticker
  return typeof t === 'string' ? t.trim() : ''
}

/** true si le dernier fetch réussi de l'actif date de moins d'1 h */
export function isPriceFresh(asset: PatrimoineAsset, now = Date.now()): boolean {
  const last = asset.metadata?.lastPriceFetchAt
  if (typeof last !== 'string') return false
  const ts = new Date(last).getTime()
  return Number.isFinite(ts) && now - ts < PRICE_FETCH_TTL_MS
}

/**
 * Fetche les prix des actifs ayant un ticker défini.
 * - Ignore les actifs sans ticker et ceux dont lastPriceFetchAt < 1 h
 * - Échec silencieux par actif : un ticker en erreur n'empêche pas les autres
 * - Hors ligne : chaque actif reçoit { erreur } — la dernière valeur connue
 *   est conservée par l'appelant (rien n'est écrit ici)
 */
export async function fetchPrixActifs(
  assets: PatrimoineAsset[]
): Promise<Record<string, PrixActifResult>> {
  const out: Record<string, PrixActifResult> = {}
  const now = Date.now()
  const candidates = assets
    .map((a) => ({ id: a.id, ticker: assetTicker(a), fresh: isPriceFresh(a, now) }))
    .filter((c) => c.ticker && !c.fresh)
  if (candidates.length === 0) return out

  try {
    const tickers = [...new Set(candidates.map((c) => c.ticker))]
    const quotes = await fetchQuotes(tickers)
    const byTicker = new Map(quotes.map((q) => [q.ticker, q]))
    const fetchedAt = new Date().toISOString()
    for (const { id, ticker } of candidates) {
      const q = byTicker.get(ticker)
      if (q && q.price > 0) {
        out[id] = { prix: q.price, fetchedAt }
      } else {
        out[id] = { erreur: `Ticker « ${ticker} » introuvable ou sans cotation` }
      }
    }
  } catch {
    for (const { id } of candidates) {
      out[id] = { erreur: 'Réseau indisponible' }
    }
  }
  return out
}
