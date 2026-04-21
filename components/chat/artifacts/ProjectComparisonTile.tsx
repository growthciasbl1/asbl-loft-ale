'use client';

import { TileShell, TileIcon } from './common';

interface Row {
  attr: string;
  loft: string;
  competitor_a: string;
  competitor_b: string;
  competitor_c: string;
  loft_wins?: boolean;
}

const ROWS: Row[] = [
  {
    attr: 'Location',
    loft: 'Financial District · Gachibowli',
    competitor_a: 'Kokapet',
    competitor_b: 'Narsingi',
    competitor_c: 'Gachibowli · interior',
    loft_wins: true,
  },
  {
    attr: '₹/sqft (all-in)',
    loft: '₹11,446',
    competitor_a: '₹10,800',
    competitor_b: '₹10,200',
    competitor_c: '₹12,400',
  },
  {
    attr: 'Possession',
    loft: 'Dec 2026',
    competitor_a: 'Jun 2027',
    competitor_b: 'Mar 2028',
    competitor_c: 'Already handed over',
    loft_wins: true,
  },
  {
    attr: 'Clubhouse size',
    loft: '55,000 sqft',
    competitor_a: '30,000 sqft',
    competitor_b: '24,000 sqft',
    competitor_c: '38,000 sqft',
    loft_wins: true,
  },
  {
    attr: 'Units per floor',
    loft: '10 (2 lift lobbies)',
    competitor_a: '12',
    competitor_b: '16',
    competitor_c: '8',
  },
  {
    attr: '5-min drive to',
    loft: 'Google, Apple, Amazon',
    competitor_a: 'ORR ramp only',
    competitor_b: 'ORR ramp only',
    competitor_c: 'TCS, Infosys',
    loft_wins: true,
  },
  {
    attr: 'Rental offer',
    loft: '₹85K/mo till Dec 2026',
    competitor_a: 'None',
    competitor_b: 'None',
    competitor_c: 'None',
    loft_wins: true,
  },
  {
    attr: 'Booking amount',
    loft: '₹10 L',
    competitor_a: '₹15 L',
    competitor_b: '₹12 L',
    competitor_c: '20% of ticket',
    loft_wins: true,
  },
  {
    attr: 'Approved lender',
    loft: 'Bajaj HFL + all major banks',
    competitor_a: 'Select banks',
    competitor_b: 'Select banks',
    competitor_c: 'Select banks',
  },
  {
    attr: 'Units available today',
    loft: '228 of 894',
    competitor_a: '~40%',
    competitor_b: '~55%',
    competitor_c: 'Resale only',
  },
];

export default function ProjectComparisonTile() {
  return (
    <TileShell
      eyebrow="ASBL Loft vs competition"
      title="Head-to-head with the 3BHK projects buyers usually shortlist."
      sub="Same radius. Same 3BHK spec. Very different economics."
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M6 17l4-6 4 3 5-8" />
          </svg>
        </TileIcon>
      }
      footer={
        <>
          Competitor numbers indicative · drawn from broker listings + public RERA filings · updated
          Q2 2026.
        </>
      }
      askMore={{
        label: 'Talk to a named RM about this',
        query: 'Please call me to walk through the comparison',
      }}
      relatedAsks={[
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Price trends', query: 'Show me FD price trends' },
        { label: 'Book a site visit', query: 'Book a weekend site visit' },
      ]}
    >
      <div style={{ overflowX: 'auto', margin: '0 -4px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12.5,
            minWidth: 540,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle()} />
              <th style={thStyle(true)}>
                <div style={{ fontWeight: 600, color: 'var(--plum-dark)' }}>ASBL Loft</div>
                <div style={{ fontSize: 9.5, color: 'var(--mid-gray)', fontWeight: 400, marginTop: 2 }}>
                  FD · Gachibowli
                </div>
              </th>
              <th style={thStyle()}>
                <div style={{ fontWeight: 500 }}>Project A</div>
                <div style={{ fontSize: 9.5, color: 'var(--mid-gray)', fontWeight: 400, marginTop: 2 }}>
                  Kokapet
                </div>
              </th>
              <th style={thStyle()}>
                <div style={{ fontWeight: 500 }}>Project B</div>
                <div style={{ fontSize: 9.5, color: 'var(--mid-gray)', fontWeight: 400, marginTop: 2 }}>
                  Narsingi
                </div>
              </th>
              <th style={thStyle()}>
                <div style={{ fontWeight: 500 }}>Project C</div>
                <div style={{ fontSize: 9.5, color: 'var(--mid-gray)', fontWeight: 400, marginTop: 2 }}>
                  Gachibowli interior
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.attr}>
                <td
                  style={{
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--mid-gray)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 500,
                  }}
                >
                  {r.attr}
                </td>
                <td
                  style={{
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    background: r.loft_wins ? 'var(--plum-pale)' : '#fff',
                    color: r.loft_wins ? 'var(--plum-dark)' : 'var(--charcoal)',
                    fontWeight: r.loft_wins ? 600 : 500,
                  }}
                >
                  {r.loft_wins && (
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        marginRight: 6,
                        color: 'var(--plum)',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                  {r.loft}
                </td>
                <td style={tdCompetitor()}>{r.competitor_a}</td>
                <td style={tdCompetitor()}>{r.competitor_b}</td>
                <td style={tdCompetitor()}>{r.competitor_c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        <b style={{ color: 'var(--plum-dark)' }}>The one-liner: </b>
        Loft is the only FD 3BHK where your ₹10 L booking starts paying you back ₹85K/mo — and
        that&apos;s on top of a 55,000 sqft clubhouse and five 5-minute drives to the big tech
        campuses. No one else in the list stacks all four.
      </div>
    </TileShell>
  );
}

function thStyle(highlight = false): React.CSSProperties {
  return {
    textAlign: 'left',
    padding: '10px 8px',
    fontSize: 11.5,
    color: 'var(--charcoal)',
    borderBottom: '1px solid var(--border)',
    background: highlight ? 'var(--plum-pale)' : '#fff',
    whiteSpace: 'nowrap',
  };
}

function tdCompetitor(): React.CSSProperties {
  return {
    padding: '10px 8px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--mid-gray)',
  };
}
