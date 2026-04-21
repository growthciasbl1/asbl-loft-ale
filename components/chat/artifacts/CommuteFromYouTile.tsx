'use client';

import { useMemo, useState } from 'react';
import { TileShell } from './common';

interface Place {
  label: string;
  aliases: string[];
  toLoft: number;
  toGachi: number;
  toKokapet: number;
  cluster: 'north' | 'central' | 'east' | 'south';
}

const PLACES: Place[] = [
  { label: 'HITEC City', aliases: ['hitec', 'hitech', 'raheja'], toLoft: 18, toGachi: 10, toKokapet: 22, cluster: 'north' },
  { label: 'Madhapur', aliases: ['madhapur', 'cyber towers'], toLoft: 16, toGachi: 8, toKokapet: 20, cluster: 'north' },
  { label: 'Kondapur', aliases: ['kondapur'], toLoft: 14, toGachi: 6, toKokapet: 18, cluster: 'north' },
  { label: 'Raidurg', aliases: ['raidurg'], toLoft: 14, toGachi: 7, toKokapet: 17, cluster: 'north' },
  { label: 'Gachibowli', aliases: ['gachibowli', 'dlf', 'uoh'], toLoft: 12, toGachi: 0, toKokapet: 14, cluster: 'central' },
  { label: 'Nanakramguda', aliases: ['nanakramguda', 'nanakram'], toLoft: 4, toGachi: 8, toKokapet: 8, cluster: 'central' },
  { label: 'Manikonda', aliases: ['manikonda'], toLoft: 10, toGachi: 14, toKokapet: 12, cluster: 'central' },
  { label: 'Kokapet', aliases: ['kokapet'], toLoft: 9, toGachi: 14, toKokapet: 0, cluster: 'central' },
  { label: 'Jubilee Hills', aliases: ['jubilee hills', 'jubilee'], toLoft: 25, toGachi: 15, toKokapet: 30, cluster: 'east' },
  { label: 'Banjara Hills', aliases: ['banjara hills', 'banjara'], toLoft: 22, toGachi: 16, toKokapet: 32, cluster: 'east' },
  { label: 'Begumpet', aliases: ['begumpet'], toLoft: 32, toGachi: 28, toKokapet: 42, cluster: 'east' },
  { label: 'Ameerpet', aliases: ['ameerpet'], toLoft: 30, toGachi: 22, toKokapet: 40, cluster: 'east' },
  { label: 'Secunderabad', aliases: ['secunderabad', 'sec-bad'], toLoft: 45, toGachi: 35, toKokapet: 50, cluster: 'east' },
  { label: 'Kukatpally / KPHB', aliases: ['kukatpally', 'kphb'], toLoft: 40, toGachi: 30, toKokapet: 45, cluster: 'north' },
  { label: 'Mehdipatnam', aliases: ['mehdipatnam'], toLoft: 28, toGachi: 24, toKokapet: 18, cluster: 'south' },
  { label: 'Tolichowki', aliases: ['tolichowki'], toLoft: 18, toGachi: 18, toKokapet: 14, cluster: 'south' },
  { label: 'Shamshabad / Airport', aliases: ['airport', 'rgi', 'shamshabad'], toLoft: 32, toGachi: 38, toKokapet: 28, cluster: 'south' },
  { label: 'LB Nagar', aliases: ['lb nagar', 'lbnagar'], toLoft: 55, toGachi: 50, toKokapet: 52, cluster: 'east' },
  { label: 'Nallagandla', aliases: ['nallagandla'], toLoft: 10, toGachi: 6, toKokapet: 15, cluster: 'north' },
  { label: 'Financial District', aliases: ['financial district', 'fd'], toLoft: 5, toGachi: 12, toKokapet: 9, cluster: 'central' },
];

const SUGGESTS = ['HITEC City', 'Madhapur', 'Jubilee Hills', 'Begumpet', 'Airport', 'Banjara Hills'];

function findPlace(q: string): Place | null {
  const s = q.toLowerCase().trim();
  if (!s) return null;
  return (
    PLACES.find((p) => p.aliases.some((a) => s === a || s.includes(a))) ??
    PLACES.find((p) => p.label.toLowerCase().includes(s) || s.includes(p.label.toLowerCase())) ??
    null
  );
}

export default function CommuteFromYouTile() {
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<Place | null>(null);

  const onSubmit = (raw: string) => {
    const q = raw.trim();
    setInput(q);
    const found = findPlace(q);
    setPicked(found);
  };

  const math = useMemo(() => {
    if (!picked) return null;
    const toLoft = picked.toLoft;
    const toGachi = picked.toGachi;
    const toKokapet = picked.toKokapet;
    const bestAlt = Math.min(toGachi, toKokapet);
    const bestAltLabel = toGachi <= toKokapet ? 'Gachibowli' : 'Kokapet';
    const savingsMin = bestAlt - toLoft;
    const dailySavingMin = savingsMin * 2; // round trip
    const yearlyHours = (dailySavingMin * 22 * 12) / 60; // 22 working days / mo
    const sundays = Math.round(yearlyHours / 18); // rough Sunday-equivalent
    return { toLoft, toGachi, toKokapet, savingsMin, dailySavingMin, yearlyHours, sundays, bestAltLabel };
  }, [picked]);

  return (
    <TileShell
      eyebrow="Your address · Loft commute"
      title="How much time does Loft buy you back?"
      sub="Tell us where you live or work — we'll compare your commute vs buying in Gachibowli or Kokapet."
      footer={<>Drive times are midweek 9am estimates via Google Distance Matrix · ±3 min variance.</>}
      askMore={{
        label: 'Book a visit from this side of town',
        query: picked
          ? `Book a weekend visit · I'm coming from ${picked.label}`
          : 'Book a weekend visit',
      }}
      relatedAsks={[
        { label: 'Urban corridors', query: 'Show me the urban corridors and location map' },
        { label: 'Master plan', query: 'Show me the ASBL Loft master plan' },
        { label: 'Why FD vs Gachibowli', query: 'Why FD instead of Gachibowli or Kokapet?' },
      ]}
    >
      {/* Input */}
      <div style={{ padding: '20px 26px', borderBottom: '1px solid var(--paper-2)' }}>
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--mute)',
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Where are you coming from?
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 6,
            background: 'var(--paper)',
            borderRadius: 12,
            border: '1px solid var(--hairline)',
          }}
        >
          <input
            type="text"
            placeholder="e.g. HITEC City, Jubilee Hills, Madhapur"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit(input);
            }}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: 14,
              background: 'white',
              borderRadius: 8,
            }}
          />
          <button
            type="button"
            onClick={() => onSubmit(input)}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              background: 'var(--ink)',
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Calculate →
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {SUGGESTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSubmit(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 100,
                fontSize: 11.5,
                background: 'white',
                border: '1px solid var(--hairline)',
                color: 'var(--ink-2)',
                fontWeight: 500,
              }}
              className="hover:border-[var(--sienna)] hover:text-[var(--sienna-dark)]"
            >
              {s}
            </button>
          ))}
        </div>

        {input.trim() && !picked && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--mute)' }}>
            We couldn&apos;t match that exactly. Try one of the suggestions, or type your neighborhood
            (e.g. &ldquo;Kondapur&rdquo;, &ldquo;Ameerpet&rdquo;).
          </div>
        )}
      </div>

      {/* Result */}
      {picked && math && (
        <>
          <div
            style={{
              padding: '22px 26px',
              background: 'var(--sienna-soft)',
              borderBottom: '1px solid var(--hairline)',
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--sienna-dark)',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              From {picked.label} to ASBL Loft
            </div>
            <div
              className="display"
              style={{
                fontSize: 56,
                lineHeight: 1,
                color: 'var(--sienna-dark)',
                fontWeight: 400,
              }}
            >
              {math.toLoft}
              <span style={{ fontSize: 22, marginLeft: 6 }}>min</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>
              Midweek, 9am departure · door-to-door
            </div>
          </div>

          {/* Comparison strip */}
          <div style={{ padding: '18px 26px', borderBottom: '1px solid var(--paper-2)' }}>
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--mute)',
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              If you&apos;d bought nearby instead
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <ComparisonCard label="Gachibowli" min={math.toGachi} baseline={math.toLoft} />
              <ComparisonCard label="Kokapet" min={math.toKokapet} baseline={math.toLoft} />
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--ink)',
                  color: '#f5f1e8',
                }}
              >
                <div style={{ fontSize: 10.5, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  ASBL Loft
                </div>
                <div className="display" style={{ fontSize: 28, lineHeight: 1, marginTop: 4 }}>
                  {math.toLoft}
                  <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 3 }}>min</span>
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 6 }}>
                  Your pick
                </div>
              </div>
            </div>
          </div>

          {/* Pros */}
          <div style={{ padding: '20px 26px' }}>
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--mute)',
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              How Loft solves your commute
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {math.savingsMin > 0 && (
                <Pro
                  title={`You save ${math.savingsMin} min each way vs ${math.bestAltLabel}`}
                  body={`That's <b>${math.dailySavingMin} min a day</b>, <b>${Math.round(math.yearlyHours)} hours a year</b>, or roughly <b>${math.sundays} Sundays of commute</b> handed back to you.`}
                />
              )}
              {math.savingsMin <= 0 && (
                <Pro
                  title={`Comparable to ${math.bestAltLabel}, with newer infrastructure`}
                  body={`Drive time is similar, but Loft sits on the ORR spur with <b>Nanakramguda exit 4 min away</b> — fewer bottlenecks than inner Gachibowli.`}
                />
              )}
              <Pro
                title="ORR access in 4 minutes"
                body="Nanakramguda ORR exit puts you on the outer ring before most traffic even builds up. The IT corridor becomes a straight shot."
              />
              <Pro
                title="Metro extension by 2027"
                body="Raidurg–FD metro extension is sanctioned. Once live, your commute to HITEC drops another 6–8 minutes."
              />
              <Pro
                title="Last-mile is walkable"
                body={`Unlike buildings deep inside ${math.bestAltLabel === 'Gachibowli' ? 'Gachibowli' : 'Kokapet'}, Loft faces a main road — no 15-minute crawl through internal lanes.`}
              />
            </div>
          </div>
        </>
      )}
    </TileShell>
  );
}

function ComparisonCard({ label, min, baseline }: { label: string; min: number; baseline: number }) {
  const worse = min > baseline;
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: 'var(--paper)',
        border: '1px solid var(--hairline)',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mute)',
        }}
      >
        {label}
      </div>
      <div className="display" style={{ fontSize: 28, lineHeight: 1, marginTop: 4 }}>
        {min}
        <span style={{ fontSize: 12, color: 'var(--mute)', marginLeft: 3 }}>min</span>
      </div>
      <div
        style={{
          fontSize: 10.5,
          marginTop: 6,
          color: worse ? 'var(--sienna-dark)' : 'var(--mute)',
        }}
      >
        {worse ? `+${min - baseline} min vs Loft` : min === baseline ? 'Same as Loft' : `${baseline - min} min better`}
      </div>
    </div>
  );
}

function Pro({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--sienna)', fontWeight: 700, marginTop: 1 }}>✓</span>
      <div>
        <div style={{ fontWeight: 500, fontSize: 13.5 }}>{title}</div>
        <div
          style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    </div>
  );
}
