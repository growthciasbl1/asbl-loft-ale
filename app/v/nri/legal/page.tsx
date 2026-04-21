'use client';

import { useState } from 'react';

const topics = [
  {
    k: 'fema',
    title: 'FEMA rules for NRIs',
    summary:
      'NRIs can buy residential or commercial property in India without RBI approval. Agricultural land, plantations, farmhouses — not allowed.',
    details: [
      'Payment must be from NRE / NRO / FCNR accounts, or by inward remittance via banking channels.',
      'No limit on number of residential properties purchased.',
      'Repatriation: proceeds from sale of up to 2 residential properties are repatriable.',
    ],
  },
  {
    k: 'tax',
    title: 'Tax on rental income',
    summary:
      'Indian rental income is taxable in India. TDS at 31.2% applies; you can claim credit under DTAA in your resident country.',
    details: [
      'Standard deduction of 30% on annual rent (Section 24A).',
      'Interest on home loan up to ₹2L deductible (Section 24B).',
      'DTAA with UAE / UK / USA / Singapore avoids double taxation.',
    ],
  },
  {
    k: 'loan',
    title: 'NRI home loan',
    summary:
      'HDFC, ICICI, SBI offer NRI home loans up to 80% LTV at domestic rates. Tenure: up to 20 years or retirement, whichever earlier.',
    details: [
      'Documents: passport, visa, overseas address proof, 6-month salary slips, 6-month NRE statements.',
      'Co-applicant usually an Indian resident relative.',
      'EMI payment from NRE / NRO account.',
    ],
  },
  {
    k: 'poa',
    title: 'Power of Attorney',
    summary:
      'Required for registration, handover, ongoing representation. Specific (not general) POA recommended.',
    details: [
      'Notarized & apostilled in your country, then adjudicated at Sub-Registrar&#39;s office in India.',
      'Valid for specified transactions and time window.',
      'We provide bonded POA-holders for buyers without family in India.',
    ],
  },
  {
    k: 'repatriation',
    title: 'Repatriation on sale',
    summary:
      'Sale proceeds of up to 2 residential properties fully repatriable; subject to tax clearance (Form 15CA / 15CB).',
    details: [
      'LTCG after 2 years at 20% with indexation.',
      '1% TDS if sale consideration > ₹50L (Section 194-IA).',
      'CA-certified Form 15CB needed before outward remittance > ₹5L.',
    ],
  },
];

export default function NriLegalPage() {
  const [open, setOpen] = useState<string | null>('fema');

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <p className="eyebrow mb-3">Legal & Tax · plain English</p>
        <h1 className="text-4xl md:text-5xl font-bold max-w-3xl">
          Everything you&apos;re supposed to know,<br />
          <span className="accent-text">not buried.</span>
        </h1>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-10 space-y-3">
        {topics.map((t) => (
          <div key={t.k} className="surface rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpen(open === t.k ? null : t.k)}
              className="w-full p-6 text-left flex justify-between items-start gap-4"
            >
              <div>
                <p className="font-semibold text-lg">{t.title}</p>
                <p className="muted-text text-sm mt-2">{t.summary}</p>
              </div>
              <span className="text-2xl accent-text flex-shrink-0">
                {open === t.k ? '−' : '+'}
              </span>
            </button>
            {open === t.k && (
              <div className="px-6 pb-6 border-t border-theme pt-5">
                <ul className="space-y-2.5">
                  {t.details.map((d, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm muted-text"
                      dangerouslySetInnerHTML={{ __html: `<span class="accent-text font-semibold">→</span> ${d}` }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="eyebrow mb-3">Still have a specific question?</p>
        <h3 className="text-3xl font-bold mb-6">
          Our NRI desk (Hyderabad + Dubai) replies in under 4 hours.
        </h3>
        <a href="#contact" className="btn-primary">Ask the NRI desk →</a>
      </section>
    </>
  );
}
