import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Tu cibles 70 % actions / 30 % obligations. Après un bull market, tu es à 85 % / 15 %. Quel est le risque si tu ne rééquilibres pas ?",
    options: [
      'Ton rendement va automatiquement diminuer',
      "Tu es surexposé au risque actions sans l'avoir décidé",
      'Tes obligations vont perdre de la valeur',
      "Il n'y a aucun risque, la dérive est normale et souhaitable",
    ],
    correct: 1,
    explanation:
      "La dérive te fait assumer un risque supérieur à ce que tu as choisi. Si les actions chutent de 40 %, tu perds 34 % de ton portefeuille (85 % × 40 %) au lieu des 28 % prévus (70 % × 40 %) — une différence de 6 points non décidée.",
  },
  {
    text: "Quel effet mécanique le rééquilibrage produit-il sur un portefeuille ?",
    options: [
      "Il maximise le rendement en gardant les actifs gagnants",
      "Il force à vendre ce qui a monté et acheter ce qui a baissé — \"vendre haut, acheter bas\" de façon disciplinée",
      "Il réduit le rendement à long terme",
      "Il élimine complètement le risque du portefeuille",
    ],
    correct: 1,
    explanation:
      "En vendant les actifs surpondérés (qui ont sur-performé) et en achetant les sous-représentés (qui ont sous-performé), le rééquilibrage applique mécaniquement la discipline \"vendre haut, acheter bas\" — sans se laisser guider par les émotions du marché.",
  },
  {
    text: "Tu es en phase d'accumulation et tu verses 500 €/mois. Quelle méthode de rééquilibrage minimise les frais et la fiscalité ?",
    options: [
      "Rééquilibrage calendaire trimestriel par vente",
      "Rééquilibrage par seuil à ±5 %",
      "Orienter les nouveaux versements vers les actifs sous-représentés (cash-flow)",
      "Rééquilibrage hybride mensuel",
    ],
    correct: 2,
    explanation:
      "Le rééquilibrage par cash-flow (orienter les versements vers ce qui est sous-représenté) évite toute vente — donc zéro plus-value imposable, et frais de transaction minimaux. C'est la méthode idéale en phase d'accumulation.",
  },
  {
    text: "Pourquoi faut-il éviter de rééquilibrer par vente sur un CTO ?",
    options: [
      "Les transactions sont trop lentes sur un CTO",
      "La vente génère des plus-values imposables au PFU 30 %",
      "Le CTO ne permet pas de vendre des ETF",
      "Les frais de courtage sont trop élevés sur un CTO",
    ],
    correct: 1,
    explanation:
      "Sur un CTO, toute cession génère une plus-value soumise au Prélèvement Forfaitaire Unique de 30 %. Rééquilibrer en vendant revient à payer 30 % sur les gains. Sur PEA ou assurance-vie, les arbitrages internes ne déclenchent pas d'imposition immédiate.",
  },
]

const METHODS = [
  {
    name: 'Calendaire',
    freq: 'Trimestriel ou annuel',
    pro: 'Simple, peu de transactions, frais limités',
    con: 'Peut laisser des dérives entre les rebalancements',
    tag: 'Recommandé',
    tagColor: 'var(--success)',
    tagBg: 'rgba(76,183,130,0.15)',
    border: 'var(--success)',
  },
  {
    name: 'Par seuil',
    freq: 'Dès ±5 % de dérive',
    pro: 'Respect précis de l\'allocation cible',
    con: 'Peut générer beaucoup de transactions en marché volatil',
    tag: null, tagColor: '', tagBg: '', border: 'var(--hairline-strong)',
  },
  {
    name: 'Hybride',
    freq: 'Calendaire + déclenchement par seuil',
    pro: 'Meilleur compromis rigueur/simplicité',
    con: 'Un peu plus complexe à suivre',
    tag: null, tagColor: '', tagBg: '', border: 'var(--hairline-strong)',
  },
  {
    name: 'Cash-flow',
    freq: 'À chaque versement mensuel',
    pro: 'Zéro vente, zéro fiscalité, idéal en accumulation',
    con: 'Efficace uniquement si les versements sont significatifs',
    tag: 'Idéal accumulation',
    tagColor: 'var(--primary)',
    tagBg: 'rgba(94,106,210,0.12)',
    border: 'var(--primary)',
  },
]

export default function LessonA4Rebalancing({
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
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Rééquilibrage et dérive de portefeuille</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Tu cibles <strong>70 % actions / 30 % obligations</strong>. Après deux excellentes
            années boursières, les actions ont tellement progressé que ton portefeuille est
            maintenant à{' '}
            <strong style={{ color: 'var(--danger)' }}>85 % actions / 15 % obligations</strong>.
            Tu n'as rien décidé — mais tu es désormais bien plus exposé au risque que prévu.
            C'est la <strong>dérive naturelle</strong> d'un portefeuille.
          </p>
        </div>

        {/* Drift visualization */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Visualiser la dérive</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Cible initiale',     actions: 70, bonds: 30, accent: 'var(--primary)', note: 'Ton allocation choisie' },
              { label: 'Après bull market',  actions: 85, bonds: 15, accent: 'var(--danger)',  note: 'Dérive non corrigée' },
            ].map(({ label, actions, bonds, accent, note }) => (
              <div key={label} className="col" style={{ gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: accent }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 8 }}>{note}</div>
                <div style={{ display: 'flex', flexDirection: 'column', height: 120, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
                  <div style={{
                    height: `${actions}%`, background: '#5e6ad2', opacity: 0.85,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    transition: 'height 0.4s ease',
                  }}>
                    {actions} % actions
                  </div>
                  <div style={{
                    height: `${bonds}%`, background: '#4cb782', opacity: 0.85,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    transition: 'height 0.4s ease',
                  }}>
                    {bonds} % oblig.
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
            Le rééquilibrage corrige cette dérive en vendant des actions (surpondérées) et en
            achetant des obligations (sous-représentées). Mécaniquement, tu{' '}
            <strong>"vends haut, achètes bas"</strong> de façon automatique et disciplinée.
          </p>
        </div>

        {/* Methods */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>4 méthodes de rééquilibrage</div>
          <div className="col" style={{ gap: 8 }}>
            {METHODS.map(m => (
              <div key={m.name} style={{
                padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)',
                borderLeft: `3px solid ${m.border}`,
              }}>
                <div className="row" style={{ gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                    {m.freq}
                  </span>
                  {m.tag && (
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 4,
                      background: m.tagBg, color: m.tagColor, fontWeight: 600, marginLeft: 'auto',
                    }}>
                      {m.tag}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 2 }}>✓ {m.pro}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>✗ {m.con}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fiscal warning */}
        <div className="panel" style={{ padding: '14px 18px', borderLeft: '3px solid var(--danger)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 6 }}>
            Point fiscal critique — CTO
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            Sur un CTO, rééquilibrer en vendant génère des{' '}
            <strong>plus-values imposables au PFU 30 %</strong>. Préférer le rééquilibrage par
            cash-flow, ou arbitrer à l'intérieur d'un <strong>PEA ou d'une assurance-vie</strong>{' '}
            où les échanges internes ne déclenchent pas d'imposition immédiate.
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Le rééquilibrage</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>⚖️</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 4 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Le rééquilibrage est la discipline qui maintient ton profil de risque dans le temps.
          Calendaire pour la simplicité, cash-flow pour éviter la fiscalité, hybride pour la
          rigueur — choisis la méthode adaptée à ta situation.
        </p>
        <button
          onClick={onComplete}
          style={{
            display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 28px',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            background: 'var(--success)', color: '#fff', marginTop: 8,
          }}
        >
          Valider et terminer le Module 2
        </button>
        <span className="caption">Le Module 3 sera déverrouillé.</span>
      </div>
    </LessonShell>
  )
}
