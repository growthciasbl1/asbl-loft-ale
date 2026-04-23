'use client';

import { TileShell, TileIcon } from './common';

const SCHOOLS = [
  { name: 'Keystone International School', type: 'K–12 · IB', min: 5 },
  { name: "The Future Kid's School", type: 'Pre-K – K', min: 5 },
  { name: 'Global Edge School', type: 'K–12 · CBSE', min: 10 },
  { name: 'Oakridge International School', type: 'K–12 · IB/CBSE', min: 10 },
  { name: 'Delhi Public School', type: 'K–12 · CBSE', min: 10 },
  { name: 'The Gaudium School', type: 'K–12 · IB', min: 10 },
  { name: 'Phoenix Greens International', type: 'K–12', min: 15 },
  { name: 'Rockwell International', type: 'K–12', min: 15 },
];

const HOSPITALS = [
  { name: 'Continental Hospitals', min: 5 },
  { name: 'Apollo Hospitals', min: 5 },
  { name: 'Star Hospitals', min: 5 },
  { name: 'Care Hospitals', min: 15 },
  { name: 'AIG Hospitals', min: 15 },
];

interface Props {
  /** Which side should be shown first. Defaults to "schools" — but if the user
   *  query was hospital-specific, queryRouter passes 'hospitals' so the
   *  healthcare strip is surfaced before the school grid. */
  focus?: 'schools' | 'hospitals';
}

export default function SchoolsTile({ focus = 'schools' }: Props) {
  const isHospitalFocus = focus === 'hospitals';
  return (
    <TileShell
      eyebrow={isHospitalFocus ? 'Healthcare + schools' : 'Schools + healthcare'}
      title={
        isHospitalFocus
          ? 'Continental, Apollo and Star — all 5 minutes away.'
          : 'Eight schools. Five at 10 minutes or less.'
      }
      sub={
        isHospitalFocus
          ? 'Plus eight K–12 schools in the same 15-minute radius.'
          : 'Plus Continental, Apollo and Star Hospitals all 5 min away.'
      }
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l10 5-10 5L2 8l10-5z" />
            <path d="M6 10v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
          </svg>
        </TileIcon>
      }
      footer={<>Distances are typical midweek drives · verified via Google Distance Matrix.</>}
      askMore={{
        label: 'Book a site visit to see the neighborhood',
        query: 'Book a site visit',
      }}
      relatedAsks={[
        { label: 'Amenities', query: 'What amenities does ASBL Loft offer?' },
        { label: 'Commute to offices', query: 'How long to reach Loft from my office?' },
        { label: 'Book a visit', query: 'Book a site visit' },
      ]}
    >
      <div
        style={{
          fontSize: 9.5,
          textTransform: 'uppercase',
          letterSpacing: '0.13em',
          color: 'var(--mid-gray)',
          fontWeight: 500,
          marginBottom: 10,
        }}
      >
        K–12 schools
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {SCHOOLS.map((s) => (
          <div
            key={s.name}
            style={{
              padding: '10px 12px',
              background: 'var(--cream)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 500, fontSize: 12.5, color: 'var(--charcoal)' }}>{s.name}</span>
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--plum-dark)', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {s.min} min
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--mid-gray)', marginTop: 3 }}>{s.type}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 9.5,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--mid-gray)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          Hospitals
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {HOSPITALS.map((h) => (
            <div
              key={h.name}
              style={{
                padding: '7px 12px',
                background: 'var(--cream)',
                border: '1px solid var(--border)',
                borderRadius: 100,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: 'var(--charcoal)', fontWeight: 500 }}>{h.name}</span>
              <span className="mono" style={{ color: 'var(--plum-dark)', fontSize: 11 }}>
                {h.min} min
              </span>
            </div>
          ))}
        </div>
      </div>
    </TileShell>
  );
}
