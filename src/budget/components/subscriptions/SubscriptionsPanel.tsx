import { useMemo } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import { listSubscriptions, subscriptionTotals, RENEWAL_ALERT_DAYS } from '../../engine/subscriptionEngine'
import type { RecurringFrequency, SubscriptionInfo } from '../../types/budget'
import { formatEur } from '../../../utils/format'

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Hebdo',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  annual: 'Annuel',
}

function renewalLabel(sub: SubscriptionInfo): string {
  if (sub.daysUntilRenewal === null || !sub.nextRenewalDate) return 'Renouvellement inconnu'
  if (sub.daysUntilRenewal === 0) return "Renouvellement aujourd'hui"
  if (sub.daysUntilRenewal === 1) return 'Renouvellement demain'
  return `Renouvellement dans ${sub.daysUntilRenewal} j`
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel" style={{ padding: '12px 16px', flex: 1 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-tertiary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: tone ?? 'var(--ink)' }}>
        {value}
      </div>
    </div>
  )
}

export default function SubscriptionsPanel() {
  const { recurringRules, transactions, categories, upsertRecurringRule } = useBudgetStore()

  const subscriptions = useMemo(
    () => listSubscriptions(recurringRules, transactions),
    [recurringRules, transactions]
  )
  const totals = useMemo(() => subscriptionTotals(subscriptions), [subscriptions])
  const upcoming = subscriptions.filter(
    (s) => s.daysUntilRenewal !== null && s.daysUntilRenewal >= 0 && s.daysUntilRenewal <= RENEWAL_ALERT_DAYS
  )

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  function confirmDetected(sub: SubscriptionInfo) {
    upsertRecurringRule({
      label: sub.label,
      amount: sub.amount,
      type: 'expense',
      categoryId: sub.categoryId,
      frequency: sub.frequency,
      dayOfMonth: sub.nextRenewalDate ? Number(sub.nextRenewalDate.slice(8, 10)) : undefined,
      active: true,
      detectedAutomatically: true,
      lastGeneratedMonth: null,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12 }}>
        <Kpi label="Abonnements" value={String(subscriptions.length)} />
        <Kpi label="Coût mensuel total" value={`${formatEur(totals.monthly)}/mois`} />
        <Kpi label="Coût annuel estimé" value={formatEur(totals.annual)} tone="var(--warning)" />
      </div>

      {/* Renouvellements imminents (J-7) */}
      {upcoming.length > 0 && (
        <div style={{
          padding: '10px 14px',
          background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
          borderRadius: 8, fontSize: 12.5, color: 'var(--warning)',
        }}>
          {upcoming.length === 1
            ? `1 renouvellement dans les ${RENEWAL_ALERT_DAYS} prochains jours : ${upcoming[0].label} (${formatEur(upcoming[0].amount)})`
            : `${upcoming.length} renouvellements dans les ${RENEWAL_ALERT_DAYS} prochains jours : ${upcoming.map((s) => s.label).join(', ')}`}
        </div>
      )}

      {/* Liste */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>
          Dépenses récurrentes identifiées
        </div>

        {subscriptions.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '16px 0' }}>
            Aucun abonnement détecté. Ajoutez des règles récurrentes (onglet Récurrences)
            ou importez un relevé bancaire — la détection repère les dépenses régulières.
          </p>
        )}

        {subscriptions.map((sub) => {
          const cat = catById.get(sub.categoryId)
          const soon = sub.daysUntilRenewal !== null && sub.daysUntilRenewal >= 0 && sub.daysUntilRenewal <= RENEWAL_ALERT_DAYS
          return (
            <div key={sub.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
              borderBottom: '1px solid var(--hairline)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: cat?.color ?? 'var(--ink-tertiary)',
              }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.label}
                  {sub.source === 'detected' && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 99,
                      background: 'var(--primary-tint)', color: 'var(--primary-hover)',
                    }}>
                      détecté
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: soon ? 'var(--warning)' : 'var(--ink-tertiary)' }}>
                  {FREQ_LABELS[sub.frequency]} · {renewalLabel(sub)}
                  {cat ? ` · ${cat.label}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {formatEur(sub.monthlyCost)}/mois
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>
                  {formatEur(sub.annualCost)}/an
                </div>
              </div>
              {sub.source === 'detected' && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => confirmDetected(sub)}
                  style={{ fontSize: 11 }}
                  title="Créer une règle récurrente pour cet abonnement"
                >
                  Confirmer
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
