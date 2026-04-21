'use client';

import { TileShell } from './common';

const CORRIDORS = [
  { name: 'Hitech City / Raheja IT Park', kind: 'IT Hub', min: 18, km: 7.2, tenants: '50K+ professionals' },
  { name: 'Gachibowli DLF', kind: 'IT Hub', min: 12, km: 5.1, tenants: '35K+ professionals' },
  { name: 'Nanakramguda ORR exit', kind: 'Expressway', min: 4, km: 1.8, tenants: 'Anywhere in Hyd' },
  { name: 'RGI Airport', kind: 'Airport', min: 32, km: 28, tenants: 'Intl. travelers' },
  { name: 'Kokapet commercial', kind: 'Emerging hub', min: 9, km: 4.0, tenants: '15K+ professionals' },
  { name: 'Raidurg Metro · 2027', kind: 'Metro', min: 6, km: 2.4, tenants: 'Last-mile connect' },
];

const SCHOOLS = [
  { name: 'Delhi Public School', min: 6 },
  { name: 'Oakridge International', min: 8 },
  { name: 'Chirec International', min: 10 },
];

const HOSPITALS = [
  { name: 'Continental Hospitals', min: 8 },
  { name: 'AIG Hospitals', min: 12 },
  { name: 'Care Hospitals (Banjara)', min: 18 },
];

export default function UrbanCorridorsTile() {
  return (
    <TileShell
      eyebrow="Financial District · the urban map"
      title="Why the corridor matters."
      sub="Every catchment a 3BHK buyer cares about — within 30 minutes."
      footer={<>Drive times via Google Distance Matrix · midweek 9am · ±3 min variance.</>}
      askMore={{
        label: 'Calculate commute from your address',
        query: 'Calculate commute from my address to ASBL Loft',
      }}
      relatedAsks={[
        { label: 'Tenant demographics', query: 'Who rents in Financial District?' },
        { label: 'Master plan', query: 'Show me the ASBL Loft master plan' },
        { label: 'Schools in 12 min', query: 'What schools are within 12 minutes?' },
        { label: 'Why FD not Gachibowli', query: 'Why FD instead of Gachibowli or Kokapet?' },
      ]}
    >
      <div style={{ padding: 0 }}>
        {/* Corridor map visual */}
        <div
          style={{
            background: '#0b0b0f',
            color: '#f5f1e8',
            padding: '24px 26px',
          }}
        >
          <CorridorMap />
        </div>

        {/* Corridor list */}
        <div style={{ padding: '20px 26px' }}>
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--mute)',
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Primary corridors
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CORRIDORS.map((c) => (
              <div
                key={c.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 80px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--paper-2)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>
                    {c.kind} · {c.tenants}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--sienna-dark)', fontWeight: 600 }}>
                  {c.min} min
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'right' }}>
                  {c.km} km
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schools + Hospitals strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderTop: '1px solid var(--paper-2)',
          }}
        >
          <div style={{ padding: '16px 26px', borderRight: '1px solid var(--paper-2)' }}>
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--mute)',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Schools
            </div>
            {SCHOOLS.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  padding: '4px 0',
                }}
              >
                <span>{s.name}</span>
                <span className="mono" style={{ color: 'var(--sienna-dark)' }}>
                  {s.min}m
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px 26px' }}>
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--mute)',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Hospitals
            </div>
            {HOSPITALS.map((h) => (
              <div
                key={h.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  padding: '4px 0',
                }}
              >
                <span>{h.name}</span>
                <span className="mono" style={{ color: 'var(--sienna-dark)' }}>
                  {h.min}m
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TileShell>
  );
}

function CorridorMap() {
  // Approximate west-Hyderabad geography, 720x440 viewBox, north = up
  // Loft at FD, ORR curves through; IT spine runs HITEC → Gachi → FD → Kokapet
  return (
    <svg
      viewBox="0 0 720 440"
      width="100%"
      style={{ maxWidth: 640, margin: '0 auto', display: 'block' }}
    >
      {/* Background zones (subtle) */}
      <rect x={0} y={0} width={720} height={440} fill="#0b0b0f" />

      {/* District polygons (very soft) */}
      <polygon
        points="140,40 300,30 340,110 240,180 130,150"
        fill="#1a1a22"
        stroke="#2a2a30"
        strokeWidth={0.5}
      />
      <text x={220} y={95} textAnchor="middle" fill="#5a5a68" fontSize={10} fontWeight={500}>
        HITEC CITY
      </text>

      <polygon
        points="260,150 420,140 440,220 300,260 240,210"
        fill="#1a1a22"
        stroke="#2a2a30"
        strokeWidth={0.5}
      />
      <text x={340} y={200} textAnchor="middle" fill="#5a5a68" fontSize={10} fontWeight={500}>
        GACHIBOWLI
      </text>

      <polygon
        points="380,250 540,240 580,330 440,380 360,320"
        fill="#18181f"
        stroke="#b5552b"
        strokeWidth={0.8}
        strokeDasharray="3 2"
      />
      <text x={470} y={310} textAnchor="middle" fill="#b5552b" fontSize={11} fontWeight={600}>
        FINANCIAL DISTRICT
      </text>

      <polygon
        points="140,290 300,280 340,360 240,420 130,390"
        fill="#1a1a22"
        stroke="#2a2a30"
        strokeWidth={0.5}
      />
      <text x={220} y={345} textAnchor="middle" fill="#5a5a68" fontSize={10} fontWeight={500}>
        KOKAPET
      </text>

      {/* Outer Ring Road — curves through FD and Nanakramguda */}
      <path
        d="M 50 200 Q 180 100 340 100 Q 500 120 600 220 Q 640 320 520 400 Q 400 430 260 410 Q 120 380 80 300 Q 50 250 50 200 Z"
        fill="none"
        stroke="#b5552b"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        opacity={0.4}
      />
      <text x={620} y={310} fill="#b5552b" fontSize={9} opacity={0.7} fontFamily="JetBrains Mono">
        ORR
      </text>

      {/* IT spine arterial — HITEC → Gachi → FD → Kokapet */}
      <path
        d="M 210 100 L 330 200 L 470 300 L 220 340"
        fill="none"
        stroke="#3a3a42"
        strokeWidth={3}
      />
      <text x={400} y={248} fill="#6a6a75" fontSize={8} fontFamily="JetBrains Mono">
        IT CORRIDOR
      </text>

      {/* Metro (dashed, 2027) */}
      <path
        d="M 120 80 L 260 170"
        fill="none"
        stroke="#5a6b4f"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      <text x={180} y={70} fill="#5a6b4f" fontSize={8} fontFamily="JetBrains Mono">
        METRO · 2027
      </text>

      {/* Pois */}
      {[
        { x: 220, y: 100, label: 'HITEC City', sub: '18 min', muted: true },
        { x: 180, y: 130, label: 'Madhapur', sub: '16', muted: true, small: true },
        { x: 270, y: 170, label: 'Raidurg', sub: '14', muted: true, small: true },
        { x: 340, y: 200, label: 'Gachibowli', sub: '12', muted: true },
        { x: 410, y: 260, label: 'Nanakramguda', sub: '4', muted: true, small: true },
        { x: 220, y: 340, label: 'Kokapet', sub: '9', muted: true, small: true },
        { x: 630, y: 400, label: 'RGI Airport', sub: '32', muted: true, small: true },
      ].map((p) => (
        <g key={p.label}>
          <circle
            cx={p.x}
            cy={p.y}
            r={p.small ? 3 : 4}
            fill={p.muted ? '#6a6a75' : '#f5f1e8'}
          />
          <text
            x={p.x + 8}
            y={p.y - 4}
            fill="#a8a8b2"
            fontSize={p.small ? 9 : 10}
            fontWeight={500}
          >
            {p.label}
          </text>
          <text
            x={p.x + 8}
            y={p.y + 9}
            fill="#b5552b"
            fontSize={8}
            fontFamily="JetBrains Mono"
          >
            {p.sub}m
          </text>
        </g>
      ))}

      {/* Loft pin */}
      <g>
        <circle cx={470} cy={300} r={18} fill="#b5552b" opacity={0.15} />
        <circle cx={470} cy={300} r={12} fill="#b5552b" opacity={0.35} />
        <circle cx={470} cy={300} r={7} fill="#b5552b" stroke="#f5f1e8" strokeWidth={1.5} />
        <text
          x={470}
          y={283}
          textAnchor="middle"
          fill="#f5f1e8"
          fontSize={10}
          fontWeight={700}
          fontFamily="Fraunces, serif"
        >
          ASBL LOFT
        </text>
      </g>

      {/* Compass */}
      <g transform="translate(680, 40)">
        <circle r={14} fill="none" stroke="#3a3a42" strokeWidth={1} />
        <path d="M 0 -10 L -4 8 L 0 5 L 4 8 Z" fill="#b5552b" />
        <text y={-17} textAnchor="middle" fill="#b5552b" fontSize={9}>
          N
        </text>
      </g>

      {/* Scale bar */}
      <g transform="translate(40, 420)">
        <line x1={0} y1={0} x2={60} y2={0} stroke="#6a6a75" strokeWidth={1.5} />
        <line x1={0} y1={-3} x2={0} y2={3} stroke="#6a6a75" strokeWidth={1.5} />
        <line x1={60} y1={-3} x2={60} y2={3} stroke="#6a6a75" strokeWidth={1.5} />
        <text x={30} y={-6} textAnchor="middle" fill="#6a6a75" fontSize={8} fontFamily="JetBrains Mono">
          ≈ 3 km
        </text>
      </g>

      {/* Legend */}
      <g transform="translate(40, 40)">
        <text fill="#a8a8b2" fontSize={10} fontWeight={600}>
          West Hyderabad
        </text>
        <text y={14} fill="#6a6a75" fontSize={8}>
          IT corridor + ORR + commute times to Loft
        </text>
      </g>
    </svg>
  );
}
