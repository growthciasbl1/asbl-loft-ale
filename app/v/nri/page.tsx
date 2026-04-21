'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

const timeZones = [
  { city: 'Dubai', offset: '+2:00 IST', slot: '9–11 AM Dubai' },
  { city: 'Singapore', offset: '-2:30 IST', slot: '10 AM–12 PM SGT' },
  { city: 'London', offset: '-4:30 IST', slot: '8–10 AM GMT' },
  { city: 'New York', offset: '-9:30 IST', slot: '9:30–11 PM EST' },
  { city: 'San Francisco', offset: '-12:30 IST', slot: '7–9 PM PST' },
  { city: 'Sydney', offset: '+4:30 IST', slot: '2–4 PM AEDT' },
];

export default function NriHome() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <NriHomeInner />
    </Suspense>
  );
}

function NriHomeInner() {
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
              'radial-gradient(700px 400px at 85% 10%, rgba(30,64,175,0.15), transparent 60%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-14 grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-3">
            {q && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs muted-text mb-4"
              >
                Searched: &ldquo;{q}&rdquo;
              </motion.p>
            )}
            <p className="eyebrow mb-4">For NRIs · Remote-first purchase</p>
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.04] max-w-3xl">
              You never fly to India to close it.<br />
              <span className="accent-text">We close it for you.</span>
            </h1>
            <p className="mt-6 text-lg muted-text max-w-xl">
              Entire purchase — site visit, legal, loan, registration, handover — done with you
              staying in Dubai / Singapore / London / Bay Area. 211 NRI families have done this with us.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/v/nri/virtual-tour" className="btn-primary">Start virtual tour →</Link>
              <Link href="/v/nri/legal" className="btn-ghost">FEMA, RBI, Tax</Link>
            </div>
          </div>

          <div
            className="md:col-span-2 rounded-2xl p-7"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="eyebrow mb-3">Next available call slots</p>
            <div className="space-y-2.5">
              {timeZones.slice(0, 4).map((t) => (
                <div
                  key={t.city}
                  className="flex justify-between items-center surface-2 rounded-lg p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{t.city}</p>
                    <p className="muted-text text-xs">{t.offset}</p>
                  </div>
                  <span className="accent-text text-xs font-semibold">{t.slot}</span>
                </div>
              ))}
            </div>
            <a href="#contact" className="btn-primary w-full mt-5 text-sm justify-center">
              Book a 30-min call →
            </a>
          </div>
        </div>
      </section>

      {/* 5 STEPS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="eyebrow mb-3">How it actually works</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-10 max-w-2xl">
          Five steps. Six to eight weeks. Zero travel.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { n: '01', t: 'Intro call', d: '30 min on your timezone. No pitch deck.' },
            { n: '02', t: 'Virtual walkthrough', d: 'Live tour with a named site manager.' },
            { n: '03', t: 'Power of Attorney', d: 'Drafted by our law partner. e-sign from wherever you are.' },
            { n: '04', t: 'Loan + payment', d: 'HDFC / ICICI NRI home loan. USD/AED/SGD/GBP accepted.' },
            { n: '05', t: 'Registration & keys', d: 'Your POA-holder signs. We courier keys to you.' },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="card"
            >
              <p className="accent-text font-bold">{s.n}</p>
              <p className="font-semibold mt-3 mb-2">{s.t}</p>
              <p className="muted-text text-sm">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* GLOBAL STRIP */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="eyebrow mb-6">NRIs already onboard</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {['🇦🇪 UAE · 62', '🇺🇸 USA · 48', '🇸🇬 Singapore · 31', '🇬🇧 UK · 24', '🇨🇦 Canada · 18', '🇦🇺 Australia · 12'].map(
            (c) => (
              <div key={c} className="surface rounded-xl p-4 text-center text-sm font-semibold">
                {c}
              </div>
            )
          )}
        </div>
      </section>

      {/* FAQ TEASER */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <p className="eyebrow mb-3">Common concern</p>
            <h3 className="text-3xl font-bold">
              &ldquo;I don&apos;t have a family member in India to hand keys to.&rdquo;
            </h3>
            <p className="muted-text mt-4">
              Neither did 37 of our 211 NRI buyers. We provide a bonded POA-holder (ex-IAS / retired
              banker) for a single-use appointment, under escrow. Standard practice now.
            </p>
            <Link href="/v/nri/legal" className="btn-ghost mt-5 text-sm">Legal details →</Link>
          </div>
          <div
            className="rounded-2xl p-8"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <p className="eyebrow mb-3">One resource, always up to date</p>
            <p className="font-semibold text-xl mb-5">
              &ldquo;What I wish I&apos;d known before buying from Dubai&rdquo; — PDF + Calendly
            </p>
            <form className="space-y-3">
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-3 rounded-xl bg-white border border-[var(--border)] text-[var(--text)]"
              />
              <button className="btn-primary w-full justify-center">Send me the guide</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
