import { useState, useMemo } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Deux actifs ont une corrélation de −1. Qu'est-ce que cela signifie ?",
    options: [
      'Ils évoluent toujours dans le même sens',
      "Ils n'ont aucun lien entre eux",
      "Quand l'un monte, l'autre baisse systématiquement",
      'Leurs rendements sont identiques',
    ],
    correct: 2,
    explanation:
      "Une corrélation de −1 (parfaitement négative) signifie que les deux actifs évoluent en sens exactement opposés. C'est le Graal de la diversification : en combinant deux actifs ρ = −1 avec les bons poids, on peut théoriquement annuler toute volatilité.",
  },
  {
    text: "Pourquoi la diversification perd-elle de son efficacité pendant les crises ?",
    options: [
      "Les marchés sont fermés pendant les crises",
      "Les corrélations entre actifs augmentent, les actifs chutent ensemble",
      "Les investisseurs vendent uniquement les obligations",
      "Les rendements espérés diminuent pour tous les actifs",
    ],
    correct: 1,
    explanation:
      "En période de panique (2008, mars 2020), les corrélations convergent vers 1 : les investisseurs vendent tout pour obtenir des liquidités. La diversification reste utile mais devient moins efficace précisément quand on en a le plus besoin.",
  },
  {
    text: "Tu possèdes 50 actions individuelles de secteurs variés. Ajouter une 51ème action va-t-il significativement réduire le risque de ton portefeuille ?",
    options: [
      "Oui, chaque ligne supplémentaire réduit toujours le risque",
      "Non, au-delà de 20–30 lignes diversifiées l'effet marginal est négligeable",
      "Non, la diversification ne fonctionne qu'avec des ETF",
      "Oui, mais uniquement si la nouvelle action est dans un secteur différent",
    ],
    correct: 1,
    explanation:
      "Au-delà de 20–30 titres bien diversifiés, le risque résiduel est presque entièrement du risque systématique (risque de marché) qu'on ne peut pas éliminer par la diversification. Une 51ème ligne apporte un bénéfice marginal quasi nul.",
  },
  {
    text: "Un ETF MSCI World unique est-il un portefeuille diversifié ?",
    options: [
      "Non, c'est un seul produit donc pas diversifié",
      "Oui, il expose à 1 500+ entreprises dans 40+ pays, mais uniquement sur la classe actions",
      "Oui, il est diversifié sur toutes les classes d'actifs",
      "Non, car il ne contient pas d'obligations",
    ],
    correct: 1,
    explanation:
      "Un ETF MSCI World offre une diversification géographique et sectorielle remarquable au sein de la classe actions. Mais 100 % en actions reste un portefeuille concentré sur une seule classe — il manque les obligations, l'immobilier, le monétaire.",
  },
]

const SIGMA1 = 15 // actions %
const SIGMA2 = 5  // obligations %

export default function LessonA2Diversification({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [rho, setRho] = useState(0.1)
  const [w1, setW1] = useState(60)

  const w2 = 100 - w1

  const portfolioVol = useMemo(() => {
    const v =
      (w1 / 100) ** 2 * SIGMA1 ** 2 +
      (w2 / 100) ** 2 * SIGMA2 ** 2 +
      2 * (w1 / 100) * (w2 / 100) * SIGMA1 * SIGMA2 * rho
    return Math.sqrt(Math.max(0, v))
  }, [w1, w2, rho])

  const weightedVol = useMemo(() => (w1 / 100) * SIGMA1 + (w2 / 100) * SIGMA2, [w1, w2])

  const gain = weightedVol - portfolioVol
  const gainPct = weightedVol > 0 ? (gain / weightedVol) * 100 : 0

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>La diversification en pratique</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Imagine deux boutiques : <strong>un glacier</strong> et <strong>un vendeur de parapluies</strong>.
            Par beau temps, le glacier fait de bonnes affaires — le marchand de parapluies souffre.
            Par temps de pluie, c'est l'inverse. Séparément, chacun subit les caprices de la météo.
            Ensemble, ils se compensent : l'ensemble est plus stable que chaque boutique isolément.
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6 }}>
            En finance, cette relation s'appelle la <strong>corrélation</strong> (notée ρ) :
          </p>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'ρ = +1', desc: "Ils bougent toujours dans le même sens — aucun bénéfice à les combiner", accent: 'var(--danger)' },
              { label: 'ρ = 0',  desc: "Aucun lien entre les deux — diversification partielle",                   accent: 'var(--ink-muted)' },
              { label: 'ρ = −1', desc: "Quand l'un monte, l'autre baisse — diversification maximale",             accent: 'var(--success)' },
            ].map(({ label, desc, accent }) => (
              <div key={label} style={{ display: 'flex', gap: 12, padding: '9px 12px', background: 'var(--surface-3)', borderRadius: 6 }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: accent, flexShrink: 0, minWidth: 44 }}>
                  {label}
                </code>
                <span style={{ fontSize: 13, color: 'var(--ink-subtle)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>La formule de variance de portefeuille</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.9,
            background: 'var(--surface-3)', padding: '12px 16px', borderRadius: 8,
          }}>
            <div>σ²p = w₁²σ₁² + w₂²σ₂² + 2 · w₁ · w₂ · σ₁ · σ₂ · ρ₁₂</div>
            <div style={{ fontSize: 10, color: 'var(--ink-subtle)', marginTop: 4 }}>
              w₁, w₂ = poids des actifs · σ₁, σ₂ = volatilités individuelles · ρ₁₂ = corrélation
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            <strong style={{ color: 'var(--ink)' }}>Limite importante :</strong> les corrélations
            augmentent en période de crise — précisément quand on a le plus besoin de diversification,
            elle devient moins efficace. Ce phénomène est parfois appelé "corrélation tail risk".
          </p>
        </div>

        {/* Interactive simulator */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Simulateur de corrélation</div>
          <p className="caption" style={{ marginBottom: 18 }}>
            Actif 1 : Actions (σ = {SIGMA1} %) · Actif 2 : Obligations (σ = {SIGMA2} %) — fais varier les curseurs.
          </p>

          <div className="col" style={{ gap: 18 }}>
            {/* Weight slider */}
            <div className="col" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="caption">Poids actions (w₁)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary)' }}>
                  {w1} % actions / {w2} % obligations
                </span>
              </div>
              <input
                type="range" min={0} max={100} step={5} value={w1}
                onChange={e => setW1(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="caption" style={{ fontSize: 11 }}>0 % actions</span>
                <span className="caption" style={{ fontSize: 11 }}>100 % actions</span>
              </div>
            </div>

            {/* Correlation slider */}
            <div className="col" style={{ gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="caption">Corrélation (ρ)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary)' }}>
                  {rho.toFixed(2)}
                </span>
              </div>
              <input
                type="range" min={-1} max={1} step={0.05} value={rho}
                onChange={e => setRho(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="caption" style={{ fontSize: 11, color: 'var(--success)' }}>ρ = −1 (diversification max)</span>
                <span className="caption" style={{ fontSize: 11, color: 'var(--danger)' }}>ρ = +1 (aucun effet)</span>
              </div>
            </div>

            {/* Result */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '14px 16px', background: 'var(--surface-3)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 4 }}>Sans diversification</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--ink-muted)' }}>
                  {weightedVol.toFixed(1)} %
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-subtle)', marginTop: 2 }}>volatilité pondérée</div>
              </div>

              <div style={{
                padding: '14px 16px', borderRadius: 8, textAlign: 'center',
                background: gain > 0.05 ? 'rgba(76,183,130,0.1)' : 'var(--surface-3)',
                border: gain > 0.05 ? '1px solid rgba(76,183,130,0.3)' : '1px solid transparent',
                transition: 'background 0.3s, border 0.3s',
              }}>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 4 }}>Volatilité portefeuille</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
                  color: gain > 0.05 ? 'var(--success)' : 'var(--ink)',
                  transition: 'color 0.2s',
                }}>
                  {portfolioVol.toFixed(1)} %
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-subtle)', marginTop: 2 }}>
                  {gain > 0.05
                    ? `−${gain.toFixed(1)} % (−${gainPct.toFixed(0)} %)`
                    : 'aucun bénéfice'}
                </div>
              </div>
            </div>

            {portfolioVol <= 0.2 && (
              <div style={{
                padding: '10px 14px', background: 'rgba(76,183,130,0.1)',
                borderRadius: 8, fontSize: 13, color: 'var(--success)',
                border: '1px solid rgba(76,183,130,0.3)',
              }}>
                ✓ À ρ = −1, les deux actifs se compensent parfaitement — risque quasi nul !
              </div>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 18px' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
            <strong>Règle pratique :</strong> au-delà de 20–30 lignes bien diversifiées, l'effet marginal est
            négligeable. Un ETF MSCI World seul couvre déjà 1 500+ entreprises dans 40+ pays — une
            diversification intra-actions remarquable, sans nécessiter des dizaines de lignes.
          </p>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — La diversification</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>🎲</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 2 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          La diversification réduit le risque sans sacrifier le rendement — à condition de combiner
          des actifs faiblement corrélés. Son efficacité diminue en crise, mais elle reste l'outil
          le plus puissant de la construction de portefeuille.
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
