'use client';

import { useMemo, useState } from 'react';
import { TileShell } from './common';
import { useAsk } from '../AskContext';
import { track } from '@/lib/analytics/tracker';

function emi(p: number, r: number, y: number) {
  const m = r / 12 / 100;
  const n = y * 12;
  return (p * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

interface Props {
  initialSalary?: number;
  initialExistingEmi?: number;
}

// Actual ticket sizes (base price) per KB:
// 1,695 sqft → ₹1.94 Cr
// 1,870 sqft → ₹2.15 Cr
const TICKET_1695 = 19400000;
const TICKET_1870 = 21500000;

export default function AffordabilityTile({ initialSalary = 40, initialExistingEmi = 0 }: Props) {
  const ask = useAsk();
  const [salary, setSalary] = useState(initialSalary);
  const [existingEmi, setExistingEmi] = useState(initialExistingEmi);
  const [years, setYears] = useState(25);

  const onDiscussOnSiteVisit = () => {
    track('click', 'affordability_site_visit_nudge');
    ask('Book a site visit');
  };

  const result = useMemo(() => {
    const monthlyIncome = (salary * 100000) / 12;
    const maxEmiAllowed = monthlyIncome * 0.5 - existingEmi;
    const rate = 8.5;
    const m = rate / 12 / 100;
    const n = years * 12;
    const maxLoan =
      maxEmiAllowed > 0
        ? (maxEmiAllowed * (Math.pow(1 + m, n) - 1)) / (m * Math.pow(1 + m, n))
        : 0;
    const downNeeded = Math.round(TICKET_1695 * 0.1);
    const maxTicket = maxLoan + downNeeded;
    const emi1695 = emi(TICKET_1695 * 0.9, rate, years);
    const emi1870 = emi(TICKET_1870 * 0.9, rate, years);

    return {
      monthlyIncome,
      maxEmiAllowed,
      maxLoan,
      maxTicket,
      canAfford1695: maxTicket >= TICKET_1695,
      canAfford1870: maxTicket >= TICKET_1870,
      emi1695,
      emi1870,
    };
  }, [salary, existingEmi, years]);

  return (
    <TileShell
      eyebrow="Affordability, instantly"
      title="Can you afford ASBL Loft?"
      sub="FOIR is variable — use the sliders to unlock your new home."
      footer={<>Actual sanction depends on CIBIL, vintage, and obligations — variance ±12%.</>}
      askMore={{
        label: 'Start 3-min pre-approval',
        query: 'Start the 3-minute pre-approval with HDFC, SBI and Bajaj',
      }}
      relatedAsks={[
        { label: 'Full price breakdown', query: 'Show me the full price breakdown for 1695 East' },
        { label: 'Payment schedule', query: 'Show me Bajaj vs standard payment schedule' },
        { label: 'Unit plans', query: 'Show me the 3BHK unit plans' },
      ]}
    >
      <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Row label="Annual salary" value={`₹${salary}L`}>
          <input
            type="range"
            min={10}
            max={100}
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            onMouseUp={(e) =>
              track('click', 'affordability_slider_commit', {
                field: 'salary',
                value: Number((e.target as HTMLInputElement).value),
              })
            }
            onTouchEnd={(e) =>
              track('click', 'affordability_slider_commit', {
                field: 'salary',
                value: Number((e.target as HTMLInputElement).value),
              })
            }
            style={{ width: '100%', accentColor: 'var(--sienna)' }}
          />
        </Row>

        <Row
          label="Existing EMIs"
          value={`₹${existingEmi.toLocaleString('en-IN')}/mo`}
        >
          <input
            type="range"
            min={0}
            max={80000}
            step={1000}
            value={existingEmi}
            onChange={(e) => setExistingEmi(Number(e.target.value))}
            onMouseUp={(e) =>
              track('click', 'affordability_slider_commit', {
                field: 'existing_emi',
                value: Number((e.target as HTMLInputElement).value),
              })
            }
            onTouchEnd={(e) =>
              track('click', 'affordability_slider_commit', {
                field: 'existing_emi',
                value: Number((e.target as HTMLInputElement).value),
              })
            }
            style={{ width: '100%', accentColor: 'var(--sienna)' }}
          />
        </Row>

        <Row label="Tenure" value={`${years} yrs`}>
          <input
            type="range"
            min={15}
            max={30}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            onMouseUp={(e) =>
              track('click', 'affordability_slider_commit', {
                field: 'years',
                value: Number((e.target as HTMLInputElement).value),
              })
            }
            onTouchEnd={(e) =>
              track('click', 'affordability_slider_commit', {
                field: 'years',
                value: Number((e.target as HTMLInputElement).value),
              })
            }
            style={{ width: '100%', accentColor: 'var(--sienna)' }}
          />
        </Row>
      </div>

      {/* Result */}
      <div
        style={{
          padding: '22px 26px',
          background: 'var(--sienna-soft)',
          borderTop: '1px solid var(--hairline)',
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: 'var(--sienna-dark)',
          }}
        >
          Max ticket you can afford
        </div>
        <div
          className="display"
          style={{
            fontSize: 'clamp(30px, 11vw, 48px)',
            fontWeight: 400,
            lineHeight: 1,
            color: 'var(--sienna-dark)',
          }}
        >
          ₹{(result.maxTicket / 10000000).toFixed(2)}
          <span style={{ fontSize: 22, marginLeft: 4 }}>Cr</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 6 }}>
          Max EMI ₹{(result.maxEmiAllowed / 100000).toFixed(2)}L/mo · Max loan ₹
          {(result.maxLoan / 10000000).toFixed(2)}Cr
        </div>
        <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 8, fontStyle: 'italic' }}>
          Subject to your credit health (CIBIL, obligations, vintage).
        </div>
      </div>

      <div
        className="tile-grid-flex"
        style={{
          padding: '18px 26px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <UnitCheck
          label="1,695 sqft"
          price="₹1.94Cr"
          ok={result.canAfford1695}
          emiL={result.emi1695 / 100000}
          onDiscussOnSiteVisit={onDiscussOnSiteVisit}
        />
        <UnitCheck
          label="1,870 sqft"
          price="₹2.15Cr"
          ok={result.canAfford1870}
          emiL={result.emi1870 / 100000}
          onDiscussOnSiteVisit={onDiscussOnSiteVisit}
        />
      </div>
    </TileShell>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
        <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sienna-dark)' }}>
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}

function UnitCheck({
  label,
  price,
  ok,
  emiL,
  onDiscussOnSiteVisit,
}: {
  label: string;
  price: string;
  ok: boolean;
  emiL: number;
  onDiscussOnSiteVisit: () => void;
}) {
  return (
    <div
      style={{
        padding: 14,
        background: 'var(--paper)',
        borderRadius: 10,
        border: '1px solid var(--sienna)',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</div>
      <div className="display" style={{ fontSize: 20, marginTop: 2 }}>
        {price}
      </div>
      <div
        style={{
          fontSize: 11.5,
          marginTop: 6,
          color: 'var(--sienna-dark)',
          fontWeight: 500,
        }}
      >
        ✓ Affordable · EMI ₹{emiL.toFixed(2)}L
      </div>
      {!ok && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--mute)', lineHeight: 1.45 }}>
            Still within reach — want to discuss this on a site visit?
          </div>
          <button
            type="button"
            onClick={onDiscussOnSiteVisit}
            style={{
              background: 'var(--sienna)',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              padding: '5px 14px',
              fontSize: 11.5,
              fontWeight: 500,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Yes, book a site visit →
          </button>
        </div>
      )}
    </div>
  );
}
