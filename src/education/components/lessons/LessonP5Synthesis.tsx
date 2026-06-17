import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LessonShell } from './LessonShell'

// Projection over 5 years after a 30% crash (portfolio was 150k → 105k)
// Recovery path: market recovers ~50% over 18m then grows at 7%/yr
// month 0 = crash point (portfolio = 105k)

function buildRecovery(yearlyGrowth: number[], extraContrib: number, extraLump: number) {
  // yearlyGrowth = annual return per year (5 values for years 1-5)
  // extraContrib = monthly DCA amount added
  // extraLump = one-time injection at month 0
  let value = 105000 + extraLump
  return [105000 + extraLump, ...yearlyGrowth.map(g => {
    value = value * (1 + g) + extraContrib * 12
    return Math.round(value)
  })]
}

const CHOICES = [
  {
    id: 'a',
    label: 'Vendre tout pour stopper les pertes',
    color: '#eb5757',
    emoji: '❌',
    description: "Cristalliser la perte à 105 000 € et rester en cash. Tu rates la reprise.",
    biais: "Illustre le biais de récence + transforme le drawdown en perte réelle définitive.",
    // Cash, 0% return
    values: buildRecovery([0, 0, 0, 0, 0], 0, -105000 + 105000),
  },
  {
    id: 'b',
    label: 'Ne rien faire, continuer comme avant',
    color: '#f5a623',
    emoji: '😐',
    description: "Rester investi sans modifier le comportement. Le marché récupère naturellement.",
    biais: "Stratégie correcte. La discipline de ne pas agir sous l'émotion est une force.",
    values: buildRecovery([0.25, 0.15, 0.07, 0.07, 0.07], 0, 0),
  },
  {
    id: 'c',
    label: 'Continuer le DCA habituel sans changement',
    color: '#1abc9c',
    emoji: '✅',
    description: "Continuer les versements mensuels habituels (500 €/mois). Profite du bas cours.",
    biais: "La discipline du DCA : chaque versement pendant la baisse achète plus de parts.",
    values: buildRecovery([0.25, 0.15, 0.07, 0.07, 0.07], 500, 0),
  },
  {
    id: 'd',
    label: 'Investir davantage si on a des liquidités',
    color: '#5e6ad2',
    emoji: '🚀',
    description: "Injecter un capital supplémentaire (ex. 15 000 €) profitant du bas de marché.",
    biais: "L'achat lors d'une baisse — contre-intuitif mais mathématiquement très efficace.",
    values: buildRecovery([0.25, 0.15, 0.07, 0.07, 0.07], 0, 15000),
  },
]

// Special case for 'a': cash stays at 105k
CHOICES[0].values = [105000, 105000, 105000, 105000, 105000, 105000]

function fmtEur(n: number) { return Math.round(n).toLocaleString('fr-FR') + ' €' }

export default function LessonP5Synthesis({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [explored, setExplored] = useState(false)

  function selectChoice(id: string) {
    setSelectedChoice(id)
    setExplored(true)
  }

  const chosen = CHOICES.find(c => c.id === selectedChoice)

  const chartData = Array.from({ length: 6 }, (_, yr) => {
    const pt: Record<string, number | string> = { year: yr === 0 ? 'Crash' : `+${yr} an${yr > 1 ? 's' : ''}` }
    CHOICES.forEach(ch => { pt[ch.id] = ch.values[yr] })
    return pt
  })

  return (
    <LessonShell step={1} totalSteps={1} onBack={onBack} backLabel="← Retour aux leçons">
      <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Synthèse — Construire sa discipline d'investisseur</h2>

      <div className="panel" style={{ padding: '18px 22px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Le scénario</div>
        <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
          Le marché chute de <strong style={{ color: 'var(--danger)' }}>−30 %</strong> en 2 mois.
          Ton portefeuille était à <strong>150 000 €</strong>, il vaut maintenant{' '}
          <strong style={{ color: 'var(--danger)' }}>105 000 €</strong>.
          Tu as « perdu » 45 000 €. <strong>Que fais-tu ?</strong>
        </p>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 2 }}>Choisis une réaction</div>
        {CHOICES.map(ch => (
          <button
            key={ch.id}
            onClick={() => selectChoice(ch.id)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${selectedChoice === ch.id ? ch.color : 'var(--hairline)'}`,
              background: selectedChoice === ch.id ? ch.color + '15' : 'var(--surface-2)',
              transition: 'all 0.15s var(--ease)',
            }}
          >
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{ch.emoji}</span>
              <div className="col grow" style={{ gap: 3 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: selectedChoice === ch.id ? ch.color : 'var(--ink)' }}>
                  {ch.label}
                </div>
                <div className="caption">{ch.description}</div>
              </div>
              {selectedChoice === ch.id && (
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: ch.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {chosen && (
        <div className="panel" style={{ padding: '18px 22px', borderTop: `3px solid ${chosen.color}` }}>
          <div className="eyebrow" style={{ marginBottom: 10, color: chosen.color }}>
            {chosen.emoji} {chosen.label} — projection à 5 ans
          </div>
          <p className="caption" style={{ margin: '0 0 14px', lineHeight: 1.6, borderLeft: `3px solid ${chosen.color}`, paddingLeft: 10 }}>
            {chosen.biais}
          </p>

          <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {CHOICES.map(ch => (
              <div key={ch.id} className="row" style={{ gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: ch.color, flexShrink: 0 }} />
                <span className="caption" style={{ fontSize: 11 }}>{ch.label.split(' ').slice(0, 2).join(' ')}…</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `${Math.round(v / 1000)}k€`} width={48} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 12 }}
                formatter={((v: number, name: string) => {
                  const ch = CHOICES.find(c => c.id === name)
                  return [fmtEur(v), ch?.label.split(' ').slice(0, 3).join(' ') ?? name]
                }) as never}
              />
              {CHOICES.map(ch => (
                <Line key={ch.id} type="monotone" dataKey={ch.id}
                  stroke={ch.color} strokeWidth={ch.id === chosen.id ? 2.5 : 1.5}
                  dot={false}
                  strokeDasharray={ch.id === chosen.id ? undefined : '4 3'}
                  opacity={ch.id === chosen.id ? 1 : 0.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 14 }}>
            {CHOICES.map(ch => (
              <div key={ch.id} style={{
                padding: '10px 12px', borderRadius: 8, border: `1px solid ${ch.id === chosen.id ? ch.color : 'var(--hairline)'}`,
                background: ch.id === chosen.id ? ch.color + '10' : 'var(--surface-2)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: ch.color, marginBottom: 4 }}>{ch.emoji} {ch.label.split(' ').slice(0, 2).join(' ')}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{fmtEur(ch.values[5])}</div>
                <div className="caption" style={{ marginTop: 2 }}>dans 5 ans</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: '14px 18px', background: 'var(--surface-3)' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Les leçons du module</div>
        <div className="col" style={{ gap: 6 }}>
          {[
            "DCA vs Lump-sum — pas de réponse universelle, ça dépend du chemin des prix",
            "Drawdown — une perte de 30 % ne se récupère pas avec +30 %",
            "TWR vs MWR — comparer au benchmark vs mesurer sa performance réelle",
            "Biais cognitifs — les reconnaître est la première étape pour ne pas y céder",
            "Discipline — ne pas vendre au creux est souvent la meilleure décision",
          ].map((item, i) => (
            <div key={i} className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--success)', flexShrink: 0 }}>✓</span>
              <span className="caption">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button
          onClick={onComplete}
          disabled={!explored}
          style={{
            display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 24px',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500,
            cursor: explored ? 'pointer' : 'not-allowed',
            background: explored ? 'var(--success)' : 'var(--surface-3)',
            color: explored ? '#fff' : 'var(--ink-muted)',
            transition: 'all 0.2s',
          }}
        >
          {explored ? 'Terminer le module →' : 'Sélectionne une réaction pour continuer'}
        </button>
      </div>
    </LessonShell>
  )
}
