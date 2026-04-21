'use client';

import { useState } from 'react';
import { PAYMENT_STRUCTURES } from '@/lib/utils/asblData';

type BankKey = 'otherBanks' | 'bajaj';

export default function BudgetPlansPage() {
  const [bank, setBank] = useState<BankKey>('bajaj');
  const [ticket] = useState(21500000);

  const structure = PAYMENT_STRUCTURES[bank];
  const items = [
    { k: 'Booking', v: structure.booking, when: 'At signing' },
    { k: 'Installment 1', v: structure.installment1, when: 'Plinth + 5 slabs' },
    { k: 'Installment 2', v: structure.installment2, when: 'Roof slab' },
    { k: 'Installment 3', v: structure.installment3, when: 'Finishes' },
    { k: 'Handover', v: structure.handover, when: 'Possession (Dec &#39;26)' },
  ];

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <p className="eyebrow mb-3">Payment plans — decoded</p>
        <h1 className="text-4xl md:text-5xl font-bold max-w-3xl">
          The plan that <span className="accent-text">starts smallest</span> wins.
        </h1>
        <p className="muted-text mt-5 max-w-xl">
          We have two approved structures. The Bajaj plan starts at 5.5% down — the lowest on any
          premium FD project today.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setBank('bajaj')}
            className={`px-5 py-2.5 rounded-full transition ${
              bank === 'bajaj' ? 'accent-bg text-white' : 'surface-2'
            }`}
          >
            Bajaj (low-booking)
          </button>
          <button
            onClick={() => setBank('otherBanks')}
            className={`px-5 py-2.5 rounded-full transition ${
              bank === 'otherBanks' ? 'accent-bg text-white' : 'surface-2'
            }`}
          >
            HDFC / SBI / Standard
          </button>
        </div>

        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.k}
              className="surface rounded-xl p-5 md:p-6 grid grid-cols-[1fr_120px_100px_160px] items-center gap-4"
            >
              <div>
                <p className="font-semibold">{it.k}</p>
                <p
                  className="muted-text text-xs mt-0.5"
                  dangerouslySetInnerHTML={{ __html: it.when }}
                />
              </div>
              <p className="accent-text font-bold text-xl">{(it.v * 100).toFixed(2)}%</p>
              <p className="text-right font-semibold text-sm">
                ₹{Math.round((ticket * it.v) / 100000)}L
              </p>
              <div className="h-2 rounded-full surface-2 overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${it.v * 100}%`, background: 'var(--accent)' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-8 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
          style={{ background: 'var(--surface-2)' }}
        >
          <div>
            <p className="muted-text text-sm">Total ticket (1,695 sqft base)</p>
            <p className="font-bold text-3xl">₹{(ticket / 10000000).toFixed(2)} Cr</p>
          </div>
          <div>
            <p className="muted-text text-sm">
              First cheque on{' '}
              {bank === 'bajaj' ? <span className="accent-text font-semibold">Bajaj plan</span> : 'standard'}
            </p>
            <p className="font-bold text-3xl accent-text">
              ₹{Math.round((ticket * structure.booking) / 100000)}L
            </p>
          </div>
          <a href="#contact" className="btn-primary">Lock plan →</a>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <p className="eyebrow mb-5">Approved lenders on this project</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['HDFC', 'SBI', 'ICICI', 'Bajaj HFL', 'Axis'].map((b) => (
            <div
              key={b}
              className="surface rounded-xl p-5 text-center font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {b}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
