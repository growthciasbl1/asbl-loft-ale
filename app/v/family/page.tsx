'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

export default function FamilyHome() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <FamilyHomeInner />
    </Suspense>
  );
}

function FamilyHomeInner() {
  const params = useSearchParams();
  const q = params.get('q');

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(700px 400px at 80% 10%, rgba(200,125,79,0.18), transparent 60%), radial-gradient(600px 400px at 10% 90%, rgba(160,90,46,0.12), transparent 60%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-14 md:pt-24 pb-16">
          {q && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 inline-flex items-center gap-2 text-xs muted-text"
            >
              <span className="w-1.5 h-1.5 rounded-full accent-bg" /> Tailored for: &ldquo;{q}&rdquo;
            </motion.div>
          )}
          <p className="eyebrow mb-5">For families · Financial District</p>
          <h1 className="serif text-5xl md:text-7xl leading-[1.05] max-w-4xl">
            The morning your daughter walks to school,<br />
            <span className="accent-text italic">unhurried.</span>
          </h1>
          <p className="mt-7 text-lg muted-text max-w-xl">
            We designed ASBL Loft for the small moments — the 7:42am walk to the bus stop, the
            4pm playground sprint, the Sunday breakfast on a 125 sqft balcony.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/v/family/schools" className="btn-primary">See schools nearby →</Link>
            <Link href="/v/family/amenities" className="btn-ghost">What&apos;s inside the community</Link>
          </div>
        </div>
      </section>

      {/* MORNING STORY */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="eyebrow mb-3">A day, told in minutes</p>
        <h2 className="serif text-3xl md:text-4xl mb-10 max-w-2xl">
          Here&apos;s what a Tuesday looks like.
        </h2>
        <div className="space-y-2">
          {[
            { t: '6:45', h: 'Jog loop, east of the tower', b: 'Fresh air before anyone&apos;s up.' },
            { t: '7:30', h: 'Breakfast on the balcony', b: '125 sqft is enough for a small table and tea.' },
            { t: '8:00', h: 'School bus stop, 4 mins away', b: 'Your kid walks it themselves by age 9.' },
            { t: '9:30', h: 'Co-working space', b: 'You skip the commute on WFH days.' },
            { t: '16:30', h: 'Playground + creche pickup', b: 'Both within the gated compound.' },
            { t: '19:00', h: 'Badminton / pool / yoga', b: '3 badminton courts. Reserve by app.' },
            { t: '21:30', h: 'Quiet', b: 'Gated, 24/7 CCTV, neighbours you know.' },
          ].map((row, i) => (
            <motion.div
              key={row.t}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="surface rounded-xl p-5 md:p-6 grid grid-cols-[70px_1fr] md:grid-cols-[90px_1fr_2fr] gap-5 items-center"
            >
              <p className="serif text-3xl accent-text">{row.t}</p>
              <p className="font-semibold">{row.h}</p>
              <p className="muted-text text-sm hidden md:block">{row.b}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* THREE PILLARS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              k: 'School-walkable',
              v: '5–10 min',
              b: 'Delhi Public School, Oakridge, Chirec — all within a 10-minute drive.',
            },
            {
              k: 'Gated & safe',
              v: '24/7',
              b: 'CCTV coverage, controlled access, children playing outside is normal again.',
            },
            {
              k: 'Made for kids',
              v: '5+',
              b: 'Creche, learning center, play area, basketball, cycling loop.',
            },
          ].map((p) => (
            <div key={p.k} className="card">
              <p className="serif text-5xl accent-text mb-2">{p.v}</p>
              <p className="font-semibold mb-2">{p.k}</p>
              <p className="muted-text text-sm">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOME SIZES */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              size: '1,695 sqft',
              rooms: '3 bed · 2 bath · 125 sqft balcony',
              fit: 'A family of four who host relatives twice a year.',
              cta: 'View the 1,695 layout',
            },
            {
              size: '1,870 sqft',
              rooms: '3 bed · 2.5 bath · 260 sqft balcony',
              fit: 'A family that wants a reading nook + a home office.',
              cta: 'View the 1,870 layout',
            },
          ].map((h) => (
            <div
              key={h.size}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="h-48 md:h-56"
                style={{
                  background:
                    'linear-gradient(135deg, var(--surface-2), var(--accent) 200%)',
                }}
              />
              <div className="p-7">
                <p className="serif text-3xl accent-text mb-1">{h.size}</p>
                <p className="muted-text text-sm mb-3">{h.rooms}</p>
                <p className="mb-5">&ldquo;{h.fit}&rdquo;</p>
                <Link href="/v/family/floor-plans" className="btn-ghost text-sm">{h.cta} →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TOUR CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="surface-2 rounded-3xl p-10 md:p-14 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <p className="eyebrow mb-2">Come see it</p>
            <h3 className="serif text-3xl md:text-4xl">
              Saturday tours.<br />
              <span className="accent-text">Kids welcome</span> — we have snacks.
            </h3>
          </div>
          <div className="flex md:justify-end">
            <a href="#contact" className="btn-primary">Book Saturday tour →</a>
          </div>
        </div>
      </section>
    </>
  );
}
