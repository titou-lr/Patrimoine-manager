import { useState, useMemo } from 'react'
import { FinanceSelect } from '../ui/FinanceSelect'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAllAssets } from '../../store/useFinanceStore'
import { STRATEGIES } from '../../engine/strategies/index'
import { runBacktest } from '../../engine/backtestEngine'
import { fetchHistorical } from '../../services/priceService'
import type { BacktestResult, BacktestConfig } from '../../types/finance'
import { formatEur, formatPct } from '../../../utils/format'
import NumberInput from '../../../components/ui/NumberInput'

export default function BacktestPanel() {
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [strategyId, setStrategyId] = useState('sma_crossover')
  const [paramValues, setParamValues] = useState<Record<string, number | string>>({})
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [initialCapital, setInitialCapital] = useState(10000)
  const [feeRate, setFeeRate] = useState(0.1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const strategy = STRATEGIES.find(s => s.id === strategyId)

  const effectiveParams = useMemo(() => {
    if (!strategy) return {}
    const defaults: Record<string, number | string> = {}
    strategy.params.forEach(p => { defaults[p.key] = p.defaultValue })
    return { ...defaults, ...paramValues }
  }, [strategy, paramValues])

  const allAssets = useAllAssets()
  const filteredAssets = useMemo(() => {
    const q = assetSearch.toLowerCase()
    return allAssets.filter(a =>
      a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [assetSearch, allAssets])

  const selectedAsset = allAssets.find(a => a.id === selectedAssetId)

  async function handleRun() {
    if (!selectedAsset) { setErrorMsg('Sélectionnez un actif'); return }
    setRunning(true)
    setErrorMsg('')
    setResult(null)
    try {
      const candles = await fetchHistorical(selectedAsset.ticker, '5Y')
      const config: BacktestConfig = {
        strategyId,
        assetId: selectedAssetId,
        params: effectiveParams,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        initialCapital,
        feeRate: feeRate / 100,
      }
      const r = runBacktest(config, candles)
      setResult(r)
    } catch {
      setErrorMsg('Erreur lors du backtest. Vérifiez la connexion réseau.')
    } finally {
      setRunning(false)
    }
  }

  // Build chart data merging equity curve and buy-and-hold
  const chartData = useMemo(() => {
    if (!result) return []
    return result.equityCurve.map(pt => {
      const holdVal = result.config.initialCapital * (1 + result.buyAndHoldReturn / 100) *
        ((pt.time - result.equityCurve[0].time) / (result.equityCurve[result.equityCurve.length - 1].time - result.equityCurve[0].time))
      return {
        date: new Date(pt.time).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        stratégie: Math.round(pt.value),
        buyHold: Math.round(result.config.initialCapital + holdVal),
      }
    })
  }, [result])

  const pnlColor = (v: number) => v >= 0 ? 'var(--success)' : 'var(--danger)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 className="title" style={{ fontSize: 14, margin: 0 }}>Configuration du backtest</h3>

        {/* Sélection actif */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="caption" style={{ fontWeight: 600 }}>Actif</span>
          <input
            type="text"
            placeholder="Rechercher un actif…"
            value={selectedAsset ? selectedAsset.name : assetSearch}
            onChange={e => { setAssetSearch(e.target.value); setSelectedAssetId('') }}
            onFocus={() => { if (selectedAsset) setAssetSearch('') }}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
              color: 'var(--ink)', outline: 'none',
            }}
          />
          {assetSearch && !selectedAsset && (
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', maxHeight: 160, overflowY: 'auto',
            }}>
              {filteredAssets.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAssetId(a.id); setAssetSearch('') }}
                  style={{
                    display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
                  }}
                >
                  {a.name} <span className="caption">{a.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stratégie */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="caption" style={{ fontWeight: 600 }}>Stratégie</span>
          <FinanceSelect
            value={strategyId}
            onChange={v => { setStrategyId(v); setParamValues({}) }}
            options={STRATEGIES.map(s => ({ value: s.id, label: s.label }))}
          />
          {strategy && <p className="caption" style={{ margin: 0 }}>{strategy.description}</p>}
        </div>

        {/* Paramètres dynamiques */}
        {strategy && strategy.params.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {strategy.params.map(param => (
              <div key={param.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="caption" style={{ fontWeight: 600 }}>{param.label}</span>
                {param.type === 'number' ? (
                  <NumberInput
                    value={Number(effectiveParams[param.key] ?? param.defaultValue)}
                    onChange={v => setParamValues(prev => ({ ...prev, [param.key]: v }))}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    size="sm"
                  />
                ) : (
                  <FinanceSelect
                    value={String(effectiveParams[param.key] ?? param.defaultValue)}
                    onChange={v => setParamValues(prev => ({ ...prev, [param.key]: v }))}
                    options={param.options ?? []}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dates et capital */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Date début</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--r)', padding: '6px 8px', fontSize: 12,
                color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Date fin</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--r)', padding: '6px 8px', fontSize: 12,
                color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Capital initial (€)</span>
            <NumberInput
              value={initialCapital}
              onChange={setInitialCapital}
              min={100}
              suffix="€"
              size="sm"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Frais (%)</span>
            <NumberInput
              value={feeRate}
              onChange={setFeeRate}
              min={0}
              max={5}
              step={0.05}
              suffix="%"
              size="sm"
            />
          </div>
        </div>

        {errorMsg && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{errorMsg}</p>}

        <button
          className="btn btn-primary btn-sm"
          onClick={handleRun}
          disabled={running || !selectedAsset}
          style={{ alignSelf: 'flex-start' }}
        >
          {running ? 'Calcul en cours…' : 'Lancer le backtest'}
        </button>
      </div>

      {/* Résultats */}
      {result && (
        <>
          {/* KPIs */}
          <div className="panel" style={{ padding: 16 }}>
            <h3 className="title" style={{ fontSize: 13, marginBottom: 12 }}>Résultats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div>
                <div className="caption">Rendement stratégie</div>
                <div className="kpi" style={{ color: pnlColor(result.totalReturn) }}>
                  {formatPct(result.totalReturn)}
                </div>
                <div className="caption">{formatEur(result.totalReturnAbs)}</div>
              </div>
              <div>
                <div className="caption">Buy & Hold</div>
                <div className="kpi" style={{ color: pnlColor(result.buyAndHoldReturn) }}>
                  {formatPct(result.buyAndHoldReturn)}
                </div>
              </div>
              <div>
                <div className="caption">Max Drawdown</div>
                <div className="kpi" style={{ color: 'var(--danger)' }}>
                  -{formatPct(result.maxDrawdown * 100)}
                </div>
              </div>
              <div>
                <div className="caption">Win Rate</div>
                <div className="kpi" style={{ color: result.winRate >= 0.5 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatPct(result.winRate * 100)}
                </div>
              </div>
              <div>
                <div className="caption">Nb trades</div>
                <div className="kpi">{result.totalTrades}</div>
              </div>
              <div>
                <div className="caption">Profit Factor</div>
                <div className="kpi" style={{ color: result.profitFactor >= 1 ? 'var(--success)' : 'var(--danger)' }}>
                  {isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : '∞'}
                </div>
              </div>
              <div>
                <div className="caption">Sharpe Ratio</div>
                <div className="kpi" style={{ color: result.sharpeRatio >= 1 ? 'var(--success)' : 'var(--ink-subtle)' }}>
                  {result.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="caption">Capital final</div>
                <div className="kpi">{formatEur(result.finalCapital)}</div>
              </div>
            </div>
          </div>

          {/* Equity curve */}
          {chartData.length > 0 && (
            <div className="panel" style={{ padding: 16 }}>
              <h3 className="title" style={{ fontSize: 13, marginBottom: 12 }}>Courbe de capital</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', fontSize: 12 }}
                    formatter={(v: unknown) => typeof v === 'number' ? formatEur(v) : ''}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="stratégie" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="buyHold" stroke="var(--ink-subtle)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tableau trades backtest */}
          {result.trades.filter(t => t.side === 'sell').length > 0 && (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
                <h3 className="title" style={{ fontSize: 13, margin: 0 }}>Trades du backtest</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                      {['Date', 'Côté', 'Qté', 'Prix', 'P&L'].map(h => (
                        <th key={h} className="caption" style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.slice(0, 100).map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--hairline)' }}>
                        <td style={{ padding: '7px 12px', color: 'var(--ink-subtle)' }}>
                          {new Date(t.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '7px 12px', color: t.side === 'buy' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {t.side === 'buy' ? 'Achat' : 'Vente'}
                        </td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)' }}>{t.quantity}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)' }}>{t.price.toFixed(2)}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', color: t.pnl != null ? pnlColor(t.pnl) : 'inherit' }}>
                          {t.pnl != null ? formatEur(t.pnl) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

