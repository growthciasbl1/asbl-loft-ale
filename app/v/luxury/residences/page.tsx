'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ASBL_LOFT_DATA } from '@/lib/utils/asblData';

export default function LuxuryResidencesPage() {
  const skyUnits = useMemo(
    () =>
      ASBL_LOFT_DATA.units
        .filter((u) => u.floor >= 41 && u.size === 1870 && u.facing === 'EAST')
        .sort((a, b) => b.floor - a.floor)
        .slice(0, 24),
    []
  );

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <p className="eyebrow mb-3">The Sky Collection</p>
        <h1 className="serif text-5xl md:text-6xl max-w-3xl">
          Twenty-four residences.<br />
          <span className="accent-text italic">That&apos;s it.</span>
        </h1>
        <p className="muted-text mt-6 max-w-xl">
          1,870 sqft, east-facing, above floor 41. Two per floor. Twelve floors. No more, no fewer.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="surface rounded-2xl overflow-hidden">
          <div
            className="grid grid-cols-[100px_1fr_1fr_1fr_150px] px-6 py-4 text-xs uppercase tracking-wider muted-text"
            style={{ background: 'var(--surface-2)' }}
          >
            <div>Floor</div>
            <div>Residence</div>
            <div>Tower</div>
            <div>Ticket</div>
            <div className="text-right">Status</div>
          </div>
          {skyUnits.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.02 }}
              className="grid grid-cols-[100px_1fr_1fr_1fr_150px] px-6 py-5 border-t border-theme items-center"
            >
              <div className="serif text-2xl accent-text">{u.floor}</div>
              <div>
                <p className="font-semibold text-sm">Residence {u.id}</p>
                <p className="muted-text text-xs mt-0.5">1,870 sqft · 260 sqft terrace · East</p>
              </div>
              <div className="text-sm">Tower {u.tower}</div>
              <div className="text-sm">₹{(u.totalPrice / 10000000).toFixed(2)} Cr all-in</div>
              <div className="text-right">
                <span
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    background: u.available ? 'rgba(184,147,90,0.18)' : 'rgba(140,130,118,0.15)',
                    color: u.available ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  {u.available ? 'Available' : 'Held'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p className="eyebrow mb-3">What&apos;s included</p>
          <h2 className="serif text-3xl md:text-4xl mb-6">Finishes, not options.</h2>
          <ul className="space-y-3 muted-text">
            <li>— Teak wood front door, concealed hinge, soft-close</li>
            <li>— 10 ft ceilings across living and master</li>
            <li>— 800 × 800 double-charged vitrified, matte</li>
            <li>— Grohe fixtures, Duravit sanitary throughout</li>
            <li>— Kitchen pre-plumbed for dishwasher + coffee machine</li>
            <li>— EV charging outlet in your allotted bay</li>
            <li>— Triple-glazed balcony doors (noise cut 34 dB)</li>
          </ul>
        </div>
        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--accent)' }}
        >
          <p className="eyebrow mb-4">Private appointment</p>
          <p className="serif text-2xl mb-5">
            We&apos;ll walk you through a mirrored unit on floor 38 — identical finish, same view arc.
          </p>
          <form className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-transparent border border-theme text-sm"
            />
            <input
              type="tel"
              placeholder="Contact"
              className="w-full px-4 py-3 rounded-xl bg-transparent border border-theme text-sm"
            />
            <input
              type="text"
              placeholder="Preferred residence (e.g. A-45E-1870)"
              className="w-full px-4 py-3 rounded-xl bg-transparent border border-theme text-sm"
            />
            <button className="btn-primary w-full">Request viewing →</button>
          </form>
        </div>
      </section>
    </>
  );
}
