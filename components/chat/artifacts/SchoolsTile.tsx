'use client';

import { TileShell } from './common';

const SCHOOLS = [
  { name: 'Delhi Public School', type: 'K–12 · CBSE', distance: '6 min', fees: '₹1.6–2.2L/yr' },
  { name: 'Oakridge International', type: 'K–12 · IB/CBSE', distance: '8 min', fees: '₹4.5–7L/yr' },
  { name: 'Chirec International', type: 'K–12 · CBSE/IB', distance: '10 min', fees: '₹2.8–4.2L/yr' },
  { name: 'The Gaudium School', type: 'K–12 · IB', distance: '12 min', fees: '₹5–8L/yr' },
  { name: 'Meridian School', type: 'K–12 · CBSE', distance: '9 min', fees: '₹1.4–1.9L/yr' },
  { name: 'Glendale Academy', type: 'K–12 · CBSE/IB', distance: '7 min', fees: '₹2.2–3.5L/yr' },
];

const COLLEGES = [
  { name: 'ISB Hyderabad', distance: '9 min' },
  { name: 'IIT Hyderabad', distance: '20 min' },
  { name: 'IIIT Hyderabad', distance: '18 min' },
  { name: 'University of Hyderabad', distance: '25 min' },
];

export default function SchoolsTile() {
  return (
    <TileShell
      eyebrow="12-minute school radius"
      title="Six schools. Twelve minutes."
      sub="Every K–12 option a family typically shortlists — with honest fee brackets."
      footer={<>Commute times are midweek 8am departure · distances via Google Maps.</>}
      askMore={{
        label: 'Connect me with families already living here',
        query: 'Connect me with 3 families inside Loft — by school preference',
      }}
      relatedAsks={[
        { label: 'Family amenities', query: 'Show me family-friendly amenities' },
        { label: 'Floor plans', query: 'Show me the 1870 floor plan for a family' },
        { label: 'Book a Saturday tour', query: 'Book a Saturday family tour slot' },
      ]}
    >
      <div style={{ padding: '20px 26px' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--mute)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          K–12
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {SCHOOLS.map((s) => (
            <div
              key={s.name}
              style={{
                padding: 14,
                background: 'var(--paper)',
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--sienna-dark)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.distance}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 4 }}>{s.type}</div>
              <div
                className="mono"
                style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6, fontWeight: 500 }}
              >
                {s.fees}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 26px', borderTop: '1px solid var(--paper-2)' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--mute)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          Higher ed · same radius
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COLLEGES.map((c) => (
            <div
              key={c.name}
              style={{
                padding: '8px 14px',
                background: 'var(--paper)',
                borderRadius: 100,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              <span className="mono" style={{ color: 'var(--sienna-dark)', fontSize: 11 }}>
                {c.distance}
              </span>
            </div>
          ))}
        </div>
      </div>
    </TileShell>
  );
}
