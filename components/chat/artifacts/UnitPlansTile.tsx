'use client';

import { useCallback, useMemo, useState } from 'react';
import { TileShell, TileIcon } from './common';
import FloorPlanCarousel, { PlanSlide } from '../FloorPlanCarousel';
import { UNIT_LAYOUTS, type Facing } from '@/lib/utils/asblData';
import { track } from '@/lib/analytics/tracker';

type UnitSize = 1695 | 1870;

/**
 * Infer facing (east / west) from a slide key like "1695-east" or
 * "1870-nb-west". Falls back to 'east' if the key has no facing token.
 */
function facingFromKey(key: string): Facing {
  if (key.endsWith('-west')) return 'west';
  return 'east';
}

// West first per doc 2.28 — east surfaces via auto-cycle or user click.
const SLIDES_1695: PlanSlide[] = [
  {
    key: '1695-west',
    img: '/assets/1695_west.webp',
    label: '1,695 sq.ft — West facing',
    sub: '3 BHK · Units 5, 6',
  },
  {
    key: '1695-east',
    img: '/assets/1695_east.webp',
    label: '1,695 sq.ft — East facing',
    sub: '3 BHK · Units 3, 4, 7, 8',
  },
];

// Per brochure floor plans (pages 41-43): 1,870 is 3 BHK with 3 toilets,
// NOT "3 BHK + office". The previous "+ office" label was fabricated.
// Difference between NB and SB plans is the number of side balconies
// (NB has 2, SB has 1). Both have the standard outdoor living balcony.
const SLIDES_1870: PlanSlide[] = [
  {
    key: '1870-nb-east',
    img: '/assets/1870_nb_east.webp',
    label: '1,870 sq.ft — NB · East facing',
    sub: '3 BHK · North Block (with 2 extra side balconies)',
  },
  {
    key: '1870-nb-west',
    img: '/assets/1870_nb_west.webp',
    label: '1,870 sq.ft — NB · West facing',
    sub: '3 BHK · North Block (with 2 extra side balconies)',
  },
  {
    key: '1870-sb-east',
    img: '/assets/1870_sb_east.webp',
    label: '1,870 sq.ft — SB · East facing',
    sub: '3 BHK · South Block (with 1 extra side balcony)',
  },
  {
    key: '1870-sb-west',
    img: '/assets/1870_sb_west.webp',
    label: '1,870 sq.ft — SB · West facing',
    sub: '3 BHK · South Block (with 1 extra side balcony)',
  },
];

export default function UnitPlansTile() {
  const [size, setSize] = useState<UnitSize>(1695);
  // Track facing separately — driven by carousel's active slide via the
  // onActiveChange callback below. East is the default since the
  // brochure's "typical floor plan" pages list East variants first.
  const [facing, setFacing] = useState<Facing>('east');
  const slides = useMemo(() => (size === 1695 ? SLIDES_1695 : SLIDES_1870), [size]);
  // Room-by-room data depends on BOTH size and facing. Brochure shows
  // E and W have different kitchen / master bedroom / toilet sizes.
  const layout = UNIT_LAYOUTS[size][facing];

  const handleSlideChange = useCallback((slide: PlanSlide) => {
    const newFacing = facingFromKey(slide.key);
    setFacing((prev) => {
      if (prev === newFacing) return prev;
      track('view', 'unit_facing_select', { size, facing: newFacing });
      return newFacing;
    });
  }, [size]);

  return (
    <TileShell
      eyebrow="Unit plans"
      title="3 BHK · two sizes, multiple facings"
      sub="Both 1,695 sq.ft and 1,870 sq.ft layouts — tap the size to compare."
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5}>
            <rect x={3} y={3} width={7} height={7} />
            <rect x={14} y={3} width={7} height={7} />
            <rect x={3} y={14} width={7} height={7} />
            <rect x={14} y={14} width={7} height={7} />
          </svg>
        </TileIcon>
      }
      footer={<>Dimensions are carpet · NB = North Block, SB = South Block.</>}
      askMore={{
        label: 'Send high-res PDF on WhatsApp',
        query: `Send me the high-res ${size} unit plan PDF`,
      }}
      relatedAsks={[
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Pricing', query: 'What is the pricing for ASBL Loft?' },
        { label: 'Amenities', query: 'What amenities does ASBL Loft offer?' },
        { label: 'Location', query: 'Where is ASBL Loft and what is nearby?' },
      ]}
    >
      {/* ── Size toggle (1695 / 1870) ── */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'inline-flex',
            padding: 3,
            background: 'var(--cream)',
            border: '1px solid var(--border)',
            borderRadius: 100,
          }}
        >
          <SizePill
            active={size === 1695}
            onClick={() => {
              setSize(1695);
              track('click', 'unit_size_select', { size: 1695 });
            }}
            label="1,695 sq.ft"
          />
          <SizePill
            active={size === 1870}
            onClick={() => {
              setSize(1870);
              track('click', 'unit_size_select', { size: 1870 });
            }}
            label="1,870 sq.ft"
          />
        </div>
      </div>

      <div style={{ margin: '0 -18px' }}>
        <FloorPlanCarousel slides={slides} onActiveChange={handleSlideChange} />
      </div>

      {/* Room-by-room (reflects selected size AND facing — swaps when
          user toggles East/West in the carousel above) */}
      <div style={{ marginTop: 18 }}>
        <div
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--mid-gray)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          Room by room · {size.toLocaleString()} sq.ft · {facing === 'east' ? 'East' : 'West'} facing
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 8,
          }}
        >
          {layout.rooms.map((r) => (
            <div
              key={r.name}
              style={{
                background: 'var(--cream)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--mid-gray)' }}>{r.name}</div>
              <div
                className="serif"
                style={{ fontSize: 14, color: 'var(--charcoal)', marginTop: 3, fontWeight: 500 }}
              >
                {r.ft}
              </div>
              <div style={{ fontSize: 10, color: 'var(--light-gray)', marginTop: 1 }}>
                {r.sqft} sq.ft
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: 'var(--plum-pale)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--plum-dark)',
            fontWeight: 500,
          }}
        >
          {layout.balcony.label}
        </div>
      </div>
    </TileShell>
  );
}

function SizePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 18px',
        borderRadius: 100,
        background: active ? 'var(--plum)' : 'transparent',
        color: active ? '#fff' : 'var(--gray-2)',
        fontSize: 12.5,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 180ms',
      }}
    >
      {label}
    </button>
  );
}
