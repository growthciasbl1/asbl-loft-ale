'use client';

import { TileShell } from './common';

/**
 * ASBL Loft's "Urban Corridor" is a branded feature of the ground floor of
 * each tower — a wide double-height retail + amenity spine that residents
 * walk through every day. NOT the Hyderabad IT corridor (that's covered
 * separately under the commute / why_fd tiles). Content sourced from the
 * SYSTEM_PROMPT KB (Tower A and Tower B sections).
 */

interface CorridorFeature {
  label: string;
  note?: string;
}

const TOWER_A_FEATURES: CorridorFeature[] = [
  { label: 'Grand double-height entrance', note: 'Ceremonial arrival' },
  { label: 'Reflection pools', note: 'Calm-down buffer' },
  { label: 'Zen garden', note: 'Contemplative pause' },
  { label: 'Co-working space #1', note: '4 conference rooms shared' },
  { label: 'Co-working space #2', note: 'Quiet focus zone' },
  { label: 'Breakout lounges', note: 'Casual meetings' },
  { label: 'Ratnadeep Supermarket', note: 'Double-entry convenience' },
  { label: 'Pharmacy', note: 'On-campus' },
  { label: 'ATM + locker', note: 'Banking essentials' },
  { label: 'Fire command centre', note: 'Safety HQ' },
];

const TOWER_B_FEATURES: CorridorFeature[] = [
  { label: '3 creche play areas', note: 'Padded floors, age-zoned' },
  { label: 'Tuition centre', note: '2 classrooms' },
  { label: 'Hobby & art space', note: 'For kids + adults' },
  { label: 'Conference rooms', note: 'Bookable for residents' },
  { label: 'Business pods', note: 'Phone booth style' },
  { label: 'Pantry', note: 'Coffee + snacks' },
  { label: 'ATM', note: 'On-campus' },
];

const TOWER_A_POSITIONING = 'Professional utility';
const TOWER_B_POSITIONING = 'Family & learning';

export default function UrbanCorridorsTile() {
  return (
    <TileShell
      eyebrow="Ground-floor amenity spine · Both towers"
      title="The Urban Corridor — your daily walk."
      sub="A double-height retail + work + wellness corridor you walk through every morning and evening. Each tower has its own vocabulary."
      footer={<>Both corridors run ground-floor, double-height. Residents access via tower lobby.</>}
      askMore={{
        label: 'See the full amenities list',
        query: 'What amenities does ASBL Loft offer?',
      }}
      relatedAsks={[
        { label: 'Clubhouse walk-through', query: 'Walk me through the clubhouse and podium amenities' },
        { label: 'Unit plans', query: 'Show me the 3BHK unit plans' },
        { label: 'Master plan', query: 'Show me the ASBL Loft master plan' },
        { label: 'Book a site visit', query: 'Book a site visit' },
      ]}
    >
      <div style={{ padding: 0 }}>
        {/* Tower A */}
        <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--hairline)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--plum-dark)',
                fontWeight: 700,
              }}
            >
              Tower A
            </div>
            <div
              style={{
                fontSize: 12,
                fontStyle: 'italic',
                color: 'var(--mute)',
              }}
            >
              {TOWER_A_POSITIONING}
            </div>
          </div>
          <div
            className="serif"
            style={{
              fontSize: 17,
              color: 'var(--ink)',
              marginBottom: 14,
            }}
          >
            Designed for the workday rhythm.
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 8,
            }}
          >
            {TOWER_A_FEATURES.map((f) => (
              <FeatureCard key={f.label} label={f.label} note={f.note} />
            ))}
          </div>
        </div>

        {/* Tower B */}
        <div style={{ padding: '22px 26px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--plum-dark)',
                fontWeight: 700,
              }}
            >
              Tower B
            </div>
            <div
              style={{
                fontSize: 12,
                fontStyle: 'italic',
                color: 'var(--mute)',
              }}
            >
              {TOWER_B_POSITIONING}
            </div>
          </div>
          <div
            className="serif"
            style={{
              fontSize: 17,
              color: 'var(--ink)',
              marginBottom: 14,
            }}
          >
            Built around kids, learning, and pause.
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 8,
            }}
          >
            {TOWER_B_FEATURES.map((f) => (
              <FeatureCard key={f.label} label={f.label} note={f.note} />
            ))}
          </div>
        </div>
      </div>
    </TileShell>
  );
}

function FeatureCard({ label, note }: { label: string; note?: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--paper)',
        borderRadius: 10,
        border: '1px solid var(--hairline)',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
      {note && (
        <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 3 }}>{note}</div>
      )}
    </div>
  );
}
