import { Fragment, useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'Quelle est la principale contrainte des SCPI par rapport aux foncières cotées ?',
    options: [
      'Le rendement des SCPI est systématiquement inférieur',
      'Les SCPI ne sont accessibles qu\'aux investisseurs institutionnels',
      'La liquidité est faible — revendre ses parts peut prendre plusieurs semaines voire mois',
      'Les SCPI ne distribuent pas de revenus réguliers',
    ],
    correct: 2,
    explanation:
      "Les parts de SCPI s'échangent sur un marché de gré à gré, sans cotation continue. Trouver un acheteur et finaliser la cession peut prendre des semaines, voire des mois — à l'opposé d'une foncière cotée, négociable en quelques secondes.",
  },
  {
    text: 'Tu veux investir dans l\'immobilier mais tu pourrais avoir besoin de récupérer ton argent dans 2 ans. Que choisir ?',
    options: [
      'SCPI — meilleur rendement courant',
      'SIIC / ETF REIT — liquidité totale, vendable en quelques secondes',
      'Les deux sont équivalents sur un horizon court',
      'Ni l\'un ni l\'autre — l\'immobilier n\'est jamais adapté à un horizon court',
    ],
    correct: 1,
    explanation:
      "Sur un horizon court avec un besoin de liquidité incertain, la SIIC cotée (ou un ETF REIT) est nettement préférable : elle se revend instantanément en bourse, sans le délai de plusieurs semaines à mois propre aux SCPI.",
  },
  {
    text: "Quel est l'avantage de loger des SCPI dans une assurance-vie ?",
    options: [
      'Les SCPI sont plus performantes à l\'intérieur d\'une AV',
      'La liquidité des SCPI est améliorée via l\'AV',
      'Les revenus locatifs bénéficient de la fiscalité avantageuse de l\'AV plutôt que d\'être imposés comme des revenus fonciers',
      'Les frais d\'entrée des SCPI sont supprimés en AV',
    ],
    correct: 2,
    explanation:
      "En détention directe, les revenus de SCPI sont imposés comme des revenus fonciers (TMI + prélèvements sociaux). Logées dans une assurance-vie, ils suivent la fiscalité de l'AV — souvent plus douce, en contrepartie d'une légère décote sur la valeur de part.",
  },
  {
    text: 'Pourquoi les SIIC sont-elles légalement obligées de distribuer 85-95 % de leurs loyers ?',
    options: [
      'Pour compenser leur volatilité plus élevée que les SCPI',
      'C\'est la contrepartie de leur régime fiscal avantageux — elles sont exonérées d\'IS en échange de cette distribution',
      'Pour attirer les investisseurs particuliers',
      'C\'est une obligation européenne imposée à toutes les foncières cotées',
    ],
    correct: 1,
    explanation:
      "Le statut SIIC exonère la société d'impôt sur les sociétés sur ses revenus locatifs et plus-values — en échange, la loi l'oblige à redistribuer 85-95 % de ses loyers et 50 % de ses plus-values de cession à ses actionnaires.",
  },
]

const COMPARISON = [
  { critere: 'Liquidité', scpi: 'Faible — marché de gré à gré', siic: 'Totale — cotée en continu' },
  { critere: 'Volatilité', scpi: 'Faible — valeur de part lissée', siic: 'Proche des actions' },
  { critere: 'Ticket d\'entrée', scpi: 'Quelques centaines à milliers d\'€', siic: 'Le prix d\'une action ou d\'une part d\'ETF' },
  { critere: 'Frais', scpi: '8-12 % à l\'entrée', siic: 'Frais de courtage standards' },
  { critere: 'Horizon recommandé', scpi: '8-10 ans minimum', siic: 'Flexible, y compris court terme' },
]

export default function LessonS3SCPI({
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
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>
          L'immobilier papier : SCPI et foncières cotées
        </h2>

        {/* Problème immobilier direct */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Investir dans l'immobilier classique demande un capital important, une gestion active
            (locataires, travaux, assemblées de copropriété) et concentre tout le risque sur un seul
            bien dans une seule ville.
          </p>
          <p style={{ margin: '12px 0 0', lineHeight: 1.75, fontSize: 14 }}>
            L'<strong>immobilier papier</strong> résout ces problèmes : tu achètes des parts dans
            des sociétés qui gèrent des parcs immobiliers entiers — bureaux, commerces, logistique,
            santé — pour quelques centaines d'euros.
          </p>
        </div>

        {/* SCPI */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>SCPI — Société Civile de Placement Immobilier</div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { icon: '🎫', label: 'Ticket d\'entrée', desc: 'Quelques centaines à quelques milliers d\'euros.' },
              { icon: '💶', label: 'Rendement courant', desc: '4-6 % — revenus locatifs distribués régulièrement.' },
              { icon: '🐢', label: 'Liquidité faible', desc: 'Marché de gré à gré — revendre peut prendre des semaines ou des mois.' },
              { icon: '🧾', label: 'Frais d\'entrée élevés', desc: '8-12 % — à amortir sur 8-10 ans minimum.' },
              { icon: '🛡️', label: 'SCPI via assurance-vie', desc: 'Avantage fiscal sur les revenus locatifs, souvent avec une légère décote sur la valeur de part.' },
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

        {/* SIIC */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>SIIC / REIT — foncières cotées</div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { icon: '⚡', label: 'Cotées en bourse', desc: 'Liquidité totale — achat/vente en quelques secondes.' },
              { icon: '📉', label: 'Volatilité', desc: 'Proche des actions, contrairement aux SCPI.' },
              { icon: '⚖️', label: 'Obligation légale', desc: 'Distribuer 85-95 % des loyers aux actionnaires.' },
              { icon: '🌍', label: 'Accès facile', desc: 'Diversification mondiale via ETF REIT.' },
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

        {/* Comparatif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Comparatif direct</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, fontSize: 12 }}>
            <div style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--ink-subtle)' }} />
            <div style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--primary)', textAlign: 'center' }}>SCPI</div>
            <div style={{ padding: '8px 10px', fontWeight: 700, color: '#9b59b6', textAlign: 'center' }}>SIIC / REIT</div>
            {COMPARISON.map(row => (
              <Fragment key={row.critere}>
                <div style={{
                  padding: '10px 10px', fontWeight: 600, background: 'var(--surface-3)', borderRadius: '6px 0 0 6px',
                }}>
                  {row.critere}
                </div>
                <div style={{
                  padding: '10px 10px', background: 'var(--surface-3)', color: 'var(--ink-subtle)', textAlign: 'center',
                }}>
                  {row.scpi}
                </div>
                <div style={{
                  padding: '10px 10px', background: 'var(--surface-3)', color: 'var(--ink-subtle)', textAlign: 'center', borderRadius: '0 6px 6px 0',
                }}>
                  {row.siic}
                </div>
              </Fragment>
            ))}
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
            QCM — SCPI et foncières cotées
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
        <div style={{ fontSize: 44 }}>🏢</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 3 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          SCPI pour la stabilité et le rendement courant sur un horizon long, SIIC / ETF REIT pour
          la liquidité — le choix dépend avant tout de ton besoin de flexibilité.
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
