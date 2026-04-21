'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type Plan = 1695 | 1870;

const detail: Record<
  Plan,
  {
    rooms: string;
    balcony: string;
    bestFor: string;
    priceRange: string;
    callouts: { title: string; body: string }[];
  }
> = {
  1695: {
    rooms: '3 Bed · 2 Bath',
    balcony: '125 sqft balcony',
    bestFor: 'Family of 4, no live-in help needed',
    priceRange: '₹1.94 Cr – ₹2.05 Cr (base)',
    callouts: [
      { title: 'Master bedroom', body: '14 × 12 with walk-in closet. Fits a king + a small armchair.' },
      { title: 'Kid&#39;s room', body: '11 × 11 — enough for a single bed, desk, and a bookshelf.' },
      { title: 'Kitchen', body: 'L-shape, 9 × 8. Dishwasher + microwave outlets pre-wired.' },
      { title: 'Living', body: '16 × 12, opens to 125 sqft balcony. East-facing units flood at 8am.' },
    ],
  },
  1870: {
    rooms: '3 Bed · 2.5 Bath',
    balcony: '260 sqft balcony',
    bestFor: 'Family of 4 + extended family visits + home office',
    priceRange: '₹2.15 Cr – ₹2.28 Cr (base)',
    callouts: [
      { title: 'Master suite', body: '16 × 13 with walk-in closet and en-suite. Blackout curtains at built-in track.' },
      { title: 'Kids room + study nook', body: '12 × 11 with a window desk alcove — no bunk bed needed.' },
      { title: 'Guest / office', body: '11 × 10 with half-bath adjacent. Zoom calls without backdrops.' },
      { title: 'Balcony', body: '260 sqft wraps two sides. Table for 6 + a swing chair.' },
    ],
  },
};

export default function FamilyFloorPlansPage() {
  const [plan, setPlan] = useState<Plan>(1870);
  const d = detail[plan];

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <p className="eyebrow mb-3">Floor plans · decoded</p>
        <h1 className="serif text-4xl md:text-5xl max-w-3xl">
          Which one gives your family<br />
          <span className="accent-text">room to breathe?</span>
        </h1>
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <div className="flex gap-3">
          {([1695, 1870] as Plan[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={`px-6 py-3 rounded-full transition ${
                plan === p ? 'accent-bg text-white' : 'surface-2'
              }`}
            >
              {p.toLocaleString()} sqft
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-5 gap-8">
        <motion.div
          key={plan}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-3 rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface-2)' }}
        >
          <div
            className="h-64 md:h-96 flex items-center justify-center"
            style={{
              background:
                'repeating-linear-gradient(45deg, var(--surface) 0 12px, var(--surface-2) 12px 24px)',
            }}
          >
            <div className="text-center">
              <p className="serif text-6xl md:text-7xl accent-text">{plan}</p>
              <p className="muted-text text-sm mt-2">sqft · {d.rooms}</p>
            </div>
          </div>
          <div className="p-7">
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Layout', d.rooms],
                ['Outdoor', d.balcony],
                ['Range', d.priceRange],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="muted-text text-xs">{k}</p>
                  <p className="font-semibold text-sm mt-1">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="md:col-span-2 space-y-3">
          <p className="eyebrow">Best for</p>
          <p className="font-semibold serif text-xl mb-4">{d.bestFor}</p>
          {d.callouts.map((c) => (
            <div key={c.title} className="card">
              <p className="font-semibold mb-1">{c.title}</p>
              <p
                className="muted-text text-sm"
                dangerouslySetInnerHTML={{ __html: c.body }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="surface-2 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row gap-6 items-center justify-between">
          <h3 className="serif text-3xl md:text-4xl max-w-lg">
            Need the high-res PDF with furniture placement?
          </h3>
          <a href="#contact" className="btn-primary">Send the PDF →</a>
        </div>
      </section>
    </>
  );
}
