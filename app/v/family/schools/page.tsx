'use client';

const schools = [
  { name: 'Delhi Public School', type: 'K–12 · CBSE', distance: '6 min', fees: '₹1.6–2.2L/yr', rating: 'Top 10 in HYD' },
  { name: 'Oakridge International', type: 'K–12 · IB/CBSE', distance: '8 min', fees: '₹4.5–7L/yr', rating: 'IB World School' },
  { name: 'Chirec International', type: 'K–12 · CBSE/IB', distance: '10 min', fees: '₹2.8–4.2L/yr', rating: 'Highly rated' },
  { name: 'The Gaudium School', type: 'K–12 · IB', distance: '12 min', fees: '₹5–8L/yr', rating: 'IB continuum' },
  { name: 'Meridian School', type: 'K–12 · CBSE', distance: '9 min', fees: '₹1.4–1.9L/yr', rating: 'Balanced' },
  { name: 'Glendale Academy', type: 'K–12 · CBSE/IB', distance: '7 min', fees: '₹2.2–3.5L/yr', rating: 'New campus' },
];

const colleges = [
  { name: 'ISB Hyderabad', distance: '9 min' },
  { name: 'IIT Hyderabad', distance: '20 min' },
  { name: 'University of Hyderabad', distance: '25 min' },
  { name: 'IIIT Hyderabad', distance: '18 min' },
];

export default function FamilySchoolsPage() {
  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <p className="eyebrow mb-3">Schools, honest version</p>
        <h1 className="serif text-4xl md:text-5xl max-w-3xl">
          Six schools.<br />
          Twelve minutes, outer edge.
        </h1>
        <p className="muted-text mt-5 max-w-xl">
          Financial District is arguably Hyderabad&apos;s best school radius. Here&apos;s every option
          within a 12-minute drive — with honest fee brackets so you can plan.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="eyebrow mb-6">K–12 options</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {schools.map((s) => (
            <div key={s.name} className="card">
              <div className="flex justify-between items-start mb-3">
                <p className="font-semibold text-lg">{s.name}</p>
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
                >
                  {s.distance}
                </span>
              </div>
              <p className="muted-text text-sm mb-4">{s.type}</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme">
                <div>
                  <p className="muted-text text-xs">Fees</p>
                  <p className="text-sm font-semibold">{s.fees}</p>
                </div>
                <div>
                  <p className="muted-text text-xs">Standing</p>
                  <p className="text-sm font-semibold">{s.rating}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <p className="eyebrow mb-6">Higher ed, same radius</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colleges.map((c) => (
            <div key={c.name} className="surface rounded-xl p-5">
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="muted-text text-xs mt-1">{c.distance}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="surface-2 rounded-3xl p-10 md:p-14">
          <p className="eyebrow mb-3">Not sure which one?</p>
          <h3 className="serif text-3xl md:text-4xl mb-5 max-w-2xl">
            We&apos;ll connect you with 3 families already living here — by school preference.
          </h3>
          <a href="#contact" className="btn-primary">Connect me with families →</a>
        </div>
      </section>
    </>
  );
}
