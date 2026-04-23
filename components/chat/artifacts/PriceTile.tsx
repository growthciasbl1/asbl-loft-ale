'use client';

import { TileShell, TileRow } from './common';

export default function PriceTile() {
  return (
    <TileShell
      eyebrow="Total build-up"
      title="1,695 sqft · East"
      sub="3BHK · ASBL Loft, Financial District"
      footer={
        <>
          Excludes stamp duty and registration. Handover: <b style={{ color: 'var(--ink-2)' }}>December 2026</b>.
          TS RERA P02400006761.
        </>
      }
      askMore={{ label: 'Show payment plans', query: 'Show me the payment plan schedule and first cheque amount' }}
      relatedAsks={[
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Price trend', query: 'How has FD price trend moved?' },
        { label: 'Compare with other FD projects', query: 'Compare ASBL Loft with other FD projects' },
        { label: 'Can I afford this?', query: 'Check affordability · ₹25L salary' },
        { label: 'Unit plan', query: 'Show me the 1695 East unit plan' },
      ]}
    >
      <div style={{ padding: '6px 26px' }}>
        <TileRow label="Base price" value="₹1,94,00,000" note="₹1.94 Cr" />
        <TileRow label="GST (5%)" value="₹9,70,000" note="₹9.70 L" />
        <TileRow label="Total sale consideration" value="₹2,03,70,000" note="₹2.03 Cr" highlight />
        <TileRow
          label="Other charges"
          value="₹3,81,111"
          note="Maintenance 2 yrs · Move-in · Corpus"
        />
      </div>
      <div
        style={{
          padding: '22px 26px',
          background: 'var(--paper)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--mute)' }}>
            All-in
          </div>
          <div
            className="display"
            style={{ fontSize: 40, lineHeight: 1, marginTop: 6, fontWeight: 400 }}
          >
            ≈ ₹2.07 <em style={{ color: 'var(--sienna)', fontStyle: 'italic' }}>Cr</em>
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
          ₹2,07,51,111
        </div>
      </div>
    </TileShell>
  );
}
