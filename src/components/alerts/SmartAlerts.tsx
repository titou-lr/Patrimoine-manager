import { useState } from 'react'
import { useStore, selectActiveSim } from '../../store/useStore'
import { generateAlerts, type Alert } from '../../engine/alertsEngine'
import type { SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
  onNavigate: (page: 'envelopes' | 'dashboard') => void
}

const MAX_VISIBLE = 3

const TYPE_CFG: Record<Alert['type'], {
  borderCls: string
  iconCls: string
  icon: React.ReactNode
}> = {
  warning: {
    borderCls: 'border-l-warning',
    iconCls: 'text-warning',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1L11.2 10H.8L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M6 4.5v2.5M6 8.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  tip: {
    borderCls: 'border-l-orange',
    iconCls: 'text-orange',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 8.5h3M5 10h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  success: {
    borderCls: 'border-l-success',
    iconCls: 'text-success',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  info: {
    borderCls: 'border-l-purple',
    iconCls: 'text-purple',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 5.5v3M6 4v-.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
}

interface AlertCardProps {
  alert: Alert
  index: number
  onNavigate: (page: 'envelopes' | 'dashboard') => void
}

function AlertCard({ alert, index, onNavigate }: AlertCardProps) {
  const cfg = TYPE_CFG[alert.type]
  const animClass =
    index === 0 ? 'animate-in' : index === 1 ? 'animate-in-delay-1' : 'animate-in-delay-2'

  return (
    <div
      className={`border-l-2 ${cfg.borderCls} bg-surface border border-border border-l-0 rounded-r-xl pl-3 pr-4 py-2.5 flex items-start gap-3 ${animClass}`}
    >
      <span className={`mt-0.5 shrink-0 ${cfg.iconCls}`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground leading-snug">{alert.title}</div>
        <div className="text-xs text-muted mt-0.5 leading-relaxed">{alert.message}</div>
        {alert.actionLabel && alert.actionTarget && (
          <button
            onClick={() => onNavigate(alert.actionTarget as 'envelopes' | 'dashboard')}
            className="text-xs text-orange mt-1.5 hover:underline underline-offset-2"
          >
            {alert.actionLabel} →
          </button>
        )}
      </div>
    </div>
  )
}

export default function SmartAlerts({ results, onNavigate }: Props) {
  const { envelopes, globalParams } = useStore(selectActiveSim)
  const [expanded, setExpanded] = useState(false)

  if (results.length === 0) return null

  const { liabilities } = useStore(selectActiveSim)
  const alerts = generateAlerts(envelopes, results, globalParams, liabilities ?? [])
  if (alerts.length === 0) return null

  const visible = expanded ? alerts : alerts.slice(0, MAX_VISIBLE)
  const hiddenCount = alerts.length - MAX_VISIBLE

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-0.5">
        <span className="text-xs text-muted uppercase tracking-widest font-medium">
          Alertes & conseils
        </span>
      </div>
      {visible.map((alert, i) => (
        <AlertCard key={alert.id} alert={alert} index={i} onNavigate={onNavigate} />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted hover:text-foreground py-1 transition-colors text-left"
        >
          {expanded
            ? '↑ Réduire les alertes'
            : `↓ Voir toutes les alertes (${alerts.length})`}
        </button>
      )}
    </div>
  )
}
