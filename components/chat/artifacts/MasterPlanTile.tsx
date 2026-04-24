'use client';

import { TileShell } from './common';
import BrandImage from './BrandImage';

const LEGEND = [
  { n: 1, label: 'Entry / Exit Dropoff' },
  { n: 2, label: 'Resident Entry / Exit' },
  { n: 3, label: 'Cascading Waterfall' },
  { n: 4, label: 'Seating Alcove' },
  { n: 5, label: 'Reflective Pond' },
  { n: 6, label: 'Roundabout with Sculpture' },
  { n: 7, label: 'Open Lawn' },
  { n: 8, label: 'Gazebo Seating' },
  { n: 9, label: 'Basketball Court' },
  { n: 10, label: "Kid's Play Area" },
  { n: 11, label: "Toddler's Play Area" },
  { n: 12, label: "Senior's Court + Reflexology" },
  { n: 13, label: 'Outdoor Fitness Station' },
  { n: 14, label: 'Bicycle Parking' },
  { n: 15, label: 'Clubhouse' },
  { n: 16, label: 'Wall Fountain' },
  { n: 17, label: 'Lawn Spill-out' },
  { n: 18, label: 'Amphitheater' },
  { n: 19, label: 'Multi-purpose Plaza' },
  { n: 20, label: "Pet's Park" },
  { n: 21, label: 'Bicycle Loop' },
  { n: 22, label: 'Jogging Loop' },
  { n: 23, label: 'Avenue Plantation' },
  { n: 24, label: 'Reflective Waterbody' },
  { n: 25, label: 'Themed Garden' },
  { n: 26, label: 'Party Spill-out Area' },
];

// Land parcel headline stats — sourced from the SYSTEM_PROMPT KB. Surface
// these prominently because visitors keep asking "how big is the project"
// without getting a clean number back (doc 2.13).
const LAND_STATS: { label: string; value: string; note?: string }[] = [
  { label: 'Land parcel', value: '4.92 acres', note: '~21,410 sqm' },
  { label: 'Towers', value: '2', note: 'Tower A · Tower B · G+45' },
  { label: 'Units', value: '894', note: '10 per floor · 3 BHK only' },
  { label: 'Density', value: '182 units/acre', note: 'FD average range' },
  { label: 'Clubhouse', value: '55,000 sqft', note: '26 landscape zones' },
];

export default function MasterPlanTile() {
  return (
    <TileShell
      eyebrow="Master plan · Tower A & B · 26 zones"
      title="The site, walked from above."
      sub="4.92-acre parcel · long north–south strip · jogging loop runs the spine · clubhouse north-west."
      footer={<>4.92 acres · 894 units on G+45 · 26-zone landscape · handover Dec 2026.</>}
      askMore={{
        label: 'A typical family day in these spaces',
        query: 'Show me a typical family day inside ASBL Loft',
      }}
      relatedAsks={[
        { label: 'Unit plans', query: 'Show me the 3BHK unit plans' },
        { label: 'Amenities list', query: 'What amenities does Loft offer?' },
        { label: 'Urban corridors', query: 'Show me the location and urban connectivity' },
      ]}
    >
      {/* Land-parcel headline stats — visitors asking 'how big is the project'
          get the core numbers up-front without waiting for the image to load. */}
      <div
        style={{
          padding: '14px 22px',
          background: 'var(--plum-pale)',
          borderBottom: '1px solid var(--plum-border, var(--border))',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 12,
        }}
      >
        {LAND_STATS.map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontSize: 9.5,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--plum-dark)',
                fontWeight: 600,
                marginBottom: 3,
              }}
            >
              {s.label}
            </div>
            <div
              className="serif"
              style={{
                fontSize: 17,
                fontWeight: 500,
                color: 'var(--charcoal)',
                lineHeight: 1.15,
              }}
            >
              {s.value}
            </div>
            {s.note && (
              <div style={{ fontSize: 10, color: 'var(--mid-gray)', marginTop: 2 }}>{s.note}</div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '20px 26px',
          background: 'var(--paper-2)',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <BrandImage
          src={['/asbl/master-plan.webp', '/asbl/master-plan.png', '/asbl/master-plan.jpg']}
          alt="ASBL Loft master plan"
          fallback={<SitePlanSvg />}
          bg="#0b0b0f"
        />
      </div>

      <div style={{ padding: '18px 26px 22px', background: 'white' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--sienna)',
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Legend
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            columnGap: 28,
            rowGap: 7,
          }}
        >
          {LEGEND.map((l) => (
            <div
              key={l.n}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                fontSize: 12.5,
                color: 'var(--ink-2)',
              }}
            >
              <span
                className="mono"
                style={{
                  color: 'var(--sienna)',
                  fontWeight: 600,
                  width: 22,
                  flexShrink: 0,
                  fontSize: 11,
                }}
              >
                {String(l.n).padStart(2, '0')}
              </span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </TileShell>
  );
}

/**
 * Blueprint-style master plan.
 * Canvas is intentionally tall/narrow — the real ASBL Loft site is a long north-south strip.
 */
function SitePlanSvg() {
  const ink = 'var(--ink-2)';
  const muted = 'var(--mute)';
  const accent = 'var(--sienna)';
  const paper = 'var(--paper)';

  return (
    <svg
      viewBox="0 0 520 760"
      width="100%"
      style={{ maxWidth: 460, height: 'auto', margin: '0 auto', display: 'block' }}
    >
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#d9cfbd" strokeWidth="0.3" opacity="0.4" />
        </pattern>
      </defs>

      {/* Site parcel */}
      <rect x="40" y="20" width="440" height="720" fill={paper} stroke={ink} strokeWidth="0.8" />
      <rect x="40" y="20" width="440" height="720" fill="url(#grid)" />

      {/* Outer planting (light) */}
      <path
        d="M 50 30 Q 40 400 55 730 M 470 30 Q 480 400 465 730"
        fill="none"
        stroke={muted}
        strokeWidth="0.5"
        strokeDasharray="2 3"
        opacity="0.6"
      />

      {/* Entry / ORR (south) */}
      <rect x="180" y="720" width="160" height="20" fill={paper} stroke={ink} strokeWidth="0.6" />
      <text
        x="260"
        y="735"
        textAnchor="middle"
        fill={muted}
        fontSize="8"
        fontFamily="JetBrains Mono"
        letterSpacing="0.1em"
      >
        100-FEET ROAD
      </text>
      <g transform="translate(260, 714) rotate(0)">
        <path d="M-3 0 L3 0 M0 -3 L3 0 L0 3" fill="none" stroke={accent} strokeWidth="0.8" />
      </g>
      <text x="275" y="711" fill={accent} fontSize="8" fontFamily="JetBrains Mono">
        01
      </text>

      {/* Clubhouse — top (north-west) */}
      <rect x="80" y="40" width="130" height="50" fill="#eee5d4" stroke={ink} strokeWidth="0.6" />
      <text x="145" y="62" textAnchor="middle" fontFamily="Fraunces" fontSize="12" fill={ink}>
        Clubhouse
      </text>
      <text x="145" y="75" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill={muted}>
        L-45 · amenities
      </text>
      <NumberTag n={15} x={215} y={48} accent={accent} />

      {/* Multi-purpose plaza (north-east) */}
      <NumberTag n={19} x={440} y={48} accent={accent} />
      <NumberTag n={18} x={440} y={80} accent={accent} />
      <NumberTag n={16} x={440} y={112} accent={accent} />

      {/* Tower A — upper spine */}
      <rect x="225" y="120" width="70" height="230" fill="#b5552b" opacity="0.9" />
      <rect
        x="225"
        y="120"
        width="70"
        height="230"
        fill="none"
        stroke="#8a3e1e"
        strokeWidth="0.6"
      />
      <text
        x="260"
        y="225"
        textAnchor="middle"
        fontFamily="Fraunces"
        fontSize="14"
        fontWeight="500"
        fill="white"
        letterSpacing="0.12em"
      >
        TOWER A
      </text>
      <text x="260" y="243" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#f5e6d5">
        G + 45 · 10 units/floor
      </text>

      {/* Central spine / pedestrian boulevard */}
      <path
        d="M 260 90 L 260 370 M 260 395 L 260 710"
        fill="none"
        stroke={accent}
        strokeWidth="1"
        opacity="0.55"
      />

      {/* Reflective pond (center) */}
      <ellipse
        cx="260"
        cy="382"
        rx="40"
        ry="10"
        fill="#e8d3c2"
        stroke={accent}
        strokeWidth="0.6"
        opacity="0.85"
      />
      <NumberTag n={5} x={230} y={378} accent={accent} />
      <NumberTag n={22} x={286} y={378} accent={accent} />

      {/* Tower B — lower spine */}
      <rect x="225" y="410" width="70" height="230" fill="#b5552b" opacity="0.9" />
      <rect
        x="225"
        y="410"
        width="70"
        height="230"
        fill="none"
        stroke="#8a3e1e"
        strokeWidth="0.6"
      />
      <text
        x="260"
        y="515"
        textAnchor="middle"
        fontFamily="Fraunces"
        fontSize="14"
        fontWeight="500"
        fill="white"
        letterSpacing="0.12em"
      >
        TOWER B
      </text>
      <text x="260" y="533" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill="#f5e6d5">
        G + 45 · 10 units/floor
      </text>

      {/* Jogging loop — elegant curve wrapping both towers */}
      <path
        d="M 90 95 Q 70 380 90 660 Q 260 700 430 660 Q 450 380 430 95 Q 260 60 90 95 Z"
        fill="none"
        stroke={accent}
        strokeWidth="0.8"
        strokeDasharray="1 4"
        opacity="0.7"
      />

      {/* Landscape dots — amenity markers around towers */}
      {/* Left column */}
      <NumberTag n={13} x={100} y={140} accent={accent} />
      <NumberTag n={11} x={100} y={205} accent={accent} />
      <NumberTag n={10} x={100} y={270} accent={accent} />
      <NumberTag n={6} x={100} y={420} accent={accent} />
      <NumberTag n={8} x={100} y={490} accent={accent} />
      <NumberTag n={9} x={100} y={560} accent={accent} />
      <NumberTag n={12} x={100} y={630} accent={accent} />

      {/* Right column */}
      <NumberTag n={3} x={430} y={140} accent={accent} />
      <NumberTag n={4} x={430} y={200} accent={accent} />
      <NumberTag n={17} x={430} y={260} accent={accent} />
      <NumberTag n={14} x={430} y={320} accent={accent} />
      <NumberTag n={21} x={430} y={420} accent={accent} />
      <NumberTag n={20} x={430} y={490} accent={accent} />
      <NumberTag n={24} x={430} y={560} accent={accent} />
      <NumberTag n={25} x={430} y={625} accent={accent} />

      {/* Connectors — delicate serif labels for key zones */}
      <text x="90" y="125" textAnchor="end" fontFamily="Fraunces" fontSize="9" fill={ink} fontStyle="italic">
        Outdoor fitness
      </text>
      <text x="430" y="125" textAnchor="start" fontFamily="Fraunces" fontSize="9" fill={ink} fontStyle="italic">
        ← Waterfall
      </text>
      <text x="260" y="405" textAnchor="middle" fontFamily="Fraunces" fontSize="10" fill={accent} fontStyle="italic">
        Reflective pond
      </text>
      <text x="90" y="655" textAnchor="end" fontFamily="Fraunces" fontSize="9" fill={ink} fontStyle="italic">
        Basketball
      </text>
      <text x="430" y="655" textAnchor="start" fontFamily="Fraunces" fontSize="9" fill={ink} fontStyle="italic">
        Garden →
      </text>

      {/* Compass rose */}
      <g transform="translate(76, 700)">
        <circle r="14" fill="white" stroke={ink} strokeWidth="0.6" />
        <path d="M 0 -10 L -3 3 L 0 0 L 3 3 Z" fill={accent} />
        <text y="-17" textAnchor="middle" fontFamily="Fraunces" fontSize="10" fill={accent} fontWeight="500">
          N
        </text>
      </g>

      {/* Scale bar */}
      <g transform="translate(370, 700)">
        <line x1="0" y1="0" x2="80" y2="0" stroke={ink} strokeWidth="0.8" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke={ink} strokeWidth="0.8" />
        <line x1="40" y1="-3" x2="40" y2="3" stroke={ink} strokeWidth="0.8" />
        <line x1="80" y1="-3" x2="80" y2="3" stroke={ink} strokeWidth="0.8" />
        <text x="40" y="14" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fill={muted}>
          0     30     60 m
        </text>
      </g>

      {/* Title block bottom-right */}
      <g transform="translate(440, 700)">
        <text
          textAnchor="end"
          fontFamily="Fraunces"
          fontSize="10"
          fill={ink}
          fontWeight="500"
          letterSpacing="0.08em"
        >
          ASBL · LOFT
        </text>
        <text
          y="12"
          textAnchor="end"
          fontFamily="JetBrains Mono"
          fontSize="7"
          fill={muted}
          letterSpacing="0.1em"
        >
          FINANCIAL DISTRICT · HYD
        </text>
      </g>
    </svg>
  );
}

function NumberTag({ n, x, y, accent }: { n: number; x: number; y: number; accent: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="7" fill="white" stroke={accent} strokeWidth="0.8" />
      <text
        x={x}
        y={y + 2.6}
        textAnchor="middle"
        fontFamily="JetBrains Mono"
        fontSize="7"
        fill={accent}
        fontWeight="600"
      >
        {n}
      </text>
    </g>
  );
}
