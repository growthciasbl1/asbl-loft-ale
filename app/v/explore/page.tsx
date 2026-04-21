'use client';

import Link from 'next/link';

export default function ExploreHome() {
  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-14">
        <p className="eyebrow mb-4">Editorial · ASBL Loft</p>
        <h1 className="serif text-5xl md:text-6xl leading-[1.05] max-w-3xl">
          Not sure yet?<br />
          <span className="accent-text italic">Start here.</span>
        </h1>
        <p className="muted-text mt-6 text-lg max-w-xl">
          We&apos;ll help you figure out if ASBL Loft is for you — without the pitch deck.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">Back to ask Loft anything →</Link>
          <Link href="/v/investor" className="btn-ghost">See the investor view</Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { t: 'A place to live', d: 'Family, commute, schools, calm.', link: '/v/family' },
            { t: 'An asset to own', d: 'Yield, appreciation, exit.', link: '/v/investor' },
            { t: 'Both, honestly', d: 'Hybrid view · smart buy.', link: '/v/budget' },
          ].map((x) => (
            <Link key={x.t} href={x.link} className="card" style={{ textDecoration: 'none' }}>
              <p className="serif text-2xl mb-2">{x.t}</p>
              <p className="muted-text text-sm mb-3">{x.d}</p>
              <p className="text-sm accent-text">Open this view →</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
