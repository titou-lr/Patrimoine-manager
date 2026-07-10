import { useState } from 'react'
import { usePatrimoineStore } from '../store/usePatrimoineStore'
import {
  ASSET_CATEGORY_META,
  LIABILITY_CATEGORY_META,
  BANKING_CATEGORIES,
  REAL_ESTATE_CATEGORIES,
  type AssetGroup,
} from '../data/patrimoineCategories'
import type {
  PatrimoineAsset,
  PatrimoineAssetCategory,
  PatrimoineLiability,
  PatrimoineLiabilityCategory,
  PatrimoineMetadata,
  VersementFrequence,
  VersementPeriodique,
} from '../types/patrimoine'

const FREQUENCE_LABELS: Record<VersementFrequence, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  annual: 'Annuel',
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Cible du formulaire : création (item absent) ou édition (item présent) */
export type FormTarget =
  | { kind: 'asset'; item?: PatrimoineAsset; defaultGroup?: AssetGroup }
  | { kind: 'liability'; item?: PatrimoineLiability }

interface SimEnvelopeRef {
  id: string
  label: string
  type: string
}

interface Props {
  target: FormTarget
  simulationEnvelopes: SimEnvelopeRef[]
  onClose: () => void
}

const ASSET_CATEGORIES = Object.keys(ASSET_CATEGORY_META) as PatrimoineAssetCategory[]
const LIABILITY_CATEGORIES = Object.keys(LIABILITY_CATEGORY_META) as PatrimoineLiabilityCategory[]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <label className="caption" style={{ fontSize: 11.5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
  borderRadius: 'var(--r)', padding: '8px 10px', fontSize: 13,
  color: 'var(--ink)', outline: 'none', width: '100%',
}

export default function PatrimoineItemFormModal({ target, simulationEnvelopes, onClose }: Props) {
  const { upsertAsset, upsertLiability } = usePatrimoineStore()
  const isAsset = target.kind === 'asset'
  const editing = target.item

  const [label, setLabel] = useState(editing?.label ?? '')
  const [category, setCategory] = useState<string>(
    editing?.category
    ?? (isAsset
      ? (ASSET_CATEGORIES.find((c) => ASSET_CATEGORY_META[c].group === (target as { defaultGroup?: AssetGroup }).defaultGroup) ?? 'compte_bancaire')
      : 'credit_immobilier')
  )
  const [subcategory, setSubcategory] = useState(
    isAsset ? ((editing as PatrimoineAsset | undefined)?.subcategory ?? '') : ''
  )
  const [currentValue, setCurrentValue] = useState(editing?.currentValue ?? 0)
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [linkedEnvelopeId, setLinkedEnvelopeId] = useState(
    isAsset ? ((editing as PatrimoineAsset | undefined)?.linkedEnvelopeId ?? '') : ''
  )
  const [metadata, setMetadata] = useState<PatrimoineMetadata>(editing?.metadata ?? {})

  const assetCat = category as PatrimoineAssetCategory
  const isRealEstate = isAsset && REAL_ESTATE_CATEGORIES.includes(assetCat)
  const isBanking = isAsset && BANKING_CATEGORIES.includes(assetCat)
  // Catégories financières : versements périodiques + prix de marché par ticker
  const isFinancial = isAsset && ASSET_CATEGORY_META[assetCat]?.group === 'financier'

  const vp = (metadata.versementPeriodique as VersementPeriodique | null | undefined) ?? null

  function setVp(patch: Partial<VersementPeriodique>) {
    setMetadata((m) => {
      const cur = (m.versementPeriodique as VersementPeriodique | null | undefined) ?? {
        montant: 0, frequence: 'monthly' as VersementFrequence, prochaineDate: todayIso(), actif: false,
      }
      return { ...m, versementPeriodique: { ...cur, ...patch } }
    })
  }

  // Prix de marché : si ticker + quantité + prix unitaire connus, la valeur est calculée
  const ticker = String(metadata.ticker ?? '').trim()
  const quantite = Number(metadata.quantite)
  const prixUnitaire = Number(metadata.prixUnitaire)
  const computedValue =
    isFinancial && ticker && Number.isFinite(quantite) && quantite > 0 &&
    Number.isFinite(prixUnitaire) && prixUnitaire > 0
      ? prixUnitaire * quantite
      : null

  function metaStr(key: string): string {
    const v = metadata[key]
    return v === undefined ? '' : String(v)
  }

  function setMeta(key: string, value: string, numeric = false) {
    setMetadata((m) => {
      const next = { ...m }
      if (value === '') {
        delete next[key]
      } else {
        next[key] = numeric ? Number(value) : value
      }
      return next
    })
  }

  /** true si le versement périodique activé est incomplet (bloque le submit) */
  const vpInvalid = isFinancial && !!vp?.actif && (!(vp.montant > 0) || !vp.prochaineDate)

  function handleSubmit() {
    if (!label.trim() || currentValue < 0 || vpInvalid) return
    const now = new Date().toISOString()
    if (isAsset) {
      // Les champs financiers (versements, ticker…) ne suivent pas un
      // changement de catégorie vers immobilier/alternatif
      const cleanMeta: PatrimoineMetadata = { ...metadata }
      if (!isFinancial) {
        delete cleanMeta.versementPeriodique
        delete cleanMeta.ticker
        delete cleanMeta.quantite
        delete cleanMeta.prixUnitaire
        delete cleanMeta.lastPriceFetchAt
      } else if (!ticker) {
        delete cleanMeta.lastPriceFetchAt
      }
      upsertAsset({
        id: editing?.id,
        label: label.trim(),
        category: assetCat,
        subcategory: subcategory.trim() || undefined,
        currentValue: computedValue ?? currentValue,
        currency: editing?.currency ?? 'EUR',
        lastUpdatedAt: now,
        notes: notes.trim() || undefined,
        linkedEnvelopeId: linkedEnvelopeId || undefined,
        metadata: Object.keys(cleanMeta).length > 0 ? cleanMeta : undefined,
      })
    } else {
      upsertLiability({
        id: editing?.id,
        label: label.trim(),
        category: category as PatrimoineLiabilityCategory,
        currentValue,
        currency: editing?.currency ?? 'EUR',
        lastUpdatedAt: now,
        notes: notes.trim() || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      })
    }
    onClose()
  }

  const linkedEnv = simulationEnvelopes.find((e) => e.id === linkedEnvelopeId)

  return (
    <div className="scrim" onMouseDown={onClose} style={{ zIndex: 100 }}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="scroll"
        style={{
          width: 480, maxHeight: '86vh', overflowY: 'auto',
          background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-pop)', padding: 22,
          animation: 'pop .18s var(--ease)',
        }}
      >
        <div className="spread" style={{ marginBottom: 18 }}>
          <div className="title">
            {editing ? 'Modifier' : 'Ajouter'} {isAsset ? 'un actif' : 'un passif'}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <Field label="Catégorie">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              {(isAsset ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map((c) => (
                <option key={c} value={c}>
                  {isAsset
                    ? ASSET_CATEGORY_META[c as PatrimoineAssetCategory].label
                    : LIABILITY_CATEGORY_META[c as PatrimoineLiabilityCategory].label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Libellé">
            <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle}
              placeholder={isAsset ? 'Ex. PEA Bourse Direct, Appartement Lyon…' : 'Ex. Prêt résidence principale'} />
          </Field>

          <div className="row gap12">
            <Field label={isAsset ? 'Valeur actuelle (€)' : 'Capital restant dû (€)'}>
              <input
                type="number" min={0}
                value={computedValue !== null ? Math.round(computedValue * 100) / 100 : (currentValue || '')}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
                readOnly={computedValue !== null}
                title={computedValue !== null ? 'Calculée automatiquement : prix unitaire × quantité' : undefined}
                style={{ ...inputStyle, ...(computedValue !== null ? { opacity: 0.65, cursor: 'not-allowed' } : {}) }}
              />
            </Field>
            {isAsset && (
              <Field label="Sous-catégorie (libre)">
                <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} style={inputStyle}
                  placeholder="Ex. ETF World, Studio T1…" />
              </Field>
            )}
          </div>

          {/* ── Champs contextuels : immobilier ─────────────────────────── */}
          {isRealEstate && (
            <>
              <Field label="Adresse">
                <input value={metaStr('adresse')} onChange={(e) => setMeta('adresse', e.target.value)} style={inputStyle} />
              </Field>
              <div className="row gap12">
                <Field label="Surface (m²)">
                  <input type="number" min={0} value={metaStr('surface')} onChange={(e) => setMeta('surface', e.target.value, true)} style={inputStyle} />
                </Field>
                {assetCat === 'immobilier_locatif' && (
                  <Field label="Loyer mensuel (€)">
                    <input type="number" min={0} value={metaStr('loyerMensuel')} onChange={(e) => setMeta('loyerMensuel', e.target.value, true)} style={inputStyle} />
                  </Field>
                )}
                <Field label="Encours crédit (€)">
                  <input type="number" min={0} value={metaStr('encoursCredit')} onChange={(e) => setMeta('encoursCredit', e.target.value, true)} style={inputStyle} />
                </Field>
              </div>
              <div className="row gap12">
                <Field label="Date d'acquisition">
                  <input type="date" value={metaStr('dateAcquisition')} onChange={(e) => setMeta('dateAcquisition', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Valeur d'acquisition (€)">
                  <input type="number" min={0} value={metaStr('valeurAcquisition')} onChange={(e) => setMeta('valeurAcquisition', e.target.value, true)} style={inputStyle} />
                </Field>
              </div>
            </>
          )}

          {/* ── Champs contextuels : bancaire / enveloppes ──────────────── */}
          {isBanking && (
            <>
              <div className="row gap12">
                <Field label="Établissement">
                  <input value={metaStr('etablissement')} onChange={(e) => setMeta('etablissement', e.target.value)} style={inputStyle}
                    placeholder="Ex. Boursorama, Fortuneo…" />
                </Field>
                <Field label="IBAN (optionnel)">
                  <input value={metaStr('iban')} onChange={(e) => setMeta('iban', e.target.value)} style={inputStyle}
                    placeholder="FR76…" />
                </Field>
              </div>
              <Field label="Lier à une enveloppe de simulation (informatif)">
                <select value={linkedEnvelopeId} onChange={(e) => setLinkedEnvelopeId(e.target.value)} style={inputStyle}>
                  <option value="">— Aucune liaison —</option>
                  {simulationEnvelopes.map((env) => (
                    <option key={env.id} value={env.id}>{env.label}</option>
                  ))}
                </select>
              </Field>
              {linkedEnv && (
                <div className="caption" style={{
                  fontSize: 11.5, color: 'var(--primary-hover)',
                  padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--r)',
                }}>
                  ℹ Synchronisé avec simulation {linkedEnv.label} — lien purement informatif,
                  aucune écriture automatique dans la simulation.
                </div>
              )}
            </>
          )}

          {/* ── Prix de marché par ticker (catégories financières) ─────── */}
          {isFinancial && (
            <div className="col" style={{
              gap: 12, padding: '12px 14px', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', background: 'var(--surface-1)',
            }}>
              <div className="subhead" style={{ fontSize: 13 }}>Prix de marché (optionnel)</div>
              <div className="row gap12">
                <Field label="Ticker Yahoo Finance">
                  <input value={String(metadata.ticker ?? '')} onChange={(e) => setMeta('ticker', e.target.value)}
                    style={inputStyle} placeholder="Ex. EWLD.PA, BTC-EUR, OR=F" />
                </Field>
                <Field label="Quantité détenue">
                  <input type="number" min={0} step="any" value={metaStr('quantite')}
                    onChange={(e) => setMeta('quantite', e.target.value, true)} style={inputStyle} />
                </Field>
                <Field label="Prix unitaire (€)">
                  <input
                    value={Number.isFinite(prixUnitaire) && prixUnitaire > 0 ? prixUnitaire.toFixed(2) : '—'}
                    readOnly
                    title="Mis à jour automatiquement au lancement de l'app"
                    style={{ ...inputStyle, opacity: 0.65, cursor: 'not-allowed' }}
                  />
                </Field>
              </div>
              <div className="caption" style={{ fontSize: 11 }}>
                Si ticker et quantité sont renseignés, la valeur de l'actif est calculée
                (prix × quantité) et actualisée à chaque lancement de l'app. Sinon elle reste saisie manuellement.
              </div>
            </div>
          )}

          {/* ── Versements périodiques (catégories financières) ────────── */}
          {isFinancial && (
            <div className="col" style={{
              gap: 12, padding: '12px 14px', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', background: 'var(--surface-1)',
            }}>
              <label className="row gap8" style={{ alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={vp?.actif ?? false}
                  onChange={(e) => setVp({ actif: e.target.checked })}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span className="subhead" style={{ fontSize: 13 }}>Versements périodiques automatiques</span>
              </label>
              {vp?.actif && (
                <>
                  <div className="row gap12">
                    <Field label="Montant (€)">
                      <input type="number" min={0} value={vp.montant || ''}
                        onChange={(e) => setVp({ montant: Number(e.target.value) })} style={inputStyle} />
                    </Field>
                    <Field label="Fréquence">
                      <select value={vp.frequence} onChange={(e) => setVp({ frequence: e.target.value as VersementFrequence })} style={inputStyle}>
                        {(Object.keys(FREQUENCE_LABELS) as VersementFrequence[]).map((f) => (
                          <option key={f} value={f}>{FREQUENCE_LABELS[f]}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Prochain versement">
                      <input type="date" value={vp.prochaineDate}
                        onChange={(e) => setVp({ prochaineDate: e.target.value })} style={inputStyle} />
                    </Field>
                  </div>
                  <div className="caption" style={{ fontSize: 11 }}>
                    Les versements échus sont ajoutés automatiquement à la valeur de l'actif
                    au lancement de l'app — aucun snapshot n'est pris automatiquement.
                  </div>
                  {vpInvalid && (
                    <div className="caption" style={{ fontSize: 11, color: 'var(--danger)' }}>
                      Renseignez un montant positif et une date de prochain versement.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
          </Field>
        </div>

        <div className="row gap8" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!label.trim() || vpInvalid}>
            {editing ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
