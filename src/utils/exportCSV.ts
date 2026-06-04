import type { Envelope, SimulationResult } from '../types'

export function exportToCSV(results: SimulationResult[], envelopes: Envelope[]): void {
  const active = envelopes.filter((e) => e.active)

  const headers = [
    'Année',
    'Capital total (€)',
    'Total versé (€)',
    'Gains nets (€)',
    'Valeur réelle (€)',
    ...active.map((e) => `${e.label} (€)`),
  ]

  const rows = results.map((r) => [
    r.year,
    Math.round(r.totalNominal),
    Math.round(r.totalContributed),
    Math.round(r.totalGains),
    Math.round(r.totalReal),
    ...active.map((e) => Math.round(r.byEnvelope[e.id]?.capital ?? 0)),
  ])

  const csv = [headers, ...rows].map((row) => row.join(';')).join('\r\n')

  // BOM UTF-8 pour compatibilité Excel
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `simulation-patrimoine-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
