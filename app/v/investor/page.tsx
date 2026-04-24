'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ASBL_LOFT_DATA } from '@/lib/utils/asblData';

function YieldCounter({ target }: { target: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span>{v.toFixed(2)}</span>;
}

export default function InvestorHome() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <InvestorHomeInner />
    </Suspense>
  );
}

function InvestorHomeInner() {
  const params = useSearchParams();
  const q = params.get('q');

  const units = ASBL_LOFT_DATA.units;
  const avgYield =
    units.reduce((a, u) => a + u.roiPercentage, 0) / Math.max(1, units.length);
  const avgRental = units.reduce((a, u) => a + u.expectedRental, 0) / Math.max(1, units.length);
  const availableHigh = units.filter((u) => u.available && u.floor > 35).length;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(800px 400px at 15% 10%, rgba(212,175,55,0.22), transparent 60%), radial-gradient(900px 500px at 90% 90%, rgba(212,175,55,0.08), transparent 60%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 md:pt-28 pb-20 grid grid-cols-1 md:grid-cols-5 gap-12">
          <div className="md:col-span-3">
            {q && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-5 inline-flex items-center gap-2 text-xs muted-text"
              >
                <span className="w-1.5 h-1.5 rounded-full accent-bg" /> Tailored for: &ldquo;{q}&rdquo;
              </motion.div>
            )}
            <p className="eyebrow mb-5">Investor Thesis · 2026</p>
            <h1 className="display serif">
              A <span className="accent-text">{avgYield.toFixed(2)}%</span> gross yield<br />
              in India&apos;s fastest-renting<br />
              office corridor.
            </h1>
            <p className="mt-6 text-base md:text-lg muted-text max-w-xl">
              ASBL Loft sits 14 minutes from HITEC City — where 50,000 salaried tech professionals
              renew leases every year. Our floor-plate, facing and tower math is built for tenants who
              stay.
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link href="/v/investor/units" className="btn-primary">Open the yield matrix →</Link>
            </div>
          </div>

          <div className="md:col-span-2 surface rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <p className="eyebrow mb-1">Live snapshot</p>
              <p className="text-5xl md:text-6xl font-bold serif accent-text leading-none mt-2">
                <YieldCounter target={avgYield} />
                <span className="text-2xl">%</span>
              </p>
              <p className="muted-text text-sm mt-1">Average gross rental yield</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-theme">
              <div>
                <p className="muted-text text-xs">Avg. rental (mo)</p>
                <p className="text-lg font-semibold">₹{Math.round(avgRental / 1000)}K</p>
              </div>
              <div>
                <p className="muted-text text-xs">Available · floor 35+</p>
                <p className="text-lg font-semibold">{availableHigh}</p>
              </div>
              <div>
                <p className="muted-text text-xs">Handover</p>
                <p className="text-lg font-semibold">Dec &apos;26</p>
              </div>
              <div>
                <p className="muted-text text-xs">Exit liquidity</p>
                <p className="text-lg font-semibold">Resale active</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THESIS PILLARS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="eyebrow mb-3">Thesis pillars</p>
        <h2 className="text-3xl md:text-4xl serif mb-12 max-w-2xl">
          Why this stacks up vs. the usual 3BHK investment.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              k: '01',
              title: 'Tenant density, not speculation',
              body: '50K+ IT salaries within a 15-min drive. Demand is a lease renewal cycle, not a launch story.',
            },
            {
              k: '02',
              title: 'Floor-plate engineered for rent',
              body: 'Two layouts (1,695 / 1,870 sqft) priced so yield holds across both. East facing carries the premium.',
            },
            {
              k: '03',
              title: 'Exit that isn&#39;t theoretical',
              body: '665 of 893 units already sold. Secondary market has comps before you even take possession.',
            },
          ].map((p) => (
            <motion.div
              key={p.k}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card"
            >
              <p className="accent-text font-semibold mb-4">{p.k}</p>
              <p className="text-xl font-semibold mb-3 serif">{p.title}</p>
              <p className="muted-text text-sm" dangerouslySetInnerHTML={{ __html: p.body }} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* RENTAL MATH */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="eyebrow mb-3">The math, plainly</p>
            <h2 className="text-3xl md:text-4xl serif mb-6">
              ₹55K rent.<br />₹2.15Cr ticket.<br />Your tenant moves in on Day 1.
            </h2>
            <p className="muted-text">
              Our modelling assumes a conservative ₹55,000/mo on a 1,870 sqft east-facing unit on
              floor 35. That&apos;s 3.0% gross unlevered yield on a tenant-ready unit the day
              possession hits.
            </p>
            <Link href="/v/investor/units" className="btn-ghost mt-6 text-sm">
              See the unit-level yield matrix →
            </Link>
          </div>
          <div className="surface-2 rounded-2xl p-8">
            <div className="space-y-5">
              {[
                ['Ticket (1,870 sqft)', '₹2.15 Cr'],
                ['Stamp + GST', '₹26 L'],
                ['All-in', '₹2.41 Cr'],
                ['Rent (mo)', '₹55,000'],
                ['Rent (yr)', '₹6.6 L'],
                ['Gross yield', '2.74%'],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  className={`flex justify-between ${i === 5 ? 'pt-4 mt-2 border-t border-theme' : ''}`}
                >
                  <span className="muted-text text-sm">{k}</span>
                  <span className={`font-semibold ${i === 6 ? 'accent-text text-lg' : ''}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div
          className="rounded-3xl p-10 md:p-14 text-center"
          style={{
            background:
              'radial-gradient(600px 300px at 50% 0%, rgba(212,175,55,0.18), transparent 60%), var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="eyebrow mb-3">Next step</p>
          <h3 className="text-3xl md:text-4xl serif mb-4">
            See the yield, the site, and the story.
          </h3>
          <p className="muted-text mb-7 max-w-xl mx-auto">
            Pick a slot — a 20-minute walk-through on floor, facing, rental evidence, and
            payment plan. No pressure, no pitch deck.
          </p>
          <a href="#contact" className="btn-primary">Book a site visit →</a>
        </div>
      </section>
    </>
  );
}
