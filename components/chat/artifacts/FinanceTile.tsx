'use client';

import { useMemo, useState } from 'react';
import { TileShell } from './common';
import { PAYMENT_STRUCTURES } from '@/lib/utils/asblData';

function emi(p: number, r: number, y: number) {
  const m = r / 12 / 100;
  const n = y * 12;
  return (p * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

export default function FinanceTile() {
  const [ticket, setTicket] = useState(24100000);
  const [downPct, setDownPct] = useState(25);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const [rent, setRent] = useState(55000);
  const [bank, setBank] = useState<'otherBanks' | 'bajaj'>('bajaj');

  const numbers = useMemo(() => {
    const down = (ticket * downPct) / 100;
    const loan = ticket - down;
    const monthlyEmi = emi(loan, rate, years);
    const annualEmi = monthlyEmi * 12;
    const annualRent = rent * 12;
    const grossYield = (annualRent / ticket) * 100;
    const cocYield = ((annualRent - annualEmi) / Math.max(1, down)) * 100;
    return {
      down,
      loan,
      monthlyEmi,
      grossYield,
      cocYield,
      netMonthly: rent - monthlyEmi,
    };
  }, [ticket, downPct, rate, years, rent]);

  const structure = PAYMENT_STRUCTURES[bank];

  return (
    <TileShell
      eyebrow="The levered play"
      title="Cash-on-cash calculator"
      sub="Play with the down payment · loan rate · tenure"
      footer={<>Indicative only. Actual rate depends on bank, CIBIL, LTV, vintage.</>}
      askMore={{ label: 'Send full 5-yr IRR', query: 'Send me the 5-year levered IRR model to my WhatsApp' }}
      relatedAsks={[
        { label: 'Start pre-approval', query: 'Start 3-minute pre-approval with HDFC, SBI and Bajaj' },
        { label: 'Payment schedule', query: 'Show me the Bajaj vs standard payment structure' },
        { label: 'Pick a unit', query: 'Show me available high-yield units' },
      ]}
    >
      {/* Controls */}
      <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Slider
          label="Ticket size"
          value={`₹${(ticket / 10000000).toFixed(2)}Cr`}
          min={15000000}
          max={30000000}
          step={100000}
          raw={ticket}
          onChange={setTicket}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Slider
            label="Down payment"
            value={`${downPct}%`}
            min={10}
            max={100}
            step={1}
            raw={downPct}
            onChange={setDownPct}
          />
          <Slider
            label="Loan rate"
            value={`${rate.toFixed(1)}%`}
            min={7}
            max={11}
            step={0.1}
            raw={rate}
            onChange={setRate}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Slider
            label="Tenure"
            value={`${years}y`}
            min={5}
            max={30}
            step={1}
            raw={years}
            onChange={setYears}
          />
          <Slider
            label="Expected rent"
            value={`₹${(rent / 1000).toFixed(0)}K`}
            min={30000}
            max={90000}
            step={1000}
            raw={rent}
            onChange={setRent}
          />
        </div>

        {/* Payment structure */}
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--paper-2)' }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--mute)',
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            Payment structure
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <Pill active={bank === 'bajaj'} onClick={() => setBank('bajaj')}>
              Bajaj (low booking)
            </Pill>
            <Pill active={bank === 'otherBanks'} onClick={() => setBank('otherBanks')}>
              Standard banks
            </Pill>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {[
              ['Booking', structure.booking],
              ['Install 1', structure.installment1],
              ['Install 2', structure.installment2],
              ['Install 3', structure.installment3],
              ['Handover', structure.handover],
            ].map(([k, v]) => (
              <div
                key={k as string}
                style={{
                  padding: '10px 8px',
                  background: 'var(--paper)',
                  borderRadius: 8,
                  textAlign: 'center',
                  fontSize: 11,
                }}
              >
                <div style={{ color: 'var(--mute)' }}>{k as string}</div>
                <div className="mono" style={{ fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                  {((v as number) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div style={{ padding: '22px 26px', background: 'var(--ink)', color: '#f5f1e8' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            opacity: 0.6,
          }}
        >
          Your cash-on-cash yield
        </div>
        <div className="display" style={{ fontSize: 60, fontWeight: 400, lineHeight: 1 }}>
          {numbers.cocYield.toFixed(1)}
          <span style={{ fontSize: 24, opacity: 0.7 }}>%</span>
        </div>
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            fontSize: 13,
          }}
        >
          <ResultRow k="Gross yield" v={`${numbers.grossYield.toFixed(2)}%`} />
          <ResultRow k="Down payment" v={`₹${(numbers.down / 100000).toFixed(1)}L`} />
          <ResultRow k="Monthly EMI" v={`₹${Math.round(numbers.monthlyEmi / 1000)}K`} />
          <ResultRow
            k="Net monthly"
            v={`₹${Math.round(numbers.netMonthly / 1000)}K`}
            highlight
          />
        </div>
      </div>
    </TileShell>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  raw,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  raw: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
        <span
          className="mono"
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sienna-dark)' }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--sienna)' }}
      />
    </div>
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

function ResultRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span style={{ opacity: 0.7 }}>{k}</span>
      <span
        className="mono"
        style={{
          fontWeight: 600,
          color: highlight ? 'var(--sienna-soft)' : '#f5f1e8',
        }}
      >
        {v}
      </span>
    </div>
  );
}
