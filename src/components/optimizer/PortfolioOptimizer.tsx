import { useState, useCallback, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import { useStore, selectActiveSim } from '../../store/useStore'
import { runMonteCarlo } from '../../engine/markovEngine'
import {
  buildCovarianceMatrix, applyBlackLitterman,
  computeCVaR, optimizePortfolio, assetLocationOptimizer, getEffectiveTaxRate,
} from '../../engine/portfolioOptimizer'
import { formatEur } from '../../utils/format'
import type {
  EconomicRegime, OptimizationResult, BlackLittermanView,
  LocationSuggestion, MonteCarloResult, AssetClass,
} from '../../types'
import { MONTE_CARLO_N } from '../../data/regimeData'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface RegimeCard {
  key: EconomicRegime
  emoji: string
  label: string
  description: string
  probability: string
  border: string
}

const REGIME_CARDS: RegimeCard[] = [
  {
    key: 'expansion', emoji: '🟢', label: 'Expansion',
    description: 'Croissance soutenue, marchés haussiers',
    probability: '52%',
    border: 'border-green-500',
  },
  {
    key: 'overheat', emoji: '🟡', label: 'Surchauffe',
    description: 'Inflation élevée, fin de cycle',
    probability: '18%',
    border: 'border-yellow-500',
  },
  {
    key: 'recession', emoji: '🔴', label: 'Récession',
    description: 'Contraction économique',
    probability: '22%',
    border: 'border-red-500',
  },
  {
    key: 'crisis', emoji: '⚫', label: 'Crise',
    description: 'Choc systémique',
    probability: '8%',
    border: 'border-gray-600',
  },
]

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  equity:       'Actions',
  bonds:        'Obligations',
  real_estate:  'Immobilier',
  money_market: 'Monétaire',
  crypto:       'Crypto',
  regulated:    'Livret réglementé',
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PortfolioOptimizer() {
  const store = useStore()
  const activeSim = selectActiveSim(store)
  const { envelopes, globalParams } = activeSim
  const { updateEnvelope, setDirty } = store

  const [selectedRegime, setSelectedRegime] = useState<EconomicRegime | null>(null)
  const [targetReturn, setTargetReturn] = useState(5)
  const [riskTolerance, setRiskTolerance] = useState<'prudent' | 'balanced' | 'dynamic'>('balanced')
  const [nSimulations, setNSimulations] = useState(MONTE_CARLO_N)
  const [views, setViews] = useState<BlackLittermanView[]>([])

  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressTrajectories, setProgressTrajectories] = useState(0)

  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [mcResults, setMcResults] = useState<MonteCarloResult[] | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  const [confirmApply, setConfirmApply] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [targetWarning, setTargetWarning] = useState<string | null>(null)

  const activeEnvelopes = envelopes.filter(e => e.active)
  const allAssets = activeEnvelopes.flatMap(env => env.assets)

  // Rendement net maximum atteignable en temps réel (avant lancement)
  const maxAchievableNetReturn = useMemo(() => {
    const tmi = globalParams.tmi ?? 30
    const isCouple = globalParams.isCouple ?? false
    const taxProfile = { tmi, isCouple, avAbattement: isCouple ? 9200 : 4600 }
    const duration = globalParams.duration
    return activeEnvelopes.flatMap(env =>
      env.assets.map(asset => {
        const gross = asset.expectedReturn / 100
        const gain = Math.max(1, gross * (env.currentRealValue ?? env.initialCapital))
        const taxRate = getEffectiveTaxRate(env, gain, taxProfile, 10, duration)
        return gross * (1 - taxRate)
      })
    ).reduce((max, r) => Math.max(max, r), 0)
  }, [activeEnvelopes, globalParams])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Lancer l'optimisation ─────────────────────────────────────────────────

  const handleOptimize = useCallback(async () => {
    if (running || activeEnvelopes.length === 0) return
    setRunning(true)
    setProgress(0)
    setProgressTrajectories(0)
    setResult(null)

    const duration = globalParams.duration
    const tmi = globalParams.tmi ?? 30
    const isCouple = globalParams.isCouple ?? false
    const taxProfile = { tmi, isCouple, avAbattement: isCouple ? 9200 : 4600 }

    // Paramètres initiaux du régime
    const modifiedParams = { ...globalParams, initialRegime: selectedRegime }

    // 1. Monte Carlo
    const { results: mcRes, rawTrajectories } = await runMonteCarlo(
      envelopes,
      modifiedParams,
      duration,
      nSimulations,
      (pct) => {
        setProgress(pct)
        setProgressTrajectories(Math.round(pct / 100 * nSimulations))
      }
    )
    setMcResults(mcRes)

    // 2. Black-Litterman — prior = rendements configurés par l'utilisateur (pas équilibre CAPM)
    const currentRegime: EconomicRegime = selectedRegime ?? 'expansion'
    const covMatrix = buildCovarianceMatrix(allAssets, currentRegime)
    const impliedReturns = allAssets.map(a => a.expectedReturn / 100)
    const assetIds = allAssets.map(a => a.id)
    const blReturns = applyBlackLitterman(impliedReturns, covMatrix, views, assetIds)

    // 3. Validation : rendement cible vs maximum atteignable après fiscalité
    const maxNetReturn = allAssets.reduce((maxR, asset, idx) => {
      const env = activeEnvelopes.find(e => e.assets.some(a => a.id === asset.id))
      if (!env) return maxR
      const gross = blReturns[idx] ?? (asset.expectedReturn / 100)
      const gain = Math.max(1, gross * (env.currentRealValue ?? env.initialCapital))
      const taxRate = getEffectiveTaxRate(env, gain, taxProfile, 10, duration)
      return Math.max(maxR, gross * (1 - taxRate))
    }, 0)
    const maxNetReturnPct = maxNetReturn * 100
    let effectiveTarget = targetReturn
    if (targetReturn > maxNetReturnPct) {
      effectiveTarget = maxNetReturnPct * 0.9
      setTargetWarning(`Cible irréalisable — maximum atteignable : ${maxNetReturnPct.toFixed(1)}%`)
    } else {
      setTargetWarning(null)
    }

    // 4. CVaR portfolio actuel
    const currentCVaR = computeCVaR([1], rawTrajectories, 0.95)

    // 5. Optimisation (contrainte minimum acceptable, cible plafonnée si irréalisable)
    const allocations = optimizePortfolio(
      allAssets, envelopes, blReturns, rawTrajectories,
      effectiveTarget, taxProfile, riskTolerance
    )

    // 6. Métriques finales
    const expectedReturn = allocations.reduce((s, a) => s + a.optimizedWeight * a.expectedNetReturn, 0)
    const sigma = allocations.reduce((s, a) =>
      s + Math.pow(a.optimizedWeight, 2) * Math.pow(a.contributionToCVaR, 2), 0
    )
    const portfolioSigma = Math.sqrt(Math.max(0, sigma))
    const sharpe = portfolioSigma > 0 ? (expectedReturn - 0.03) / portfolioSigma : 0

    // 7. Suggestions de placement
    const locationSuggestions = assetLocationOptimizer(
      allAssets, envelopes, allocations.map(a => a.optimizedWeight), taxProfile, duration
    )

    // 8. Régimes dominants
    const regimeWeights = mcRes.length > 0
      ? mcRes[mcRes.length - 1].regimeDistribution
      : { expansion: 0.52, overheat: 0.18, recession: 0.22, crisis: 0.08 }

    const blMap: Record<string, number> = {}
    allAssets.forEach((a, i) => { blMap[a.id] = blReturns[i] ?? 0 })

    setResult({
      allocations,
      expectedReturn,
      cvar95: currentCVaR,
      sharpeRatio: sharpe,
      monteCarloResults: mcRes,
      blackLittermanReturns: blMap,
      regimeWeights,
      locationSuggestions,
      userViews: views,
    })

    setRunning(false)
    setProgress(100)
  }, [running, activeEnvelopes, envelopes, globalParams, selectedRegime, nSimulations, views, allAssets, targetReturn, riskTolerance])

  // ── Appliquer l'allocation optimisée ─────────────────────────────────────

  function handleApplyAllocation() {
    if (!result) return
    for (const envelope of activeEnvelopes) {
      const envelopeAllocs = result.allocations.filter(a => a.envelopeId === envelope.id)
      if (envelopeAllocs.length === 0) continue

      const totalWeight = envelopeAllocs.reduce((s, a) => s + a.optimizedWeight, 0)
      if (totalWeight <= 0) continue

      const newAssets = envelope.assets.map(asset => {
        const alloc = envelopeAllocs.find(a => a.assetId === asset.id)
        if (!alloc) return asset
        return { ...asset, allocation: Math.round((alloc.optimizedWeight / totalWeight) * 100) }
      })
      updateEnvelope(envelope.id, { assets: newAssets })
    }
    setDirty(true)
    setConfirmApply(false)
    showToast('Allocation optimisée appliquée ✓')
  }

  // ── Appliquer une suggestion de placement ────────────────────────────────

  function handleApplyLocationSuggestion(s: LocationSuggestion) {
    const srcEnv = envelopes.find(e => e.id === s.currentEnvelopeId)
    const dstEnv = envelopes.find(e => e.id === s.suggestedEnvelopeId)
    if (!srcEnv || !dstEnv) return

    const asset = srcEnv.assets.find(a => a.id === s.assetId)
    if (!asset) return

    // Retirer de la source
    updateEnvelope(srcEnv.id, { assets: srcEnv.assets.filter(a => a.id !== s.assetId) })
    // Ajouter dans la destination
    updateEnvelope(dstEnv.id, { assets: [...dstEnv.assets, { ...asset, allocation: 0 }] })
    setDirty(true)
    showToast(`${s.assetName} déplacé vers ${dstEnv.label} ✓`)
  }

  // ── Données pour les graphiques ───────────────────────────────────────────

  const mcChartData = mcResults?.map(r => ({
    year: r.year,
    p10: Math.round(r.p10),
    p50: Math.round(r.p50),
    p90: Math.round(r.p90),
    band: [Math.round(r.p10), Math.round(r.p90)],
  })) ?? []

  const regimeChartData = mcResults?.map(r => ({
    year: r.year,
    expansion: Math.round(r.regimeDistribution.expansion * 100),
    overheat: Math.round(r.regimeDistribution.overheat * 100),
    recession: Math.round(r.regimeDistribution.recession * 100),
    crisis: Math.round(r.regimeDistribution.crisis * 100),
  })) ?? []

  const sortedAllocations = result
    ? [...result.allocations].sort((a, b) => b.optimizedWeight - a.optimizedWeight)
    : []

  // Amélioration rendement
  const currentExpectedReturn = activeEnvelopes.length > 0
    ? activeEnvelopes.flatMap(e => e.assets).reduce((s, a, _, arr) =>
      s + (a.expectedReturn / 100) * (a.allocation / 100) / arr.length, 0
    )
    : 0
  const improvement = result ? result.expectedReturn - currentExpectedReturn : 0

  // ── Render ────────────────────────────────────────────────────────────────

  const IcCheck  = () => <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.2 8.4 6.4 11.6 12.8 4.6" /></svg>

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden', height: '100%' }}>

      {/* Main content */}
      <div className="content">
        {/* SubheadBar */}
        <div className="subhead-bar">
          <h1 className="title" style={{ fontSize: 15 }}>Optimiseur de portefeuille</h1>
          <span className="badge badge-accent">Black-Litterman + Monte-Carlo</span>
          <div className="grow" />
          {result && (
            <>
              <button className="btn btn-secondary btn-sm">Comparer</button>
              <button className="btn btn-primary btn-sm" onClick={() => setConfirmApply(true)}>
                <IcCheck /> Appliquer l'allocation
              </button>
            </>
          )}
        </div>

        {/* Results area — scroll */}
        <div className="scroll" style={{ flex: 1, padding: '16px 22px 40px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', paddingLeft: 4, paddingRight: 4 }}>

        {/* ── PARAMÈTRES ──────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Section régime économique */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Régime économique actuel</h3>
            <p className="text-xs text-muted mb-4">
              Laissez vide pour utiliser les probabilités historiques (recommandé).
            </p>
            <div className="grid grid-cols-2 gap-2">
              {REGIME_CARDS.map(card => (
                <button
                  key={card.key}
                  onClick={() => setSelectedRegime(selectedRegime === card.key ? null : card.key)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    selectedRegime === card.key
                      ? `border-2 ${card.border} bg-elevated`
                      : 'border-border hover:border-border-mid bg-elevated'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{card.emoji}</span>
                    <span className="text-xs font-semibold text-foreground">{card.label}</span>
                    <span className="ml-auto text-[10px] text-muted">{card.probability}</span>
                  </div>
                  <p className="text-[11px] text-muted leading-snug">{card.description}</p>
                </button>
              ))}
            </div>
            {selectedRegime && (
              <button
                onClick={() => setSelectedRegime(null)}
                className="mt-3 text-xs text-muted hover:text-foreground"
              >
                ↺ Réinitialiser
              </button>
            )}
          </div>

          {/* Section paramètres d'optimisation */}
          <div className="bg-surface border border-border rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Paramètres d'optimisation</h3>
            <div className="grid grid-cols-2 gap-4">

              {/* Rendement minimum acceptable */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">Rendement min. acceptable</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={targetReturn}
                    onChange={e => { setTargetReturn(Number(e.target.value)); setTargetWarning(null) }}
                    min={0} max={30} step={0.5}
                    className={`w-20 h-8 bg-elevated border rounded-lg px-3 text-sm font-mono text-foreground ${
                      targetWarning ? 'border-yellow-500' : 'border-border'
                    }`}
                  />
                  <span className="text-xs text-muted">%/an</span>
                </div>
                {allAssets.length > 0 && (
                  <span className="text-[10px] text-muted">
                    Max : {(maxAchievableNetReturn * 100).toFixed(1)}%
                  </span>
                )}
                {targetWarning && (
                  <span className="text-[10px] text-yellow-400">{targetWarning}</span>
                )}
              </div>

              {/* Horizon */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">Horizon</span>
                <div className="h-8 flex items-center text-sm font-mono tabular-nums" style={{ color: 'var(--primary)' }}>
                  {globalParams.duration} ans
                  <span className="ml-2 text-xs text-muted font-normal">(paramètres globaux)</span>
                </div>
              </div>

              {/* Tolérance au risque — pleine largeur */}
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">Tolérance au risque</span>
                <div className="flex gap-1">
                  {(['prudent', 'balanced', 'dynamic'] as const).map(rt => (
                    <button
                      key={rt}
                      onClick={() => setRiskTolerance(rt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        riskTolerance === rt
                          ? 'bg-orange text-black border-orange'
                          : 'border-border text-muted hover:text-foreground'
                      }`}
                    >
                      {rt === 'prudent' ? 'Prudent' : rt === 'balanced' ? 'Équilibré' : 'Dynamique'}
                    </button>
                  ))}
                  <span className="text-[10px] text-muted ml-3 self-center">
                    {riskTolerance === 'prudent' ? 'CVaR95 ≥ −10%' : riskTolerance === 'balanced' ? 'CVaR95 ≥ −20%' : 'Aucune contrainte CVaR'}
                  </span>
                </div>
              </div>

              {/* Nombre de simulations */}
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted uppercase tracking-wider">Simulations Monte-Carlo</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={nSimulations}
                    onChange={e => setNSimulations(Math.max(100, Math.min(5000, Number(e.target.value))))}
                    min={100} max={5000} step={100}
                    className="w-20 h-8 bg-elevated border border-border rounded-lg px-3 text-sm font-mono text-foreground"
                  />
                  <span className="text-[10px] text-muted">1 000 reco. · 5 000 précis</span>
                </div>
              </label>

            </div>
          </div>

          {/* Section vues de marché */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Vues de marché <span className="text-muted font-normal">(optionnel)</span></h3>
            <p className="text-xs text-muted mb-4">
              Exprimez vos convictions pour affiner l'optimisation Black-Litterman.
            </p>

            {views.length === 0 && (
              <p className="text-xs text-muted italic mb-3">
                L'optimisation utilisera uniquement les données de marché.
              </p>
            )}

            <div className="space-y-2 mb-3">
              {views.map((view, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={view.assetId}
                    onChange={e => {
                      const next = [...views]
                      next[idx] = { ...next[idx], assetId: e.target.value }
                      setViews(next)
                    }}
                    className="bg-elevated border border-border rounded-lg px-2 h-8 text-xs text-foreground"
                  >
                    <option value="">Actif…</option>
                    {allAssets.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted">surperforme de</span>
                  <input
                    type="number"
                    value={view.relativeOutperformance}
                    onChange={e => {
                      const next = [...views]
                      next[idx] = { ...next[idx], relativeOutperformance: Number(e.target.value) }
                      setViews(next)
                    }}
                    className="w-16 h-8 bg-elevated border border-border rounded-lg px-2 text-xs font-mono text-foreground"
                    step={0.5}
                  />
                  <span className="text-xs text-muted">%</span>
                  <span className="text-xs text-muted">confiance</span>
                  <input
                    type="number"
                    value={view.confidence}
                    onChange={e => {
                      const next = [...views]
                      next[idx] = { ...next[idx], confidence: Number(e.target.value) }
                      setViews(next)
                    }}
                    min={0} max={100}
                    className="w-14 h-8 bg-elevated border border-border rounded-lg px-2 text-xs font-mono text-foreground"
                  />
                  <span className="text-xs text-muted">%</span>
                  <button
                    onClick={() => setViews(views.filter((_, i) => i !== idx))}
                    className="text-muted hover:text-foreground text-xs px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {views.length < 5 && (
              <button
                onClick={() => setViews([...views, { assetId: '', relativeOutperformance: 2, confidence: 50 }])}
                className="text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5"
              >
                + Ajouter une vue
              </button>
            )}
          </div>

          {/* Bouton Lancer */}
          <button
            onClick={handleOptimize}
            disabled={running || activeEnvelopes.length === 0}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
              running || activeEnvelopes.length === 0
                ? 'bg-orange/40 text-black/60 cursor-not-allowed'
                : 'bg-orange text-black hover:bg-orange/90 cursor-pointer'
            }`}
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Simulation en cours… {progress}% ({progressTrajectories} / {nSimulations})
              </span>
            ) : (
              'Optimiser le portefeuille'
            )}
          </button>

        </div>

        {/* ── RÉSULTATS ─────────────────────────────────────────────────── */}
        <div className="space-y-5" style={{ marginTop: 20 }}>

          {!result && !running && (
            <div className="bg-surface border border-border rounded-2xl flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center text-2xl">
                ⚙
              </div>
              <p className="text-sm text-muted text-center max-w-xs">
                Configurez les paramètres et lancez l'optimisation pour voir les résultats.
              </p>
            </div>
          )}

          {result && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="Rendement espéré net"
                  value={`${(result.expectedReturn * 100).toFixed(2)}%/an`}
                  accent
                />
                <KpiCard
                  label="CVaR 95%"
                  value={`${(result.cvar95 * 100).toFixed(2)}%/an`}
                  danger
                  tooltip="En scénario défavorable (5% des cas), rendement annualisé (CAGR) moyen sur la durée simulée"
                />
                <KpiCard
                  label="Ratio de Sharpe"
                  value={result.sharpeRatio.toFixed(2)}
                  tooltip="> 1 = bon, > 2 = excellent"
                />
                <KpiCard
                  label="Amélioration vs actuel"
                  value={`${improvement >= 0 ? '+' : ''}${(improvement * 100).toFixed(2)}%`}
                  success={improvement > 0}
                />
              </div>

              {/* Tableau allocation optimisée */}
              <div className="bg-surface border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Allocation optimisée</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted border-b border-border">
                        <th className="text-left pb-2 font-medium">Actif</th>
                        <th className="text-left pb-2 font-medium">Classe</th>
                        <th className="text-right pb-2 font-medium">Avant</th>
                        <th className="text-right pb-2 font-medium">Après</th>
                        <th className="text-right pb-2 font-medium">Δ</th>
                        <th className="text-right pb-2 font-medium">Rend.net/an</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAllocations.map(alloc => {
                        const env = envelopes.find(e => e.id === alloc.envelopeId)
                        const asset = env?.assets.find(a => a.id === alloc.assetId)
                        const delta = alloc.optimizedWeight - alloc.currentWeight
                        return (
                          <tr key={`${alloc.envelopeId}-${alloc.assetId}`} className="border-b border-border/50">
                            <td className="py-2 pr-3">
                              <div className="font-medium text-foreground">{asset?.name ?? alloc.assetId}</div>
                              <div className="text-muted">{env?.label}</div>
                            </td>
                            <td className="py-2 pr-3 text-muted">
                              {ASSET_CLASS_LABELS[alloc.assetClass]}
                            </td>
                            <td className="py-2 pr-3 text-right font-mono tabular-nums">
                              {(alloc.currentWeight * 100).toFixed(1)}%
                            </td>
                            <td className="py-2 pr-3 text-right font-mono tabular-nums text-orange font-semibold">
                              {(alloc.optimizedWeight * 100).toFixed(1)}%
                            </td>
                            <td className={`py-2 pr-3 text-right font-mono tabular-nums ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {delta >= 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                            </td>
                            <td className="py-2 text-right font-mono tabular-nums text-orange">
                              {(alloc.expectedNetReturn * 100).toFixed(2)}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td colSpan={3} className="pt-2 text-muted">Total</td>
                        <td className="pt-2 text-right font-mono tabular-nums text-orange font-semibold">
                          {(sortedAllocations.reduce((s, a) => s + a.optimizedWeight, 0) * 100).toFixed(1)}%
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Graphique Monte-Carlo */}
              {mcResults && mcResults.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Simulation Monte-Carlo</h3>
                    <button
                      onClick={() => setShowComparison(v => !v)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                        showComparison
                          ? 'border-orange text-orange bg-orange/10'
                          : 'border-border text-muted hover:text-foreground'
                      }`}
                    >
                      Comparer avec allocation actuelle
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-3">
                    <LegendItem color="#22c55e" dashed label="Favorable (P90)" />
                    <LegendItem color="#f97316" label="Médian (P50)" />
                    <LegendItem color="#ef4444" dashed label="Défavorable (P10)" />
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={mcChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#262931" strokeDasharray="1 0" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: '#6B7280', fontSize: 10 }}
                        tickFormatter={v => String(v)}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#6B7280', fontSize: 10 }}
                        tickFormatter={v => `${Math.round(v / 1000)}k`}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip content={<MCTooltip />} />
                      {/* Bande P10→P90 */}
                      <Area
                        type="monotone"
                        dataKey="p90"
                        fill="#f97316"
                        fillOpacity={0.10}
                        stroke="none"
                        stackId="band"
                      />
                      <Area
                        type="monotone"
                        dataKey="p10"
                        fill="#f97316"
                        fillOpacity={-0.10}
                        stroke="none"
                        stackId="band"
                      />
                      <Line
                        type="monotone"
                        dataKey="p50"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                        name="Médian (P50)"
                      />
                      <Line
                        type="monotone"
                        dataKey="p90"
                        stroke="#22c55e"
                        strokeWidth={1}
                        strokeDasharray="4 2"
                        dot={false}
                        name="Favorable (P90)"
                      />
                      <Line
                        type="monotone"
                        dataKey="p10"
                        stroke="#ef4444"
                        strokeWidth={1}
                        strokeDasharray="4 2"
                        dot={false}
                        name="Défavorable (P10)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Annotations dernière année */}
                  {mcResults.length > 0 && (() => {
                    const last = mcResults[mcResults.length - 1]
                    return (
                      <div className="flex justify-between mt-2 text-xs">
                        <span className="text-red-400">Défavorable : {formatEur(last.p10)}</span>
                        <span className="text-orange font-semibold">Médian : {formatEur(last.p50)}</span>
                        <span className="text-green-400">Favorable : {formatEur(last.p90)}</span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Analyse des régimes économiques */}
              {regimeChartData.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Distribution des régimes simulés</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={regimeChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#262931" strokeDasharray="1 0" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: '#6B7280', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={v => `${v}%`}
                        tick={{ fill: '#6B7280', fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <Tooltip
                        formatter={(v: unknown, name: unknown) => [`${v}%`, String(name)]}
                        contentStyle={{ background: '#1a1d24', border: '1px solid #2d3139', borderRadius: 8 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: '#6B7280' }} />
                      <Bar dataKey="expansion" stackId="a" fill="#22c55e" name="Expansion" />
                      <Bar dataKey="overheat" stackId="a" fill="#eab308" name="Surchauffe" />
                      <Bar dataKey="recession" stackId="a" fill="#f87171" name="Récession" />
                      <Bar dataKey="crisis" stackId="a" fill="#ef4444" name="Crise" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Suggestions de placement fiscal */}
              {result.locationSuggestions.length > 0 && (
                <div className="bg-surface border border-border rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Optimisation fiscale inter-enveloppes
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {result.locationSuggestions.map(s => {
                      const srcEnv = envelopes.find(e => e.id === s.currentEnvelopeId)
                      const dstEnv = envelopes.find(e => e.id === s.suggestedEnvelopeId)
                      return (
                        <div
                          key={`${s.assetId}-${s.suggestedEnvelopeId}`}
                          className="flex flex-col gap-2 bg-elevated rounded-xl p-3"
                        >
                          <div className="text-xs font-medium text-foreground leading-snug">
                            {s.assetName}
                            <span className="text-muted font-normal"> → {dstEnv?.label ?? s.suggestedEnvelopeId}</span>
                          </div>
                          <div className="text-[10px] text-muted leading-snug">{s.reason}</div>
                          <div className="text-[10px] text-muted">De : {srcEnv?.label}</div>
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--success)' }}>
                              +{formatEur(s.taxSavingEstimate)}
                            </span>
                            <button
                              onClick={() => handleApplyLocationSuggestion(s)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-orange/15 text-orange hover:bg-orange/25 transition-colors"
                            >
                              Appliquer
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Bouton Appliquer l'allocation */}
              {!confirmApply ? (
                <button
                  onClick={() => setConfirmApply(true)}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-orange text-black hover:bg-orange/90 transition-colors"
                >
                  Appliquer l'allocation optimisée
                </button>
              ) : (
                <div className="bg-elevated border border-orange/30 rounded-2xl p-4 space-y-3">
                  <p className="text-sm text-foreground">
                    Cette action modifiera les allocations dans vos enveloppes. Continuer ?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleApplyAllocation}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold bg-orange text-black"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmApply(false)}
                      className="flex-1 py-2 rounded-xl text-sm text-muted border border-border"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)', padding: '10px 16px', fontSize: 13,
          color: 'var(--ink)', boxShadow: 'var(--shadow-pop)', zIndex: 50,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({
  label, value, accent, danger, success, tooltip,
}: {
  label: string
  value: string
  accent?: boolean
  danger?: boolean
  success?: boolean
  tooltip?: string
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4" title={tooltip}>
      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-mono font-semibold tabular-nums ${
        accent ? 'text-orange' :
        danger ? 'text-red-400' :
        success ? 'text-green-400' :
        'text-foreground'
      }`}>
        {value}
      </div>
      {tooltip && (
        <div className="text-[10px] text-muted mt-1 leading-snug">{tooltip}</div>
      )}
    </div>
  )
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted">
      <span
        className="w-5 inline-block shrink-0"
        style={{ borderTop: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}` }}
      />
      {label}
    </div>
  )
}

interface MCPayload {
  dataKey: string
  name: string
  value: number
  color: string
}

function MCTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: MCPayload[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-overlay border border-border-mid rounded-xl p-3 text-xs min-w-40 shadow-xl">
      <div className="text-muted mb-2">Année {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-foreground font-mono tabular-nums">{formatEur(p.value)}</span>
        </div>
      ))}
    </div>
  )
}
