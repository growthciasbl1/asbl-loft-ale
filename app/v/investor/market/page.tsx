'use client';

import { motion } from 'framer-motion';
import { ASBL_LOFT_DATA } from '@/lib/utils/asblData';

const tenantPersonas = [
  {
    name: 'Principal Engineer, Amazon Hyd',
    package: '₹65 L',
    tenure: '2–3 yrs',
    weight: 32,
    paysUpto: '₹72K/mo',
  },
  {
    name: 'Manager, Microsoft IDC',
    package: '₹55 L',
    tenure: '2–4 yrs',
    weight: 28,
    paysUpto: '₹62K/mo',
  },
  {
    name: 'Director, Global Capability Centre',
    package: '₹90 L',
    tenure: '3+ yrs',
    weight: 18,
    paysUpto: '₹1.1L/mo',
  },
  {
    name: 'Consultant, Deloitte/EY',
    package: '₹40 L',
    tenure: '1–2 yrs',
    weight: 14,
    paysUpto: '₹50K/mo',
  },
  {
    name: 'Senior Dev, Qualcomm/NVIDIA',
    package: '₹75 L',
    tenure: '2–3 yrs',
    weight: 8,
    paysUpto: '₹85K/mo',
  },
];

export default function InvestorMarketPage() {
  const nearby = ASBL_LOFT_DATA.nearbyLocations;

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <p className="eyebrow mb-3">Rental market data</p>
        <h1 className="text-4xl md:text-5xl serif max-w-3xl">
          The tenants live here because work is <span className="accent-text">14 minutes away.</span>
        </h1>
        <p className="muted-text mt-6 max-w-2xl">
          Financial District is the southern anchor of Hyderabad&apos;s IT corridor. ASBL Loft sits inside
          a 30-minute commute radius of every major tech campus. These are the tenants writing the
          cheques.
        </p>
      </section>

      {/* Tenant personas */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="eyebrow mb-6">Who rents — by weight</p>
        <div className="space-y-3">
          {tenantPersonas.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="surface rounded-xl p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs muted-text mt-1">
                    CTC {t.package} · Stay {t.tenure} · Pays upto {t.paysUpto}
                  </p>
                </div>
                <div className="flex-1 min-w-[200px] max-w-md">
                  <div className="h-2 rounded-full surface-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${t.weight}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: i * 0.05 }}
                      className="h-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  </div>
                </div>
                <p className="accent-text font-semibold w-14 text-right">{t.weight}%</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Commute grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="eyebrow mb-6">Commute-to-campus time</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(nearby).map(([key, val]) => (
            <div key={key} className="card">
              <p className="eyebrow mb-2">{key}</p>
              <p className="text-4xl serif">{val.distance}<span className="text-lg ml-1">min</span></p>
              {'professionals' in val && (
                <p className="muted-text text-sm mt-2">
                  {(val.professionals / 1000).toFixed(0)}K+ professionals
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rent trend */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <p className="eyebrow mb-3">Rent trajectory (3BHK, FD)</p>
            <h2 className="text-3xl serif mb-4">
              Rents have compounded at <span className="accent-text">8.4%</span> since 2020.
            </h2>
            <p className="muted-text">
              Hyderabad tech salaries have risen faster than rent inflation, so tenants are
              price-tolerant. Our model assumes only 5% YoY rent escalation — still conservative.
            </p>
          </div>
          <div className="surface rounded-2xl p-8">
            {[
              { yr: '2020', v: '₹38K', pct: 55 },
              { yr: '2021', v: '₹41K', pct: 62 },
              { yr: '2022', v: '₹47K', pct: 72 },
              { yr: '2023', v: '₹51K', pct: 80 },
              { yr: '2024', v: '₹55K', pct: 88 },
              { yr: '2026e', v: '₹63K', pct: 100 },
            ].map((r, i) => (
              <div key={r.yr} className="flex items-center gap-4 py-2.5">
                <span className="muted-text w-14 text-xs">{r.yr}</span>
                <div className="flex-1 h-2 surface-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${r.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.1 }}
                    className="h-full"
                    style={{ background: 'var(--accent)' }}
                  />
                </div>
                <span className="w-14 text-right font-semibold">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
