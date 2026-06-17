import { useState } from 'react'
import type { Bank, BankType, EnvelopeInfo } from '../../types/data'

// ── Types ────────────────────────────────────────────────────────────────────

type AllEnvKey = keyof Bank['envelopes']

interface EnvFormState {
  available: boolean
  notes: string
  fees: number
  orderFees: number
  custodyFees: number
  minOrder: number
  entryFees: number
  managementFees: number
  arbitrageFees: number
}

interface FormState {
  name: string
  type: BankType
  rating: number
  pros: [string, string, string]
  cons: [string, string, string]
  envelopes: Record<AllEnvKey, EnvFormState>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: BankType; label: string }[] = [
  { value: 'courtier',              label: 'Courtier' },
  { value: 'banque-en-ligne',       label: 'Banque en ligne' },
  { value: 'banque-traditionnelle', label: 'Banque traditionnelle' },
]

const ENV_TABS: { key: AllEnvKey; label: string }[] = [
  { key: 'pea',           label: 'PEA' },
  { key: 'cto',           label: 'CTO' },
  { key: 'assurance_vie', label: 'AV' },
  { key: 'per',           label: 'PER' },
  { key: 'livret_a',      label: 'Livret A' },
  { key: 'ldds',          label: 'LDDS' },
]

type NumericEnvField = Exclude<keyof EnvFormState, 'available' | 'notes'>

const ENV_FIELDS: Record<AllEnvKey, { field: NumericEnvField; label: string; suffix: string }[]> = {
  pea:           [{ field: 'orderFees',     label: 'Frais de courtage', suffix: '%' },
                  { field: 'custodyFees',   label: 'Frais de garde',    suffix: '%/an' },
                  { field: 'minOrder',      label: 'Ordre minimum',     suffix: '€' }],
  cto:           [{ field: 'orderFees',     label: 'Frais de courtage', suffix: '%' },
                  { field: 'custodyFees',   label: 'Frais de garde',    suffix: '%/an' }],
  assurance_vie: [{ field: 'entryFees',     label: "Frais d'entrée",    suffix: '%' },
                  { field: 'managementFees',label: 'Frais de gestion',  suffix: '%/an' },
                  { field: 'arbitrageFees', label: "Frais d'arbitrage", suffix: '%' }],
  per:           [{ field: 'entryFees',     label: "Frais d'entrée",    suffix: '%' },
                  { field: 'managementFees',label: 'Frais de gestion',  suffix: '%/an' }],
  livret_a:      [{ field: 'fees',          label: 'Frais',             suffix: '%' }],
  ldds:          [{ field: 'fees',          label: 'Frais',             suffix: '%' }],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initEnv(): EnvFormState {
  return { available: false, notes: '', fees: 0, orderFees: 0, custodyFees: 0, minOrder: 0, entryFees: 0, managementFees: 0, arbitrageFees: 0 }
}

function fromEnv(e: EnvelopeInfo): EnvFormState {
  return {
    available:     e.available,
    notes:         e.notes,
    fees:          e.fees          ?? 0,
    orderFees:     e.orderFees     ?? 0,
    custodyFees:   e.custodyFees   ?? 0,
    minOrder:      e.minOrder      ?? 0,
    entryFees:     e.entryFees     ?? 0,
    managementFees:e.managementFees?? 0,
    arbitrageFees: e.arbitrageFees ?? 0,
  }
}

function buildEnvInfo(key: AllEnvKey, f: EnvFormState): EnvelopeInfo {
  const base: EnvelopeInfo = { available: f.available, notes: f.notes }
  switch (key) {
    case 'livret_a':
    case 'ldds':
      return { ...base, fees: f.fees }
    case 'pea':
      return { ...base, orderFees: f.orderFees, custodyFees: f.custodyFees, minOrder: f.minOrder }
    case 'cto':
      return { ...base, orderFees: f.orderFees, custodyFees: f.custodyFees }
    case 'assurance_vie':
      return { ...base, entryFees: f.entryFees, managementFees: f.managementFees, arbitrageFees: f.arbitrageFees }
    case 'per':
      return { ...base, entryFees: f.entryFees, managementFees: f.managementFees }
  }
}

function initForm(bank?: Bank): FormState {
  if (!bank) {
    const emptyEnvs: Record<AllEnvKey, EnvFormState> = {
      pea: initEnv(), cto: initEnv(), assurance_vie: initEnv(),
      per: initEnv(), livret_a: initEnv(), ldds: initEnv(),
    }
    return { name: '', type: 'courtier', rating: 3, pros: ['', '', ''], cons: ['', '', ''], envelopes: emptyEnvs }
  }
  const pad = (arr: string[]): [string, string, string] =>
    [...arr, '', '', ''].slice(0, 3) as [string, string, string]
  return {
    name:   bank.name,
    type:   bank.type,
    rating: bank.rating,
    pros:   pad(bank.pros),
    cons:   pad(bank.cons),
    envelopes: {
      pea:           fromEnv(bank.envelopes.pea),
      cto:           fromEnv(bank.envelopes.cto),
      assurance_vie: fromEnv(bank.envelopes.assurance_vie),
      per:           fromEnv(bank.envelopes.per),
      livret_a:      fromEnv(bank.envelopes.livret_a),
      ldds:          fromEnv(bank.envelopes.ldds),
    },
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  initial?: Bank
  onSave: (bank: Bank) => void
  onClose: () => void
}

export default function AddBankModal({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>(() => initForm(initial))
  const [activeEnv, setActiveEnv] = useState<AllEnvKey>('pea')

  function patchEnv(key: AllEnvKey, patch: Partial<EnvFormState>) {
    setForm(f => ({ ...f, envelopes: { ...f.envelopes, [key]: { ...f.envelopes[key], ...patch } } }))
  }

  function handleSave() {
    if (!form.name.trim()) return
    const bank: Bank = {
      id:     initial?.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name:   form.name.trim(),
      type:   form.type,
      logo:   null,
      rating: Math.min(5, Math.max(0, form.rating)),
      pros:   form.pros.map(s => s.trim()).filter(Boolean),
      cons:   form.cons.map(s => s.trim()).filter(Boolean),
      envelopes: {
        pea:           buildEnvInfo('pea',           form.envelopes.pea),
        cto:           buildEnvInfo('cto',           form.envelopes.cto),
        assurance_vie: buildEnvInfo('assurance_vie', form.envelopes.assurance_vie),
        per:           buildEnvInfo('per',           form.envelopes.per),
        livret_a:      buildEnvInfo('livret_a',      form.envelopes.livret_a),
        ldds:          buildEnvInfo('ldds',          form.envelopes.ldds),
      },
    }
    onSave(bank)
  }

  const env = form.envelopes[activeEnv]

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-base/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h3 className="font-semibold text-sm">
            {initial ? 'Modifier le courtier' : 'Ajouter un courtier'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground w-6 h-6 flex items-center justify-center rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Informations générales ── */}
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">
              Informations générales
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-muted mb-1">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex : BoursoBank"
                  className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-purple/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as BankType }))}
                    className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-purple/50"
                  >
                    {TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Note (0 – 5)</label>
                  <input
                    type="number"
                    value={form.rating}
                    min={0} max={5} step={0.5}
                    onChange={e => setForm(f => ({ ...f, rating: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-purple/50"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Points forts & faibles ── */}
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">
              Points forts &amp; faibles
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-[10px] text-success/70 font-medium">Points forts</div>
                {form.pros.map((p, i) => (
                  <input
                    key={i}
                    type="text"
                    value={p}
                    onChange={e => {
                      const pros = [...form.pros] as [string, string, string]
                      pros[i] = e.target.value
                      setForm(f => ({ ...f, pros }))
                    }}
                    placeholder={`Avantage ${i + 1}`}
                    className="w-full bg-elevated border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted/30 focus:outline-none focus:border-success/40"
                  />
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] text-danger/70 font-medium">Points faibles</div>
                {form.cons.map((c, i) => (
                  <input
                    key={i}
                    type="text"
                    value={c}
                    onChange={e => {
                      const cons = [...form.cons] as [string, string, string]
                      cons[i] = e.target.value
                      setForm(f => ({ ...f, cons }))
                    }}
                    placeholder={`Inconvénient ${i + 1}`}
                    className="w-full bg-elevated border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted/30 focus:outline-none focus:border-danger/40"
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── Enveloppes ── */}
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">
              Configuration des enveloppes
            </h4>

            {/* Mini-tabs */}
            <div className="flex gap-0.5 mb-3 flex-wrap">
              {ENV_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveEnv(tab.key)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    activeEnv === tab.key
                      ? 'bg-purple/10 text-purple border border-purple/20'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {form.envelopes[tab.key].available && (
                    <span className="ml-1 w-1 h-1 rounded-full bg-success inline-block align-middle" />
                  )}
                </button>
              ))}
            </div>

            {/* Active envelope fields */}
            <div className="bg-elevated rounded-xl p-4 space-y-3">
              {/* Available toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={env.available}
                  onChange={e => patchEnv(activeEnv, { available: e.target.checked })}
                  className="accent-purple w-3.5 h-3.5"
                />
                <span className="text-[11px] text-foreground">Disponible</span>
              </label>

              {/* Fee fields */}
              {env.available && ENV_FIELDS[activeEnv].map(({ field, label, suffix }) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted w-44 shrink-0">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={(env as unknown as Record<string, number>)[field]}
                      min={0}
                      step={field === 'minOrder' ? 1 : 0.01}
                      onChange={e => patchEnv(activeEnv, { [field]: parseFloat(e.target.value) || 0 } as Partial<EnvFormState>)}
                      className="w-24 bg-card border border-border rounded-lg px-2 py-1 text-[11px] text-foreground font-mono focus:outline-none focus:border-purple/50"
                    />
                    <span className="text-[10px] text-muted">{suffix}</span>
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div>
                <label className="block text-[11px] text-muted mb-1">Notes</label>
                <input
                  type="text"
                  value={env.notes}
                  onChange={e => patchEnv(activeEnv, { notes: e.target.value })}
                  placeholder="Ex : 0 € sur ETF éligibles, 1,99 € min sur actions"
                  className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted/30 focus:outline-none focus:border-purple/50"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-muted hover:text-foreground transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-purple/10 text-purple border border-purple/20 hover:bg-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {initial ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
