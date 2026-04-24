'use client';

import { useMemo, useState } from 'react';
import { TileShell } from './common';
import { track } from '@/lib/analytics/tracker';

type Size = 1695 | 1870;

// Market-anchored defaults from our KB (see SYSTEM_PROMPT KB-03 market
// intelligence section). These are historical / current numbers, never
// presented as forward guarantees.
const DEFAULTS = {
  appreciationYoY: 14, // FD 14.2% YoY historical (2023-2026)
  rentGrowthYoY: 5, // modest default — FD rentals have grown faster
  loanPct: 75, // typical BHFL / other bank LTV
  loanRate: 8.5, // current BHFL indicative
  exitYear: 2029, // 3 years post-possession
};

const UNIT_PRICE: Record<Size, number> = {
  1695: 1.94 * 1e7, // ₹1.94 Cr
  1870: 2.15 * 1e7, // ₹2.15 Cr
};

// Guaranteed ASBL rental during offer window (Dec 2026)
const GUARANTEED_MONTHLY: Record<Size, number> = {
  1695: 85000,
  1870: 95000,
};

// Initial post-possession market rent (can be tuned via slider in v2).
// We anchor to the current FD 3BHK upper band (₹85K) for 1695 and scale
// proportionally for 1870.
const POST_POSSESSION_MONTHLY: Record<Size, number> = {
  1695: 85000,
  1870: 95000,
};

const POSSESSION_YEAR = 2026; // Dec 2026 handover
const OFFER_END_YEAR = 2026;

export default function RoiCalculatorTile() {
  const [size, setSize] = useState<Size>(1695);
  const [exitYear, setExitYear] = useState<number>(DEFAULTS.exitYear);
  const [appreciation, setAppreciation] = useState<number>(DEFAULTS.appreciationYoY);
  const [loanPct, setLoanPct] = useState<number>(DEFAULTS.loanPct);
  const [loanRate, setLoanRate] = useState<number>(DEFAULTS.loanRate);
  const [rentGrowth, setRentGrowth] = useState<number>(DEFAULTS.rentGrowthYoY);

  const model = useMemo(() => compute({
    size,
    exitYear,
    appreciation,
    loanPct,
    loanRate,
    rentGrowth,
  }), [size, exitYear, appreciation, loanPct, loanRate, rentGrowth]);

  return (
    <TileShell
      eyebrow="ROI scenarios · not a guarantee"
      title="Your potential returns — live projection"
      sub="Adjust the sliders. All numbers are scenarios based on FD's historical 14.2% YoY appreciation, GCC-driven tenant demand, and TDR-led land scarcity."
      relatedAsks={[
        { label: 'Rental offer details', query: 'Tell me about the rental offer' },
        { label: 'Full price breakdown', query: 'Show full price breakdown 1695 East' },
        { label: 'Book a site visit', query: 'Book a site visit' },
      ]}
      footer={
        <span style={{ fontSize: 11, color: 'var(--mid-gray)' }}>
          ASBL does <b>NOT</b> guarantee this ROI. Based on recent market updates (GCC expansion,
          TDR scarcity, FD&apos;s 14.2% YoY historical appreciation), these returns are expected
          but not promised.
        </span>
      }
    >
      {/* Unit size */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {([1695, 1870] as Size[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              track('click', 'roi_unit_size_select', { size: s });
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
            {s.toLocaleString()} sqft · ₹{(UNIT_PRICE[s] / 1e7).toFixed(2)} Cr
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Slider
          label="Exit year"
          trackName="roi_slider_exit_year"
          value={exitYear}
          min={POSSESSION_YEAR + 1}
          max={POSSESSION_YEAR + 10}
          step={1}
          display={`${exitYear}`}
          onChange={setExitYear}
          helper={`${exitYear - POSSESSION_YEAR} year${exitYear - POSSESSION_YEAR > 1 ? 's' : ''} after possession`}
        />
        <Slider
          label="Assumed annual appreciation"
          trackName="roi_slider_appreciation"
          value={appreciation}
          min={5}
          max={25}
          step={0.5}
          display={`${appreciation}% YoY`}
          onChange={setAppreciation}
          helper="FD historical: 14.2% YoY · adjust for your view"
        />
        <Slider
          label="Loan portion"
          trackName="roi_slider_loan_pct"
          value={loanPct}
          min={0}
          max={80}
          step={5}
          display={`${loanPct}%`}
          onChange={setLoanPct}
          helper={loanPct === 0 ? 'Self-funded' : `${100 - loanPct}% down payment`}
        />
        {loanPct > 0 && (
          <Slider
            label="Loan interest rate"
            trackName="roi_slider_loan_rate"
            value={loanRate}
            min={7.5}
            max={11}
            step={0.25}
            display={`${loanRate}%`}
            onChange={setLoanRate}
            helper="BHFL indicative · actual rate depends on profile"
          />
        )}
        <Slider
          label="Post-possession rent growth"
          trackName="roi_slider_rent_growth"
          value={rentGrowth}
          min={0}
          max={12}
          step={0.5}
          display={`${rentGrowth}% YoY`}
          onChange={setRentGrowth}
          helper="After ASBL offer ends (Dec 2026)"
        />
      </div>

      {/* Hero ROI band */}
      <div
        style={{
          marginTop: 18,
          padding: 22,
          borderRadius: 14,
          background: 'var(--plum)',
          color: '#fff',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
        }}
      >
        <HeroStat
          label="Net gain"
          value={fmtCr(model.netGain)}
          sub={`After ${exitYear - POSSESSION_YEAR + 1} years`}
        />
        <HeroStat
          label="ROI on capital deployed"
          value={`${model.roiPct.toFixed(1)}%`}
          sub={`${model.annualizedPct.toFixed(1)}% annualised`}
        />
        <HeroStat
          label="Exit value"
          value={fmtCr(model.exitValue)}
          sub={`@ ${appreciation}% YoY growth`}
        />
      </div>

      {/* Detailed breakdown */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--plum)',
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          The math, laid out
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Unit price (all-in)" value={fmtCr(model.unitPrice)} />
          <Row
            label={`Down payment (${(100 - loanPct).toFixed(0)}%)`}
            value={fmtCr(model.downPayment)}
            neg
          />
          <Row
            label={`EMIs during construction (${12} months)`}
            value={fmtCr(model.cashOutPreHandover - model.downPayment)}
            neg
          />
          <Row
            label={`Market rent · ${model.postPossessionYears}y post-possession (₹${(POST_POSSESSION_MONTHLY[size] / 1000).toFixed(0)}K/mo, +${rentGrowth}% YoY)`}
            value={`+ ${fmtCr(model.postRentalTotal)}`}
            pos
          />
          <Row
            label={`EMIs post-possession (${model.postPossessionYears}y till exit)`}
            value={fmtCr(model.postEmiTotal)}
            neg
          />
          <Row label="Outstanding loan at exit" value={fmtCr(model.loanAtExit)} neg />
          <Row label="Exit sale value" value={`+ ${fmtCr(model.exitValue)}`} pos />
          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
          <Row
            label="Net cash deployed across period"
            value={fmtCr(model.netCashDeployed)}
          />
          <Row label="Net gain" value={fmtCr(model.netGain)} bold />
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 10.5,
            color: 'var(--mid-gray)',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          Note: ASBL&apos;s Assured Rental Offer (₹85K/mo for 1,695 · ₹95K/mo for 1,870 till 31 Dec
          2026) is excluded from this ROI calculation — it&apos;s a separate direct payment and
          doesn&apos;t affect the investment math.
        </div>
      </div>

      {/* Market anchors */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          background: 'var(--plum-pale)',
          border: '1px solid var(--plum-border)',
          borderRadius: 10,
          fontSize: 12.5,
          color: 'var(--gray-2)',
          lineHeight: 1.55,
        }}
      >
        <b style={{ color: 'var(--plum-dark)' }}>Why these numbers hold weight: </b>
        FD has appreciated <b>33% in 2.5 years (~14.2% YoY)</b> — fastest-moving micro-market in
        Hyderabad. 200+ GCCs (Eli Lilly, HCA, Heineken, Apple, Microsoft) are hiring
        10,000+ senior roles locally, anchoring tenant demand. TDR-led land scarcity means the
        next FD launch will price <b>15-20% above Loft</b>. The numbers above extrapolate from
        these structural drivers.
      </div>
    </TileShell>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function Slider({
  label,
  trackName,
  value,
  min,
  max,
  step,
  display,
  onChange,
  helper,
}: {
  label: string;
  trackName?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  helper?: string;
}) {
  const fireCommit = (v: number) => {
    if (trackName) track('click', trackName, { value });
  };
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}
      >
        <label
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--mid-gray)',
            fontWeight: 500,
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--plum)',
          }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) => fireCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => fireCommit(Number((e.target as HTMLInputElement).value))}
        style={{
          width: '100%',
          accentColor: 'var(--plum)',
          cursor: 'pointer',
        }}
      />
      {helper && (
        <div style={{ fontSize: 10.5, color: 'var(--light-gray)', marginTop: 2 }}>{helper}</div>
      )}
    </div>
  );
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          opacity: 0.75,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        className="serif"
        style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 500, marginTop: 4, color: '#fff' }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10.5, opacity: 0.8, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function Row({
  label,
  value,
  pos,
  neg,
  bold,
}: {
  label: string;
  value: string;
  pos?: boolean;
  neg?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--gray-2)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span
        style={{
          fontWeight: bold ? 700 : 500,
          color: pos ? 'var(--plum)' : neg ? 'var(--sienna-dark, #6f2462)' : 'var(--charcoal)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Core model ─────────────────────────────────────── */

interface ModelInput {
  size: Size;
  exitYear: number;
  appreciation: number; // YoY %, e.g. 14
  loanPct: number; // 0-80
  loanRate: number; // % p.a.
  rentGrowth: number; // YoY %
}

function compute(input: ModelInput) {
  const { size, exitYear, appreciation, loanPct, loanRate, rentGrowth } = input;
  const unitPrice = UNIT_PRICE[size];

  const downPayment = unitPrice * (1 - loanPct / 100);
  const loanAmount = unitPrice * (loanPct / 100);

  // Years from now (2026) till exit
  const yearsHeld = Math.max(1, exitYear - POSSESSION_YEAR);

  // Construction phase — 1 year (2026). EMIs on disbursed amount, but we
  // simplify to full-EMI across construction year since bulk is disbursed
  // in the first 30 days (BHFL structure).
  const constructionMonths = 12;
  const monthlyEmiFull = pmt(loanAmount, loanRate / 100 / 12, 20 * 12); // 20 yr tenure
  const emiDuringConstruction = monthlyEmiFull * constructionMonths;

  // Cash out pre-handover — down payment + construction-phase EMIs.
  // The ASBL Assured Rental Offer is excluded from this calculator at the
  // user's request: it runs separately as a direct payment from ASBL and
  // is not rolled into the investment ROI math. The offer is surfaced in
  // RentalOfferTile / elsewhere.
  const cashOutPreHandover = downPayment + emiDuringConstruction;

  // Post-possession phase — from 2027 onwards till exit
  const postPossessionYears = yearsHeld - 1; // 2027 onwards
  let postRentalTotal = 0;
  let postEmiTotal = 0;
  if (postPossessionYears > 0) {
    const baseMonthlyRent = POST_POSSESSION_MONTHLY[size];
    // Simple compounded rent model — each year at (1 + rentGrowth)
    for (let yr = 0; yr < postPossessionYears; yr++) {
      const yearlyRent = baseMonthlyRent * 12 * Math.pow(1 + rentGrowth / 100, yr);
      postRentalTotal += yearlyRent;
      postEmiTotal += monthlyEmiFull * 12;
    }
  }

  // Outstanding loan principal at exit (after yearsHeld years of payments)
  const monthsPaid = yearsHeld * 12;
  const loanAtExit = principalRemaining(loanAmount, loanRate / 100 / 12, 20 * 12, monthsPaid);

  // Exit sale value — compounded appreciation from today's price
  const exitValue = unitPrice * Math.pow(1 + appreciation / 100, yearsHeld);

  // Final returns
  // Net cash deployed = down + all EMIs - post-possession market rent.
  // (ASBL Assured Rental Offer deliberately excluded per user direction.)
  const totalEmi = emiDuringConstruction + postEmiTotal;
  const netCashDeployed = downPayment + totalEmi - postRentalTotal;

  // Exit settlement = exit value - outstanding loan
  const exitSettlement = exitValue - loanAtExit;

  // Net gain = exit settlement - net cash deployed
  const netGain = exitSettlement - netCashDeployed;

  const roiPct = netCashDeployed > 0 ? (netGain / netCashDeployed) * 100 : 0;
  const annualizedPct =
    netCashDeployed > 0 && yearsHeld > 0
      ? (Math.pow(exitSettlement / netCashDeployed, 1 / yearsHeld) - 1) * 100
      : 0;

  return {
    unitPrice,
    downPayment,
    loanAmount,
    cashOutPreHandover,
    postRentalTotal,
    postEmiTotal,
    loanAtExit,
    exitValue,
    netCashDeployed,
    netGain,
    roiPct,
    annualizedPct,
    yearsHeld,
    postPossessionYears,
  };
}

/* ─── Finance helpers ────────────────────────────────── */

function pmt(principal: number, ratePerMonth: number, totalMonths: number): number {
  if (ratePerMonth === 0) return principal / totalMonths;
  return (
    (principal * ratePerMonth) /
    (1 - Math.pow(1 + ratePerMonth, -totalMonths))
  );
}

function principalRemaining(
  principal: number,
  ratePerMonth: number,
  totalMonths: number,
  monthsPaid: number,
): number {
  if (monthsPaid >= totalMonths) return 0;
  const p = pmt(principal, ratePerMonth, totalMonths);
  if (ratePerMonth === 0) return principal - p * monthsPaid;
  const remaining =
    principal * Math.pow(1 + ratePerMonth, monthsPaid) -
    (p * (Math.pow(1 + ratePerMonth, monthsPaid) - 1)) / ratePerMonth;
  return Math.max(0, remaining);
}

function fmtCr(rupees: number): string {
  const sign = rupees < 0 ? '−' : '';
  const abs = Math.abs(rupees);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}
