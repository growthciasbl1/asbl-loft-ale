'use client';

import { TileShell } from './common';

export default function YieldTile() {
  return (
    <TileShell
      eyebrow="Indicative · not guaranteed"
      title="Rental yield · 1,695 East"
      sub="Against ₹2.07 Cr all-in · 11 active FD 3BHK comps"
      footer={
        <>
          Rental comps from Magicbricks + NoBroker, Q1 2026. Capital appreciation is tracked
          separately.
        </>
      }
      askMore={{ label: 'Run the levered IRR calculator', query: 'Open the levered finance calculator' }}
      relatedAsks={[
        { label: 'Tenant demographics', query: 'Who rents in Financial District?' },
        { label: 'Price trends', query: 'Show me FD 3BHK price trends last 3 years' },
        { label: 'Live inventory', query: 'Show me available high-yield units' },
      ]}
    >
      <div style={{ padding: 26 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 18,
          }}
        >
          {[
            { label: 'Monthly rent (comps)', num: '₹45k', unit: '–₹60k', sub: '11 active listings' },
            { label: 'Gross annual yield', num: '2.6', unit: '–3.5%', sub: 'Against all-in price' },
          ].map((c) => (
            <div
              key={c.label}
              style={{ padding: 16, background: 'var(--paper)', borderRadius: 10 }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--mute)',
                  marginBottom: 6,
                }}
              >
                {c.label}
              </div>
              <div className="display" style={{ fontSize: 26, lineHeight: 1 }}>
                {c.num}
                <span
                  style={{
                    fontFamily: 'Instrument Sans, sans-serif',
                    fontSize: 13,
                    color: 'var(--mute)',
                    fontWeight: 400,
                    marginLeft: 4,
                  }}
                >
                  {c.unit}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 8 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            height: 6,
            background: 'var(--paper-2)',
            borderRadius: 100,
            overflow: 'hidden',
            marginBottom: 6,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '23%',
              width: '32%',
              top: 0,
              bottom: 0,
              background: 'linear-gradient(to right, var(--sienna), var(--sienna-dark))',
              borderRadius: 100,
            }}
          />
        </div>
        <div
          className="mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10.5,
            color: 'var(--mute)',
          }}
        >
          <span>1%</span>
          <span>2.5%</span>
          <span>4%</span>
          <span>5.5%</span>
        </div>
      </div>
    </TileShell>
  );
}
