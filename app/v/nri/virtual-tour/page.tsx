'use client';

import { useState } from 'react';

const stops = [
  { k: 'entry', title: 'Gate & lobby', duration: '4 min', note: 'Triple-layer security, visitor logs, valet.' },
  { k: 'tower', title: 'Tower A lobby', duration: '3 min', note: 'Kone elevators, 7 floors served in 18 seconds.' },
  { k: 'unit', title: 'Sample unit (45E, 1870)', duration: '12 min', note: 'Walk every room, open every cupboard, check every socket.' },
  { k: 'terrace', title: '260 sqft balcony', duration: '4 min', note: 'East-facing. Sunrise arc visible from June–December.' },
  { k: 'amenities', title: 'Level 45 amenities', duration: '6 min', note: 'Pool, gym, co-working, library.' },
  { k: 'outside', title: 'Ground landscape', duration: '5 min', note: 'Jog loop, pet park, kids play, reflexology.' },
];

export default function VirtualTourPage() {
  const [active, setActive] = useState(2);
  const s = stops[active];

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <p className="eyebrow mb-3">Virtual tour · live session</p>
        <h1 className="text-4xl md:text-5xl font-bold max-w-3xl">
          A site manager. A camera. <span className="accent-text">Your questions.</span>
        </h1>
        <p className="muted-text mt-4 max-w-xl">
          These aren&apos;t pre-recorded walkthroughs. A named site manager walks with you — on WhatsApp
          video — for 40 minutes. You decide what to inspect.
        </p>
      </section>

      {/* Stage */}
      <section className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <div
            className="rounded-2xl h-[380px] md:h-[480px] flex items-end p-8"
            style={{
              background:
                'linear-gradient(135deg, #1e40af, #3b82f6 60%, #93c5fd), radial-gradient(600px 300px at 30% 20%, rgba(255,255,255,0.15), transparent 60%)',
              color: '#fff',
            }}
          >
            <div>
              <p className="text-xs uppercase tracking-widest opacity-70">Stop {active + 1} · {s.duration}</p>
              <p className="text-4xl font-bold mt-2">{s.title}</p>
              <p className="opacity-80 mt-2 max-w-md">{s.note}</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          {stops.map((st, i) => (
            <button
              key={st.k}
              onClick={() => setActive(i)}
              className={`w-full text-left rounded-xl p-4 transition border ${
                active === i ? 'accent-bg text-white border-transparent' : 'surface border-[var(--border)]'
              }`}
            >
              <div className="flex justify-between items-center">
                <p className={`font-semibold ${active === i ? '' : ''}`}>{st.title}</p>
                <span className={`text-xs ${active === i ? 'opacity-80' : 'muted-text'}`}>
                  {st.duration}
                </span>
              </div>
            </button>
          ))}
          <a href="#contact" className="btn-primary w-full justify-center mt-4">
            Book live tour →
          </a>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { t: 'Unedited', b: 'We do not cut the feed. If the corridor tile is off, you see it.' },
          { t: 'Your agenda', b: 'You tell us: spend 15 minutes on the kitchen, 5 on the lobby. We comply.' },
          { t: 'Recorded for you', b: 'Session recording + a 6-angle photo pack lands in your inbox by next day.' },
        ].map((x) => (
          <div key={x.t} className="card">
            <p className="font-semibold mb-2">{x.t}</p>
            <p className="muted-text text-sm">{x.b}</p>
          </div>
        ))}
      </section>
    </>
  );
}
