'use client';

import { useMemo, useState } from 'react';

function emi(p: number, r: number, y: number) {
  const m = r / 12 / 100;
  const n = y * 12;
  return (p * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

export default function AffordabilityPage() {
  const [salary, setSalary] = useState(25);
  const [existingEmi, setExistingEmi] = useState(0);
  const [years, setYears] = useState(25);

  const result = useMemo(() => {
    const monthlyIncome = (salary * 100000) / 12;
    const maxEmiAllowed = monthlyIncome * 0.5 - existingEmi;
    const rate = 8.5;
    const m = rate / 12 / 100;
    const n = years * 12;
    const maxLoan = maxEmiAllowed > 0 ? (maxEmiAllowed * (Math.pow(1 + m, n) - 1)) / (m * Math.pow(1 + m, n)) : 0;
    const downNeeded = 2150000;
    const maxTicket = maxLoan + downNeeded;
    const emi1695 = emi(21500000 - 215000, rate, years);
    const emi1870 = emi(24100000 - 241000, rate, years);

    return {
      monthlyIncome,
      maxEmiAllowed,
      maxLoan,
      maxTicket,
      canAfford1695: maxTicket >= 21500000,
      canAfford1870: maxTicket >= 24100000,
      emi1695,
      emi1870,
    };
  }, [salary, existingEmi, years]);

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-6">
        <p className="eyebrow mb-3">Affordability, instantly</p>
        <h1 className="text-4xl md:text-5xl font-bold max-w-3xl">
          Before you visit, <span className="accent-text">know the number.</span>
        </h1>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Inputs */}
        <div className="md:col-span-2 surface rounded-2xl p-7 space-y-7">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold">Annual salary</label>
              <span className="accent-text font-bold">₹{salary}L</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold">Existing EMIs</label>
              <span className="accent-text font-bold">₹{existingEmi.toLocaleString()}/mo</span>
            </div>
            <input
              type="range"
              min={0}
              max={80000}
              step={1000}
              value={existingEmi}
              onChange={(e) => setExistingEmi(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold">Tenure</label>
              <span className="accent-text font-bold">{years} yrs</span>
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
        </div>

        {/* Output */}
        <div className="md:col-span-3 space-y-5">
          <div
            className="rounded-2xl p-7"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <p className="text-xs uppercase tracking-widest opacity-80 mb-2">Max ticket you can afford</p>
            <p className="text-6xl font-bold leading-none">
              ₹{(result.maxTicket / 10000000).toFixed(2)}<span className="text-2xl">Cr</span>
            </p>
            <p className="opacity-80 text-sm mt-3">
              Max EMI ₹{Math.round(result.maxEmiAllowed / 1000)}K/mo · Max loan ₹
              {Math.round(result.maxLoan / 100000)}L
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className="card"
              style={{
                borderColor: result.canAfford1695 ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <p className="text-sm font-semibold">1,695 sqft</p>
              <p className="text-2xl font-bold mt-1">₹2.15Cr</p>
              <p
                className="text-xs mt-2 font-semibold"
                style={{ color: result.canAfford1695 ? 'var(--accent)' : 'var(--muted)' }}
              >
                {result.canAfford1695
                  ? '✓ Affordable · EMI ₹' + Math.round(result.emi1695 / 1000) + 'K'
                  : 'Over budget by ₹' +
                    Math.round((21500000 - result.maxTicket) / 100000) +
                    'L'}
              </p>
            </div>
            <div
              className="card"
              style={{
                borderColor: result.canAfford1870 ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <p className="text-sm font-semibold">1,870 sqft</p>
              <p className="text-2xl font-bold mt-1">₹2.41Cr</p>
              <p
                className="text-xs mt-2 font-semibold"
                style={{ color: result.canAfford1870 ? 'var(--accent)' : 'var(--muted)' }}
              >
                {result.canAfford1870
                  ? '✓ Affordable · EMI ₹' + Math.round(result.emi1870 / 1000) + 'K'
                  : 'Over budget by ₹' +
                    Math.round((24100000 - result.maxTicket) / 100000) +
                    'L'}
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl p-6"
            style={{ background: 'var(--surface-2)' }}
          >
            <p className="font-semibold mb-2">Next: 3-minute pre-approval</p>
            <p className="muted-text text-sm mb-5">
              We pull your CIBIL + ITR + salary slip once, get eligibility from HDFC, SBI &amp;
              Bajaj in parallel. You leave with three signed numbers.
            </p>
            <a href="#contact" className="btn-primary">Start pre-approval →</a>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <p className="muted-text text-xs">
          * Banks usually cap FOIR (fixed obligation-to-income) at 50%. We model that here. Actual
          sanction depends on CIBIL, vintage, and existing obligations — variance ±12%.
        </p>
      </section>
    </>
  );
}
