'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LuxuryHome() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <LuxuryHomeInner />
    </Suspense>
  );
}

function LuxuryHomeInner() {
  const params = useSearchParams();
  const q = params.get('q');

  return (
    <>
      {/* HERO — black, grand */}
      <section className="relative">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(700px 500px at 50% -10%, rgba(184,147,90,0.22), transparent 65%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 pt-24 md:pt-36 pb-24 text-center">
          {q && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs muted-text mb-4 tracking-widest uppercase"
            >
              &ldquo;{q}&rdquo;
            </motion.p>
          )}
          <p className="eyebrow mb-6">The Sky Collection · 24 residences</p>
          <h1 className="serif text-6xl md:text-8xl leading-[0.95]">
            Floor 41.<br />
            <span className="accent-text italic">Sunrise included.</span>
          </h1>
          <p className="mt-8 text-lg muted-text max-w-xl mx-auto">
            Twenty-four east-facing, 1,870 sqft residences above the 40th floor — each with a 260
            sqft private terrace that sees the city wake up.
          </p>
          <div className="mt-10 flex justify-center gap-3 flex-wrap">
            <Link href="/v/luxury/residences" className="btn-primary">The Sky Collection →</Link>
            <a href="#contact" className="btn-ghost">Arrange private viewing</a>
          </div>
        </div>

        {/* Decorative lines */}
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="h-[320px] md:h-[480px] rounded-2xl overflow-hidden relative"
            style={{
              background:
                'linear-gradient(180deg, #0a0a0a 0%, #1a1410 40%, #2a1f18 80%, #3d2d20 100%)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(184,147,90,0.2) 0 2px, transparent 2px 60px), linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
              }}
            />
            <div
              className="absolute inset-x-0 top-0 h-1/2"
              style={{
                background:
                  'radial-gradient(ellipse at 70% 70%, rgba(184,147,90,0.35), transparent 60%)',
              }}
            />
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
              <div>
                <p className="eyebrow mb-2">Above</p>
                <p className="serif text-4xl md:text-5xl">Floor 40</p>
              </div>
              <div className="text-right">
                <p className="muted-text text-xs">Only</p>
                <p className="serif text-4xl accent-text">24</p>
                <p className="text-xs muted-text">residences</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPEC STRIP */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { k: 'Residence size', v: '1,870 sqft' },
            { k: 'Terrace', v: '260 sqft' },
            { k: 'Ceiling', v: '10 ft' },
            { k: 'Occupants', v: '2 per floor' },
          ].map((s) => (
            <div key={s.k}>
              <p className="eyebrow mb-3">{s.k}</p>
              <p className="serif text-4xl md:text-5xl accent-text">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <p className="eyebrow mb-8 text-center">The idea</p>
        <p className="serif text-3xl md:text-4xl leading-snug text-center">
          &ldquo;Luxury isn&apos;t the marble. It&apos;s the silence.<br />
          The hour you get back. The light you wake up to.<br />
          <span className="accent-text italic">The door you don&apos;t share.&rdquo;</span>
        </p>
        <p className="muted-text text-center mt-6 text-sm">— Design brief, ASBL Loft Sky Collection</p>
      </section>

      {/* PRIVATE COLLECTION TILES */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="eyebrow mb-3 text-center">The private collection</p>
        <h2 className="serif text-3xl md:text-4xl text-center mb-12">Three rituals, curated.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { t: 'Sky Pool', d: 'Heated infinity pool at 45, private reservation app.' },
            { t: 'Residents&apos; Library', d: 'Silent floor, 800 volumes, single-origin espresso.' },
            { t: 'Concierge', d: 'Named concierge per floor. WhatsApp, 7 to 11.' },
          ].map((x) => (
            <div key={x.t} className="card">
              <p className="serif text-2xl mb-3">{x.t}</p>
              <p className="muted-text text-sm" dangerouslySetInnerHTML={{ __html: x.d }} />
            </div>
          ))}
        </div>
      </section>

      {/* APPOINTMENT */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="eyebrow mb-4">By appointment</p>
        <h3 className="serif text-4xl md:text-5xl mb-5">
          A private viewing.<br />One hour. Just you.
        </h3>
        <p className="muted-text mb-8 max-w-lg mx-auto">
          We open the building on weekday mornings for one guest at a time. No sales desk, no crowd.
        </p>
        <a href="#contact" className="btn-primary">Request an appointment →</a>
      </section>
    </>
  );
}
