'use client';

import { TileShell, TileRow } from './common';
import LeadGate from '../LeadGate';

export default function PriceTile() {
  const basePreview = (
    <div style={{ padding: '6px 26px', filter: 'blur(6px)', pointerEvents: 'none' }}>
      <TileRow label="GST (5%)" value="₹—" note="Locked" />
      <TileRow label="Other charges" value="₹—" note="Maintenance · Move-in · Corpus" />
      <div
        style={{
          padding: '22px 0 6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'var(--mute)',
            }}
          >
            All-in
          </div>
          <div
            className="display"
            style={{ fontSize: 40, lineHeight: 1, marginTop: 6, fontWeight: 400 }}
          >
            ≈ ₹— <em style={{ color: 'var(--sienna)', fontStyle: 'italic' }}>Cr</em>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <TileShell
      eyebrow="Total build-up"
      title="1,695 sqft · East"
      sub="3BHK · ASBL Loft, Financial District"
      footer={
        <>
          Excludes stamp duty and registration. Handover:{' '}
          <b style={{ color: 'var(--ink-2)' }}>December 2026</b>. TS RERA P02400006761.
        </>
      }
      askMore={{
        label: 'Show payment plans',
        query: 'Show me the payment plan schedule and booking amount',
      }}
      relatedAsks={[
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Payment structure', query: 'Show me the payment plan schedule and booking amount' },
        { label: 'FOIR check', query: 'Check affordability using FOIR' },
        { label: 'Price trend', query: 'How has FD price trend moved?' },
        { label: 'Compare projects', query: 'Compare ASBL Loft with other FD projects' },
        { label: 'Unit plan', query: 'Show me the 1695 East unit plan' },
      ]}
    >
      {/* Always visible: Base + Total sale consideration (doc 3.1) */}
      <div style={{ padding: '6px 26px' }}>
        <TileRow label="Base price" value="₹1,94,00,000" note="₹1.94 Cr" />
        <TileRow
          label="Total sale consideration"
          value="₹2,03,70,000"
          note="Base + 5% GST"
          highlight
        />
      </div>

      {/* Inline-gated: GST + Other charges + All-in */}
      <div style={{ padding: '6px 0 0' }}>
        <LeadGate reason="Unlock full cost breakdown" preview={basePreview}>
          <div style={{ padding: '6px 26px' }}>
            <TileRow label="GST (5%)" value="₹9,70,000" note="₹9.70 L" />
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
              <div
                style={{
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: 'var(--mute)',
                }}
              >
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
        </LeadGate>
      </div>
    </TileShell>
  );
}
