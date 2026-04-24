'use client';

import { useState } from 'react';
import { TileShell, TileIcon } from './common';
import { track } from '@/lib/analytics/tracker';

type Size = 1695 | 1870;

// Rounded headline: ₹85,000/month for BOTH sizes (per user direction —
// 1,870 was showing ₹95K; capped at the same ₹85K).
const MONTHLY_BY_SIZE: Record<Size, number> = {
  1695: 85000,
  1870: 85000,
};

export default function RentalOfferTile() {
  const [size, setSize] = useState<Size>(1695);
  const monthly = MONTHLY_BY_SIZE[size];

  return (
    <TileShell
      eyebrow="Rental offer · active now"
      title="₹10 L books it. ₹85K/mo lands till Dec 2026."
      sub="₹85,000/month assured rental income — direct from ASBL till December 2026."
      icon={
        <TileIcon>
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--plum)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v4M12 18v4M4 12H2M22 12h-2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
            <circle cx={12} cy={12} r={4} />
          </svg>
        </TileIcon>
      }
      footer={
        <>
          Offer runs until <b>31 December 2026</b>. Book with ₹10 L, receive ₹85,000/month from
          ASBL until handover.
        </>
      }
      askMore={{
        label: 'Lock this offer — call me back',
        query: 'Please call me back about the ₹10L booking and rental offer',
      }}
      relatedAsks={[
        { label: 'Full price breakdown', query: 'Show full price breakdown 1695 East' },
        { label: 'Payment schedule', query: 'Show me the payment plan schedule' },
        { label: 'Book a site visit', query: 'Book a site visit' },
        { label: 'Start pre-approval', query: 'Start 3-minute pre-approval with HDFC, SBI and Bajaj' },
        { label: 'Show me projected ROI', query: 'Show me projected ROI calculator' },
      ]}
    >
      {/* Unit size picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([1695, 1870] as Size[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              track('click', 'rental_offer_size_select', { size: s });
              setSize(s);
            }}
            style={{
              padding: '7px 14px',
              borderRadius: 100,
              fontSize: 12.5,
              fontWeight: 500,
              background: size === s ? 'var(--plum)' : 'white',
              color: size === s ? '#fff' : 'var(--gray-2)',
              border: '1px solid ' + (size === s ? 'var(--plum)' : 'var(--border)'),
              cursor: 'pointer',
            }}
          >
            {s.toLocaleString()} sqft
          </button>
        ))}
      </div>

      {/* Hero numbers */}
      <div
        className="tile-grid-flex"
        style={{
          background: 'var(--plum)',
          color: '#fff',
          padding: 22,
          borderRadius: 14,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              opacity: 0.75,
            }}
          >
            Monthly rental (from ASBL)
          </div>
          <div
            className="serif"
            style={{
              fontSize: 'clamp(22px, 8vw, 34px)',
              fontWeight: 500,
              lineHeight: 1.05,
              marginTop: 4,
              color: '#fff',
            }}
          >
            ₹{monthly.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
            For {size.toLocaleString()} sqft unit
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              opacity: 0.75,
            }}
          >
            Offer ends
          </div>
          <div
            className="serif"
            style={{
              fontSize: 'clamp(22px, 8vw, 34px)',
              fontWeight: 500,
              lineHeight: 1.05,
              marginTop: 4,
              color: '#fff',
            }}
          >
            31 Dec 2026
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
            Valid from date of agreement
          </div>
        </div>
      </div>

      {/* TDS disclaimer */}
      <div
        style={{
          marginTop: 10,
          padding: '8px 14px',
          fontSize: 11.5,
          color: 'var(--mid-gray)',
          fontStyle: 'italic',
          textAlign: 'center',
        }}
      >
        TDS will be applicable as per government rules.
      </div>

      {/* Booking + context cards */}
      <div
        style={{
          marginTop: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {[
          {
            k: 'Booking amount',
            v: '₹10 L / ₹19.4 L',
            note: '₹10 L via Bajaj HFL · ₹19.4 L via other banks',
          },
          {
            k: 'Balance',
            v: 'Fixed milestone',
            note: 'Pre-defined 5 milestones · both BHFL and standard banks',
          },
          {
            k: 'Open-market rent',
            v: '₹75–85K/mo',
            note: "Current FD 3BHK market rate · ASBL's ₹85K offer matches the upper band",
          },
          {
            k: 'Possession',
            v: 'Dec 2026',
            note: 'ASBL pays rental till handover',
          },
        ].map((row) => (
          <div
            key={row.k}
            style={{
              background: 'var(--cream)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--mid-gray)',
                fontWeight: 500,
              }}
            >
              {row.k}
            </div>
            <div
              className="serif"
              style={{ fontSize: 16, color: 'var(--charcoal)', marginTop: 4, fontWeight: 500 }}
            >
              {row.v}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--light-gray)', marginTop: 3 }}>
              {row.note}
            </div>
          </div>
        ))}
      </div>

      {/* Explainer strip */}
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
        <b style={{ color: 'var(--plum-dark)' }}>Why this works for you: </b>
        you book now, pay a small ₹10 L, and ASBL pays you{' '}
        <b>₹{monthly.toLocaleString('en-IN')}/month</b> into your account every month till the
        project hands over. Possession comes with a real tenant-ready unit in India&apos;s fastest
        renting corridor.
      </div>
    </TileShell>
  );
}
