import { useMemo } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import { computePaymentCalendar, calendarMonthTotal, daysInMonth } from '../../engine/paymentCalendarEngine'
import { formatEur } from '../../../utils/format'

interface Props {
  month: string   // YYYY-MM
}

export default function PaymentCalendar({ month }: Props) {
  const { transactions, recurringRules, categories } = useBudgetStore()

  const byDay = useMemo(
    () => computePaymentCalendar(month, transactions, recurringRules, categories),
    [month, transactions, recurringRules, categories]
  )
  const total = useMemo(() => calendarMonthTotal(byDay), [byDay])

  const nbDays = daysInMonth(month)
  const [y, m] = month.split('-').map(Number)
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7  // 0 = lundi
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m
  const todayDay = today.getDate()

  const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Calendrier de prélèvements</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', marginTop: 2 }}>
            Dépenses fixes et récurrentes du mois — réelles et à venir
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-tertiary)' }}>
            Total du mois
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {formatEur(total)}
          </div>
        </div>
      </div>

      {/* Grille */}
      <div className="panel" style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {weekdays.map((w) => (
            <div key={w} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '2px 0' }}>
              {w}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: nbDays }, (_, i) => i + 1).map((day) => {
            const items = byDay[day] ?? []
            const dayTotal = items.reduce((s, it) => s + it.amount, 0)
            const isToday = isCurrentMonth && day === todayDay
            return (
              <div
                key={day}
                title={items.map((it) => `${it.label} — ${formatEur(it.amount)}${it.kind === 'upcoming' ? ' (à venir)' : ''}`).join('\n')}
                style={{
                  minHeight: 64, borderRadius: 6, padding: '4px 6px',
                  border: isToday ? '1px solid var(--primary)' : '1px solid var(--hairline)',
                  background: items.length > 0 ? 'var(--surface-2)' : 'transparent',
                  display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden',
                }}
              >
                <div style={{ fontSize: 10.5, color: isToday ? 'var(--primary-hover)' : 'var(--ink-tertiary)', fontWeight: isToday ? 600 : 400 }}>
                  {day}
                </div>
                {items.slice(0, 2).map((it, i) => (
                  <div key={i} style={{
                    fontSize: 10, lineHeight: 1.25,
                    color: it.kind === 'upcoming' ? 'var(--ink-tertiary)' : 'var(--ink-subtle)',
                    fontStyle: it.kind === 'upcoming' ? 'italic' : 'normal',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {it.label}
                  </div>
                ))}
                {items.length > 2 && (
                  <div style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>+{items.length - 2} autres</div>
                )}
                {dayTotal > 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, color: 'var(--danger)', marginTop: 'auto' }}>
                    -{formatEur(dayTotal)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--ink-tertiary)' }}>
          <span>Normal : transaction réelle du mois</span>
          <span style={{ fontStyle: 'italic' }}>Italique : prélèvement à venir (règle récurrente)</span>
        </div>
      </div>
    </div>
  )
}
