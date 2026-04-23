'use client';

import { useState } from 'react';
import { TileShell } from './common';
import { PAYMENT_STRUCTURES } from '@/lib/utils/asblData';

export default function PlansTile() {
  const [bank, setBank] = useState<'otherBanks' | 'bajaj'>('bajaj');
  const [ticket, setTicket] = useState(21500000);
  const structure = PAYMENT_STRUCTURES[bank];

  const items = [
    { k: 'Booking', v: structure.booking, when: 'At signing' },
    { k: 'Installment 1', v: structure.installment1, when: 'Plinth + 5 slabs' },
    { k: 'Installment 2', v: structure.installment2, when: 'Roof slab' },
    { k: 'Installment 3', v: structure.installment3, when: 'Finishes' },
    { k: 'Handover', v: structure.handover, when: "Possession (Dec '26)" },
  ];

  return (
    <TileShell
      eyebrow="Payment plans · decoded"
      title="Start smallest, win biggest"
      sub="Bajaj starts at 5.5% down — lowest on any premium FD project."
      footer={<>Fixed 5-milestone schedule (both BHFL and standard banks). Pre-EMI applies on disbursed portion only.</>}
      askMore={{
        label: 'Start pre-approval',
        query: 'Start 3-minute pre-approval with HDFC, SBI and Bajaj',
      }}
      relatedAsks={[
        { label: 'Am I eligible?', query: 'Check affordability · 30L salary · 0 existing EMI' },
        { label: 'Cash-on-cash math', query: 'Open the levered finance calculator' },
        { label: 'Unit plans', query: 'Show me the 3BHK unit floor plans' },
      ]}
    >
      <div style={{ padding: '18px 26px', borderBottom: '1px solid var(--paper-2)' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill active={bank === 'bajaj'} onClick={() => setBank('bajaj')}>
            Bajaj (low booking)
          </Pill>
          <Pill active={bank === 'otherBanks'} onClick={() => setBank('otherBanks')}>
            HDFC / SBI / Standard
          </Pill>
        </div>
      </div>

      <div style={{ padding: '8px 26px' }}>
        {items.map((it) => (
          <div
            key={it.k}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 110px 120px',
              alignItems: 'center',
              gap: 10,
              padding: '12px 0',
              borderBottom: '1px solid var(--paper-2)',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 13.5 }}>{it.k}</div>
              <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 1 }}>{it.when}</div>
            </div>
            <div className="mono" style={{ color: 'var(--sienna-dark)', fontWeight: 600, fontSize: 14 }}>
              {(it.v * 100).toFixed(2)}%
            </div>
            <div
              className="mono"
              style={{ textAlign: 'right', fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}
            >
              ₹{Math.round((ticket * it.v) / 100000)}L
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
                  width: `${it.v * 100}%`,
                  height: '100%',
                  background: 'var(--sienna)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '18px 26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          background: 'var(--paper)',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--mute)' }}>Ticket (1,695 base)</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>
            ₹{(ticket / 10000000).toFixed(2)} Cr
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--mute)' }}>First cheque</div>
          <div
            className="display"
            style={{ fontSize: 28, color: 'var(--sienna-dark)', fontWeight: 400 }}
          >
            ₹{Math.round((ticket * structure.booking) / 100000)}L
          </div>
        </div>
        <div>
          <input
            type="range"
            min={19400000}
            max={28000000}
            step={100000}
            value={ticket}
            onChange={(e) => setTicket(Number(e.target.value))}
            style={{ width: 160, accentColor: 'var(--sienna)' }}
          />
          <div style={{ fontSize: 10.5, color: 'var(--mute)', textAlign: 'right', marginTop: 3 }}>
            Adjust ticket
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
      }}
    >
      {children}
    </button>
  );
}
