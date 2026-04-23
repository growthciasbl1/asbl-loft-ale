'use client';

import { useMemo, useState } from 'react';
import { TileShell } from './common';

type Size = 1695 | 1870;
type Bank = 'bajaj' | 'otherBanks';

// Base (ticket) prices per KB:
const TICKET: Record<Size, number> = {
  1695: 19400000, // ₹1.94 Cr
  1870: 21500000, // ₹2.15 Cr
};

// BHFL offer is always ₹10 L booking regardless of size. Standard banks take
// 10% of the ticket. The remaining 4 milestones split the balance at a fixed
// ratio (62.5 / 22.5 / 5 / 10) of the REMAINING amount.
const BHFL_BOOKING_FLAT = 1000000; // ₹10 L
const STANDARD_BOOKING_PCT = 0.1;
const REMAINING_SPLIT = [0.625, 0.225, 0.05, 0.1]; // sums to 1.0

function formatAmount(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  return `₹${(amount / 100000).toFixed(2)} L`;
}

function computeRows(size: Size, bank: Bank) {
  const ticket = TICKET[size];
  const bookingAmount = bank === 'bajaj' ? BHFL_BOOKING_FLAT : ticket * STANDARD_BOOKING_PCT;
  const remaining = ticket - bookingAmount;
  const [r1, r2, r3, r4] = REMAINING_SPLIT;
  return {
    ticket,
    bookingAmount,
    rows: [
      { k: 'Booking amount', amount: bookingAmount, pct: bookingAmount / ticket },
      { k: 'Installment 1', amount: remaining * r1, pct: (remaining * r1) / ticket },
      { k: 'Installment 2', amount: remaining * r2, pct: (remaining * r2) / ticket },
      { k: 'Installment 3', amount: remaining * r3, pct: (remaining * r3) / ticket },
      { k: 'Handover', amount: remaining * r4, pct: (remaining * r4) / ticket },
    ],
  };
}

export default function PlansTile() {
  const [size, setSize] = useState<Size>(1695);
  const [bank, setBank] = useState<Bank>('bajaj');
  const { ticket, bookingAmount, rows } = useMemo(() => computeRows(size, bank), [size, bank]);

  return (
    <TileShell
      eyebrow="Payment plan"
      title="Choose size + bank · see the split"
      footer={
        <>
          Fixed 5-milestone schedule (both BHFL and standard banks). Assured Rental Offer is going
          on till 31 December 2026.
        </>
      }
      askMore={{
        label: 'Calculate affordability',
        query: 'Check affordability using FOIR',
      }}
      relatedAsks={[
        { label: 'Start pre-approval', query: 'Start 3-minute pre-approval with HDFC, SBI and Bajaj' },
        { label: 'Show me projected ROI', query: 'Show me projected ROI calculator' },
        { label: 'Unit plans', query: 'Show me the 3BHK unit plans' },
      ]}
    >
      {/* Size + bank toggles */}
      <div
        style={{
          padding: '18px 26px',
          borderBottom: '1px solid var(--paper-2)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              color: 'var(--mute)',
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Unit size
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Pill active={size === 1695} onClick={() => setSize(1695)}>
              1,695 sqft
            </Pill>
            <Pill active={size === 1870} onClick={() => setSize(1870)}>
              1,870 sqft
            </Pill>
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              color: 'var(--mute)',
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Bank
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Pill active={bank === 'bajaj'} onClick={() => setBank('bajaj')}>
              Bajaj (low booking)
            </Pill>
            <Pill active={bank === 'otherBanks'} onClick={() => setBank('otherBanks')}>
              HDFC / SBI / Standard
            </Pill>
          </div>
        </div>
      </div>

      {/* Installment rows — no status column (per doc 3.5: "no status against installments") */}
      <div style={{ padding: '8px 26px' }}>
        {rows.map((it) => (
          <div
            key={it.k}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 120px 120px',
              alignItems: 'center',
              gap: 10,
              padding: '12px 0',
              borderBottom: '1px solid var(--paper-2)',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>{it.k}</div>
            <div className="mono" style={{ color: 'var(--sienna-dark)', fontWeight: 600, fontSize: 14 }}>
              {(it.pct * 100).toFixed(2)}%
            </div>
            <div
              className="mono"
              style={{ textAlign: 'right', fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}
            >
              {formatAmount(it.amount)}
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--paper-2)',
                borderRadius: 100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${it.pct * 100}%`,
                  height: '100%',
                  background: 'var(--sienna)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer — Ticket + Booking amount */}
      <div
        style={{
          padding: '18px 26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 18,
          flexWrap: 'wrap',
          background: 'var(--paper)',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--mute)' }}>
            Ticket · {size.toLocaleString()} sqft
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>
            {formatAmount(ticket)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--mute)' }}>Booking amount</div>
          <div
            className="display"
            style={{ fontSize: 28, color: 'var(--sienna-dark)', fontWeight: 400 }}
          >
            {formatAmount(bookingAmount)}
          </div>
        </div>
      </div>
    </TileShell>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 500,
        background: active ? 'var(--ink)' : 'white',
        color: active ? 'white' : 'var(--ink-2)',
        border: '1px solid ' + (active ? 'var(--ink)' : 'var(--hairline)'),
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
