'use client';

import { TileShell } from './common';

type Category = 'Clubhouse' | 'Landscape' | 'Utility' | 'Security';

interface Amenity {
  label: string;
  category: Category;
  note?: string;
}

// Full 23-amenity list per KB (doc 2.9 wants everything, not a "9 of 23" preview).
const AMENITIES: Amenity[] = [
  { label: 'Swimming pool', category: 'Clubhouse', note: 'Clubhouse level' },
  { label: 'Gym & fitness', category: 'Clubhouse', note: 'Double-height' },
  { label: 'Yoga & calisthenics studio', category: 'Clubhouse' },
  { label: 'Squash court', category: 'Clubhouse', note: 'Regulation size' },
  { label: '3 badminton courts', category: 'Clubhouse' },
  { label: 'Indoor games', category: 'Clubhouse' },
  { label: 'Co-working space', category: 'Clubhouse', note: 'Meeting rooms' },
  { label: 'Conference rooms', category: 'Clubhouse' },
  { label: 'Creche & learning centre', category: 'Clubhouse' },
  { label: 'Tuition centre', category: 'Clubhouse' },
  { label: 'Hobby & art centre', category: 'Clubhouse' },
  { label: 'Guest rooms', category: 'Clubhouse' },
  { label: 'Gents + ladies salon', category: 'Clubhouse' },
  { label: 'Jogging & cycling loop', category: 'Landscape' },
  { label: "Kids' play area", category: 'Landscape', note: 'Age-zoned' },
  { label: 'Senior reflexology walk', category: 'Landscape' },
  { label: 'Pet park', category: 'Landscape', note: 'Fenced loop' },
  { label: 'Basketball court', category: 'Landscape' },
  { label: 'Multi-sports turf', category: 'Landscape' },
  { label: 'EV charging', category: 'Utility', note: 'Basement level' },
  { label: 'Solar + DG backup', category: 'Utility', note: '100% backup' },
  { label: 'On-campus retail', category: 'Utility', note: 'Ratnadeep · ICICI' },
  { label: '24/7 security & CCTV', category: 'Security', note: 'Gated community' },
];

const CATEGORY_ORDER: Category[] = ['Clubhouse', 'Landscape', 'Utility', 'Security'];

export default function AmenityTile() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: AMENITIES.filter((a) => a.category === cat),
  }));

  return (
    <TileShell
      eyebrow={`${AMENITIES.length} amenities · all zones`}
      title="Lifestyle amenities"
      sub="Full clubhouse + landscape + utility + security grid."
      askMore={{
        label: 'See inside the clubhouse',
        query: 'Walk me through the clubhouse and podium amenities',
      }}
      relatedAsks={[
        { label: 'Schools nearby', query: 'What schools are within 12 minutes?' },
        { label: 'Commute time', query: 'How long to reach Loft from my place?' },
        { label: 'Book a visit', query: 'Book a site visit' },
      ]}
    >
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {grouped.map((group) => (
          <div key={group.category}>
            <div
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--plum-dark)',
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {group.category} · {group.items.length}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
              }}
            >
              {group.items.map((a) => (
                <div
                  key={a.label}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--paper)',
                    borderRadius: 10,
                    border: '1px solid var(--hairline)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--sienna)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>
                      {a.label}
                    </div>
                  </div>
                  {a.note && (
                    <div
                      style={{
                        fontSize: 10.5,
                        color: 'var(--mute)',
                        marginTop: 3,
                        marginLeft: 14,
                      }}
                    >
                      {a.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </TileShell>
  );
}
