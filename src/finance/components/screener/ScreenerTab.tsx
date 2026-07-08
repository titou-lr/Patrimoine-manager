import { useState, useCallback } from 'react'
import { FinanceSelect } from '../ui/FinanceSelect'
import { FINANCE_ASSETS } from '../../data/financeAssets'
import { fetchQuotes, loadHistCache } from '../../services/priceService'
import { rsi as computeRsi, atr as computeAtr, lastValue } from '../../services/indicatorsService'
import { getStrategy } from '../../engine/strategies/index'
import { useFinanceStore } from '../../store/useFinanceStore'
import type { AssetClass, HistoricalPeriod, ScreenerFilter, ScreenerResult } from '../../types/finance'

const CLASS_LABELS: Record<AssetClass, string> = {
  equity: 'Actions',
  etf: 'ETF',
  crypto: 'Crypto',
  forex: 'Forex',
  commodity: 'Matières 1ères',
  bond: 'Obligations',
}

const CLASS_COLORS: Record<AssetClass, string> = {
  equity: '#5e6ad2',
  etf: '#4cb782',
  crypto: '#f59e0b',
  forex: '#06b6d4',
  commodity: '#8b5cf6',
  bond: '#64748b',
}

function exportScreenerCSV(results: ScreenerResult[]) {
  const headers = ['Nom', 'Ticker', 'Classe', 'Prix', 'Variation 24h (%)', 'RSI', 'ATR', 'Signal']
  const rows = results.map(r => [
    r.asset.name,
    r.asset.ticker,
    CLASS_LABELS[r.asset.assetClass],
    r.quote.price.toFixed(4),
    r.quote.changePct.toFixed(2),
    r.rsi != null ? r.rsi.toFixed(1) : '',
    r.atr != null ? r.atr.toFixed(4) : '',
    r.signal ?? '',
  ])
  const csv = [headers, ...rows].map(row => row.join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `screener-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const VOLUME_OPTIONS = [
  { label: 'Pas de filtre', value: 0 },
  { label: '> 100k', value: 100_000 },
  { label: '> 1M', value: 1_000_000 },
  { label: '> 10M', value: 10_000_000 },
  { label: '> 100M', value: 100_000_000 },
]

const PERIODS: HistoricalPeriod[] = ['1W', '1M', '3M']

const ALL_CLASSES: AssetClass[] = ['equity', 'etf', 'crypto', 'forex', 'commodity', 'bond']

const MAX_DISPLAY = 50

export default function ScreenerTab() {
  const { setSelectedAssetId, setActiveTab, activeStrategyId, strategyParams, activeTradingAccountId } = useFinanceStore()

  const [filter, setFilter] = useState<ScreenerFilter>({
    assetClasses: [],
    period: '1M',
  })
  const [minChange, setMinChange] = useState('')
  const [maxChange, setMaxChange] = useState('')
  const [rsiMin, setRsiMin] = useState('')
  const [rsiMax, setRsiMax] = useState('')
  const [minVolume, setMinVolume] = useState(0)

  const [results, setResults] = useState<ScreenerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [ran, setRan] = useState(false)

  const toggleClass = (cls: AssetClass) => {
    setFilter(f => ({
      ...f,
      assetClasses: f.assetClasses.includes(cls)
        ? f.assetClasses.filter(c => c !== cls)
        : [...f.assetClasses, cls],
    }))
  }

  const runScreener = useCallback(async () => {
    setLoading(true)
    setRan(false)
    setResults([])

    const activeClasses = filter.assetClasses.length > 0 ? filter.assetClasses : ALL_CLASSES
    const assets = FINANCE_ASSETS.filter(a => activeClasses.includes(a.assetClass))
    const histCache = loadHistCache()
    setProgress({ loaded: 0, total: assets.length })

    const screenerResults: ScreenerResult[] = []
    const BATCH = 10

    for (let i = 0; i < assets.length; i += BATCH) {
      const batch = assets.slice(i, i + BATCH)
      const quotes = await fetchQuotes(batch.map(a => a.ticker))
      const quoteMap = new Map(quotes.map(q => [q.ticker, q]))

      for (const asset of batch) {
        const quote = quoteMap.get(asset.ticker)
        if (!quote) continue

        // Apply basic filters
        const changePct = quote.changePct
        if (minChange !== '' && changePct < parseFloat(minChange)) continue
        if (maxChange !== '' && changePct > parseFloat(maxChange)) continue
        if (minVolume > 0 && (quote.volume ?? 0) < minVolume) continue

        // Compute RSI / ATR from cache only
        const cacheKey = `${asset.ticker}-${filter.period}`
        const cached = histCache[cacheKey]
        let rsiVal: number | undefined
        let atrVal: number | undefined
        let signalVal: ScreenerResult['signal']

        if (cached && cached.candles.length > 0) {
          const closes = cached.candles.map(c => c.close)
          const rsiArr = computeRsi(closes, 14)
          const last = lastValue(rsiArr)
          if (last != null) rsiVal = last

          const atrArr = computeAtr(cached.candles, 14)
          const lastAtr = lastValue(atrArr)
          if (lastAtr != null) atrVal = lastAtr

          // Signal from active strategy
          const accountId = activeTradingAccountId ?? ''
          const stratId = activeStrategyId[accountId] ?? 'smaCrossover'
          const strategy = getStrategy(stratId)
          if (strategy) {
            const params = strategyParams[accountId] ?? {}
            try {
              const sig = strategy.run(cached.candles, params)
              signalVal = sig.type
            } catch { /* ignore */ }
          }
        }

        // RSI filter
        if (rsiMin !== '' && (rsiVal == null || rsiVal < parseFloat(rsiMin))) continue
        if (rsiMax !== '' && (rsiVal == null || rsiVal > parseFloat(rsiMax))) continue

        screenerResults.push({ asset, quote, rsi: rsiVal, atr: atrVal, signal: signalVal })
      }

      setProgress({ loaded: Math.min(i + BATCH, assets.length), total: assets.length })
    }

    // Sort by changePct descending
    screenerResults.sort((a, b) => b.quote.changePct - a.quote.changePct)
    setResults(screenerResults)
    setLoading(false)
    setRan(true)
  }, [filter, minChange, maxChange, rsiMin, rsiMax, minVolume, activeTradingAccountId, activeStrategyId, strategyParams])

  function handleAnalyze(assetId: string) {
    setSelectedAssetId(assetId)
    setActiveTab('analysis')
  }

  const displayed = results.slice(0, MAX_DISPLAY)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Screener</h2>
          <p className="caption">Filtrer les actifs par classe, variation, indicateurs techniques</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Classes */}
        <div>
          <div className="caption" style={{ fontWeight: 600, marginBottom: 8 }}>Classe d'actifs</div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter(f => ({ ...f, assetClasses: [] }))}
              style={{
                padding: '4px 12px', borderRadius: 20, border: '1px solid',
                borderColor: filter.assetClasses.length === 0 ? 'var(--primary)' : 'var(--hairline)',
                background: filter.assetClasses.length === 0 ? 'var(--primary)' : 'transparent',
                color: filter.assetClasses.length === 0 ? '#fff' : 'var(--ink-secondary)',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              Tous
            </button>
            {ALL_CLASSES.map(cls => (
              <button
                key={cls}
                onClick={() => toggleClass(cls)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: '1px solid',
                  borderColor: filter.assetClasses.includes(cls) ? CLASS_COLORS[cls] : 'var(--hairline)',
                  background: filter.assetClasses.includes(cls) ? CLASS_COLORS[cls] + '22' : 'transparent',
                  color: filter.assetClasses.includes(cls) ? CLASS_COLORS[cls] : 'var(--ink-secondary)',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                {CLASS_LABELS[cls]}
              </button>
            ))}
          </div>
        </div>

        {/* Variation + RSI */}
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
            <div className="caption" style={{ fontWeight: 600 }}>Variation 24h (%)</div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                value={minChange}
                onChange={e => setMinChange(e.target.value)}
                placeholder="Min"
                style={{ width: 70, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', borderRadius: 'var(--r)', padding: '6px 8px', fontSize: 12, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-mono)' }}
              />
              <span className="caption">à</span>
              <input
                type="number"
                value={maxChange}
                onChange={e => setMaxChange(e.target.value)}
                placeholder="Max"
                style={{ width: 70, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', borderRadius: 'var(--r)', padding: '6px 8px', fontSize: 12, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
            <div className="caption" style={{ fontWeight: 600 }}>RSI (si données en cache)</div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                value={rsiMin}
                onChange={e => setRsiMin(e.target.value)}
                placeholder="Min (0)"
                min={0} max={100}
                style={{ width: 80, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', borderRadius: 'var(--r)', padding: '6px 8px', fontSize: 12, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-mono)' }}
              />
              <span className="caption">à</span>
              <input
                type="number"
                value={rsiMax}
                onChange={e => setRsiMax(e.target.value)}
                placeholder="Max (100)"
                min={0} max={100}
                style={{ width: 80, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)', borderRadius: 'var(--r)', padding: '6px 8px', fontSize: 12, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div className="caption" style={{ fontSize: 11 }}>
              &lt; 30 = Survente · 30-70 = Neutre · &gt; 70 = Surachat
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="caption" style={{ fontWeight: 600 }}>Volume minimum</div>
            <FinanceSelect
              value={String(minVolume)}
              onChange={v => setMinVolume(Number(v))}
              options={VOLUME_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="caption" style={{ fontWeight: 600 }}>Période indicateurs</div>
            <div className="row" style={{ gap: 4 }}>
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setFilter(f => ({ ...f, period: p }))}
                  className={`btn btn-sm ${filter.period === p ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11 }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={runScreener}
            disabled={loading}
            style={{ fontSize: 13, padding: '8px 20px' }}
          >
            {loading ? 'Chargement…' : 'Lancer le screener'}
          </button>
          {ran && results.length > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => exportScreenerCSV(displayed)}
              style={{ fontSize: 12 }}
            >
              ↓ Exporter CSV
            </button>
          )}
        </div>

        {/* Progress bar */}
        {loading && progress.total > 0 && (
          <div>
            <div className="caption" style={{ marginBottom: 4 }}>
              Chargement {progress.loaded}/{progress.total} actifs…
            </div>
            <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: 'var(--primary)',
                  width: `${(progress.loaded / progress.total) * 100}%`,
                  transition: 'width 0.2s ease',
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {!ran && !loading && (
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div className="title" style={{ marginBottom: 6 }}>Aucun résultat</div>
          <p className="caption" style={{ maxWidth: 340, margin: '0 auto' }}>
            Configurez vos filtres et cliquez sur «&nbsp;Lancer le screener&nbsp;» pour analyser les actifs disponibles.
          </p>
        </div>
      )}

      {ran && results.length === 0 && !loading && (
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>😶</div>
          <div className="title" style={{ marginBottom: 6 }}>Aucun actif trouvé</div>
          <p className="caption">Essayez d'assouplir vos filtres.</p>
        </div>
      )}

      {ran && results.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', alignItems: 'center' }}>
            <span className="eyebrow">
              {results.length} résultat{results.length > 1 ? 's' : ''}{results.length > MAX_DISPLAY ? ` — affichage des ${MAX_DISPLAY} premiers` : ''}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--ink-subtle)', fontWeight: 500 }}>Nom / Ticker</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--ink-subtle)', fontWeight: 500 }}>Classe</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500 }}>Prix</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500 }}>Var. 24h</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500 }}>RSI</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500 }}>ATR</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500 }}>Signal</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500 }}></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => {
                  const pctColor = r.quote.changePct >= 0 ? 'var(--success)' : 'var(--danger)'
                  const rsiColor = r.rsi == null ? 'var(--ink-subtle)' : r.rsi < 30 ? 'var(--success)' : r.rsi > 70 ? 'var(--danger)' : 'var(--ink)'
                  const sigColor = r.signal === 'buy' ? 'var(--success)' : r.signal === 'sell' ? 'var(--danger)' : 'var(--ink-subtle)'
                  const sigLabel = r.signal === 'buy' ? 'ACHAT' : r.signal === 'sell' ? 'VENTE' : r.signal === 'hold' ? 'NEUTRE' : '—'
                  return (
                    <tr
                      key={r.asset.id}
                      style={{ borderBottom: '1px solid var(--hairline)', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => handleAnalyze(r.asset.id)}
                    >
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 500 }}>{r.asset.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-subtle)', fontFamily: 'var(--font-mono)' }}>{r.asset.ticker}</div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 3,
                          background: CLASS_COLORS[r.asset.assetClass] + '22',
                          color: CLASS_COLORS[r.asset.assetClass], fontWeight: 600,
                        }}>
                          {CLASS_LABELS[r.asset.assetClass]}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {r.quote.price.toLocaleString('fr-FR', { minimumFractionDigits: r.quote.price < 1 ? 4 : 2, maximumFractionDigits: r.quote.price < 1 ? 4 : 2 })}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: pctColor, fontWeight: 600 }}>
                        {r.quote.changePct >= 0 ? '+' : ''}{r.quote.changePct.toFixed(2)}%
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: rsiColor }}>
                        {r.rsi != null ? r.rsi.toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-secondary)' }}>
                        {r.atr != null ? r.atr.toFixed(3) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: sigColor }}>{sigLabel}</span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }} onClick={e => { e.stopPropagation(); handleAnalyze(r.asset.id) }}>
                        <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }}>
                          Analyser →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
