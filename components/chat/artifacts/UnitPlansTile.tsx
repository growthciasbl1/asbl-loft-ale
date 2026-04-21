'use client';

import { useState } from 'react';
import { TileShell } from './common';
import BrandImage from './BrandImage';
import { UNIT_LAYOUTS } from '@/lib/utils/asblData';

type PlanId = '1695-east' | '1695-west' | '1870';

interface PlanMeta {
  id: PlanId;
  label: string;
  sub: string;
  size: 1695 | 1870;
  pending?: boolean;
}

interface PlanMetaWithCandidates extends Omit<PlanMeta, 'imagePath'> {
  imagePaths: string[];
}

const PLANS: PlanMetaWithCandidates[] = [
  {
    id: '1695-east',
    label: '1,695 sqft · East',
    sub: 'Units 3, 4, 7, 8 · east-facing on every floor, both towers',
    size: 1695,
    imagePaths: [
      '/asbl/unit-plan-1695-east.webp',
      '/asbl/unit-plan-1695-east.png',
      '/asbl/unit-plan-1695-east.jpg',
    ],
  },
  {
    id: '1695-west',
    label: '1,695 sqft · West',
    sub: 'Units 5, 6 · west-facing, extended outdoor living',
    size: 1695,
    imagePaths: [
      '/asbl/unit-plan-1695-west.webp',
      '/asbl/unit-plan-1695-west.png',
      '/asbl/unit-plan-1695-west.jpg',
    ],
  },
  {
    id: '1870',
    label: '1,870 sqft',
    sub: 'Plan image arriving soon · dimensions listed below',
    size: 1870,
    imagePaths: [
      '/asbl/unit-plan-1870.webp',
      '/asbl/unit-plan-1870.png',
      '/asbl/unit-plan-1870.jpg',
    ],
    pending: true,
  },
];

export default function UnitPlansTile() {
  const [pick, setPick] = useState<PlanId>('1695-east');
  const plan = PLANS.find((p) => p.id === pick)!;
  const layout = UNIT_LAYOUTS[plan.size];

  return (
    <TileShell
      eyebrow="Unit floor plans"
      title="3BHK · layouts available"
      sub={`${plan.label} · ${plan.sub}`}
      footer={<>Dimensions are carpet · cluster reference is built into the image (bottom-left).</>}
      askMore={{
        label: 'Send high-res PDF to my WhatsApp',
        query: `Send me the high-res ${plan.label} floor plan PDF`,
      }}
      relatedAsks={[
        { label: 'Master site plan', query: 'Show me the master plan and amenities' },
        { label: 'Price for this layout', query: `Show price breakdown for ${plan.size} sqft` },
        { label: 'Can I afford it?', query: 'Check affordability · salary 30L' },
        { label: 'Book a visit', query: 'Book a weekend site visit' },
      ]}
    >
      {/* Plan picker */}
      <div
        style={{
          padding: '14px 26px',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--paper-2)',
        }}
      >
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPick(p.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 100,
              fontSize: 12.5,
              fontWeight: 500,
              background: pick === p.id ? 'var(--ink)' : 'white',
              color: pick === p.id ? 'white' : 'var(--ink-2)',
              border: '1px solid ' + (pick === p.id ? 'var(--ink)' : 'var(--hairline)'),
              position: 'relative',
            }}
          >
            {p.label}
            {p.pending && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: pick === p.id ? 'var(--sienna-soft)' : 'var(--mute)',
                  fontWeight: 500,
                }}
              >
                · soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Brand image */}
      <div style={{ padding: '20px 26px', background: '#0b0b0f' }}>
        <BrandImage
          src={plan.imagePaths}
          alt={`3BHK ${plan.label} floor plan`}
          bg="#0b0b0f"
          fallback={<PlanPending plan={plan} />}
        />
      </div>

      {/* Dimensions */}
      <div style={{ padding: '18px 26px 6px' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--mute)',
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Room by room · {plan.size} sqft
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {layout.rooms.map((r) => (
            <div
              key={r.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px',
                gap: 12,
                alignItems: 'baseline',
                padding: '8px 0',
                borderBottom: '1px solid var(--paper-2)',
              }}
            >
              <div>
                <div style={{ fontSize: 13 }}>{r.name}</div>
                {r.note && <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 1 }}>{r.note}</div>}
              </div>
              <div className="mono" style={{ color: 'var(--sienna-dark)', fontSize: 12.5, textAlign: 'right' }}>
                {r.ft}
              </div>
              <div className="mono" style={{ color: 'var(--mute)', fontSize: 11.5, textAlign: 'right' }}>
                {r.sqft} sqft
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: 'var(--sienna-soft)',
            borderRadius: 10,
            fontSize: 12.5,
            color: 'var(--ink-2)',
          }}
        >
          <b style={{ color: 'var(--sienna-dark)' }}>Outdoor:</b> {layout.balcony.label} ·{' '}
          {layout.balcony.note}
        </div>
      </div>
    </TileShell>
  );
}

function PlanPending({ plan }: { plan: PlanMeta }) {
  return (
    <div
      style={{
        padding: '60px 30px',
        textAlign: 'center',
        color: '#f5e6d5',
        background: '#0b0b0f',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'var(--sienna)',
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Uploading shortly
      </div>
      <div className="display" style={{ fontSize: 24, fontWeight: 400 }}>
        {plan.label} plan image
      </div>
      <p style={{ fontSize: 12.5, color: '#8a8278', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
        Dimensions are listed below in the meantime. Ask for a visit and the RM will share this in high-res.
      </p>
    </div>
  );
}
