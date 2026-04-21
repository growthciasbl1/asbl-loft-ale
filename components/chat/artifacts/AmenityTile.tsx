'use client';

import { TileShell } from './common';

const ITEMS = [
  { icon: 'pool', label: 'Swimming pool', note: 'Clubhouse level' },
  { icon: 'gym', label: 'Gym + yoga', note: 'Double-height' },
  { icon: 'squash', label: 'Squash court', note: 'Regulation size' },
  { icon: 'play', label: "Kids' play", note: 'Age-zoned' },
  { icon: 'pet', label: 'Pet park', note: 'Fenced loop' },
  { icon: 'work', label: 'Co-working', note: 'Meeting rooms' },
  { icon: 'ev', label: 'EV charging', note: 'Basement level' },
  { icon: 'solar', label: 'Solar + DG', note: '100% backup' },
  { icon: 'shop', label: 'On-campus retail', note: 'Ratnadeep · ICICI' },
];

const PATHS: Record<string, string> = {
  pool: 'M2 18c3 0 3-2 6-2s3 2 6 2 3-2 6-2M2 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2M12 7a3 3 0 100-6 3 3 0 000 6z',
  gym: 'M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12',
  squash: 'M12 3v18M3 12h18M12 3a9 9 0 110 18 9 9 0 010-18z',
  play: 'M5 21V8l7-4 7 4v13M9 21v-6h6v6',
  pet: 'M4.5 10.5a2 2 0 104 0 2 2 0 00-4 0zM15.5 10.5a2 2 0 104 0 2 2 0 00-4 0zM8 16c0-2 2-3 4-3s4 1 4 3-2 4-4 4-4-2-4-4z',
  work: 'M3 6h18v10H3zM8 21h8M12 16v5',
  ev: 'M4 17V7a2 2 0 012-2h8a2 2 0 012 2v10M4 17h12M16 11h3l2 2v4h-5M10 10l-2 4h3l-2 4',
  solar: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3L5 5M19 19l-1.3-1.3M6.3 17.7L5 19M19 5l-1.3 1.3M12 8a4 4 0 100 8 4 4 0 000-8z',
  shop: 'M4 7h16l-1.5 10a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7L4 7zM8 7V5a4 4 0 018 0v2',
};

export default function AmenityTile() {
  return (
    <TileShell
      title="Lifestyle amenities"
      sub="9 of 23 · the full grid adapts to your household"
      askMore={{ label: 'Family-curated grid', query: 'Show me amenities curated for a family with kids' }}
      relatedAsks={[
        { label: 'Schools nearby', query: 'What schools are within 12 minutes?' },
        { label: 'Commute time', query: 'How long to Hitech City?' },
        { label: 'Book a visit', query: 'Book a weekend tour slot' },
      ]}
    >
      <div style={{ padding: 26 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {ITEMS.map((x) => (
            <div
              key={x.label}
              style={{
                padding: '14px 12px',
                background: 'var(--paper)',
                borderRadius: 10,
                transition: 'all 200ms',
                cursor: 'pointer',
              }}
              className="hover:bg-[var(--paper-2)]"
            >
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--sienna)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: 10 }}
              >
                <path d={PATHS[x.icon]} />
              </svg>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>
                {x.label}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mute)', marginTop: 2 }}>{x.note}</div>
            </div>
          ))}
        </div>
      </div>
    </TileShell>
  );
}
