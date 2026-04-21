'use client';

import { motion } from 'framer-motion';
import { ASBL_LOFT_DATA } from '@/lib/utils/asblData';

const amenityEmoji: Record<string, string> = {
  'Swimming Pool': '🏊',
  'Gym & Fitness': '💪',
  'Squash Court': '🎾',
  '3 Badminton Courts': '🏸',
  'Co-working Space': '💼',
  'Yoga & Calisthenics': '🧘',
  'Creche & Learning Center': '👶',
  'Jogging & Cycling Loop': '🚴',
  'Childrens Play Area': '🎡',
  'Senior Reflexology Walk': '👣',
  'Pet Park': '🐕',
  'Basketball Court': '🏀',
  '24/7 Security & CCTV': '🛡️',
  'Gated Community': '🚪',
  'High-Speed Internet': '📡',
};

export default function FamilyAmenitiesPage() {
  const familyAmenities = ASBL_LOFT_DATA.amenities.filter((a) => a.familyFriendly);
  const others = ASBL_LOFT_DATA.amenities.filter((a) => !a.familyFriendly);

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <p className="eyebrow mb-3">Inside the community</p>
        <h1 className="serif text-4xl md:text-5xl max-w-3xl">
          {familyAmenities.length} amenities, chosen for<br />
          <span className="accent-text">the way kids actually play.</span>
        </h1>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="eyebrow mb-5">For the little ones</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {familyAmenities.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="card text-center"
            >
              <div className="text-4xl mb-3">{amenityEmoji[a.name] ?? '✨'}</div>
              <p className="font-semibold text-sm">{a.name}</p>
              <p className="muted-text text-xs mt-1">{a.category}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="eyebrow mb-5">And for the grown-ups</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {others.map((a) => (
            <div key={a.name} className="surface rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">{amenityEmoji[a.name] ?? '✨'}</div>
              <p className="font-semibold text-sm">{a.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div
          className="rounded-3xl p-10 md:p-14 grid md:grid-cols-2 gap-8 items-center"
          style={{ background: 'var(--surface-2)' }}
        >
          <div>
            <p className="eyebrow mb-3">Be honest with us</p>
            <h3 className="serif text-3xl md:text-4xl">
              Tell us your kid&apos;s age.<br />
              We&apos;ll show you the 3 amenities they&apos;ll use daily.
            </h3>
          </div>
          <form className="flex gap-3">
            <input
              type="number"
              placeholder="Age"
              min={0}
              max={18}
              className="flex-1 px-5 py-3.5 rounded-xl bg-white border border-[var(--border)] text-[var(--text)]"
            />
            <button className="btn-primary">See top 3 →</button>
          </form>
        </div>
      </section>
    </>
  );
}
