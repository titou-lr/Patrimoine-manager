import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Quel est l'avantage fiscal immédiat et unique du PER par rapport aux autres enveloppes ?",
    options: [
      "Les gains sont totalement exonérés d'impôts à la sortie",
      "Les versements sont déductibles du revenu imposable l'année du versement",
      "Il n'y a pas de prélèvements sociaux sur les plus-values",
      "Les retraits sont exonérés d'impôts après 8 ans",
    ],
    correct: 1,
    explanation:
      "Le PER est la seule enveloppe qui agit à l'entrée : chaque euro versé réduit ton revenu imposable cette année. PEA et AV avantagent à la sortie — le PER avantage dès le versement.",
  },
  {
    text: "Tu es à 30 % de TMI et verses 4 000 € sur ton PER cette année. Quelle économie d'impôt réalises-tu immédiatement ?",
    options: ["400 €", "800 €", "1 200 €", "1 600 €"],
    correct: 2,
    explanation:
      "Économie = versement × TMI = 4 000 € × 30 % = 1 200 €. Ce n'est pas un cadeau définitif — c'est un report : tu paieras l'IR sur ces versements à la sortie. Mais si ta TMI baisse à la retraite, tu ressors gagnant.",
  },
  {
    text: "Dans quel cas le PER est-il particulièrement avantageux ?",
    options: [
      "Quand on prévoit une TMI plus élevée à la retraite qu'aujourd'hui",
      "Quand on a besoin de liquidités à court terme",
      "Quand on est à TMI ≥ 30 % aujourd'hui et anticipe une TMI plus faible à la retraite",
      "Quand on veut investir en actions américaines",
    ],
    correct: 2,
    explanation:
      "Le PER est un pari raisonné sur sa future situation fiscale. Si tu économises 30 % à l'entrée et ne paies que 11 % à la sortie, tu gagnes 19 points de fiscalité. Si ta TMI reste identique, l'avantage est quasi nul.",
  },
  {
    text: "Parmi ces situations, laquelle permet un déblocage anticipé du PER ?",
    options: [
      "Un voyage à l'étranger de plus de 6 mois",
      "L'achat de sa résidence principale",
      "Une perte de valeur du portefeuille supérieure à 30 %",
      "Un changement d'employeur",
    ],
    correct: 1,
    explanation:
      "L'achat de la résidence principale est l'un des 5 cas de déblocage anticipé du PER. Les autres : invalidité, décès du conjoint, surendettement, et fin de droits au chômage. Un simple changement d'employeur ne suffit pas.",
  },
]

const TMI_OPTIONS = [0, 11, 30, 41, 45]

const fmt = (v: number) =>
  v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'

function tmiColor(tmi: number) {
  if (tmi >= 30) return 'var(--success)'
  if (tmi === 11) return '#f5a623'
  return 'var(--danger)'
}

function tmiLabel(tmi: number) {
  if (tmi >= 30) return { text: 'PER fortement recommandé', color: 'var(--success)', bg: 'rgba(76,183,130,0.12)' }
  if (tmi === 11) return { text: 'PER peu avantageux', color: '#f5a623', bg: 'rgba(245,166,35,0.12)' }
  return { text: 'PER non pertinent (TMI 0 %)', color: 'var(--danger)', bg: 'rgba(235,87,87,0.10)' }
}

export default function LessonE3PER({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [revenu, setRevenu] = useState(50000)
  const [tmi, setTmi] = useState(30)
  const [versement, setVersement] = useState(3000)

  const plafond = Math.round(revenu * 0.10)
  const versementEffectif = Math.min(versement, plafond)
  const economieImmédiate = versementEffectif * (tmi / 100)
  const economie10ans = economieImmédiate * 10
  const indicator = tmiLabel(tmi)
  const overPlafond = versement > plafond

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>
          Le Plan d'Épargne Retraite (PER)
        </h2>

        {/* Hook : avantage unique */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Le PER est la <strong>seule enveloppe qui réduit tes impôts dès aujourd'hui</strong>.
            Contrairement au PEA ou à l'AV qui t'avantagent à la sortie, le PER t'avantage à
            l'entrée : chaque euro versé est déductible de ton revenu imposable.
          </p>
          <div style={{
            marginTop: 14, padding: '14px 16px', borderRadius: 8,
            background: 'rgba(94,106,210,0.08)', border: '1px solid rgba(94,106,210,0.2)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--ink-subtle)', marginBottom: 6 }}>Exemple concret</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' }}>
              Tu gagnes <strong>50 000 €/an</strong>, tu es à <strong>30 % de TMI</strong>.
              Tu verses <strong>3 000 €</strong> sur ton PER. Ton revenu imposable passe à 47 000 €
              — tu économises <strong style={{ color: 'var(--primary)' }}>900 € d'impôts</strong> cette année même.
            </p>
          </div>
        </div>

        {/* Comprendre la TMI avant de calculer */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Comprendre la TMI avant de calculer</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            Tout l'intérêt du PER se calcule à partir d'un seul chiffre : ta{' '}
            <strong style={{ color: 'var(--ink)' }}>Tranche Marginale d'Imposition (TMI)</strong>.
            Mais c'est une notion souvent mal comprise — clarifions-la avant de l'utiliser.
          </p>
          <div style={{
            marginTop: 12, padding: '14px 16px', borderRadius: 8,
            background: 'rgba(94,106,210,0.08)', border: '1px solid rgba(94,106,210,0.2)',
          }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' }}>
              <strong style={{ color: 'var(--primary)' }}>L'analogie à retenir :</strong> ta TMI{' '}
              <strong>n'est pas ton taux d'imposition global</strong> — c'est le taux appliqué{' '}
              <strong>uniquement sur la dernière tranche de tes revenus</strong>. Le barème français
              est progressif : chaque euro de revenu est rangé dans une tranche, et seule la partie
              qui dépasse un seuil donné est taxée au taux de la tranche supérieure. Le reste de tes
              revenus continue d'être imposé aux taux des tranches inférieures.
            </p>
          </div>

          <div className="col" style={{ gap: 6, marginTop: 14 }}>
            {[
              { range: "Jusqu'à 11 294 €", taux: 0 },
              { range: 'De 11 294 € à 28 797 €', taux: 11 },
              { range: 'De 28 797 € à 82 341 €', taux: 30 },
              { range: 'De 82 341 € à 177 106 €', taux: 41 },
              { range: 'Au-delà de 177 106 €', taux: 45 },
            ].map(b => (
              <div key={b.taux} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 6, background: 'var(--surface-3)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{b.range}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                  color: tmiColor(b.taux),
                }}>
                  {b.taux} %
                </span>
              </div>
            ))}
          </div>

          <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Exemple : avec 35 000 € de revenu imposable, tu n'es pas "imposé à 30 %" sur tout —
            seule la part entre 28 797 € et 35 000 € (soit 6 203 €) subit le taux de 30 %. Le reste
            est taxé à 11 % ou 0 %. Ta TMI (ici 30 %) désigne ce taux le plus élevé atteint — c'est
            lui qui s'applique à <strong style={{ color: 'var(--ink)' }}>chaque euro supplémentaire</strong>{' '}
            que tu gagnes, et donc à chaque euro que tu retires de ton revenu imposable via un
            versement PER.
          </p>

          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(76,183,130,0.08)', border: '1px solid rgba(76,183,130,0.2)',
          }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
              <strong style={{ color: 'var(--success)' }}>Pourquoi c'est LE chiffre clé du PER :</strong>{' '}
              ta TMI fixe à la fois l'économie d'impôt immédiate à l'entrée (versement × TMI) et le
              taux qui s'appliquera à la sortie. Plus ta TMI actuelle est élevée, plus l'avantage est
              fort — à condition qu'elle soit plus basse au moment où tu retireras l'argent.
            </p>
          </div>
        </div>

        {/* Contrepartie honnête */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>La contrepartie — ce n'est pas un cadeau</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            L'avantage fiscal du PER est un <strong style={{ color: 'var(--ink)' }}>report</strong>, pas une exonération.
            À la retraite, quand tu retires ton argent :
          </p>
          <div className="col" style={{ gap: 8, marginTop: 12 }}>
            {[
              { icon: '💼', label: 'Versements', tax: 'Imposés à l\'IR selon ta TMI à la retraite' },
              { icon: '📈', label: 'Plus-values', tax: 'PS 17,2 % + IR (sortie en capital)' },
              { icon: '🏖️', label: 'Sortie en rente', tax: 'Imposée comme une pension (abattement 10 %)' },
            ].map(r => (
              <div key={r.label} style={{
                display: 'flex', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-3)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.tax}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(94,106,210,0.06)', border: '1px solid rgba(94,106,210,0.15)',
          }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
              <strong style={{ color: 'var(--primary)' }}>Point d'attention :</strong> si ta TMI reste identique
              ou augmente à la retraite, l'avantage est réduit voire nul. Le PER est un{' '}
              <strong style={{ color: 'var(--ink)' }}>pari raisonné</strong> sur ta future situation fiscale —
              souvent favorable car les revenus baissent à la retraite.
            </p>
          </div>
        </div>

        {/* Cas de déblocage */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>5 cas de déblocage anticipé</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              'Résidence principale 🏠',
              'Invalidité 🦽',
              'Décès du conjoint 🕊️',
              'Surendettement 💸',
              'Fin droits chômage 📋',
            ].map(c => (
              <span key={c} style={{
                fontSize: 12, padding: '5px 10px', borderRadius: 6,
                background: 'var(--surface-3)', color: 'var(--ink-subtle)',
              }}>
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Calculateur */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Calculateur d'économie fiscale PER</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-subtle)', display: 'block', marginBottom: 5 }}>
                Revenu annuel net (€)
              </label>
              <input
                type="number"
                value={revenu}
                min={0}
                step={5000}
                onChange={e => setRevenu(Math.max(0, Number(e.target.value)))}
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
                Versement PER envisagé (€)
              </label>
              <input
                type="number"
                value={versement}
                min={0}
                step={500}
                onChange={e => setVersement(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6,
                  border: `1px solid ${overPlafond ? 'var(--danger)' : 'var(--hairline)'}`,
                  background: 'var(--surface-2)',
                  color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
              {overPlafond && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
                  Plafond déductible : {fmt(plafond)} (10 % du revenu)
                </div>
              )}
            </div>
          </div>

          {/* TMI slider */}
          <div style={{ marginBottom: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>Tranche marginale d'imposition</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: tmiColor(tmi) }}>
                {tmi} %
              </span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {TMI_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTmi(t)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    border: '1px solid',
                    background: tmi === t ? tmiColor(t) : 'var(--surface-3)',
                    color: tmi === t ? '#fff' : 'var(--ink-subtle)',
                    borderColor: tmi === t ? tmiColor(t) : 'var(--hairline)',
                    fontWeight: tmi === t ? 700 : 400,
                  }}
                >
                  {t} %
                </button>
              ))}
            </div>
          </div>

          {/* Indicateur pertinence */}
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14,
            background: indicator.bg,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: indicator.color }}>
              {indicator.text}
            </div>
          </div>

          {/* Résultats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Versement déductible', val: fmt(versementEffectif), color: 'var(--ink)' },
              { label: 'Économie immédiate', val: fmt(economieImmédiate), color: 'var(--success)' },
              { label: 'Économie sur 10 ans', val: fmt(economie10ans), color: 'var(--primary)' },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 6 }}>{r.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.color }}>
                  {r.val}
                </div>
              </div>
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
            QCM — Le PER
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
        <div style={{ fontSize: 44 }}>🏖️</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 3 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Le PER est l'enveloppe qui agit aujourd'hui. Avantage à l'entrée, contrainte à la sortie —
          rentable si ta TMI baisse à la retraite, neutre sinon. Un outil puissant pour les hauts revenus.
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
