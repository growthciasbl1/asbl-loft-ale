'use client';

import { TileShell } from './common';

const ROUTES = [
  ['Hitech City / Raheja IT Park', '18 min', '7.2 km'],
  ['Nanakramguda ORR exit', '4 min', '1.8 km'],
  ['Gachibowli DLF', '12 min', '5.1 km'],
  ['RGI Airport', '32 min', '28 km'],
  ['Kokapet commercial', '9 min', '4.0 km'],
];

export default function CommuteTile() {
  return (
    <TileShell
      title="Typical drive times"
      sub="Midweek, 9am departure · Google Distance Matrix"
      askMore={{ label: 'Tenant catchment detail', query: 'Who lives in Financial District — professional demographics?' }}
      relatedAsks={[
        { label: 'Schools nearby', query: 'What schools are in 12 minutes?' },
        { label: 'Amenities inside', query: 'What amenities does Loft have?' },
      ]}
    >
      <div style={{ padding: 26 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <tbody>
            {ROUTES.map((r) => (
              <tr key={r[0]}>
                <td
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--paper-2)',
                    color: 'var(--ink)',
                  }}
                >
                  {r[0]}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--paper-2)',
                    textAlign: 'right',
                    fontWeight: 500,
                    color: 'var(--sienna-dark)',
                  }}
                >
                  {r[1]}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: '12px 0 12px 16px',
                    borderBottom: '1px solid var(--paper-2)',
                    textAlign: 'right',
                    fontSize: 11.5,
                    color: 'var(--mute)',
                  }}
                >
                  {r[2]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: 'var(--sienna-soft)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          <b style={{ color: 'var(--ink)' }}>Sundays gained:</b> if your workplace is Hitech City,
          Loft saves ~26 minutes round-trip vs Kokapet — that&apos;s{' '}
          <b style={{ color: 'var(--sienna-dark)' }}>~26 Sundays</b> of commute back every year.
        </div>
      </div>
    </TileShell>
  );
}
