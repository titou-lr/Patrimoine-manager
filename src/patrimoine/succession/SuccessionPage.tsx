import { useMemo, useState } from 'react'
import { useStore, selectActiveSim } from '../../store/useStore'
import { usePatrimoineStore } from '../store/usePatrimoineStore'
import { computePatrimoineNet } from '../engine/patrimoineEngine'
import {
  computeSuccession,
  LIEN_LABELS,
  RAPPEL_FISCAL_YEARS,
  type Beneficiaire,
  type DonationHistorique,
  type LienParente,
} from './successionEngine'
import { formatEur, formatPct } from '../../utils/format'
import HelpButton from '../../help/components/HelpButton'
import type { SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
  onBack: () => void
}

const LIENS = Object.keys(LIEN_LABELS) as LienParente[]

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
  borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
  color: 'var(--ink)', outline: 'none', width: '100%',
}

const DONATION_TYPE_LABELS: Record<DonationHistorique['type'], string> = {
  manuel: 'Donation manuelle',
  assurance_vie_avant_70: 'AV — versements avant 70 ans',
  assurance_vie_apres_70: 'AV — versements après 70 ans',
}

export default function SuccessionPage({ results, onBack }: Props) {
  const { globalParams } = useStore(selectActiveSim)
  const {
    assets, liabilities, beneficiaires, donations,
    upsertBeneficiaire, removeBeneficiaire, upsertDonation, removeDonation,
  } = usePatrimoineStore()

  const [includeAV, setIncludeAV] = useState(true)
  const [projectionYears, setProjectionYears] = useState(0)
  const [showBenefForm, setShowBenefForm] = useState(false)
  const [showDonationForm, setShowDonationForm] = useState(false)

  // Formulaires locaux
  const [benefForm, setBenefForm] = useState<{ prenom: string; lienParente: LienParente; dateNaissance: string; partPct: number }>({
    prenom: '', lienParente: 'enfant', dateNaissance: '1990-01-01', partPct: 50,
  })
  const [donForm, setDonForm] = useState<{ beneficiaireId: string; montant: number; date: string; type: DonationHistorique['type'] }>({
    beneficiaireId: '', montant: 10000, date: new Date().toISOString().slice(0, 10), type: 'manuel',
  })

  const net = useMemo(() => computePatrimoineNet(assets, liabilities), [assets, liabilities])

  // Projection : patrimoine actuel + croissance simulée entre aujourd'hui et l'année cible
  const masseBase = useMemo(() => {
    if (projectionYears <= 0 || results.length === 0) return net.patrimoineNet
    const idx = Math.min(projectionYears, results.length) - 1
    const growth = results[idx].totalNominal - (results[0]?.totalNominal ?? 0)
    return net.patrimoineNet + Math.max(0, growth)
  }, [net.patrimoineNet, projectionYears, results])

  const ageDefunt = (globalParams.ageActuel ?? 40) + projectionYears

  const totalParts = beneficiaires.reduce((s, b) => s + b.partSuccessorale, 0)
  const partsValid = Math.abs(totalParts - 1) < 0.001

  const result = useMemo(
    () => computeSuccession(masseBase, assets, beneficiaires, donations, ageDefunt, {
      includeAssuranceVieHorsSuccession: includeAV,
    }),
    [masseBase, assets, beneficiaires, donations, ageDefunt, includeAV]
  )

  function handleAddBenef() {
    if (!benefForm.prenom.trim()) return
    upsertBeneficiaire({
      prenom: benefForm.prenom.trim(),
      lienParente: benefForm.lienParente,
      dateNaissance: benefForm.dateNaissance,
      partSuccessorale: benefForm.partPct / 100,
    })
    setShowBenefForm(false)
    setBenefForm({ prenom: '', lienParente: 'enfant', dateNaissance: '1990-01-01', partPct: 50 })
  }

  function handleAddDonation() {
    if (!donForm.beneficiaireId || donForm.montant <= 0) return
    upsertDonation({ ...donForm })
    setShowDonationForm(false)
  }

  return (
    <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="spread" style={{ marginBottom: 22 }} data-tour-id="succession-header">
          <div>
            <div className="row gap8" style={{ marginBottom: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={onBack}>← Patrimoine</button>
              <h1 className="headline">Succession / Donation</h1>
            </div>
            <div className="caption">
              Droits de succession projetés — droit fiscal français, barèmes 2024.
              Estimation indicative, ne remplace pas un conseil notarial.
            </div>
          </div>
          <HelpButton page="succession" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 24, alignItems: 'start' }}>

          {/* ══ Section gauche — Paramétrage ═════════════════════════════ */}
          <div className="col" style={{ gap: 16 }}>

            {/* Bénéficiaires */}
            <div className="panel" style={{ padding: 18 }} data-tour-id="succession-benef-panel">
              <div className="spread" style={{ marginBottom: 12 }}>
                <div className="title">Bénéficiaires</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowBenefForm(!showBenefForm)}>+ Ajouter</button>
              </div>

              {!partsValid && beneficiaires.length > 0 && (
                <div className="caption" style={{
                  color: 'var(--warning)', marginBottom: 10, padding: '6px 10px',
                  background: 'var(--bg-elevated)', borderRadius: 'var(--r)', fontSize: 11.5,
                }}>
                  ⚠ Le total des parts fait {(totalParts * 100).toFixed(0)} % — il devrait faire 100 %.
                </div>
              )}

              {beneficiaires.length === 0 && !showBenefForm && (
                <div className="caption" style={{ padding: '8px 0' }}>
                  Ajoutez vos héritiers avec leur lien de parenté et leur part successorale.
                </div>
              )}

              <div className="col gap8">
                {beneficiaires.map((b: Beneficiaire) => (
                  <div key={b.id} className="row gap10" style={{ alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--hairline)' }}>
                    <div className="grow">
                      <div className="small" style={{ fontWeight: 500 }}>{b.prenom}</div>
                      <div className="caption" style={{ fontSize: 11 }}>
                        {LIEN_LABELS[b.lienParente]} · né(e) le {new Date(b.dateNaissance).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <input
                      type="number" min={0} max={100}
                      value={Math.round(b.partSuccessorale * 100)}
                      onChange={(e) => upsertBeneficiaire({ ...b, partSuccessorale: Number(e.target.value) / 100 })}
                      style={{ ...inputStyle, width: 62, textAlign: 'right' }}
                    />
                    <span className="caption">%</span>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                      onClick={() => removeBeneficiaire(b.id)}>✕</button>
                  </div>
                ))}
              </div>

              {showBenefForm && (
                <div className="col" style={{ gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                  <div className="row gap10">
                    <input placeholder="Prénom" value={benefForm.prenom}
                      onChange={(e) => setBenefForm((f) => ({ ...f, prenom: e.target.value }))} style={inputStyle} />
                    <select value={benefForm.lienParente}
                      onChange={(e) => setBenefForm((f) => ({ ...f, lienParente: e.target.value as LienParente }))} style={inputStyle}>
                      {LIENS.map((l) => <option key={l} value={l}>{LIEN_LABELS[l]}</option>)}
                    </select>
                  </div>
                  <div className="row gap10">
                    <input type="date" value={benefForm.dateNaissance}
                      onChange={(e) => setBenefForm((f) => ({ ...f, dateNaissance: e.target.value }))} style={inputStyle} />
                    <div className="row gap4" style={{ alignItems: 'center' }}>
                      <input type="number" min={0} max={100} value={benefForm.partPct}
                        onChange={(e) => setBenefForm((f) => ({ ...f, partPct: Number(e.target.value) }))}
                        style={{ ...inputStyle, width: 70 }} />
                      <span className="caption">%</span>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleAddBenef} disabled={!benefForm.prenom.trim()}>
                    Ajouter le bénéficiaire
                  </button>
                </div>
              )}
            </div>

            {/* Donations */}
            <div className="panel" style={{ padding: 18 }}>
              <div className="spread" style={{ marginBottom: 12 }}>
                <div>
                  <div className="title">Donations passées</div>
                  <div className="caption" style={{ fontSize: 11 }}>
                    Rappel fiscal : les donations des {RAPPEL_FISCAL_YEARS} dernières années réduisent l'abattement
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDonationForm(!showDonationForm)}
                  disabled={beneficiaires.length === 0}>+ Ajouter</button>
              </div>

              <div className="col gap8">
                {donations.map((d) => {
                  const benef = beneficiaires.find((b) => b.id === d.beneficiaireId)
                  return (
                    <div key={d.id} className="row gap10" style={{ alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--hairline)' }}>
                      <div className="grow">
                        <div className="small">{benef?.prenom ?? '?'} — {formatEur(d.montant)}</div>
                        <div className="caption" style={{ fontSize: 11 }}>
                          {new Date(d.date).toLocaleDateString('fr-FR')} · {DONATION_TYPE_LABELS[d.type]}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                        onClick={() => removeDonation(d.id)}>✕</button>
                    </div>
                  )
                })}
              </div>

              {showDonationForm && (
                <div className="col" style={{ gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                  <select value={donForm.beneficiaireId}
                    onChange={(e) => setDonForm((f) => ({ ...f, beneficiaireId: e.target.value }))} style={inputStyle}>
                    <option value="">— Bénéficiaire —</option>
                    {beneficiaires.map((b) => <option key={b.id} value={b.id}>{b.prenom}</option>)}
                  </select>
                  <div className="row gap10">
                    <input type="number" min={0} value={donForm.montant || ''}
                      onChange={(e) => setDonForm((f) => ({ ...f, montant: Number(e.target.value) }))}
                      style={inputStyle} placeholder="Montant €" />
                    <input type="date" value={donForm.date}
                      onChange={(e) => setDonForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
                  </div>
                  <select value={donForm.type}
                    onChange={(e) => setDonForm((f) => ({ ...f, type: e.target.value as DonationHistorique['type'] }))} style={inputStyle}>
                    {(Object.keys(DONATION_TYPE_LABELS) as DonationHistorique['type'][]).map((t) => (
                      <option key={t} value={t}>{DONATION_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={handleAddDonation}
                    disabled={!donForm.beneficiaireId || donForm.montant <= 0}>
                    Enregistrer la donation
                  </button>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="panel" style={{ padding: 18 }}>
              <div className="title" style={{ marginBottom: 12 }}>Options</div>
              <label className="row gap10" style={{ alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={includeAV} onChange={(e) => setIncludeAV(e.target.checked)} />
                <div>
                  <div className="small">Assurance-vie hors succession</div>
                  <div className="caption" style={{ fontSize: 11 }}>
                    Régime 990 I pour les contrats alimentés avant 70 ans : abattement 152 500 € / bénéficiaire,
                    puis 20 % jusqu'à 700 k€ et 31,25 % au-delà
                  </div>
                </div>
              </label>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hairline)' }} data-tour-id="succession-projection">
                <div className="spread" style={{ marginBottom: 6 }}>
                  <span className="small">Projeter dans</span>
                  <span className="mono small">{projectionYears === 0 ? "aujourd'hui" : `${projectionYears} an${projectionYears > 1 ? 's' : ''}`}</span>
                </div>
                <input
                  type="range" min={0} max={Math.max(results.length, 0)} value={projectionYears}
                  onChange={(e) => setProjectionYears(Number(e.target.value))}
                  style={{ width: '100%' }}
                  disabled={results.length === 0}
                />
                <div className="caption" style={{ fontSize: 11, marginTop: 4 }}>
                  {results.length === 0
                    ? 'Lancez une simulation pour projeter la masse successorale dans le futur.'
                    : `Ajoute la croissance simulée du patrimoine à l'année cible (âge : ${ageDefunt} ans).`}
                </div>
              </div>
            </div>
          </div>

          {/* ══ Section droite — Résultats (live) ════════════════════════ */}
          <div className="col" style={{ gap: 16 }}>

            <div className="kpi-row" style={{ padding: '4px 0' }}>
              <div className="kpi">
                <div className="kpi-label">Masse successorale</div>
                <div className="kpi-value">{formatEur(result.masseSuccessorale)}</div>
                {result.assuranceVieHorsSuccession > 0 && (
                  <div className="caption" style={{ fontSize: 11 }}>
                    + {formatEur(result.assuranceVieHorsSuccession)} d'AV hors succession
                  </div>
                )}
              </div>
              <div className="kpi">
                <div className="kpi-label">Total droits estimés</div>
                <div className="kpi-value" style={{ color: 'var(--danger)' }}>{formatEur(result.totalDroits)}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Transmis net de droits</div>
                <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatEur(result.patrimoineTransmisNet)}</div>
              </div>
            </div>

            <div className="panel" style={{ padding: 18 }} data-tour-id="succession-results-panel">
              <div className="title" style={{ marginBottom: 14 }}>Détail par bénéficiaire</div>
              {result.byBeneficiaire.length === 0 ? (
                <div className="caption" style={{ padding: '18px 0', textAlign: 'center' }}>
                  Ajoutez des bénéficiaires pour voir la répartition et les droits estimés.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ textAlign: 'right', color: 'var(--ink-tertiary)', fontSize: 11 }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 500 }}>Bénéficiaire</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500 }}>Part brute</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500 }}>Abattement</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500 }}>Base imposable</th>
                        <th style={{ padding: '6px 8px', fontWeight: 500 }}>Droits</th>
                        <th style={{ padding: '6px 0 6px 8px', fontWeight: 500 }}>Taux effectif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.byBeneficiaire.map((r) => (
                        <tr key={r.beneficiaireId} style={{ borderTop: '1px solid var(--hairline)', textAlign: 'right' }}>
                          <td style={{ textAlign: 'left', padding: '8px 8px 8px 0' }}>
                            <div className="small" style={{ fontWeight: 500 }}>{r.prenom}</div>
                            <div className="caption" style={{ fontSize: 10.5 }}>{LIEN_LABELS[r.lienParente]}</div>
                          </td>
                          <td className="mono" style={{ padding: '8px' }}>{formatEur(r.part)}</td>
                          <td className="mono muted" style={{ padding: '8px' }}>
                            {formatEur(r.abattementUtilise)}
                            {r.abattementDisponible > r.abattementUtilise && (
                              <div className="caption" style={{ fontSize: 10 }}>
                                / {formatEur(r.abattementDisponible)} dispo
                              </div>
                            )}
                          </td>
                          <td className="mono" style={{ padding: '8px' }}>{formatEur(r.baseImposable)}</td>
                          <td className="mono" style={{ padding: '8px', color: r.droits > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {formatEur(r.droits)}
                          </td>
                          <td className="mono" style={{ padding: '8px 0 8px 8px' }}>{formatPct(r.tauxEffectif * 100, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.byBeneficiaire.some((r) => r.avPrelevement > 0) && (
                <div className="caption" style={{ fontSize: 11, marginTop: 10 }}>
                  Les droits incluent le prélèvement spécifique assurance-vie (art. 990 I) le cas échéant.
                </div>
              )}
            </div>

            <div className="caption" style={{ fontSize: 11, lineHeight: 1.5 }}>
              Hypothèses : abattements et barèmes 2024 (CGI art. 777 et 779), exonération totale du conjoint/PACS
              (loi TEPA 2007), rappel fiscal des donations sur {RAPPEL_FISCAL_YEARS} ans. L'âge aux versements AV est
              approximé par l'âge du défunt à la date de projection.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
