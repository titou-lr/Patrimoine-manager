import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Un portefeuille perd 33 %. Quel gain approximatif est nécessaire pour revenir à son niveau initial ?",
    options: ["33 %", "40 %", "50 %", "66 %"],
    correct: 2,
    explanation: "Après −33 % tu as 67 % du capital de départ. Pour revenir à 100 : 100/67 − 1 ≈ +49 %, soit environ +50 %.",
  },
  {
    text: "Pourquoi une perte de 50 % nécessite-t-elle un gain de 100 %, et non de 50 %, pour être totalement récupérée ?",
    options: [
      "Parce que les marchés montent plus lentement qu'ils ne baissent",
      "Parce que la base de calcul après la perte est plus petite — il faut doubler un capital réduit de moitié pour revenir au point de départ",
      "Parce que les frais de transaction s'accumulent",
      "Ce n'est vrai qu'en présence de fiscalité sur les plus-values",
    ],
    correct: 1,
    explanation: "100 000 € − 50 % = 50 000 €. Revenir à 100 000 € depuis 50 000 € exige de doubler : c'est +100 %. Le pourcentage se calcule sur la nouvelle base, plus petite.",
  },
  {
    text: "Que mesure précisément le drawdown maximum d'un portefeuille ?",
    options: [
      "Le rendement annuel moyen sur la période",
      "La pire baisse observée entre un sommet et le creux suivant",
      "Le nombre de mois consécutifs en perte",
      "La volatilité annualisée du portefeuille",
    ],
    correct: 1,
    explanation: "Drawdown max = (Sommet − Creux) / Sommet. C'est la mesure de la pire perte qu'un investisseur aurait pu subir s'il avait acheté au sommet et vendu au creux.",
  },
]

const ASYMMETRY = [
  { loss: 10, gain: 11 },
  { loss: 20, gain: 25 },
  { loss: 33, gain: 50 },
  { loss: 50, gain: 100 },
  { loss: 75, gain: 300 },
]

export default function LessonP2Drawdown({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [lossPct, setLossPct] = useState(30)

  const requiredGain = Math.round((1 / (1 - lossPct / 100) - 1) * 100)

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Le drawdown et la gestion des baisses</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Ton portefeuille passe de <strong>100 000 €</strong> à <strong>70 000 €</strong>.
            Tu as perdu 30 000 €, soit <strong style={{ color: 'var(--danger)' }}>−30 %</strong>.
            Pour revenir au point de départ, il ne suffit pas de regagner 30 % — il faut{' '}
            <strong>+42,9 %</strong>. Cette asymétrie va changer ta façon de réagir aux baisses
            pour le reste de ta vie d'investisseur.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Qu'est-ce que le drawdown ?</div>
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.65 }}>
            Le <strong>drawdown</strong> mesure la baisse d'un actif depuis son plus haut historique
            jusqu'au creux suivant. Le <strong>drawdown maximum</strong> représente la pire baisse
            qu'un investisseur aurait pu subir sur une période donnée.
          </p>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 13,
            background: 'var(--surface-3)', padding: '10px 14px', borderRadius: 8,
          }}>
            Drawdown = (Sommet − Creux) / Sommet
          </div>
          <p className="caption" style={{ margin: '10px 0 0', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            Tu as croisé ce concept dans le Module 1, Leçon 3 (Risque et rendement attendu) — cette leçon en explore les conséquences mathématiques concrètes.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>L'asymétrie pertes / gains</div>
          <p className="caption" style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
            <strong>Pourquoi −50 % nécessite +100 % pour récupérer ?</strong> Parce que le gain
            se calcule sur une base plus petite après la perte. 100 000 € moins 50 % = 50 000 €.
            Pour revenir à 100 000 € depuis 50 000 €, il faut doubler : <strong>+100 %</strong>.
            Plus la perte est grande, plus le pourcentage nécessaire pour récupérer grandit de façon
            non-linéaire.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--ink-muted)', fontSize: 11, fontWeight: 600, borderBottom: '1px solid var(--hairline)' }}>Perte subie</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--ink-muted)', fontSize: 11, fontWeight: 600, borderBottom: '1px solid var(--hairline)' }}>Gain nécessaire pour récupérer</th>
                </tr>
              </thead>
              <tbody>
                {ASYMMETRY.map(row => (
                  <tr key={row.loss} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>−{row.loss} %</td>
                    <td style={{ padding: '7px 10px', color: 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>+{row.gain} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Calculateur interactif</div>
          <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <span className="caption">Perte :</span>
            <input type="range" min={5} max={80} step={5} value={lossPct}
              onChange={e => setLossPct(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--danger)', minWidth: 52 }}>
              −{lossPct} %
            </span>
          </div>

          <div className="col" style={{ gap: 12 }}>
            <div>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="caption">Perte subie</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)', fontWeight: 700 }}>−{lossPct} %</span>
              </div>
              <div style={{ height: 22, background: 'var(--surface-3)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${lossPct}%`, background: 'var(--danger)', borderRadius: 5, transition: 'width 0.2s var(--ease)' }} />
              </div>
            </div>
            <div>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="caption">Gain nécessaire pour récupérer</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>+{requiredGain} %</span>
              </div>
              <div style={{ height: 22, background: 'var(--surface-3)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(requiredGain, 100)}%`, background: 'var(--success)', borderRadius: 5, transition: 'width 0.2s var(--ease)' }} />
              </div>
              {requiredGain > 100 && (
                <div className="caption" style={{ marginTop: 4, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                  {requiredGain} % — bien au-delà de 100 % de la barre ci-dessus
                </div>
              )}
            </div>
          </div>

          <p className="caption" style={{ margin: '14px 0 0', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            L'écart se creuse de façon non-linéaire. Éviter les grosses pertes est souvent
            plus important pour la performance long terme que de maximiser les gains en phase haussière.
          </p>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => setScreen('quiz')} style={{
            display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
            borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: 'var(--primary)', color: '#fff',
          }}>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Drawdown</h2>
          <p className="caption">3 questions · 3/3 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📉</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 2 complétée !</div>
        <p className="caption" style={{ maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
          L'asymétrie pertes/gains est l'une des réalités mathématiques les plus importantes en
          investissement. Protéger son capital des grosses pertes est souvent plus efficace à long
          terme que maximiser les gains en phase haussière.
        </p>
        <button onClick={onComplete} style={{
          display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 24px',
          borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          background: 'var(--success)', color: '#fff', marginTop: 8,
        }}>
          Terminer la leçon
        </button>
      </div>
    </LessonShell>
  )
}
