'use client';

import { motion } from 'framer-motion';

const collection = [
  { time: '06:15', label: 'Sky Pool', detail: 'Heated infinity at level 45. Reserved in 30-min slots.' },
  { time: '07:00', label: "Resident's Library", detail: 'Silent floor. 800 volumes. Single-origin espresso.' },
  { time: '08:30', label: 'Private Study', detail: 'Bookable 4-person rooms. Fibre, projection, soundproof.' },
  { time: '11:00', label: 'Concierge', detail: 'Named concierge per 3 floors. Grocery, handyman, florals.' },
  { time: '17:30', label: 'Wellness Atrium', detail: 'Sauna, steam, cold plunge. Appointment-led.' },
  { time: '19:00', label: 'The Observatory', detail: 'Top-floor lounge. Cigar-friendly terrace. Sunset-only seating.' },
  { time: '20:30', label: 'Private Dining', detail: '2 chef&apos;s rooms for 8, curated menus, 48h notice.' },
];

export default function LuxuryAmenitiesPage() {
  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <p className="eyebrow mb-3">The private collection</p>
        <h1 className="serif text-5xl md:text-6xl max-w-3xl">
          Seven rituals. <span className="accent-text italic">One building.</span>
        </h1>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-10">
        {collection.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="grid grid-cols-[90px_1fr] md:grid-cols-[120px_1fr_2fr] gap-6 py-8 border-t border-theme"
          >
            <p className="serif text-3xl accent-text">{c.time}</p>
            <p className="font-semibold">{c.label}</p>
            <p
              className="muted-text text-sm md:block"
              dangerouslySetInnerHTML={{ __html: c.detail }}
            />
          </motion.div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="eyebrow mb-5">Access, by residence</p>
        <p className="serif text-3xl md:text-4xl">
          The Sky Collection receives all seven. Unlimited. Priority booking.
        </p>
        <a href="#contact" className="btn-primary mt-10 inline-flex">Arrange private tour →</a>
      </section>
    </>
  );
}
