'use client';

import { TileShell, TileIcon } from './common';

const ROUTES = [
  { name: 'Google Phase 2 Campus', min: 5, km: '1.8 km' },
  { name: 'Apple Development Centre', min: 5, km: '2.1 km' },
  { name: 'Amazon India HQ', min: 5, km: '2.4 km' },
  { name: 'Waverock SEZ', min: 5, km: '2.5 km' },
  { name: 'Accenture Corporate Office', min: 10, km: '4.2 km' },
  { name: 'Microsoft India', min: 10, km: '4.5 km' },
  { name: 'Infosys Campus', min: 15, km: '6.8 km' },
  { name: 'TCS Deccan Park', min: 15, km: '7.0 km' },
  { name: 'DLF Cyber City', min: 15, km: '6.4 km' },
  { name: 'Google Main Campus', min: 20, km: '9.2 km' },
  { name: 'Rajiv Gandhi Airport', min: 35, km: '28 km' },
];

export default function CommuteTile() {
  return (
    <TileShell
      eyebrow="Connectivity"
      title="5 minutes to Google, Apple, Amazon, Waverock"
      sub="Every major employer in the FD–Gachibowli tech belt is within a 15-minute drive."
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z" />
            <circle cx={12} cy={10} r={2.5} />
          </svg>
        </TileIcon>
      }
      footer={<>Midweek, 9 am departure · Google Distance Matrix · ±3 min variance.</>}
      askMore={{
        label: 'Nearby schools, hospitals & offices',
        query: 'What facilities are near ASBL Loft?',
      }}
      relatedAsks={[
        { label: 'Schools in 12 min', query: 'What schools are within 12 minutes?' },
        { label: 'Hospitals nearby', query: 'What hospitals are nearby?' },
        { label: 'Why FD not Kokapet', query: 'Why FD instead of Kokapet?' },
      ]}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <tbody>
          {ROUTES.map((r) => (
            <tr key={r.name}>
              <td
                style={{
                  padding: '11px 0',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--charcoal)',
                }}
              >
                {r.name}
              </td>
              <td
                className="mono"
                style={{
                  padding: '11px 0',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'right',
                  fontWeight: 500,
                  color: 'var(--plum-dark)',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.min} min
              </td>
              <td
                className="mono"
                style={{
                  padding: '11px 0 11px 16px',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'right',
                  fontSize: 11,
                  color: 'var(--mid-gray)',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.km}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 14,
          padding: 12,
          background: 'var(--plum-pale)',
          borderRadius: 10,
          fontSize: 12.5,
          color: 'var(--gray-2)',
          lineHeight: 1.55,
        }}
      >
        <b style={{ color: 'var(--plum-dark)' }}>FD&apos;s job market is deepening:</b>{' '}
        GCC expansion (Google Phase 2, Apple R&amp;D centre), record commercial leasing in the FD
        belt, and schools + hospitals within a 12-minute radius — liveability here isn&apos;t a
        forecast, it&apos;s the day-to-day reality for residents in the immediate neighbourhood.
      </div>
    </TileShell>
  );
}
