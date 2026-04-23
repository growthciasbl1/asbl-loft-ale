'use client';

import { useState } from 'react';
import { TileShell } from './common';
import { UNIT_LAYOUTS } from '@/lib/utils/asblData';

type Size = 1695 | 1870;

export default function PlanTile() {
  const [size, setSize] = useState<Size>(1695);
  const L = UNIT_LAYOUTS[size];

  return (
    <TileShell
      title={`${size.toLocaleString()} East · unit plan`}
      sub={L.bestFor}
      askMore={{ label: 'Send high-res PDF', query: `Send me the high-res ${size} sqft unit plan PDF` }}
      relatedAsks={[
        { label: 'Full price breakdown', query: `Show me the price breakdown for the ${size} East` },
        { label: 'Pick a unit', query: `Show me available ${size} sqft units` },
      ]}
    >
      <div style={{ padding: 26 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([1695, 1870] as Size[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 100,
                fontSize: 12.5,
                fontWeight: 500,
                background: size === s ? 'var(--ink)' : 'var(--paper)',
                color: size === s ? 'white' : 'var(--ink-2)',
                border: '1px solid ' + (size === s ? 'var(--ink)' : 'var(--hairline)'),
                transition: 'all 180ms',
              }}
            >
              {s.toLocaleString()} sqft
            </button>
          ))}
        </div>

        <div
          style={{
            background: 'var(--paper)',
            borderRadius: 10,
            padding: 24,
            position: 'relative',
            aspectRatio: '4 / 3',
          }}
        >
          {size === 1695 ? <Plan1695 /> : <Plan1870 />}
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, background: 'var(--paper)', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Bedrooms
            </div>
            <div className="display" style={{ fontSize: 20, marginTop: 4 }}>
              3
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--paper)', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Bathrooms
            </div>
            <div className="display" style={{ fontSize: 20, marginTop: 4 }}>
              {L.bathrooms}
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--paper)', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Balcony
            </div>
            <div className="display" style={{ fontSize: 20, marginTop: 4 }}>
              {L.balcony.sqft}
              <span style={{ fontSize: 12, color: 'var(--mute)', marginLeft: 4 }}>sqft</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--mute)' }}>
          Hover any room in the live product to see specs. Sample 2D only — the site shows this in
          3D via Coohome.
        </div>
      </div>
    </TileShell>
  );
}

function Plan1695() {
  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%" fill="none" stroke="#3a342c" strokeWidth={1.5}>
      <rect x={20} y={20} width={360} height={260} fill="white" />
      <rect x={20} y={160} width={200} height={120} />
      <text x={120} y={222} textAnchor="middle" fontFamily="Fraunces" fontSize={13} fill="#3a342c">
        Living + Dining
      </text>
      <text x={120} y={238} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="#8a8278">
        18&apos; × 22&apos;
      </text>
      <rect x={20} y={280} width={200} height={20} strokeDasharray="4 3" />
      <text x={120} y={295} textAnchor="middle" fontSize={9} fill="#b5552b">
        Balcony · East · 125 sqft
      </text>
      <rect x={220} y={200} width={100} height={80} />
      <text x={270} y={242} textAnchor="middle" fontFamily="Fraunces" fontSize={11} fill="#3a342c">
        Kitchen
      </text>
      <text x={270} y={256} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={8} fill="#8a8278">
        10&apos; × 13&apos;
      </text>
      <rect x={320} y={200} width={60} height={80} />
      <text x={350} y={244} textAnchor="middle" fontSize={9} fill="#8a8278">
        Utility
      </text>
      <rect x={20} y={20} width={160} height={140} />
      <text x={100} y={85} textAnchor="middle" fontFamily="Fraunces" fontSize={13} fill="#3a342c">
        Master
      </text>
      <text x={100} y={101} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="#8a8278">
        14&apos; × 16&apos;
      </text>
      <rect x={20} y={120} width={80} height={40} />
      <text x={60} y={145} textAnchor="middle" fontSize={9} fill="#8a8278">
        M.Bath
      </text>
      <rect x={100} y={120} width={80} height={40} />
      <text x={140} y={145} textAnchor="middle" fontSize={9} fill="#8a8278">
        Wardrobe
      </text>
      <rect x={180} y={20} width={100} height={90} />
      <text x={230} y={68} textAnchor="middle" fontFamily="Fraunces" fontSize={12} fill="#3a342c">
        Bed 2
      </text>
      <text x={230} y={82} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={8} fill="#8a8278">
        12&apos; × 12&apos;
      </text>
      <rect x={280} y={20} width={100} height={90} />
      <text x={330} y={68} textAnchor="middle" fontFamily="Fraunces" fontSize={12} fill="#3a342c">
        Bed 3
      </text>
      <text x={330} y={82} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={8} fill="#8a8278">
        11&apos; × 12&apos;
      </text>
      <rect x={180} y={110} width={100} height={50} />
      <text x={230} y={140} textAnchor="middle" fontSize={10} fill="#8a8278">
        Shared bath
      </text>
      <rect x={280} y={110} width={100} height={90} />
      <text x={330} y={158} textAnchor="middle" fontSize={10} fill="#8a8278">
        Foyer
      </text>
      <g transform="translate(365, 45)">
        <circle r={12} fill="none" stroke="#b5552b" strokeWidth={1} />
        <text y={4} textAnchor="middle" fontFamily="Fraunces" fontSize={11} fill="#b5552b">
          E
        </text>
        <line x1={0} y1={-15} x2={0} y2={-9} stroke="#b5552b" strokeWidth={1.5} />
      </g>
    </svg>
  );
}

function Plan1870() {
  return (
    <svg viewBox="0 0 400 300" width="100%" height="100%" fill="none" stroke="#3a342c" strokeWidth={1.5}>
      <rect x={20} y={20} width={360} height={260} fill="white" />
      <rect x={20} y={160} width={220} height={120} />
      <text x={130} y={222} textAnchor="middle" fontFamily="Fraunces" fontSize={13} fill="#3a342c">
        Living + Dining
      </text>
      <text x={130} y={238} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="#8a8278">
        20&apos; × 24&apos;
      </text>
      <rect x={20} y={280} width={260} height={20} strokeDasharray="4 3" />
      <text x={150} y={295} textAnchor="middle" fontSize={9} fill="#b5552b">
        Wrap balcony · 260 sqft
      </text>
      <rect x={240} y={170} width={100} height={110} />
      <text x={290} y={222} textAnchor="middle" fontFamily="Fraunces" fontSize={11} fill="#3a342c">
        Kitchen
      </text>
      <text x={290} y={236} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={8} fill="#8a8278">
        11&apos; × 14&apos;
      </text>
      <rect x={340} y={170} width={40} height={110} />
      <text x={360} y={224} textAnchor="middle" fontSize={9} fill="#8a8278" transform="rotate(-90 360 224)">
        Utility
      </text>
      <rect x={20} y={20} width={140} height={140} />
      <text x={90} y={85} textAnchor="middle" fontFamily="Fraunces" fontSize={13} fill="#3a342c">
        Master Suite
      </text>
      <text x={90} y={101} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={9} fill="#8a8278">
        16&apos; × 13&apos;
      </text>
      <rect x={160} y={20} width={80} height={70} />
      <text x={200} y={52} textAnchor="middle" fontFamily="Fraunces" fontSize={11} fill="#3a342c">
        Bed 2
      </text>
      <text x={200} y={66} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={8} fill="#8a8278">
        12&apos; × 11&apos;
      </text>
      <rect x={240} y={20} width={80} height={70} />
      <text x={280} y={52} textAnchor="middle" fontFamily="Fraunces" fontSize={11} fill="#3a342c">
        Office
      </text>
      <text x={280} y={66} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={8} fill="#8a8278">
        11&apos; × 10&apos;
      </text>
      <rect x={320} y={20} width={60} height={70} />
      <text x={350} y={56} textAnchor="middle" fontSize={9} fill="#8a8278">
        ½ bath
      </text>
      <rect x={160} y={90} width={100} height={60} />
      <text x={210} y={125} textAnchor="middle" fontSize={10} fill="#8a8278">
        Shared bath
      </text>
      <rect x={260} y={90} width={120} height={60} />
      <text x={320} y={125} textAnchor="middle" fontSize={10} fill="#8a8278">
        Foyer
      </text>
      <g transform="translate(365, 45)">
        <circle r={12} fill="none" stroke="#b5552b" strokeWidth={1} />
        <text y={4} textAnchor="middle" fontFamily="Fraunces" fontSize={11} fill="#b5552b">
          E
        </text>
        <line x1={0} y1={-15} x2={0} y2={-9} stroke="#b5552b" strokeWidth={1.5} />
      </g>
    </svg>
  );
}
