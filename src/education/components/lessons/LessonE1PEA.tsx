import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Tu veux investir en actions européennes sur 10 ans. Quelle enveloppe privilégier ?",
    options: [
      "CTO, car il n'a pas de plafond",
      "PEA, pour bénéficier de l'exonération d'IR après 5 ans",
      "Assurance-vie, car elle est plus flexible",
      "PER, car les versements sont déductibles",
    ],
    correct: 1,
    explanation:
      "Le PEA est conçu pour les actions sur le long terme. Après 5 ans, les gains ne sont taxés qu'à 17,2 % (PS uniquement) contre 30 % en CTO. Sur 10 ans, l'avantage fiscal est décisif.",
  },
  {
    text: "Tu ouvres un PEA aujourd'hui avec 100 € et effectues un retrait dans 3 ans. Que se passe-t-il ?",
    options: [
      "Tu paies uniquement les prélèvements sociaux de 17,2 %",
      "Il ne se passe rien, le retrait est libre",
      "Tu paies le PFU 30 % et le plan est clôturé",
      "Tu paies le PFU 30 % mais le plan reste ouvert",
    ],
    correct: 2,
    explanation:
      "Avant 5 ans, tout retrait entraîne la clôture automatique du PEA et l'imposition des gains au PFU de 30 %. C'est pourquoi l'horloge des 5 ans est si précieuse — et pourquoi ouvrir tôt est crucial.",
  },
  {
    text: "Après 5 ans de détention, quel taux s'applique sur les plus-values d'un PEA ?",
    options: [
      "0 % — totalement exonéré",
      "30 % — PFU standard",
      "17,2 % — prélèvements sociaux uniquement",
      "12,8 % — IR uniquement",
    ],
    correct: 2,
    explanation:
      "Après 5 ans, les plus-values du PEA sont exonérées d'impôt sur le revenu. Seuls les prélèvements sociaux de 17,2 % restent dus. On parle souvent d'«exonération» mais c'est une exonération d'IR uniquement.",
  },
  {
    text: "Pourquoi est-il conseillé d'ouvrir un PEA le plus tôt possible, même avec un petit montant ?",
    options: [
      "Pour bénéficier de meilleurs taux d'intérêt dès le départ",
      "L'horloge fiscale des 5 ans démarre dès l'ouverture, pas au moment des vrais investissements",
      "Car le plafond de 150 000 € est difficile à atteindre rapidement",
      "Pour éviter les frais de garde annuels",
    ],
    correct: 1,
    explanation:
      "La date qui compte est celle d'ouverture, pas celle du premier vrai investissement. Ouvrir avec 100 € aujourd'hui et investir sérieusement dans 2 ans signifie que tu auras ton avantage fiscal 2 ans plus tôt.",
  },
]

const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'

export default function LessonE1PEA({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [capital, setCapital] = useState(10000)
  const [gains, setGains] = useState(5000)

  const peaBefore = gains * 0.30
  const peaAfter  = gains * 0.172
  const cto       = gains * 0.30

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>
          Le Plan d'Épargne en Actions (PEA)
        </h2>

        {/* Hook chiffré */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Même investissement, mêmes gains — deux fiscalités différentes selon l'enveloppe.
            Avec <strong>10 000 € investis</strong> et <strong>5 000 € de gains</strong> :
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div style={{
              padding: 14, borderRadius: 8,
              background: 'rgba(235,87,87,0.08)', border: '1px solid rgba(235,87,87,0.2)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>CTO</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                −1 500 €
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>PFU 30 % sur les gains</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2, fontStyle: 'italic' }}>PFU = Prélèvement Forfaitaire Unique — détaillé en Module 7</div>
            </div>
            <div style={{
              padding: 14, borderRadius: 8,
              background: 'rgba(76,183,130,0.08)', border: '1px solid rgba(76,183,130,0.3)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>PEA après 5 ans</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                −860 €
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>PS 17,2 % uniquement</div>
            </div>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ink)' }}>640 € d'écart</strong> uniquement grâce au choix de l'enveloppe.
            Et si les gains étaient de 50 000 € ?{' '}
            <strong style={{ color: 'var(--ink)' }}>6 400 € économisés</strong> — sans rien changer à l'investissement.
          </p>
        </div>

        {/* Règles */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Les règles du PEA</div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { icon: '🏦', label: 'Plafond de versements', val: '150 000 € (PEA classique)', accent: false },
              { icon: '📈', label: 'Actifs éligibles', val: 'Actions UE + ETF synthétiques (incl. S&P500)', accent: false },
              { icon: '⚠️', label: 'Avant 5 ans', val: 'PFU 30 % + clôture automatique du plan', danger: true, accent: true },
              { icon: '✅', label: 'Après 5 ans', val: 'PS 17,2 % uniquement — retraits libres sans clôture', success: true, accent: true },
            ].map(r => (
              <div key={r.label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: (r as any).danger ? 'rgba(235,87,87,0.06)'
                  : (r as any).success ? 'rgba(76,183,130,0.06)'
                  : 'var(--surface-3)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                <div>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: (r as any).danger ? 'var(--danger)' : (r as any).success ? 'var(--success)' : 'var(--ink)',
                    marginBottom: 2,
                  }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Règle d'or */}
        <div className="panel" style={{ padding: '14px 18px', borderLeft: '3px solid var(--primary)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 6 }}>
            La règle d'or du PEA
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            Ouvrir le plus tôt possible, même avec <strong style={{ color: 'var(--ink)' }}>100 €</strong>.
            L'horloge fiscale des 5 ans démarre dès le{' '}
            <strong style={{ color: 'var(--ink)' }}>premier versement</strong>, pas au moment
            où tu investis vraiment. Après 5 ans, les retraits sont libres et le plan reste ouvert.
          </p>
        </div>

        {/* Comparateur interactif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Comparateur fiscal — essaie tes chiffres</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Capital investi (€)', val: capital, set: setCapital },
              { label: 'Gains réalisés (€)', val: gains, set: setGains },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 12, color: 'var(--ink-subtle)', display: 'block', marginBottom: 6 }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  value={f.val}
                  min={0}
                  step={1000}
                  onChange={e => f.set(Math.max(0, Number(e.target.value)))}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    border: '1px solid var(--hairline)', background: 'var(--surface-2)',
                    color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'PEA < 5 ans', rate: '30 %', tax: peaBefore, net: gains - peaBefore, noteColor: 'var(--danger)', note: 'Clôture du plan', border: 'var(--hairline-strong)' },
              { label: 'PEA > 5 ans', rate: '17,2 %', tax: peaAfter, net: gains - peaAfter, noteColor: 'var(--success)', note: 'Plan maintenu', border: 'var(--success)' },
              { label: 'CTO', rate: '30 %', tax: cto, net: gains - cto, noteColor: 'var(--ink-muted)', note: 'Standard', border: 'var(--hairline-strong)' },
            ].map(col => (
              <div key={col.label} style={{
                padding: 14, borderRadius: 8, background: 'var(--surface-3)',
                border: `1px solid ${col.border}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: col.noteColor, marginBottom: 10 }}>
                  {col.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 3 }}>Taux</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                  {col.rate}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 3 }}>Impôt dû</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--danger)', marginBottom: 10 }}>
                  −{fmt(col.tax)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 3 }}>Gain net</div>
                <div style={{
                  fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: col.label === 'PEA > 5 ans' ? 'var(--success)' : 'var(--ink)',
                }}>
                  {fmt(col.net)}
                </div>
                <div style={{
                  marginTop: 10, fontSize: 10, padding: '2px 6px', borderRadius: 4,
                  background: 'var(--surface-2)', color: col.noteColor, display: 'inline-block',
                }}>
                  {col.note}
                </div>
              </div>
            ))}
          </div>

          {gains > 0 && (
            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
              → Économie PEA &gt;5 ans vs CTO : {fmt(cto - peaAfter)}
              {capital > 0 && ` (${((cto - peaAfter) / (capital + gains) * 100).toFixed(1)} % du capital total)`}
            </p>
          )}
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
            QCM — Le PEA
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
        <p className="caption" style={{ maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
          Le PEA est l'arme fiscale numéro 1 pour les actions. La clé : ouvrir tôt, laisser tourner
          l'horloge des 5 ans, et profiter d'une imposition réduite à 17,2 % sur les gains.
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
