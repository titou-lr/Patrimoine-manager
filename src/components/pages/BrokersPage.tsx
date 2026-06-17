import BanksTab from '../data/BanksTab'

export default function BrokersPage() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div
        data-tour-id="brokers-page-header"
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--surface-1)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <BankIcon />
        <div>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            Courtiers &amp; Banques
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 1 }}>
            Comparez les frais par enveloppe et importez-les dans votre simulation
          </p>
        </div>
      </div>

      {/* BanksTab fills the rest */}
      <div style={{ flex: 1, overflow: 'hidden' }} data-tour-id="brokers-filter-area">
        <BanksTab feesImport={undefined} onApplyFees={undefined} />
      </div>

    </div>
  )
}

function BankIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13h12" />
      <path d="M3 13V7" /><path d="M6 13V7" /><path d="M10 13V7" /><path d="M13 13V7" />
      <path d="M1.5 7h13L8 2z" />
    </svg>
  )
}
