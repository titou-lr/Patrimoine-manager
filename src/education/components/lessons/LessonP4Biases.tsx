import { useState } from 'react'
import { LessonShell } from './LessonShell'

const BIASES = [
  {
    name: 'Aversion aux pertes',
    icon: '⚖️',
    def: "Une perte de 100 € est ressentie ~2× plus intensément qu'un gain de 100 €.",
    example: "Garder une action en perte plutôt que d'accepter la perte et passer à autre chose.",
    antidote: "Se concentrer sur le rendement total du portefeuille, pas les lignes individuelles.",
  },
  {
    name: 'Biais de récence',
    icon: '📰',
    def: "Extrapoler les tendances récentes : vendre après une baisse en pensant que ça va continuer, acheter après une hausse.",
    example: "Vendre tout après un krach en se disant que la baisse va continuer indéfiniment.",
    antidote: "Plans d'investissement automatisés (DCA) qui retirent l'émotion de la décision.",
  },
  {
    name: 'Excès de confiance',
    icon: '🎯',
    def: "Surestimer ses capacités de sélection de titres ou de market timing par rapport à la moyenne des professionnels.",
    example: "Croire pouvoir identifier systématiquement le bon moment d'entrée et de sortie du marché.",
    antidote: "Privilégier la gestion passive. Tenir un journal de prédictions pour confronter les résultats réels.",
  },
  {
    name: 'Biais de confirmation',
    icon: '🔍',
    def: "Ne chercher que les informations qui confirment sa thèse existante, ignorer celles qui la contredisent.",
    example: "Lire 5 articles validant son investissement et ignorer les 3 articles critiques.",
    antidote: "Chercher activement les arguments contraires avant toute décision importante.",
  },
  {
    name: 'Comportement moutonnier',
    icon: '🐑',
    def: "Suivre la foule (bulle spéculative, meme stocks, nouvel actif à la mode) par peur de manquer une opportunité.",
    example: "Acheter un token crypto explosif sans l'avoir étudié, parce que tout le monde en parle.",
    antidote: "Politique d'allocation stricte définie à l'avance. Ignorer le bruit médiatique.",
  },
  {
    name: 'Ancrage',
    icon: '⚓',
    def: "S'accrocher au prix d'achat initial comme référence de valeur, refuser de vendre à perte en attendant le retour à ce prix.",
    example: "Refuser de vendre une action à 50 € achetée à 80 € en attendant qu'elle revienne à 80 €.",
    antidote: "Évaluer l'actif sur sa valeur fondamentale actuelle, pas son coût d'acquisition historique.",
  },
]

interface Scenario {
  id: number
  text: string
  options: string[]
  correct: number
  correctName: string
  explanation: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 0,
    text: "Le marché vient de chuter de 25 %. Tu te dis : 'ça va continuer à baisser, je vends tout maintenant.'",
    options: ["Aversion aux pertes", "Biais de récence", "Biais de confirmation", "Ancrage"],
    correct: 1,
    correctName: "Biais de récence",
    explanation: "Tu extrapolies la tendance baissière récente. Historiquement, les plus fortes hausses se produisent souvent juste après les pires baisses.",
  },
  {
    id: 1,
    text: "Tu as acheté une action à 80 €. Elle vaut maintenant 50 €. Tu refuses de la vendre en te disant : 'je revendrai quand elle remontera à 80 €, pas avant.'",
    options: ["Ancrage", "Aversion aux pertes", "Biais de confirmation", "Comportement moutonnier"],
    correct: 0,
    correctName: "Ancrage",
    explanation: "Le prix d'achat de 80 € n'a aucune signification fondamentale pour le marché. L'actif vaut ce qu'il vaut aujourd'hui — la bonne question est : si tu n'avais pas cette action, l'achèterais-tu à 50 € ?",
  },
  {
    id: 2,
    text: "Tu lis 5 articles qui confirment que ton choix d'investissement est excellent, et tu ignores les 2 articles qui le critiquent.",
    options: ["Excès de confiance", "Biais de récence", "Biais de confirmation", "Aversion aux pertes"],
    correct: 2,
    correctName: "Biais de confirmation",
    explanation: "Tu filtres l'information pour ne garder que ce qui confirme ta thèse. Les 2 articles critiques contiennent peut-être exactement ce que tu as besoin d'entendre.",
  },
  {
    id: 3,
    text: "Tout ton entourage parle d'un nouveau token crypto qui explose. Tu achètes sans avoir vraiment étudié le projet, par peur de rater le mouvement.",
    options: ["Comportement moutonnier", "Biais de récence", "Ancrage", "Excès de confiance"],
    correct: 0,
    correctName: "Comportement moutonnier",
    explanation: "La peur de manquer une opportunité (FOMO) te pousse à suivre la foule sans analyse. Les bulles spéculatives se nourrissent exactement de ce mécanisme.",
  },
  {
    id: 4,
    text: "Tu es persuadé de pouvoir identifier le bon moment pour entrer et sortir du marché mieux que la moyenne des investisseurs professionnels.",
    options: ["Aversion aux pertes", "Excès de confiance", "Biais de confirmation", "Ancrage"],
    correct: 1,
    correctName: "Excès de confiance",
    explanation: "Des études montrent que la grande majorité des investisseurs professionnels ne battent pas le marché sur le long terme. Penser y arriver régulièrement est un classique de l'excès de confiance.",
  },
]

function ScenarioScreen({ scenarios, onPass }: { scenarios: Scenario[]; onPass: () => void }) {
  const [activeItems, setActiveItems] = useState<number[]>(() => scenarios.map((_, i) => i))
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [totalPassed, setTotalPassed] = useState(0)

  const allAnswered = activeItems.every(i => answers[i] !== undefined)

  function pick(si: number, oi: number) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [si]: oi }))
  }

  function submit() {
    setSubmitted(true)
    const newlyPassed = activeItems.filter(i => answers[i] === scenarios[i].correct)
    const newTotal = totalPassed + newlyPassed.length
    if (newTotal === scenarios.length) {
      setTotalPassed(newTotal)
      setTimeout(onPass, 500)
    } else {
      setTotalPassed(newTotal)
    }
  }

  function retry() {
    const failed = activeItems.filter(i => answers[i] !== scenarios[i].correct)
    setActiveItems(failed)
    setAnswers({})
    setSubmitted(false)
  }

  const allCorrectThisRound = submitted && activeItems.every(i => answers[i] === scenarios[i].correct)

  return (
    <div className="col" style={{ gap: 16 }}>
      {activeItems.map(si => {
        const sc = scenarios[si]
        const sel = answers[si]
        const isCorrect = submitted && sel === sc.correct
        const isWrong = submitted && sel !== undefined && sel !== sc.correct

        return (
          <div key={si} className="panel" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Scénario {si + 1}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14, fontStyle: 'italic' }}>
              "{sc.text}"
            </div>
            <div className="caption" style={{ marginBottom: 10 }}>Quel biais comportemental est à l'œuvre ?</div>
            <div className="col" style={{ gap: 7 }}>
              {sc.options.map((opt, oi) => {
                const isSel = sel === oi
                return (
                  <button
                    key={oi}
                    onClick={() => pick(si, oi)}
                    disabled={submitted}
                    style={{
                      textAlign: 'left', padding: '9px 13px', borderRadius: 8, fontSize: 13,
                      cursor: submitted ? 'default' : 'pointer',
                      border: `1px solid ${
                        isCorrect && isSel ? 'var(--success)'
                        : isWrong && isSel ? 'var(--danger)'
                        : isSel ? 'var(--primary)'
                        : 'var(--hairline)'
                      }`,
                      background: isCorrect && isSel ? 'rgba(76,183,130,0.1)'
                        : isWrong && isSel ? 'rgba(235,87,87,0.1)'
                        : isSel ? 'rgba(94,106,210,0.12)'
                        : 'var(--surface-2)',
                      color: isCorrect && isSel ? 'var(--success)'
                        : isWrong && isSel ? 'var(--danger)'
                        : 'var(--ink)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 8, opacity: 0.6 }}>
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
            {isWrong && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: 'var(--surface-3)', borderLeft: '3px solid var(--primary)',
                color: 'var(--ink-subtle)', lineHeight: 1.5,
              }}>
                Pas tout à fait — relis les définitions et réessaie !
              </div>
            )}
            {isCorrect && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                background: 'var(--surface-3)', borderLeft: '3px solid var(--success)',
                color: 'var(--ink-subtle)', lineHeight: 1.5,
              }}>
                💡 {sc.explanation}
              </div>
            )}
          </div>
        )
      })}

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {submitted ? (
          <span style={{ fontSize: 13, fontWeight: 500, color: allCorrectThisRound ? 'var(--success)' : 'var(--ink-muted)' }}>
            {totalPassed}/{scenarios.length} {allCorrectThisRound ? '— Parfait !' : '— Continue…'}
          </span>
        ) : <span />}

        {!submitted && (
          <button onClick={submit} disabled={!allAnswered} style={{
            display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 18px',
            borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500,
            cursor: allAnswered ? 'pointer' : 'not-allowed',
            background: allAnswered ? 'var(--primary)' : 'var(--surface-3)',
            color: allAnswered ? '#fff' : 'var(--ink-muted)',
          }}>
            Valider mes réponses
          </button>
        )}
        {submitted && !allCorrectThisRound && (
          <button onClick={retry} style={{
            display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 18px',
            borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 13, fontWeight: 500,
            background: 'var(--surface-2)', color: 'var(--ink)', cursor: 'pointer',
          }}>
            Réessayer les erreurs
          </button>
        )}
      </div>
    </div>
  )
}

export default function LessonP4Biases({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'scenarios' | 'result'>('content')

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Biais cognitifs et psychologie de l'investisseur</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            La plus grande menace pour ton portefeuille n'est pas le marché — c'est souvent{' '}
            <strong>toi-même</strong>. La finance comportementale a identifié des biais cognitifs qui
            poussent systématiquement les investisseurs à prendre de mauvaises décisions, en particulier
            dans les moments extrêmes de marché.
          </p>
        </div>

        <div className="col" style={{ gap: 10 }}>
          {BIASES.map(b => (
            <div key={b.name} className="panel" style={{ padding: '14px 18px' }}>
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                <div className="col grow" style={{ gap: 6 }}>
                  <div className="subhead" style={{ fontSize: 14 }}>{b.name}</div>
                  <p className="caption" style={{ margin: 0, lineHeight: 1.55 }}>{b.def}</p>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', background: 'var(--surface-3)', padding: '6px 10px', borderRadius: 6, lineHeight: 1.5 }}>
                    <strong>Exemple :</strong> {b.example}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--success)' }}>
                    <strong>Antidote :</strong> {b.antidote}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => setScreen('scenarios')} style={{
            display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
            borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: 'var(--primary)', color: '#fff',
          }}>
            Passer aux scénarios →
          </button>
        </div>
      </LessonShell>
    )
  }

  if (screen === 'scenarios') {
    return (
      <LessonShell step={2} totalSteps={3} onBack={() => setScreen('content')} backLabel="← Retour au contenu">
        <div>
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>Exercice — Identifier les biais</h2>
          <p className="caption">5 situations réelles · identifie le biais à l'œuvre dans chacune.</p>
        </div>
        <ScenarioScreen scenarios={SCENARIOS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>🧠</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 4 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Reconnaître un biais en temps réel est la première étape pour ne pas lui céder.
          Ces 6 biais reviennent dans presque chaque mauvaise décision d'investisseur.
          Garde-les en tête lors de la synthèse finale.
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
