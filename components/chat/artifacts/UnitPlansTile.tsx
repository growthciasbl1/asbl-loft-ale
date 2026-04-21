'use client';

import { TileShell, TileIcon } from './common';
import FloorPlanCarousel, { PlanSlide } from '../FloorPlanCarousel';
import { UNIT_LAYOUTS } from '@/lib/utils/asblData';

const SLIDES: PlanSlide[] = [
  {
    key: 'east',
    img: '/assets/1695_east.webp',
    label: '1695 sq.ft — East Facing',
    sub: '3 BHK · Units 3, 4, 7, 8',
  },
  {
    key: 'west',
    img: '/assets/1695_west.webp',
    label: '1695 sq.ft — West Facing',
    sub: '3 BHK · Units 5, 6',
  },
];

export default function UnitPlansTile() {
  return (
    <TileShell
      eyebrow="Unit plans"
      title="3BHK · East and West layouts"
      sub="1,695 sq.ft · 1,870 sq.ft image coming soon"
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
      footer={<>Dimensions are carpet · cluster reference is in the image (bottom-left).</>}
      askMore={{ label: 'Send high-res PDF on WhatsApp', query: 'Send me the high-res 1695 floor plan PDF' }}
      relatedAsks={[
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Compare projects', query: 'Compare ASBL Loft with other FD projects' },
        { label: 'Pricing', query: 'What is the pricing for ASBL Loft?' },
        { label: 'Amenities', query: 'What amenities does ASBL Loft offer?' },
        { label: 'Location', query: 'Where is ASBL Loft and what is nearby?' },
      ]}
    >
      <div style={{ margin: '0 -18px' }}>
        <FloorPlanCarousel slides={SLIDES} />
      </div>

      {/* Room-by-room (collapsed into one strip, concise) */}
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
          Room by room · 1,695 sq.ft
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 8,
          }}
        >
          {UNIT_LAYOUTS[1695].rooms.map((r) => (
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
            color: 'var(--gray-2)',
          }}
        >
          <b style={{ color: 'var(--plum-dark)' }}>Outdoor:</b>{' '}
          {UNIT_LAYOUTS[1695].balcony.label} · {UNIT_LAYOUTS[1695].balcony.note}
        </div>
      </div>
    </TileShell>
  );
}
