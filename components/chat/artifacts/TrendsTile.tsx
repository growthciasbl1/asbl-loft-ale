'use client';

import { TileShell } from './common';

export default function TrendsTile() {
  const w = 600;
  const h = 180;
  const pad = 24;
  const district = [7800, 7950, 8100, 8400, 8650, 8900, 9200, 9400, 9600, 9850];
  const loft = [null, null, null, 8200, 8450, 8700, 8950, 9100, 9250, 9400];
  const min = 7500;
  const max = 10000;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (district.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  const path = (data: (number | null)[]) => {
    const firstIdx = data.findIndex((d) => d != null);
    return data
      .map((v, i) =>
        v == null ? null : `${i === firstIdx ? 'M' : 'L'} ${x(i)} ${y(v as number)}`
      )
      .filter(Boolean)
      .join(' ');
  };
  const quarters = ['Q3·23', 'Q4·23', 'Q1·24', 'Q2·24', 'Q3·24', 'Q4·24', 'Q1·25', 'Q2·25', 'Q3·25', 'Q4·25'];

  return (
    <TileShell
      title="FD 3BHK · avg ₹/sqft"
      sub="District median has climbed ~26% over 10 quarters. Loft tracks below median — a supply artefact."
      askMore={{ label: 'Who actually rents here?', query: 'Show me the tenant demographics and rental market' }}
      relatedAsks={[
        { label: 'Compare with Gachibowli', query: 'Why FD and not Gachibowli?' },
        { label: 'Current yield', query: 'What rental yield can I expect?' },
      ]}
    >
      <div style={{ padding: 26 }}>
        <div style={{ height: 180, position: 'relative', marginBottom: 14 }}>
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            {[8000, 9000, 10000].map((v) => (
              <line
                key={v}
                x1={pad}
                y1={y(v)}
                x2={w - pad}
                y2={y(v)}
                stroke="#e5dac5"
                strokeWidth={0.5}
              />
            ))}
            {[8000, 9000, 10000].map((v) => (
              <text
                key={v}
                x={pad - 4}
                y={y(v) + 4}
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
                fontSize={9}
                fill="#8a8278"
              >
                {(v / 1000).toFixed(0)}k
              </text>
            ))}
            <path
              d={path(district)}
              fill="none"
              stroke="#3a342c"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={path(loft)}
              fill="none"
              stroke="#b5552b"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={x(9)} cy={y(9400)} r={4} fill="#b5552b" />
            <circle cx={x(9)} cy={y(9400)} r={8} fill="#b5552b" opacity={0.15} />
            <circle cx={x(9)} cy={y(9850)} r={4} fill="#3a342c" />
            {quarters.map((q, i) =>
              i % 2 === 0 ? (
                <text
                  key={q}
                  x={x(i)}
                  y={h - 6}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize={9}
                  fill="#8a8278"
                >
                  {q}
                </text>
              ) : null
            )}
          </svg>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            fontSize: 11.5,
            color: 'var(--ink-2)',
            marginTop: 10,
            flexWrap: 'wrap',
          }}
        >
          <span>
            <span
              style={{
                width: 10,
                height: 3,
                borderRadius: 100,
                display: 'inline-block',
                verticalAlign: 'middle',
                marginRight: 6,
                background: '#3a342c',
              }}
            />
            FD district median (₹9,850/sqft)
          </span>
          <span>
            <span
              style={{
                width: 10,
                height: 3,
                borderRadius: 100,
                display: 'inline-block',
                verticalAlign: 'middle',
                marginRight: 6,
                background: '#b5552b',
              }}
            />
            ASBL Loft (₹9,400/sqft)
          </span>
        </div>
      </div>
    </TileShell>
  );
}
