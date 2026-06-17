import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'Quelle allocation maximum en cryptoactifs est généralement considérée comme raisonnable pour un investisseur au profil dynamique ?',
    options: [
      '20-30 % du portefeuille',
      '10-15 % du portefeuille',
      '2-5 % du portefeuille',
      '0 % — les cryptoactifs ne sont pas un investissement sérieux',
    ],
    correct: 2,
    explanation:
      "Vu la volatilité extrême des cryptoactifs (Bitcoin a déjà perdu 80 % de sa valeur à plusieurs reprises), une allocation de 2-5 % du portefeuille global permet de profiter d'un potentiel de hausse sans mettre en péril l'ensemble du patrimoine en cas de chute brutale.",
  },
  {
    text: 'Quelle propriété fondamentale de Bitcoin lui confère une caractéristique de rareté comparable à l\'or ?',
    options: [
      'Son prix augmente chaque année sans exception',
      'Son offre totale est fixée définitivement à 21 millions d\'unités, aucune nouvelle unité ne pourra jamais être créée',
      'Il est émis par des banques centrales indépendantes',
      'Sa technologie est impossible à copier',
    ],
    correct: 1,
    explanation:
      "Le protocole Bitcoin plafonne définitivement l'offre à 21 millions d'unités — une rareté programmatique et vérifiable, contrairement aux monnaies fiduciaires dont l'offre peut être augmentée par les banques centrales.",
  },
  {
    text: 'En France, à partir de quel seuil de cession les plus-values sur cryptoactifs sont-elles imposées ?',
    options: [
      'Au-delà de 305 € de plus-values annuelles',
      'Au-delà de 1 000 € de cessions annuelles',
      'Dès le premier euro de cession, sans seuil minimum',
      'Uniquement si les cryptos sont conservées moins d\'un an',
    ],
    correct: 2,
    explanation:
      "Contrairement à d'autres types de plus-values qui bénéficient parfois d'un seuil d'exonération, les plus-values sur cessions de cryptoactifs sont imposées au PFU de 30 % dès le premier euro — sans abattement ni seuil minimum.",
  },
  {
    text: 'Qu\'est-ce qu\'un hardware wallet et pourquoi est-il recommandé pour les montants significatifs ?',
    options: [
      'Un compte bancaire spécialisé crypto offrant plus de sécurité',
      'Un dispositif physique qui stocke tes clés privées hors ligne — si la plateforme d\'échange fait faillite, tes fonds restent accessibles car tu contrôles tes clés',
      'Une application mobile avec authentification renforcée',
      'Un coffre-fort numérique proposé par les exchanges régulés',
    ],
    correct: 1,
    explanation:
      "\"Not your keys, not your coins\" : si tu laisses tes cryptos sur une plateforme et qu'elle fait faillite ou se fait pirater, tu n'as aucun recours. Un hardware wallet (Ledger, Trezor) stocke tes clés privées hors ligne, sous ton contrôle exclusif.",
  },
]

export default function LessonS4Crypto({
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
          Les cryptoactifs : positionnement rationnel
        </h2>

        {/* Intro équilibrée */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Ni enthousiasme aveugle ni rejet dogmatique. Les cryptoactifs existent, ils ont une
            capitalisation de plusieurs milliers de milliards de dollars, et certains investisseurs
            les intègrent dans leur portefeuille. Mais leur volatilité est sans équivalent — Bitcoin
            a perdu <strong>80 % de sa valeur</strong> à plusieurs reprises avant de repartir à la
            hausse.
          </p>
          <p style={{ margin: '12px 0 0', lineHeight: 1.75, fontSize: 14 }}>
            La question n'est pas <em>"la crypto oui ou non"</em> — c'est{' '}
            <strong>"quelle place lui accorder dans un portefeuille construit rationnellement."</strong>
          </p>
        </div>

        {/* Bitcoin / Ethereum / Altcoins */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Bitcoin, Ethereum, altcoins</div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { icon: '₿', label: 'Bitcoin (BTC)', desc: 'Valeur refuge numérique — offre fixée définitivement à 21 millions d\'unités (rareté programmatique), forte corrélation au cycle macro et aux actions en période de stress.' },
              { icon: 'Ξ', label: 'Ethereum (ETH)', desc: 'Plateforme de contrats intelligents — rendement supplémentaire possible via le staking (proof-of-stake).' },
              { icon: '⚠️', label: 'Altcoins', desc: 'Volatilité extrême, manque de liquidité, risque de perte totale sur des projets qui disparaissent.' },
            ].map(r => (
              <div key={r.label} style={{
                display: 'flex', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-3)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, fontWeight: 700 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fiscalité */}
        <div className="panel" style={{ padding: '14px 18px', borderLeft: '3px solid var(--danger)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 6 }}>
            Fiscalité française — point d'attention
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            <strong style={{ color: 'var(--ink)' }}>PFU 30 % dès le premier euro de cession</strong> —
            pas d'abattement, pas de seuil minimum, contrairement à d'autres plus-values. La
            déclaration des comptes détenus sur des plateformes étrangères est également{' '}
            <strong style={{ color: 'var(--ink)' }}>obligatoire</strong>, même sans mouvement.
          </p>
        </div>

        {/* Conservation */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Conservation — qui détient tes clés ?</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            Pour les montants significatifs, utiliser un <strong style={{ color: 'var(--ink)' }}>
            hardware wallet</strong> (Ledger, Trezor) qui stocke tes clés privées hors ligne.
          </p>
          <div style={{
            marginTop: 12, padding: '12px 16px', borderRadius: 8,
            background: 'rgba(94,106,210,0.08)', border: '1px solid rgba(94,106,210,0.2)',
          }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink)', fontStyle: 'italic' }}>
              "Not your keys, not your coins" — si la plateforme fait faillite et que tu n'as pas tes
              clés privées, tu perds tout.
            </p>
          </div>
        </div>

        {/* Allocation */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Règle absolue d'allocation</div>
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            N'investir que ce qu'on accepte de perdre intégralement.
          </p>
          <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              width: '96.5%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, color: 'var(--ink-subtle)',
            }}>
              Reste du portefeuille
            </div>
            <div style={{
              width: '3.5%', background: '#f5a623', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff',
            }}>
              ₿
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center' }}>
            Allocation raisonnable : <strong style={{ color: '#f5a623' }}>2-5 % maximum</strong> du
            portefeuille global pour un profil dynamique.
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>
            QCM — Les cryptoactifs
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
        <div style={{ fontSize: 44 }}>₿</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 4 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Bitcoin et Ethereum ont leur place dans un portefeuille rationnel — à dose mesurée (2-5 %),
          avec une conservation maîtrisée et une fiscalité bien anticipée.
        </p>
        <button
          onClick={onComplete}
          style={{
            display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 28px',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            background: 'var(--success)', color: '#fff', marginTop: 8,
          }}
        >
          Valider et terminer le Module 4
        </button>
        <span className="caption">Le Module 5 sera déverrouillé.</span>
      </div>
    </LessonShell>
  )
}
