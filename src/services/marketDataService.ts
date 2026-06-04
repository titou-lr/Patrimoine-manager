import type { MarketAsset } from '../types/data'
import staticAssetsRaw from '../data/assets.json'

const staticAssets = staticAssetsRaw as MarketAsset[]

const CACHE_KEY = 'market-data-cache'
const CACHE_TTL_MS = 60 * 60 * 1000  // 1 heure
const FETCH_TIMEOUT_MS = 8_000       // abort si pas de réponse après 8s

// Mapping asset ID → ticker Yahoo Finance (suffixe .PA = Euronext Paris)
const YAHOO_TICKER_MAP: Record<string, string> = {
  'etf-world':    'CW8.PA',
  'etf-sp500':    'PE500.PA',
  'etf-nasdaq':   'PANX.PA',
  'etf-europe':   'ESE.PA',
  'etf-emerging': 'AEEM.PA',
  'etf-cac40':    'C40.PA',
  'etf-or':       'GLD',
  'lvmh':         'MC.PA',
  'total-energies': 'TTE.PA',
  'apple':        'AAPL',
}

// Mapping asset ID → CoinGecko ID
const COINGECKO_ID_MAP: Record<string, string> = {
  'bitcoin':  'bitcoin',
  'ethereum': 'ethereum',
}

interface LiveQuote {
  price: number
  change24h: number
}

interface CacheEntry {
  timestamp: number
  assets: MarketAsset[]
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

function writeCache(assets: MarketAsset[]): void {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), assets }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage plein ou indisponible — on ignore silencieusement
  }
}

async function fetchCoinGecko(): Promise<Record<string, LiveQuote>> {
  const ids = Object.values(COINGECKO_ID_MAP).join(',')
  const url =
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`)

  const data = (await res.json()) as Record<string, Record<string, number>>
  const result: Record<string, LiveQuote> = {}

  for (const [assetId, geckoId] of Object.entries(COINGECKO_ID_MAP)) {
    const entry = data[geckoId]
    if (entry?.eur != null) {
      result[assetId] = {
        price: entry['eur'],
        change24h: entry['eur_24h_change'] ?? 0,
      }
    }
  }
  return result
}

async function fetchYahooTicker(ticker: string): Promise<LiveQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) return null

  const data = (await res.json()) as {
    chart?: { result?: Array<{ meta?: Record<string, number> }> }
  }
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) return null

  const price = meta['regularMarketPrice']
  const prevClose = meta['chartPreviousClose'] ?? meta['previousClose'] ?? price
  const change24h = prevClose ? ((price - prevClose) / prevClose) * 100 : 0
  return { price, change24h }
}

async function fetchYahoo(): Promise<Record<string, LiveQuote>> {
  const results = await Promise.allSettled(
    Object.entries(YAHOO_TICKER_MAP).map(async ([assetId, ticker]) => {
      const quote = await fetchYahooTicker(ticker)
      return quote ? ({ assetId, quote } as const) : null
    })
  )

  const out: Record<string, LiveQuote> = {}
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      out[r.value.assetId] = r.value.quote
    }
  }
  return out
}

export async function fetchLiveData(): Promise<MarketAsset[]> {
  const cached = readCache()
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.assets
  }

  const liveQuotes: Record<string, LiveQuote> = {}

  const [cryptoResult, yahooResult] = await Promise.allSettled([
    fetchCoinGecko(),
    fetchYahoo(),
  ])

  if (cryptoResult.status === 'fulfilled') Object.assign(liveQuotes, cryptoResult.value)
  if (yahooResult.status === 'fulfilled') Object.assign(liveQuotes, yahooResult.value)

  const now = new Date().toISOString()
  const merged: MarketAsset[] = staticAssets.map((asset) => {
    const live = liveQuotes[asset.id]
    if (!live) return { ...asset }
    return {
      ...asset,
      lastPrice: live.price,
      change24h: live.change24h,
      lastUpdated: now,
      source: 'live' as const,
    }
  })

  writeCache(merged)
  return merged
}

export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // ignore
  }
}

export function getCachedAssets(): MarketAsset[] | null {
  const cached = readCache()
  return cached ? cached.assets : null
}

export function getCacheAgeMs(): number | null {
  const cached = readCache()
  return cached ? Date.now() - cached.timestamp : null
}
