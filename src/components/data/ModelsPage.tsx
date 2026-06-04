import { useState } from 'react'
import FormulaBlock from '../ui/FormulaBlock'
import InteractiveExample from '../ui/InteractiveExample'
import GlossaryTooltip from '../ui/GlossaryTooltip'
import { ENVELOPE_PRESETS, TAX_RULE_LABEL, formatPlafond } from '../../data/envelopePresets'
import { formatEur } from '../../utils/format'

// ─── Section collapsible ──────────────────────────────────────────────────────

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-elevated transition-colors duration-150"
      >
        <span className="font-medium text-sm text-foreground">{title}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-muted transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border flex flex-col gap-4">
          {children}
        </div>
      )}
    </div>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mt-1">{children}</h4>
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-secondary leading-relaxed">{children}</p>
}

// ─── Calculs interactifs ──────────────────────────────────────────────────────

function compoundInterest(values: Record<string, number>) {
  const { s0, v, r, t } = values
  const rm = r / 100 / 12
  const periods = Math.round(t * 12)
  let S: number
  if (rm === 0 || periods === 0) {
    S = s0 + v * periods
  } else {
    const factor = Math.pow(1 + rm, periods)
    S = s0 * factor + v * (factor - 1) / rm
  }
  const totalContrib = s0 + v * periods
  const gains = Math.max(0, S - totalContrib)
  return [
    { label: 'Capital final S(t)', value: formatEur(S), highlight: true },
    { label: 'Versements cumulés', value: formatEur(totalContrib) },
    { label: 'Gains', value: formatEur(gains) },
  ]
}

function fisherCalc(values: Record<string, number>) {
  const { rn, inflation } = values
  const rFisher = (1 + rn / 100) / (1 + inflation / 100) - 1
  const rApprox = rn / 100 - inflation / 100
  const ecart = Math.abs((rApprox - rFisher) * 100)
  return [
    { label: 'Rendement réel (Fisher)', value: `${(rFisher * 100).toFixed(2)} %`, highlight: true },
    { label: 'Approximation', value: `${(rApprox * 100).toFixed(2)} %` },
    { label: 'Écart', value: `+${ecart.toFixed(3)} pts` },
  ]
}

function retirementCalc(values: Record<string, number>) {
  const { expenses, pension, rate } = values
  const annual = Math.max(0, expenses - pension) * 12
  const needed = rate > 0 ? annual / (rate / 100) : 0
  const monthly = needed > 0 ? needed * (rate / 100) / 12 : 0
  return [
    { label: 'Capital nécessaire', value: formatEur(needed), highlight: true },
    { label: 'Retrait mensuel soutenable', value: formatEur(monthly) },
  ]
}

function mortgageCalc(values: Record<string, number>) {
  const { K, t, n } = values
  const rm = t / 100 / 12
  let M: number
  if (rm === 0 || n === 0) {
    M = n > 0 ? K / n : 0
  } else {
    M = K * rm / (1 - Math.pow(1 + rm, -n))
  }
  const total = M * n
  const cost = total - K
  return [
    { label: 'Mensualité', value: formatEur(M), highlight: true },
    { label: 'Coût total crédit', value: formatEur(Math.max(0, cost)) },
    { label: 'Total remboursé', value: formatEur(total) },
  ]
}

// ─── Section Fiscalité ────────────────────────────────────────────────────────

type TaxFilter = 'all' | 'exempt' | 'flat' | 'specific'

function TaxTable() {
  const [filter, setFilter] = useState<TaxFilter>('all')

  const filters: { id: TaxFilter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'exempt', label: 'Exonérés' },
    { id: 'flat', label: 'Flat tax' },
    { id: 'specific', label: 'Spécifique' },
  ]

  const rows = Object.entries(ENVELOPE_PRESETS).filter(([, p]) => {
    if (filter === 'exempt') return p.taxRule === 'exempt'
    if (filter === 'flat') return p.taxRule === 'flat30' || p.taxRule === 'cto'
    if (filter === 'specific') return ['pea', 'av', 'per'].includes(p.taxRule)
    return true
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              filter === f.id
                ? 'bg-elevated text-foreground border border-border'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-elevated text-left text-[10px] text-muted border-b border-border">
              <th className="px-3 py-2 font-normal">Enveloppe</th>
              <th className="px-3 py-2 font-normal">Plafond versements</th>
              <th className="px-3 py-2 font-normal">Fiscalité gains</th>
              <th className="px-3 py-2 font-normal">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, preset]) => (
              <tr key={key} className="border-b border-border last:border-0 hover:bg-elevated/50 transition-colors">
                <td className="px-3 py-2.5 font-medium text-foreground">
                  <div className="flex items-center gap-1.5">
                    {preset.label}
                    {preset.regulated && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/25 font-medium">
                        Réglementé
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted font-mono tabular-nums">
                  {formatPlafond(preset.maxContribution)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    preset.taxRule === 'exempt'
                      ? 'bg-success/10 text-success'
                      : 'bg-elevated text-muted border border-border'
                  }`}>
                    {TAX_RULE_LABEL[preset.taxRule]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted max-w-[180px]">{preset.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Roadmap placeholders ─────────────────────────────────────────────────────

interface RoadmapCardProps {
  title: string
  description: string
  badge: string
  badgeColor: 'orange' | 'purple'
}

function RoadmapCard({ title, description, badge, badgeColor }: RoadmapCardProps) {
  const colors = {
    orange: 'bg-orange/10 text-orange border-orange/20',
    purple: 'bg-purple/10 text-purple border-purple/20',
  }
  return (
    <div className="bg-elevated border border-dashed border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm text-foreground">{title}</span>
        <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full border font-medium ${colors[badgeColor]}`}>
          {badge}
        </span>
      </div>
      <p className="text-xs text-secondary leading-relaxed">{description}</p>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ModelsPage() {
  return (
    <div className="p-5 md:p-6 flex flex-col gap-3 max-w-3xl mx-auto">
      <div className="mb-2">
        <h2 className="font-semibold text-foreground mb-1">Modèles mathématiques</h2>
        <p className="text-sm text-muted">Formules utilisées dans le simulateur et leur justification.</p>
      </div>

      {/* 1. Intérêts composés */}
      <Section title="1. Intérêts composés" defaultOpen>
        <Prose>
          Le simulateur utilise la méthode itérative mensuelle pour intégrer précisément
          les variations de versements, la fiscalité annuelle et les frais variables.
        </Prose>

        <SubTitle>Formule itérative (utilisée)</SubTitle>
        <FormulaBlock
          formula={`S(n+1) = (S(n) + v) × (1 + r/12)`}
          variables={[
            { symbol: 'S(n)', definition: 'solde à la fin du mois n' },
            { symbol: 'v', definition: 'versement mensuel net de frais' },
            { symbol: 'r', definition: 'taux de rendement annuel nominal' },
          ]}
        />

        <SubTitle>Formule analytique — capital seul</SubTitle>
        <FormulaBlock
          formula={`S(t) = S₀ × (1 + r/12)^(12t)`}
          variables={[
            { symbol: 'S₀', definition: 'capital initial' },
            { symbol: 't', definition: 'durée en années' },
          ]}
        />

        <SubTitle>Formule analytique — avec versements constants</SubTitle>
        <FormulaBlock
          formula={`S(t) = S₀ × (1+r/12)^(12t) + v × [(1+r/12)^(12t) − 1] / (r/12)`}
          note="Valable uniquement pour des versements constants. L'app utilise la méthode itérative mensuelle pour intégrer les variations de versements et la fiscalité."
        />

        <InteractiveExample
          title="Calculer un capital final"
          inputs={[
            { id: 's0', label: 'Capital initial S₀', value: 10000, min: 0, suffix: '€' },
            { id: 'v', label: 'Versement mensuel v', value: 300, min: 0, suffix: '€' },
            { id: 'r', label: 'Taux annuel r', value: 7, min: 0, max: 30, step: 0.1, suffix: '%' },
            { id: 't', label: 'Durée t', value: 20, min: 1, max: 50, suffix: 'ans' },
          ]}
          compute={compoundInterest}
        />
      </Section>

      {/* 2. Formule de Fisher */}
      <Section title="2. Formule de Fisher — rendement réel">
        <Prose>
          Pour corriger un <GlossaryTooltip termId="rendement">rendement nominal</GlossaryTooltip> de
          l'<GlossaryTooltip termId="inflation">inflation</GlossaryTooltip>, l'application utilise toujours
          la <GlossaryTooltip termId="fisher">formule de Fisher</GlossaryTooltip> exacte, jamais l'approximation.
        </Prose>

        <SubTitle>Formule exacte (utilisée)</SubTitle>
        <FormulaBlock
          formula={`r_réel = (1 + r_nominal) / (1 + i) − 1`}
          variables={[
            { symbol: 'r_nominal', definition: 'taux de rendement nominal annuel' },
            { symbol: 'i', definition: 'taux d\'inflation annuel' },
            { symbol: 'r_réel', definition: 'taux de rendement réel (pouvoir d\'achat)' },
          ]}
        />

        <SubTitle>Approximation (pour comparaison)</SubTitle>
        <FormulaBlock
          formula={`r_réel ≈ r_nominal − i`}
          note="Acceptable pour de faibles taux mais surestime le rendement réel. Évitée dans l'app."
        />

        <SubTitle>Exemple numérique</SubTitle>
        <FormulaBlock
          formula={`r = 8 %,  i = 2.5 %
Fisher : (1.08 / 1.025) − 1 = 5.366 %
Approx : 8 % − 2.5 %        = 5.500 %
Écart                        = +0.134 points`}
        />

        <InteractiveExample
          title="Calculer le rendement réel"
          inputs={[
            { id: 'rn', label: 'Rendement nominal r', value: 8, min: 0, max: 30, step: 0.1, suffix: '%' },
            { id: 'inflation', label: 'Inflation i', value: 2.5, min: 0, max: 15, step: 0.1, suffix: '%' },
          ]}
          compute={fisherCalc}
        />
      </Section>

      {/* 3. Fiscalité par enveloppe */}
      <Section title="3. Fiscalité par enveloppe">
        <Prose>
          Récapitulatif des règles fiscales appliquées par le moteur de simulation
          pour chaque type d'enveloppe.
        </Prose>
        <TaxTable />
      </Section>

      {/* 4. Règle des 4% */}
      <Section title="4. Règle des 4 % (retraite — Trinity Study)">
        <Prose>
          Capital nécessaire pour financer une retraite indépendante sur une longue durée.
          Le <GlossaryTooltip termId="taux_retrait">taux de retrait</GlossaryTooltip> est le % du capital retiré chaque année.
          La <GlossaryTooltip termId="regle_4_pourcent">règle des 4%</GlossaryTooltip> est la référence empirique la plus utilisée.
        </Prose>

        <SubTitle>Capital nécessaire</SubTitle>
        <FormulaBlock
          formula={`C = (dépenses − pension) × 12 / taux_retrait
C = (dépenses − pension) × 300   [si taux = 4 %]`}
          variables={[
            { symbol: 'dépenses', definition: 'dépenses mensuelles en retraite (€)' },
            { symbol: 'pension', definition: 'pension mensuelle perçue (€)' },
            { symbol: 'taux_retrait', definition: 'taux annuel de retrait (ex : 0.04)' },
          ]}
        />

        <SubTitle>Retrait annuel soutenable</SubTitle>
        <FormulaBlock
          formula={`W = C × taux_retrait`}
        />

        <SubTitle>Durée de tenue (capital fini, rendement r)</SubTitle>
        <FormulaBlock
          formula={`n = −ln(1 − C×r / W) / ln(1 + r)`}
          variables={[
            { symbol: 'r', definition: 'rendement annuel en phase de retrait' },
            { symbol: 'n', definition: 'durée de tenue du capital en années' },
          ]}
          note="Trinity Study (1998) — données historiques US 1926-1995. Ne garantit pas la pérennité au-delà de 30 ans. Sensible au sequence of returns risk."
        />

        <InteractiveExample
          title="Capital nécessaire pour la retraite"
          inputs={[
            { id: 'expenses', label: 'Dépenses mensuelles', value: 3000, min: 0, suffix: '€' },
            { id: 'pension', label: 'Pension mensuelle', value: 800, min: 0, suffix: '€' },
            { id: 'rate', label: 'Taux de retrait', value: 4, min: 0.5, max: 10, step: 0.5, suffix: '%' },
          ]}
          compute={retirementCalc}
        />
      </Section>

      {/* 5. Mensualité prêt immobilier */}
      <Section title="5. Mensualité prêt immobilier">
        <SubTitle>Formule d'annuité constante</SubTitle>
        <FormulaBlock
          formula={`M = K × (t/12) / [1 − (1 + t/12)^(−n)]`}
          variables={[
            { symbol: 'M', definition: 'mensualité (€)' },
            { symbol: 'K', definition: 'capital emprunté (€)' },
            { symbol: 't', definition: 'taux annuel d\'intérêt nominal' },
            { symbol: 'n', definition: 'durée totale en mois' },
          ]}
        />

        <SubTitle>Coût total du crédit</SubTitle>
        <FormulaBlock
          formula={`Coût total = M × n − K`}
        />

        <InteractiveExample
          title="Calculer une mensualité"
          inputs={[
            { id: 'K', label: 'Capital K', value: 200000, min: 1000, suffix: '€' },
            { id: 't', label: 'Taux annuel t', value: 3.5, min: 0.1, max: 15, step: 0.05, suffix: '%' },
            { id: 'n', label: 'Durée n', value: 240, min: 12, max: 360, suffix: 'mois' },
          ]}
          compute={mortgageCalc}
        />
      </Section>

      {/* 6. VAN */}
      <Section title="6. Valeur Actuelle Nette (VAN)">
        <Prose>
          Permet de comparer deux stratégies d'investissement en ramenant tous
          les flux futurs en euros d'aujourd'hui.
        </Prose>

        <FormulaBlock
          formula={`VAN = Σ [ CF(t) / (1 + r)^t ] − I(0)
       t=0..T`}
          variables={[
            { symbol: 'CF(t)', definition: 'flux de trésorerie à la période t' },
            { symbol: 'r', definition: 'taux d\'actualisation (rendement exigé)' },
            { symbol: 'I(0)', definition: 'investissement initial' },
            { symbol: 'T', definition: 'horizon de comparaison' },
          ]}
          note="Une VAN positive indique que le projet crée de la valeur par rapport à l'alternative au taux r."
        />
      </Section>

      {/* 7. Roadmap */}
      <Section title="7. Roadmap des modèles avancés">
        <Prose>
          Modèles planifiés pour les prochaines versions du simulateur.
        </Prose>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RoadmapCard
            title="Simulation Monte-Carlo"
            description="Simulation de N scénarios de marché aléatoires pour estimer la distribution statistique des résultats. Permet de quantifier le risque et les intervalles de confiance."
            badge="Prévu"
            badgeColor="orange"
          />
          <RoadmapCard
            title="Optimisation Markowitz"
            description="Frontière efficiente et ratio de Sharpe. Allocation optimale minimisant le risque pour un rendement cible donné. Corrélations inter-actifs."
            badge="Prévu"
            badgeColor="orange"
          />
          <RoadmapCard
            title="Régression temporelle"
            description="Modélisation des tendances historiques de marché pour améliorer les estimations de rendement à long terme basées sur des données réelles."
            badge="Prévu"
            badgeColor="orange"
          />
          <RoadmapCard
            title="Black-Scholes simplifié"
            description="Évaluation de produits optionnels et dérivés. Modèle de diffusion log-normale pour valoriser des options sur actifs sous-jacents."
            badge="Exploratoire"
            badgeColor="purple"
          />
        </div>
      </Section>
    </div>
  )
}
