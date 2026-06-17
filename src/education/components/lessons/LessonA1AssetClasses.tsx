import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Dans un portefeuille équilibré, quel est le rôle principal des obligations souveraines ?",
    options: [
      'Générer le maximum de rendement',
      'Servir de stabilisateur et contrepoids aux actions',
      "Couvrir contre l'inflation",
      'Maximiser les revenus passifs',
    ],
    correct: 1,
    explanation:
      "Les obligations souveraines sont peu volatiles et évoluent souvent en sens inverse des actions lors des crises. Leur rôle est d'amortir les chocs et de stabiliser le portefeuille — pas de maximiser le rendement.",
  },
  {
    text: "Tu veux protéger ton portefeuille contre une forte inflation. Quelle classe d'actifs est historiquement la plus adaptée ?",
    options: [
      'Obligations souveraines',
      'Monétaire',
      'Matières premières',
      'Obligations HY',
    ],
    correct: 2,
    explanation:
      "Les matières premières (pétrole, métaux, agriculture) voient leurs prix augmenter avec l'inflation et constituent une couverture naturelle. Les obligations souveraines à taux fixe souffrent au contraire d'une forte inflation.",
  },
  {
    text: "Quelle fourchette de rendement annuel est historiquement réaliste pour les actions sur le long terme ?",
    options: ['1–3 %', '7–10 %', '15–20 %', '4–5 %'],
    correct: 1,
    explanation:
      "Sur le long terme (30+ ans), les actions mondiales ont historiquement délivré 7 à 10 % par an en nominal, dividendes réinvestis. Ce sont des estimations basées sur le passé — pas des garanties pour l'avenir.",
  },
  {
    text: "Un investisseur veut garder une réserve disponible immédiatement pour saisir des opportunités. Quelle classe remplit ce rôle ?",
    options: ['Immobilier SCPI', 'Actions', 'Or', 'Monétaire / Liquidités'],
    correct: 3,
    explanation:
      "Le monétaire (fonds €, livrets, dépôts courts) est disponible immédiatement, sans risque de capital, avec un rendement proche de 2–4 %. C'est la réserve tactique du portefeuille — à mobiliser rapidement quand une opportunité se présente.",
  },
]

const ASSET_CLASSES = [
  { name: 'Actions',                 ret: '7–10 %', vol: 'Élevée',   role: 'Moteur de croissance principal',           color: '#5e6ad2' },
  { name: 'Obligations souveraines', ret: '2–4 %',  vol: 'Faible',   role: 'Stabilisateur, contrepoids aux actions',   color: '#4cb782' },
  { name: 'Obligations IG corp.',    ret: '3–6 %',  vol: 'Modérée',  role: 'Rendement amélioré vs souveraines',        color: '#6c8cd5' },
  { name: 'Obligations HY',          ret: '5–9 %',  vol: 'Élevée',   role: 'Haut rendement, corrélé aux actions',      color: '#e2b550' },
  { name: 'Immobilier SCPI/SIIC',   ret: '4–7 %',  vol: 'Modérée',  role: 'Diversification + revenus réguliers',      color: '#8b6bd2' },
  { name: 'Matières premières',      ret: '2–5 %',  vol: 'Élevée',   role: 'Couverture inflation',                     color: '#f5a623' },
  { name: 'Or',                      ret: '2–4 %',  vol: 'Modérée',  role: 'Valeur refuge, décorrélation',             color: '#e2b550' },
  { name: 'Monétaire / Liquidités',  ret: '2–4 %',  vol: 'Nulle',    role: 'Réserve tactique, zéro risque',            color: '#4cb782' },
]

const VOL_STYLE: Record<string, { bg: string; color: string }> = {
  Élevée:  { bg: 'rgba(235,87,87,0.12)',   color: 'var(--danger)' },
  Modérée: { bg: 'rgba(245,166,35,0.12)',  color: '#f5a623' },
  Faible:  { bg: 'rgba(76,183,130,0.12)',  color: 'var(--success)' },
  Nulle:   { bg: 'var(--surface-3)',       color: 'var(--ink-muted)' },
}

export default function LessonA1AssetClasses({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Les grandes classes d'actifs</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Imagine que ton portefeuille est une <strong>équipe sportive</strong>. Tu as besoin de joueurs
            avec des rôles différents : un attaquant (les actions) ne fait pas le même travail qu'un
            défenseur (les obligations), et un remplaçant sur le banc (le monétaire) peut entrer en jeu
            au moment opportun.
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            <strong style={{ color: 'var(--ink)' }}>Avoir 11 attaquants</strong> maximise le risque de
            prendre un but — <strong style={{ color: 'var(--ink)' }}>avoir 11 défenseurs</strong> garantit
            de ne pas marquer. Ni "tout en actions" ni "tout en livret" n'est une stratégie optimale.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>8 classes d'actifs et leurs rôles</div>
          <p className="caption" style={{ marginBottom: 14, fontStyle: 'italic' }}>
            Les rendements sont des estimations historiques — pas des garanties.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline-strong)' }}>
                  {['Classe d\'actifs', 'Rendement', 'Volatilité', 'Rôle dans le portefeuille'].map(h => (
                    <th key={h} style={{
                      padding: '7px 10px', textAlign: 'left',
                      color: 'var(--ink-subtle)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASSET_CLASSES.map((ac, i) => {
                  const vs = VOL_STYLE[ac.vol]
                  return (
                    <tr key={ac.name} style={{ borderBottom: i < ASSET_CLASSES.length - 1 ? '1px solid var(--hairline-soft)' : 'none' }}>
                      <td style={{ padding: '9px 10px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: ac.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{ac.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--primary)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {ac.ret}
                      </td>
                      <td style={{ padding: '9px 10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: 11, padding: '1px 7px', borderRadius: 4,
                          background: vs.bg, color: vs.color,
                        }}>
                          {ac.vol}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--ink-subtle)', verticalAlign: 'top', fontSize: 12 }}>
                        {ac.role}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Classes d'actifs</h2>
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
          Chaque classe d'actifs a un rôle précis dans un portefeuille. Les combiner
          intelligemment pour réduire le risque sans sacrifier le rendement — c'est l'essence
          de l'allocation d'actifs.
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
