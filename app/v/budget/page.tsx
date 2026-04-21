'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

function emi(p: number, r: number, y: number) {
  const m = r / 12 / 100;
  const n = y * 12;
  return (p * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

export default function BudgetHome() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <BudgetHomeInner />
    </Suspense>
  );
}

function BudgetHomeInner() {
  const params = useSearchParams();
  const q = params.get('q');

  const [rent, setRent] = useState(45000);
  const [years, setYears] = useState(25);

  const data = useMemo(() => {
    const rate = 8.5;
    const ticket = 21500000;
    const down = ticket * 0.1;
    const loan = ticket - down;
    const monthly = emi(loan, rate, years);
    const netDelta = monthly - rent;
    return { ticket, down, loan, monthly, netDelta };
  }, [rent, years]);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-14">
          {q && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs muted-text mb-4"
            >
              Searched: &ldquo;{q}&rdquo;
            </motion.p>
          )}
          <p className="eyebrow mb-4">Smart Buy · ASBL Loft</p>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.02] max-w-4xl">
            You&apos;re paying ₹{(rent / 1000).toFixed(0)}K rent.<br />
            <span className="accent-text">
              The EMI here is ₹{Math.round(data.monthly / 1000)}K.
            </span>
          </h1>
          <p className="mt-6 text-lg muted-text max-w-xl">
            {data.netDelta < 5000
              ? "Stop writing cheques to your landlord. That's a rounding error away from your own roof."
              : `About ₹${Math.round(data.netDelta / 1000)}K more a month — and every rupee builds equity, not rent receipts.`}
          </p>
        </div>
      </section>

      {/* Interactive comparator */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div
          className="rounded-3xl p-6 md:p-10 grid grid-cols-1 md:grid-cols-5 gap-8 items-start"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="md:col-span-3 space-y-6">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>You pay in rent today</span>
                <span className="accent-text">₹{(rent / 1000).toFixed(0)}K/mo</span>
              </div>
              <input
                type="range"
                min={20000}
                max={90000}
                step={1000}
                value={rent}
                onChange={(e) => setRent(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>Loan tenure</span>
                <span className="accent-text">{years} years</span>
              </div>
              <input
                type="range"
                min={15}
                max={30}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme">
              <div>
                <p className="muted-text text-xs">Ticket (1,695 sqft)</p>
                <p className="font-bold text-xl">₹{(data.ticket / 10000000).toFixed(2)}Cr</p>
              </div>
              <div>
                <p className="muted-text text-xs">10% down</p>
                <p className="font-bold text-xl">₹{Math.round(data.down / 100000)}L</p>
              </div>
              <div>
                <p className="muted-text text-xs">Loan</p>
                <p className="font-bold text-xl">₹{Math.round(data.loan / 100000)}L</p>
              </div>
              <div>
                <p className="muted-text text-xs">Monthly EMI</p>
                <p className="font-bold text-xl accent-text">
                  ₹{Math.round(data.monthly / 1000)}K
                </p>
              </div>
            </div>
          </div>

          <div
            className="md:col-span-2 rounded-2xl p-7 h-full flex flex-col justify-between"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">After 25 years of rent</p>
              <p className="text-5xl font-bold mt-2 leading-none">
                ₹{((rent * 12 * 25) / 10000000).toFixed(1)}Cr
              </p>
              <p className="opacity-80 text-sm mt-1">paid · nothing owned</p>
            </div>
            <div className="pt-6 mt-6 border-t border-white/30">
              <p className="text-xs uppercase tracking-widest opacity-80">After 25 years of EMI</p>
              <p className="text-5xl font-bold mt-2 leading-none">1 unit</p>
              <p className="opacity-80 text-sm mt-1">
                owned · worth ≈ ₹{((data.ticket * 2.2) / 10000000).toFixed(1)}Cr at 3.3% CAGR
              </p>
            </div>
            <Link
              href="/v/budget/affordability"
              className="mt-6 bg-white text-[var(--accent)] font-semibold text-center py-3 rounded-full"
            >
              See if you qualify →
            </Link>
          </div>
        </div>
      </section>

      {/* WHY IT ADDS UP */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="eyebrow mb-6">Why the math works here</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              t: '10% booking',
              b: 'Just ₹1.94L (Bajaj) or ₹2.15L to lock your unit. Rest is construction-linked.',
            },
            {
              t: 'Pre-EMI till handover',
              b: "You pay interest only on disbursed slabs. Your cash stays where it's working.",
            },
            {
              t: 'Sec 24B + 80C',
              b: 'Up to ₹2L interest + ₹1.5L principal deduction. Real tax savings.',
            },
          ].map((x) => (
            <div key={x.t} className="card">
              <p className="font-semibold mb-2">{x.t}</p>
              <p className="muted-text text-sm">{x.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ACTION */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div
          className="rounded-3xl p-10 md:p-14 text-center"
          style={{ background: 'var(--surface-2)' }}
        >
          <p className="eyebrow mb-3">Three-minute pre-approval</p>
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Know your exact ticket price <span className="accent-text">before you visit.</span>
          </h3>
          <p className="muted-text mb-7 max-w-xl mx-auto">
            We plug your salary/IT data into HDFC, SBI, Bajaj simultaneously. You get three
            loan-eligibility numbers before the site visit.
          </p>
          <Link href="/v/budget/affordability" className="btn-primary">Check eligibility →</Link>
        </div>
      </section>
    </>
  );
}
