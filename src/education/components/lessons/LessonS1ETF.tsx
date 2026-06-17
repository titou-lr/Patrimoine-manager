import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Qu'est-ce que le TER d'un ETF et quelle valeur viser pour un ETF sur un grand indice ?",
    options: [
      'Le taux de rendement espéré — viser > 7 %',
      "Les frais de courtage à l'achat — viser < 5 € par transaction",
      'Les frais de gestion annuels — viser < 0,30 %',
      "Le taux d'erreur de réplication — viser < 1 %",
    ],
    correct: 2,
    explanation:
      "Le TER (Total Expense Ratio) regroupe les frais de gestion prélevés chaque année par l'émetteur de l'ETF, directement déduits de la performance. Pour un grand indice (MSCI World, S&P 500…), viser un TER inférieur à 0,30 % — la concurrence entre émetteurs a fait chuter ces frais.",
  },
  {
    text: 'Tu veux que tes dividendes soient automatiquement réinvestis pour maximiser les intérêts composés. Quelle politique de distribution choisir ?',
    options: [
      'Distribuant (D) — les dividendes sont versés sur ton compte',
      'Capitalisant (C) — les dividendes sont réinvestis automatiquement',
      'Les deux sont équivalents sur le long terme',
      "Cela dépend uniquement de la fiscalité de l'enveloppe",
    ],
    correct: 1,
    explanation:
      "Un ETF capitalisant réinvestit automatiquement les dividendes perçus, sans intervention de ta part — c'est l'option idéale en phase de croissance du capital. Un ETF distribuant te verse les dividendes en cash, utile uniquement si tu cherches un revenu régulier.",
  },
  {
    text: 'Un ETF MSCI World affiche un encours (AUM) de 50M€. Quel risque cela représente-t-il ?',
    options: [
      "Un risque de performance inférieure à l'indice",
      "Un risque de liquidation par l'émetteur faute de rentabilité",
      'Un risque de frais plus élevés que la moyenne',
      "Aucun risque — l'encours ne change rien pour l'investisseur",
    ],
    correct: 1,
    explanation:
      "Un encours sous 100M€ rend un ETF peu rentable à opérer pour son émetteur, qui peut décider de le liquider — obligeant les détenteurs à vendre (souvent avec une fiscalité déclenchée) au moment de la fermeture. Préférer des ETF avec un encours supérieur à 500M€.",
  },
  {
    text: 'Pourquoi la gestion passive surpasse-t-elle statistiquement la gestion active sur le long terme ?',
    options: [
      'Les gérants actifs prennent de mauvaises décisions en moyenne',
      'Les indices montent toujours sur le long terme contrairement aux fonds actifs',
      "Les frais réduits de la gestion passive s'accumulent en faveur de l'investisseur sur la durée",
      'La gestion passive bénéficie d\'avantages fiscaux spécifiques',
    ],
    correct: 2,
    explanation:
      "Ce n'est pas une question de compétence des gérants : sur 15 ans, l'écart de frais (souvent 1 à 2 points par an) s'accumule par capitalisation et finit par peser plus que les éventuels surplus de performance des fonds actifs — qui, en moyenne, ne compensent pas leurs frais plus élevés.",
  },
]

const FEE_LEVELS = [
  { key: 'low' as const, label: 'ETF passif', fee: 0.20, color: '#4cb782' },
  { key: 'mid' as const, label: 'Fonds actif standard', fee: 1.50, color: '#f5a623' },
  { key: 'high' as const, label: 'Fonds actif cher', fee: 2.50, color: '#eb5757' },
]

const GROSS_RETURN = 0.07

function futureValue(c0: number, monthly: number, annualFee: number, months: number) {
  const r = (GROSS_RETURN - annualFee / 100) / 12
  const series: number[] = []
  let value = c0
  for (let m = 1; m <= months; m++) {
    value = value * (1 + r) + monthly
    if (m % 12 === 0) series.push(value)
  }
  return series
}

function fmtEur(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace('.', ',')} M€`
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

export default function LessonS1ETF({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [capital, setCapital] = useState(5000)
  const [monthly, setMonthly] = useState(300)

  const series = useMemo(() => {
    const c = Math.max(0, Math.min(500_000, capital))
    const m = Math.max(0, Math.min(5000, monthly))
    return FEE_LEVELS.map(f => ({ key: f.key, values: futureValue(c, m, f.fee, 360) }))
  }, [capital, monthly])

  const data = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      year: i + 1,
      low: series.find(s => s.key === 'low')!.values[i],
      mid: series.find(s => s.key === 'mid')!.values[i],
      high: series.find(s => s.key === 'high')!.values[i],
    }))
  }, [series])

  const finalLow = data[29].low
  const finalHigh = data[29].high
  const gap = finalLow - finalHigh

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>
          Les ETF et la gestion passive
        </h2>

        {/* Constat statistique */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            <strong>90 % des fonds gérés activement sous-performent leur indice de référence sur
            15 ans</strong>, après frais. Ce n'est pas une opinion — c'est une donnée répétée depuis
            des décennies sur tous les marchés développés.
          </p>
          <p style={{ margin: '12px 0 0', lineHeight: 1.75, fontSize: 14 }}>
            La gestion passive part de ce constat : plutôt que de chercher à <em>battre</em> le
            marché, on <strong>réplique le marché entier</strong> à frais minimaux. C'est le
            principe d'un <strong>ETF (Exchange-Traded Fund)</strong> — un panier de titres coté en
            bourse qui suit un indice.
          </p>
        </div>

        {/* Réplication */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Réplication physique ou synthétique ?</div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { icon: '🏗️', label: 'Réplication physique', desc: "L'ETF détient réellement les titres de l'indice." },
              { icon: '🔄', label: 'Réplication synthétique', desc: "L'ETF utilise un contrat d'échange (swap) pour répliquer la performance — peut offrir un avantage fiscal sur les dividendes américains dans un PEA." },
            ].map(r => (
              <div key={r.label} style={{
                display: 'flex', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-3)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Les deux approches sont valides et largement utilisées — le choix dépend surtout de
            l'émetteur et de l'enveloppe fiscale visée.
          </p>
        </div>

        {/* Métriques clés */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>4 métriques à vérifier avant d'acheter</div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { icon: '💰', label: 'TER (Total Expense Ratio)', desc: 'Frais annuels prélevés sur la performance — viser < 0,30 % pour les grands indices.' },
              { icon: '📏', label: 'Tracking difference', desc: "Écart réel constaté entre la performance de l'ETF et celle de l'indice répliqué." },
              { icon: '🏦', label: 'Encours (AUM)', desc: 'Risque de liquidation si < 100 M€ — préférer un encours supérieur à 500 M€.' },
              { icon: '🔁', label: 'Politique de distribution', desc: 'Capitalisant (C) = dividendes réinvestis automatiquement, idéal pour la croissance. Distribuant (D) = dividendes versés en cash, utile en phase de rente.' },
            ].map(r => (
              <div key={r.label} style={{
                display: 'flex', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-3)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture portefeuille */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Un portefeuille ETF simple et efficace</div>
          <div className="col" style={{ gap: 6 }}>
            {[
              { label: 'MSCI World', range: '60-70 %', desc: '~1600 entreprises, marchés développés', color: '#5e6ad2' },
              { label: 'MSCI Emerging Markets', range: '10-15 %', desc: 'Chine, Inde, Brésil…', color: '#f5a623' },
              { label: 'Obligations agrégées', range: '10-20 %', desc: 'Stabilisateur du portefeuille', color: '#4cb782' },
              { label: 'MSCI World Small Cap', range: '0-10 %', desc: 'Optionnel, rendement supplémentaire', color: '#9b59b6' },
            ].map(r => (
              <div key={r.label} className="row" style={{ gap: 10, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 170 }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.color, minWidth: 56 }}>{r.range}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparateur de coût */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Comparateur de coût sur 30 ans</div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            À performance brute identique (7 %/an), seuls les frais diffèrent entre les trois
            scénarios — l'écart final montre l'effet pur des frais composés.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-subtle)', display: 'block', marginBottom: 5 }}>
                Capital initial (€)
              </label>
              <input
                type="number"
                value={capital}
                min={0}
                step={1000}
                onChange={e => setCapital(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6,
                  border: '1px solid var(--hairline)', background: 'var(--surface-2)',
                  color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-subtle)', display: 'block', marginBottom: 5 }}>
                Versement mensuel (€)
              </label>
              <input
                type="number"
                value={monthly}
                min={0}
                step={50}
                onChange={e => setMonthly(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6,
                  border: '1px solid var(--hairline)', background: 'var(--surface-2)',
                  color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div className="row" style={{ gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
            {FEE_LEVELS.map(f => (
              <div key={f.key} className="row" style={{ gap: 6 }}>
                <div style={{ width: 14, height: 3, background: f.color, borderRadius: 2, flexShrink: 0 }} />
                <span className="caption">{f.label} ({f.fee.toFixed(2)} %)</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `${v} ans`}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M€` : `${Math.round(v / 1000)}k€`
                }
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  borderRadius: 8, fontSize: 12,
                }}
                formatter={((value: number, name: string) => {
                  const label = { low: 'ETF passif', mid: 'Fonds standard', high: 'Fonds cher' }[name] ?? name
                  return [fmtEur(value), label]
                }) as never}
                labelFormatter={v => `Année ${v}`}
              />
              <Line type="monotone" dataKey="low" stroke="#4cb782" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mid" stroke="#f5a623" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="high" stroke="#eb5757" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <div style={{
            marginTop: 14, padding: '12px 16px', borderRadius: 8,
            background: 'rgba(235,87,87,0.08)', border: '1px solid rgba(235,87,87,0.2)',
          }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' }}>
              Après 30 ans, l'écart entre l'ETF passif et le fonds actif cher atteint{' '}
              <strong style={{ color: 'var(--danger)' }}>{fmtEur(gap)}</strong> — uniquement à cause
              des frais, pour une performance brute strictement identique.
            </p>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={() => setScreen('quiz')}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: 'var(--primary)', color: '#fff',
            }}
          >
            Passer au QCM →
          </button>
        </div>
      </LessonShell>
    )
  }

  if (screen === 'quiz') {
    return (
      <LessonShell step={2} totalSteps={3} onBack={() => setScreen('content')} backLabel="← Retour au contenu">
        <div>
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>
            QCM — Les ETF
          </h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📊</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 1 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Un ETF à frais réduits, capitalisant, avec un encours suffisant : c'est la base d'un
          portefeuille passif efficace. Les frais comptent plus qu'on ne le pense sur 30 ans.
        </p>
        <button
          onClick={onComplete}
          style={{
            display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 24px',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            background: 'var(--success)', color: '#fff', marginTop: 8,
          }}
        >
          Terminer la leçon
        </button>
      </div>
    </LessonShell>
  )
}
