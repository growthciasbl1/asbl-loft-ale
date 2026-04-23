'use client';

import { useMemo, useState } from 'react';
import { PAYMENT_STRUCTURES } from '@/lib/utils/asblData';

function emi(p: number, r: number, y: number) {
  const m = r / 12 / 100;
  const n = y * 12;
  return (p * m * Math.pow(1 + m, n)) / (Math.pow(1 + m, n) - 1);
}

export default function InvestorFinancePage() {
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
    const cocNumerator = annualRent - annualEmi;
    const cocYield = (cocNumerator / down) * 100;
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
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-6">
        <p className="eyebrow mb-3">The levered play</p>
        <h1 className="text-4xl md:text-5xl serif max-w-3xl">
          With 25% down, you&apos;re not buying a home.<br />
          <span className="accent-text">You&apos;re buying a yield multiplier.</span>
        </h1>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Controls */}
        <div className="lg:col-span-3 surface rounded-2xl p-6 md:p-8 space-y-7">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold">Ticket size</label>
              <span className="accent-text font-semibold">₹{(ticket / 10000000).toFixed(2)}Cr</span>
            </div>
            <input
              type="range"
              min={15000000}
              max={30000000}
              step={100000}
              value={ticket}
              onChange={(e) => setTicket(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">Down payment</span>
                <span className="accent-text font-semibold">{downPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={downPct}
                onChange={(e) => setDownPct(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">Loan rate</span>
                <span className="accent-text font-semibold">{rate.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={7}
                max={11}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">Tenure</span>
                <span className="accent-text font-semibold">{years}y</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">Expected rent</span>
                <span className="accent-text font-semibold">₹{(rent / 1000).toFixed(0)}K</span>
              </div>
              <input
                type="range"
                min={30000}
                max={90000}
                step={1000}
                value={rent}
                onChange={(e) => setRent(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </div>

          <div className="pt-5 border-t border-theme">
            <p className="text-sm font-semibold mb-3">Payment structure</p>
            <div className="flex gap-2">
              <button
                onClick={() => setBank('otherBanks')}
                className={`px-4 py-2 rounded-full text-sm ${bank === 'otherBanks' ? 'accent-bg text-white' : 'surface-2'}`}
              >
                Standard banks
              </button>
              <button
                onClick={() => setBank('bajaj')}
                className={`px-4 py-2 rounded-full text-sm ${bank === 'bajaj' ? 'accent-bg text-white' : 'surface-2'}`}
              >
                Bajaj (low booking)
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-4 text-xs">
              {[
                ['Booking', structure.booking],
                ['Install 1', structure.installment1],
                ['Install 2', structure.installment2],
                ['Install 3', structure.installment3],
                ['Handover', structure.handover],
              ].map(([k, v]) => (
                <div key={k as string} className="surface-2 rounded-lg p-3 text-center">
                  <p className="muted-text">{k as string}</p>
                  <p className="font-semibold mt-1">{((v as number) * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result card */}
        <div className="lg:col-span-2 rounded-2xl p-8" style={{ background: 'var(--accent)', color: '#0a0a14' }}>
          <p className="text-xs uppercase tracking-widest opacity-70 mb-2">Your cash-on-cash</p>
          <p className="text-7xl font-bold serif leading-none">{numbers.cocYield.toFixed(1)}<span className="text-3xl">%</span></p>

          <div className="mt-8 space-y-3 text-sm">
            <div className="flex justify-between pb-3 border-b border-black/20">
              <span>Gross yield</span>
              <span className="font-semibold">{numbers.grossYield.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-black/20">
              <span>Down payment</span>
              <span className="font-semibold">₹{(numbers.down / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-black/20">
              <span>Monthly EMI</span>
              <span className="font-semibold">₹{Math.round(numbers.monthlyEmi / 1000)}K</span>
            </div>
            <div className="flex justify-between">
              <span>Net monthly (rent − EMI)</span>
              <span className={`font-bold ${numbers.netMonthly >= 0 ? '' : 'text-red-900'}`}>
                ₹{Math.round(numbers.netMonthly / 1000)}K
              </span>
            </div>
          </div>

          <button className="mt-8 w-full bg-black text-[var(--accent)] py-3.5 rounded-full font-semibold">
            Send full IRR →
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="eyebrow mb-3">Fine print, not buried</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            ['Fixed 5-milestone schedule', 'You pay at pre-defined stages. No full capital lock-up upfront.'],
            ['Pre-EMI until handover', 'Interest-only on disbursed portion. Your cash stays liquid.'],
            ['GST rebate on rent', 'Residential exempt — your yield is clean.'],
          ].map(([t, b]) => (
            <div key={t} className="card">
              <p className="font-semibold mb-2">{t}</p>
              <p className="muted-text text-sm">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
