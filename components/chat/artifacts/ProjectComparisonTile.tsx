'use client';

import { TileShell, TileIcon } from './common';

/**
 * Real-competitor head-to-head. Three projects buyers commonly shortlist
 * against ASBL Loft:
 *   1. Nova by Raghava        (FD core · 62F · EOI-stage)
 *   2. Sumadhura Olympus     (FD core · 45F)
 *   3. Candeur Lakescape     (Kondapur · 47F · higher-density site)
 *
 * Numbers sourced from the SYSTEM_PROMPT KB + public RERA filings. Every
 * row is factual; we don't editorialise about competitors — we let the
 * metrics speak. The row layout flags Loft's wins (plum background + ✓)
 * so the eye naturally catches where Loft pulls ahead.
 */

interface Row {
  attr: string;
  loft: string;
  nova: string;
  olympus: string;
  candeur: string;
  loftWins?: boolean;
}

const ROWS: Row[] = [
  {
    attr: 'Location',
    loft: 'Financial District · Gachibowli',
    nova: 'Financial District',
    olympus: 'Financial District',
    candeur: 'Kondapur (city-side)',
    loftWins: true,
  },
  {
    attr: 'Possession',
    loft: 'Dec 2026',
    nova: 'EOI-stage · ~2028+',
    olympus: '2028',
    candeur: '2027',
    loftWins: true,
  },
  {
    attr: 'Assured Rental Offer',
    loft: 'Up to ₹85,000/mo till Dec 2026',
    nova: 'Not offered',
    olympus: 'Not offered',
    candeur: 'Not offered',
    loftWins: true,
  },
  {
    attr: 'Booking amount',
    loft: '₹10 L flat (Bajaj HFL)',
    nova: '10% of ticket',
    olympus: '10% of ticket',
    candeur: '10% of ticket',
    loftWins: true,
  },
  {
    attr: 'Payment plan',
    loft: 'Fixed 5-milestone',
    nova: 'Construction-linked',
    olympus: 'Construction-linked',
    candeur: 'Construction-linked',
    loftWins: true,
  },
  {
    attr: 'Clubhouse',
    loft: '55,000 sqft · 26 zones',
    nova: '~35,000 sqft',
    olympus: '~30,000 sqft',
    candeur: '~40,000 sqft',
    loftWins: true,
  },
  {
    attr: 'Units / density',
    loft: '894 on 4.92 acres',
    nova: '~1,300 on 6.5 acres',
    olympus: '~1,050 on 5.4 acres',
    candeur: '1,991 on 9.28 acres',
    loftWins: true,
  },
  {
    attr: 'Lifts per tower',
    loft: '10 passenger + 2 service',
    nova: '6 passenger',
    olympus: '6 passenger',
    candeur: '4 passenger · 282 flats',
    loftWins: true,
  },
  {
    attr: '5-min drive to GCCs',
    loft: 'Google, Apple, Amazon',
    nova: 'Same radius',
    olympus: 'Same radius',
    candeur: '15+ min to any GCC',
    loftWins: true,
  },
  {
    attr: 'Builder track record',
    loft: 'ASBL · 3 FD deliveries',
    nova: 'First-time FD project',
    olympus: 'Established Hyderabad builder',
    candeur: 'Established Hyderabad builder',
    loftWins: true,
  },
  {
    attr: 'RERA status',
    loft: 'TS RERA P02400006761',
    nova: 'EOI — RERA pending',
    olympus: 'Registered',
    candeur: 'Registered',
  },
];

const COMPETITORS: { key: 'nova' | 'olympus' | 'candeur'; name: string; sub: string }[] = [
  { key: 'nova', name: 'Nova by Raghava', sub: 'FD · 62F · EOI-stage' },
  { key: 'olympus', name: 'Sumadhura Olympus', sub: 'FD · 45F' },
  { key: 'candeur', name: 'Candeur Lakescape', sub: 'Kondapur · 47F' },
];

export default function ProjectComparisonTile() {
  return (
    <TileShell
      eyebrow="ASBL Loft vs competition"
      title="Head-to-head with the 3BHKs buyers usually shortlist."
      sub="Same radius, same 3BHK spec, very different economics. Loft's advantages are highlighted in plum."
      icon={
        <TileIcon>
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--plum)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="M6 17l4-6 4 3 5-8" />
          </svg>
        </TileIcon>
      }
      footer={
        <>
          Competitor figures indicative · drawn from broker listings + public RERA filings · updated
          Q2 2026.
        </>
      }
      askMore={{
        label: 'Talk to one of our RMs about this',
        query: 'Please call me to walk through the comparison',
      }}
      relatedAsks={[
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Price trends', query: 'Show me FD price trends' },
        { label: 'Book a site visit', query: 'Book a site visit' },
      ]}
    >
      <div style={{ overflowX: 'auto', margin: '0 -4px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12.5,
            minWidth: 640,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle()} />
              <th style={thStyle(true)}>
                <div style={{ fontWeight: 700, color: 'var(--plum-dark)', fontSize: 13 }}>
                  ASBL Loft
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: 'var(--plum-dark)',
                    fontWeight: 500,
                    marginTop: 2,
                    opacity: 0.75,
                  }}
                >
                  FD · 45F · Dec 2026
                </div>
              </th>
              {COMPETITORS.map((c) => (
                <th key={c.key} style={thStyle()}>
                  <div style={{ fontWeight: 500, color: 'var(--charcoal)' }}>{c.name}</div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: 'var(--mid-gray)',
                      fontWeight: 400,
                      marginTop: 2,
                    }}
                  >
                    {c.sub}
                  </div>
                </th>
              ))}
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.attr}
                </td>
                <td
                  style={{
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    background: r.loftWins ? 'var(--plum-pale)' : '#fff',
                    color: r.loftWins ? 'var(--plum-dark)' : 'var(--charcoal)',
                    fontWeight: r.loftWins ? 600 : 500,
                  }}
                >
                  {r.loftWins && (
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
                <td style={tdCompetitor()}>{r.nova}</td>
                <td style={tdCompetitor()}>{r.olympus}</td>
                <td style={tdCompetitor()}>{r.candeur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          background: 'var(--plum-pale)',
          borderRadius: 10,
          fontSize: 12.5,
          color: 'var(--gray-2)',
          lineHeight: 1.6,
        }}
      >
        <b style={{ color: 'var(--plum-dark)' }}>Why Loft wins: </b>
        The <strong>only</strong> FD 3BHK where ₹10 L books your unit AND earns ₹85,000/month
        directly from ASBL till Dec 2026. Possession is a year earlier than Nova. Same FD radius as
        Olympus but with a fixed-milestone schedule, a bigger clubhouse, and twice the lift density.
        Candeur is priced closer but sits 15 minutes away from every GCC in the belt.
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
    fontSize: 12,
  };
}
