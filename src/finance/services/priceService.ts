import type {
  PriceQuote, Candle, HistoricalPeriod, PriceCache, HistoricalCache,
  CandleInterval, FinanceAsset, AssetClass,
} from '../types/finance'

// En dev (localhost), utiliser le proxy Vite pour éviter le CORS
// En prod Electron (file://), appel direct car pas de restriction CORS
function yahooUrl(path: string): string {
  const isDev = typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  if (isDev) {
    return `/yahoo-finance${path}`
  }
  return `https://query1.finance.yahoo.com${path}`
}

const QUOTE_TTL = 5 * 60 * 1000
const HISTORICAL_TTL = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT = 8000

const QUOTE_CACHE_KEY = 'finance-quote-cache'
const HIST_CACHE_KEY = 'finance-hist-cache'

function loadQuoteCache(): PriceCache {
  try { return JSON.parse(localStorage.getItem(QUOTE_CACHE_KEY) || '{}') } catch { return {} }
}
function saveQuoteCache(cache: PriceCache) {
  try { localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(cache)) } catch {}
}
// Exporté : lecture directe du cache historique (utilisé par le screener pour éviter les re-fetch)
export function loadHistCache(): HistoricalCache {
  try { return JSON.parse(localStorage.getItem(HIST_CACHE_KEY) || '{}') } catch { return {} }
}
function saveHistCache(cache: HistoricalCache) {
  try { localStorage.setItem(HIST_CACHE_KEY, JSON.stringify(cache)) } catch {}
}

function periodToYahooParams(period: HistoricalPeriod): { range: string; interval: string } {
  switch (period) {
    case '1D': return { range: '1d', interval: '5m' }
    case '1W': return { range: '5d', interval: '15m' }
    case '1M': return { range: '1mo', interval: '1d' }
    case '3M': return { range: '3mo', interval: '1d' }
    case '6M': return { range: '6mo', interval: '1d' }
    case '1Y': return { range: '1y', interval: '1wk' }
    case '5Y': return { range: '5y', interval: '1mo' }
  }
}

// ── Timeframe chandeliers indépendant de la période ─────────────────────────
// Yahoo limite la profondeur d'historique par intervalle : le range effectif
// est le min(range de la période, range max de l'intervalle).
// '4h' n'existe pas côté Yahoo → fetch 60m + agrégation client ×4.

const RANGE_ORDER = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y'] as const

const INTERVAL_META: Record<CandleInterval, { yahoo: string; maxRange: string; aggregate?: number }> = {
  '1m':  { yahoo: '1m',  maxRange: '5d' },
  '5m':  { yahoo: '5m',  maxRange: '1mo' },
  '15m': { yahoo: '15m', maxRange: '1mo' },
  '1h':  { yahoo: '60m', maxRange: '2y' },
  '4h':  { yahoo: '60m', maxRange: '2y', aggregate: 4 },
  '1d':  { yahoo: '1d',  maxRange: '5y' },
  '1wk': { yahoo: '1wk', maxRange: '5y' },
  '1mo': { yahoo: '1mo', maxRange: '5y' },
}

/** TTL réduit pour les timeframes intraday (données périssables) */
const INTRADAY_TTL = 30 * 60 * 1000

function clampRange(range: string, maxRange: string): string {
  const i = RANGE_ORDER.indexOf(range as typeof RANGE_ORDER[number])
  const m = RANGE_ORDER.indexOf(maxRange as typeof RANGE_ORDER[number])
  if (i === -1 || m === -1) return maxRange
  return RANGE_ORDER[Math.min(i, m)]
}

/** Agrège des bougies séquentielles par paquets de `factor` (ex. 60m → 4h) */
export function aggregateCandles(candles: Candle[], factor: number): Candle[] {
  const out: Candle[] = []
  for (let i = 0; i < candles.length; i += factor) {
    const chunk = candles.slice(i, i + factor)
    if (chunk.length === 0) continue
    out.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.some(c => c.volume != null)
        ? chunk.reduce((s, c) => s + (c.volume ?? 0), 0)
        : undefined,
    })
  }
  return out
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const r = await fetch(url, { signal: controller.signal })
    clearTimeout(id)
    return r
  } catch (e) {
    clearTimeout(id)
    throw e
  }
}

export async function fetchQuotes(tickers: string[]): Promise<PriceQuote[]> {
  const now = Date.now()
  const cache = loadQuoteCache()
  const results: PriceQuote[] = []
  const toFetch: string[] = []

  for (const ticker of tickers) {
    const cached = cache[ticker]
    if (cached && now - cached.fetchedAt < QUOTE_TTL) {
      results.push(cached.quote)
    } else {
      toFetch.push(ticker)
    }
  }

  const BATCH_SIZE = 10
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(batch.map(async (ticker) => {
      try {
        const url = yahooUrl(`/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`)
        const res = await fetchWithTimeout(url)
        if (!res.ok) return
        const data = await res.json()
        const result = data?.chart?.result?.[0]
        if (!result) return

        const meta = result.meta

        // meta.previousClose n'est renvoyé par Yahoo que sur les ranges intraday —
        // absent sur range=5d/interval=1d. En daily, la DERNIÈRE bougie est toujours
        // la session courante (ou la plus récente) : le previous close est donc
        // systématiquement l'avant-dernière clôture valide de la série.
        // Ne PAS comparer lastClose à regularMarketPrice : meta est arrondi à
        // 2 décimales, la série est en float32 pleine précision — un test
        // d'égalité/epsilon prend la bougie du jour comme référence → variation 0.
        const seriesCloses: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
        const validCloses = seriesCloses.filter((c): c is number => c != null)
        const price: number = meta.regularMarketPrice ?? validCloses[validCloses.length - 1] ?? meta.previousClose ?? 0
        const prevClose: number = meta.previousClose
          ?? validCloses[validCloses.length - 2]
          ?? meta.chartPreviousClose
          ?? 0

        const quote: PriceQuote = {
          ticker,
          price,
          change: prevClose ? price - prevClose : 0,
          changePct: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
          open: meta.regularMarketOpen ?? 0,
          high: meta.regularMarketDayHigh ?? 0,
          low: meta.regularMarketDayLow ?? 0,
          previousClose: prevClose,
          volume: meta.regularMarketVolume,
          marketCap: meta.marketCap,
          timestamp: now,
        }
        results.push(quote)
        cache[ticker] = { quote, fetchedAt: now }
      } catch {
        // Silently ignore fetch errors
      }
    }))
  }

  saveQuoteCache(cache)
  return results
}

export async function fetchHistorical(
  ticker: string,
  period: HistoricalPeriod,
  candleInterval?: CandleInterval
): Promise<Candle[]> {
  const now = Date.now()
  const cache = loadHistCache()
  // Clé legacy inchangée sans timeframe explicite (compat cache existant)
  const cacheKey = candleInterval ? `${ticker}-${period}-${candleInterval}` : `${ticker}-${period}`
  const isIntraday = candleInterval != null && ['1m', '5m', '15m', '1h', '4h'].includes(candleInterval)
  const ttl = isIntraday ? INTRADAY_TTL : HISTORICAL_TTL
  const cached = cache[cacheKey]
  if (cached && now - cached.fetchedAt < ttl) {
    return cached.candles
  }

  let { range, interval } = periodToYahooParams(period)
  let aggregate = 1
  if (candleInterval) {
    const meta = INTERVAL_META[candleInterval]
    interval = meta.yahoo
    range = clampRange(range, meta.maxRange)
    aggregate = meta.aggregate ?? 1
  }
  try {
    const url = yahooUrl(`/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`)
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) throw new Error('No result')

    const timestamps: number[] = result.timestamp ?? []
    const ohlcv = result.indicators?.quote?.[0] ?? {}
    const opens: number[] = ohlcv.open ?? []
    const highs: number[] = ohlcv.high ?? []
    const lows: number[] = ohlcv.low ?? []
    const closes: number[] = ohlcv.close ?? []
    const volumes: number[] = ohlcv.volume ?? []

    let candles: Candle[] = []
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue
      candles.push({
        time: timestamps[i] * 1000,
        open: opens[i] ?? closes[i],
        high: highs[i] ?? closes[i],
        low: lows[i] ?? closes[i],
        close: closes[i],
        volume: volumes[i],
      })
    }

    if (aggregate > 1) candles = aggregateCandles(candles, aggregate)

    cache[cacheKey] = { ticker, candles, fetchedAt: now }
    saveHistCache(cache)
    return candles
  } catch {
    return cached?.candles ?? []
  }
}

export function clearPriceCache() {
  localStorage.removeItem(QUOTE_CACHE_KEY)
  localStorage.removeItem(HIST_CACHE_KEY)
}

// ── Recherche dynamique de titres (Yahoo Finance search) ────────────────────
// Couvre Euronext (.PA/.AS/.BR), Xetra (.DE), Milan (.MI), Londres (.L)…
// Même host que /v8/finance/chart → même proxy Vite en dev.

function mapQuoteType(quoteType: string | undefined, symbol: string): AssetClass {
  switch ((quoteType ?? '').toUpperCase()) {
    case 'ETF':
    case 'MUTUALFUND': return 'etf'
    case 'CRYPTOCURRENCY': return 'crypto'
    case 'CURRENCY': return 'forex'
    case 'FUTURE': return 'commodity'
    default:
      return /=F$/.test(symbol) ? 'commodity' : 'equity'
  }
}

function guessCurrency(symbol: string, exchange: string | undefined): string {
  if (/-EUR$/.test(symbol)) return 'EUR'
  if (/-USD$/.test(symbol)) return 'USD'
  if (/\.(PA|AS|BR|MI|DE|F|MC|LS|VI|HE|IR)$/.test(symbol)) return 'EUR'
  if (/\.L$/.test(symbol)) return 'GBP'
  if (/\.SW$/.test(symbol)) return 'CHF'
  if ((exchange ?? '').startsWith('PAR')) return 'EUR'
  return 'USD'
}

/**
 * Recherche Yahoo par nom partiel ou ticker.
 * Retourne des FinanceAsset prêts à être ajoutés au store (id `search_<ticker>`).
 */
export async function searchSymbols(query: string): Promise<FinanceAsset[]> {
  const q = query.trim()
  if (q.length < 2) return []
  try {
    const url = yahooUrl(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&listsCount=0`)
    const res = await fetchWithTimeout(url)
    if (!res.ok) return []
    const data = await res.json()
    const quotes: Array<{
      symbol?: string; shortname?: string; longname?: string
      quoteType?: string; exchange?: string; exchDisp?: string
    }> = data?.quotes ?? []

    return quotes
      .filter(qt => qt.symbol && (qt.shortname || qt.longname))
      .map(qt => ({
        id: `search_${qt.symbol!.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        ticker: qt.symbol!,
        name: qt.longname ?? qt.shortname ?? qt.symbol!,
        assetClass: mapQuoteType(qt.quoteType, qt.symbol!),
        currency: guessCurrency(qt.symbol!, qt.exchange),
        description: qt.exchDisp ?? qt.exchange,
      }))
  } catch {
    return []
  }
}
