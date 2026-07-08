import type { PriceQuote, Candle, HistoricalPeriod, PriceCache, HistoricalCache } from '../types/finance'

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
        const quote: PriceQuote = {
          ticker,
          price: meta.regularMarketPrice ?? meta.previousClose ?? 0,
          change: (meta.regularMarketPrice ?? 0) - (meta.previousClose ?? 0),
          changePct: meta.previousClose
            ? (((meta.regularMarketPrice ?? 0) - meta.previousClose) / meta.previousClose) * 100
            : 0,
          open: meta.regularMarketOpen ?? 0,
          high: meta.regularMarketDayHigh ?? 0,
          low: meta.regularMarketDayLow ?? 0,
          previousClose: meta.previousClose ?? 0,
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

export async function fetchHistorical(ticker: string, period: HistoricalPeriod): Promise<Candle[]> {
  const now = Date.now()
  const cache = loadHistCache()
  const cacheKey = `${ticker}-${period}`
  const cached = cache[cacheKey]
  if (cached && now - cached.fetchedAt < HISTORICAL_TTL) {
    return cached.candles
  }

  const { range, interval } = periodToYahooParams(period)
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

    const candles: Candle[] = []
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
