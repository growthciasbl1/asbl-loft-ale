'use client';

import { useMemo, useState } from 'react';
import { TileShell, TileIcon } from './common';

type Size = 1695 | 1870;

export default function RentalOfferTile() {
  const [size, setSize] = useState<Size>(1695);
  const today = new Date();
  const endDate = new Date('2026-12-31');

  const { monthly, monthsLeft, totalAccrual } = useMemo(() => {
    const m = Math.round(size * 50); // ₹50/sqft/mo
    const diffMonths = Math.max(
      0,
      (endDate.getFullYear() - today.getFullYear()) * 12 + (endDate.getMonth() - today.getMonth()),
    );
    return { monthly: m, monthsLeft: diffMonths, totalAccrual: m * diffMonths };
  }, [size]);

  return (
    <TileShell
      eyebrow="Rental offer · active now"
      title="₹10 L books it. ₹85K/mo lands till Dec 2026."
      sub="₹50/sqft/month guaranteed rental — direct from ASBL, not a third party."
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
          Offer runs until <b>31 December 2026</b>. Book with ₹10 L, get paid every month in the
          interim.
        </>
      }
      askMore={{
        label: 'Lock this offer — call me back',
        query: 'Please call me back about the ₹10L booking and rental offer',
      }}
      relatedAsks={[
        { label: 'Full price breakdown', query: 'Show full price breakdown 1695 East' },
        { label: 'Payment schedule', query: 'Show me the payment plan schedule' },
        { label: 'Book a site visit', query: 'Book a weekend site visit' },
        { label: 'Am I eligible?', query: 'Check affordability · salary 30L' },
      ]}
    >
      {/* Unit size picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([1695, 1870] as Size[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
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
            style={{ fontSize: 34, fontWeight: 500, lineHeight: 1, marginTop: 4 }}
          >
            ₹{monthly.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
            ₹50 / sqft / month × {size.toLocaleString()} sqft
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
            style={{ fontSize: 34, fontWeight: 500, lineHeight: 1, marginTop: 4 }}
          >
            31 Dec 26
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
            {monthsLeft} month{monthsLeft === 1 ? '' : 's'} × ₹{monthly.toLocaleString('en-IN')} ={' '}
            ₹{Math.round(totalAccrual / 100000)} L total
          </div>
        </div>
      </div>

      {/* Booking + context */}
      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {[
          { k: 'Booking amount', v: '₹10 Lakhs', note: 'Any unit, any floor' },
          { k: 'Balance', v: 'Construction-linked', note: 'Bajaj HFL or standard banks' },
          {
            k: 'Open-market rent',
            v: '₹75–85K/mo',
            note: 'FD 3BHKs today — ASBL guarantees at upper end',
          },
          {
            k: 'Possession',
            v: 'Dec 2026',
            note: 'Tentative · till then you collect the guaranteed rental',
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
        you book now, pay a small ₹10 L, and ASBL pays you <b>₹{monthly.toLocaleString('en-IN')}/mo</b>{' '}
        into your account every month till the project hands over. Possession comes with a real
        tenant-ready unit in India&apos;s fastest renting corridor.
      </div>
    </TileShell>
  );
}
