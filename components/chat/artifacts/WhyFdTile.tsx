'use client';

import { TileShell } from './common';

const ROWS = [
  ['Commercial catchment', 'Mature, saturated', 'Deepening fast', 'Emerging'],
  ['Avg 3BHK ₹/sqft (Q4·25)', '₹11,200', '₹9,850', '₹8,600'],
  ['Inventory available', 'Limited', '~1,200 units', 'High'],
  ['ORR & Metro access', 'Both, congested', 'ORR · Metro (2027)', 'ORR only'],
  ['Top schools & hospitals', 'Clustered', '10 within 6 km', 'Sparse'],
];

export default function WhyFdTile() {
  return (
    <TileShell
      title="Financial District in context"
      sub="Against Gachibowli and Kokapet · axes most 3BHK buyers weigh"
      askMore={{ label: 'Commute & schools angle', query: 'Show me the commute times and schools around FD' }}
      relatedAsks={[
        { label: 'Compare projects', query: 'Compare ASBL Loft with other FD projects' },
        { label: 'Price trends', query: 'Show me the FD price trends' },
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Unit plans', query: 'Show me the 3BHK unit plans' },
      ]}
    >
      <div style={{ padding: 26 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '10px 8px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--mute)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--hairline)',
                  }}
                />
                <th
                  style={{
                    textAlign: 'left',
                    padding: '10px 8px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--mute)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--hairline)',
                  }}
                >
                  Gachibowli
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '10px 8px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--sage)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--hairline)',
                  }}
                >
                  Financial District
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '10px 8px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--mute)',
                    fontWeight: 500,
                    borderBottom: '1px solid var(--hairline)',
                  }}
                >
                  Kokapet
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r[0]}>
                  <td
                    style={{
                      padding: '12px 8px',
                      borderBottom: '1px solid var(--paper-2)',
                      fontWeight: 500,
                      color: 'var(--ink)',
                    }}
                  >
                    {r[0]}
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--paper-2)' }}>
                    {r[1]}
                  </td>
                  <td
                    style={{
                      padding: '12px 8px',
                      borderBottom: '1px solid var(--paper-2)',
                      color: 'var(--sage)',
                      fontWeight: 500,
                    }}
                  >
                    {r[2]}
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--paper-2)' }}>
                    {r[3]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TileShell>
  );
}
