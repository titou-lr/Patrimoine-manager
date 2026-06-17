import { useState } from 'react'
import { LessonShell } from './LessonShell'

const LEVERS = [
  {
    id: 'donations',
    icon: '🎁',
    title: 'Donations régulières tous les 15 ans',
    desc: "Utiliser l'abattement de 100 000 € par enfant à chaque cycle — sans attendre le décès.",
    detail: "Avec 2 enfants, chaque cycle de 15 ans permet de transmettre 200 000 € exonérés. Sur 30 ans : 400 000 € transmis sans droits. Simple à mettre en place, aucun montage juridique nécessaire.",
    forCase: true,
    selectedFeedback:
      "Excellent choix — avec 2 enfants, chaque cycle de 15 ans ouvre 200 000 € d'abattements (100 000 € × 2). Sur 30 ans, ce sont 400 000 € transmis sans droits de succession. C'est le levier le plus simple et le plus efficace à activer en premier.",
    missingFeedback:
      "Les donations régulières auraient été très pertinentes — l'abattement de 100 000 € par enfant se renouvelle tous les 15 ans. C'est le levier le plus accessible, sans montage juridique particulier.",
  },
  {
    id: 'av',
    icon: '🏛️',
    title: 'Assurance-vie (versements avant 70 ans)',
    desc: "152 500 € par bénéficiaire transmis hors droits de succession — vu en Module 3, Leçon 2.",
    detail: "Pour 2 enfants bénéficiaires : 305 000 € (152 500 € × 2) hors succession. L'AV cumule avantage fiscal pendant la vie ET avantage successoral à la transmission.",
    forCase: true,
    selectedFeedback:
      "Parfait — pour 2 enfants bénéficiaires désignés, c'est 305 000 € (152 500 € × 2) transmis hors droits de succession sur les versements effectués avant 70 ans. Tu avais étudié cet avantage successoral en détail dans le Module 3, Leçon 2 — il prend ici tout son sens dans une stratégie de transmission globale.",
    missingFeedback:
      "L'assurance-vie est souvent le premier outil à activer pour la transmission : 152 500 € par bénéficiaire, totalement hors succession. Pour 2 enfants, c'est 305 000 € transmis sans droits. Tu avais découvert cet avantage en Module 3, Leçon 2.",
  },
  {
    id: 'don_manuel',
    icon: '👶',
    title: 'Don manuel aux petits-enfants',
    desc: "Transmettre directement à la génération suivante — abattement de 31 865 € par petit-enfant.",
    detail: "Sauter une génération évite une double taxation potentielle. L'abattement de 31 865 € par petit-enfant se renouvelle également tous les 15 ans.",
    forCase: false,
    selectedFeedback:
      "Bonne idée si le couple a des petits-enfants — le don manuel saute une génération, évitant une double taxation potentielle. Avec l'abattement de 31 865 € par petit-enfant renouvelable tous les 15 ans, c'est un complément efficace aux donations directes aux enfants.",
    missingFeedback:
      "Si le couple a des petits-enfants, les dons manuels directs (abattement 31 865 € par petit-enfant, renouvelable tous les 15 ans) auraient pu compléter la stratégie en transmettant directement à la génération suivante.",
  },
  {
    id: 'sci',
    icon: '🏠',
    title: 'SCI familiale / démembrement immobilier',
    desc: "Donner la nue-propriété aux enfants tout en conservant l'usufruit — seule la valeur de la nue-propriété est taxée.",
    detail: "La pleine propriété d'un bien = usufruit (droit de l'habiter ou d'en percevoir les loyers) + nue-propriété (droit de devenir propriétaire plein au décès de l'usufruitier). Donner la nue-propriété aux enfants réduit l'assiette taxable, car sa valeur est inférieure à la pleine propriété.",
    forCase: true,
    selectedFeedback:
      "Très pertinent pour la résidence secondaire du patrimoine. Le démembrement permet de donner la nue-propriété aux enfants (valeur inférieure à la pleine propriété) tout en conservant l'usufruit — les parents gardent l'usage du bien ou perçoivent les loyers jusqu'à leur décès, où la pleine propriété se reconstitue automatiquement, sans droits supplémentaires. La SCI familiale facilite en plus la gestion collective et les cessions progressives de parts.",
    missingFeedback:
      "Pour la résidence secondaire, le démembrement (nue-propriété aux enfants + usufruit conservé par les parents) aurait permis de transmettre une valeur imposable réduite. La SCI familiale facilite en plus cette transmission progressive des parts sans vente forcée.",
  },
]

export default function LessonT4TaxOptim({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'scenario'>('content')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)

  function toggleLever(id: string) {
    if (submitted) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSubmit() {
    setSubmitted(true)
  }

  const selectedLevers = LEVERS.filter(l => selected.has(l.id))
  const missedLevers = LEVERS.filter(l => !selected.has(l.id))

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={2} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Les leviers d'optimisation successorale</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Maintenant que tu connais les règles de base de la succession, voyons les quatre leviers
            concrets que les particuliers utilisent pour <strong>réduire légalement</strong> la facture
            fiscale de leurs héritiers.
          </p>
        </div>

        <div className="col" style={{ gap: 12 }}>
          {LEVERS.map((lever, i) => (
            <div key={lever.id} className="panel" style={{ padding: '18px 20px' }}>
              <div className="row" style={{ gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{lever.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Levier {i + 1} — {lever.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>{lever.desc}</div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-3)', fontSize: 12, color: 'var(--ink-subtle)', lineHeight: 1.6, borderLeft: '3px solid #e67e22' }}>
                {lever.detail}
                {lever.id === 'av' && (
                  <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(94,106,210,0.08)', fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>
                    → Avantage successoral étudié en détail au Module 3, Leçon 2 (L'assurance-vie)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={() => setScreen('scenario')}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 22px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: '#e67e22', color: '#fff',
            }}
          >
            Passer au cas pratique →
          </button>
        </div>
      </LessonShell>
    )
  }

  return (
    <LessonShell step={2} totalSteps={2} onBack={() => setScreen('content')} backLabel="← Retour aux leviers">
      <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Cas pratique — Construire une stratégie de transmission</h2>

      <div className="panel" style={{ padding: '18px 22px' }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Le scénario</div>
        <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
          Un couple a <strong>2 enfants</strong> et un patrimoine de{' '}
          <strong>600 000 €</strong> comprenant une résidence secondaire et des placements financiers.
          Ils veulent organiser leur transmission de façon optimale pour leurs enfants.
          <br /><br />
          <strong>Ta mission :</strong> sélectionne les leviers que tu activerais en priorité.
        </p>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 2 }}>Sélectionne les leviers à activer</div>
        {LEVERS.map(lever => {
          const isSel = selected.has(lever.id)
          return (
            <button
              key={lever.id}
              onClick={() => toggleLever(lever.id)}
              disabled={submitted}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 10, cursor: submitted ? 'default' : 'pointer',
                border: `2px solid ${isSel ? '#e67e22' : 'var(--hairline)'}`,
                background: isSel ? 'rgba(230,126,34,0.08)' : 'var(--surface-2)',
                transition: 'all 0.15s var(--ease)',
              }}
            >
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: '2px solid',
                  borderColor: isSel ? '#e67e22' : 'var(--hairline)',
                  background: isSel ? '#e67e22' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{lever.icon}</span>
                <div className="col grow" style={{ gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{lever.title}</div>
                  <div className="caption">{lever.desc}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {!submitted && (
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="caption">{selected.size} levier{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</span>
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500,
              cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
              background: selected.size > 0 ? '#e67e22' : 'var(--surface-3)',
              color: selected.size > 0 ? '#fff' : 'var(--ink-muted)',
            }}
          >
            Soumettre ma stratégie →
          </button>
        </div>
      )}

      {submitted && (
        <div className="col" style={{ gap: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Feedback sur ta stratégie</div>

          {selectedLevers.length > 0 && (
            <div className="col" style={{ gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 2 }}>
                Leviers que tu as activés — analyse
              </div>
              {selectedLevers.map(lever => (
                <div key={lever.id} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(76,183,130,0.07)',
                  border: '1px solid rgba(76,183,130,0.25)',
                }}>
                  <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{lever.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                      ✓ {lever.title}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
                    {lever.selectedFeedback}
                  </p>
                </div>
              ))}
            </div>
          )}

          {missedLevers.length > 0 && (
            <div className="col" style={{ gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-subtle)', marginTop: 4, marginBottom: 2 }}>
                Leviers non activés — à explorer
              </div>
              {missedLevers.map(lever => (
                <div key={lever.id} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                }}>
                  <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{lever.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{lever.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
                    {lever.missingFeedback}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="panel" style={{ padding: '14px 18px', background: 'var(--surface-3)' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>À retenir</div>
            <div className="col" style={{ gap: 6 }}>
              {[
                "Il n'y a pas de stratégie universelle — chaque situation familiale et patrimoniale est différente.",
                "Les leviers se combinent : donations + AV + démembrement forment souvent la triade optimale.",
                "L'anticipation fait toute la différence : commencer tôt multiplie l'effet des abattements renouvelables.",
                "Un notaire reste indispensable pour les montages complexes (SCI, démembrement, clauses AV).",
              ].map((item, i) => (
                <div key={i} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#e67e22', fontSize: 12, flexShrink: 0, marginTop: 2 }}>→</span>
                  <span className="caption" style={{ lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button
              onClick={onComplete}
              style={{
                display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 24px',
                borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                background: 'var(--success)', color: '#fff',
              }}
            >
              Terminer le module →
            </button>
          </div>
        </div>
      )}
    </LessonShell>
  )
}
