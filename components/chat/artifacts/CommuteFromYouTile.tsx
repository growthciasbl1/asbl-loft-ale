'use client';

import { useMemo, useState } from 'react';
import { TileShell } from './common';

interface DistanceResponse {
  ok: true;
  origin: { label: string; lat: number; lng: number; locality: string | null };
  toLoftMin: number | null;
  toGachibowliMin: number | null;
  toKokapetMin: number | null;
  toLoftKm: number | null;
  toGachibowliKm: number | null;
  toKokapetKm: number | null;
}

const SUGGESTS = [
  'HITEC City',
  'Madhapur',
  'Jubilee Hills',
  'Begumpet',
  'Banjara Hills',
  'Kondapur',
  'Hyderabad Airport',
];

export default function CommuteFromYouTile() {
  const [input, setInput] = useState('');
  const [data, setData] = useState<DistanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const submit = async (raw: string) => {
    const q = raw.trim();
    if (!q || q.length < 2) return;
    setInput(q);
    setLoading(true);
    setErrorMsg(null);
    setData(null);
    try {
      const res = await fetch('/api/geo/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: q }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(
          (err as { message?: string; error?: string }).message ??
            'Could not compute that route. Try a more specific neighbourhood.',
        );
      } else {
        const payload = (await res.json()) as DistanceResponse;
        setData(payload);
      }
    } catch {
      setErrorMsg('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const math = useMemo(() => {
    if (!data || data.toLoftMin == null) return null;
    const toLoft = data.toLoftMin;
    const toGachi = data.toGachibowliMin ?? toLoft;
    const toKokapet = data.toKokapetMin ?? toLoft;
    const bestAlt = Math.min(toGachi, toKokapet);
    const bestAltLabel = toGachi <= toKokapet ? 'Gachibowli' : 'Kokapet';
    const savingsMin = bestAlt - toLoft;
    const dailySavingMin = Math.max(0, savingsMin * 2);
    const yearlyHours = (dailySavingMin * 22 * 12) / 60;
    const sundays = Math.round(yearlyHours / 18);
    return {
      toLoft,
      toGachi,
      toKokapet,
      savingsMin,
      dailySavingMin,
      yearlyHours,
      sundays,
      bestAltLabel,
    };
  }, [data]);

  return (
    <TileShell
      eyebrow="Your address · Loft commute"
      title="How much time does Loft buy you back?"
      sub="Tell us where you live or work — we'll pull real driving times from OpenRouteService and compare vs Gachibowli / Kokapet."
      footer={
        <>
          Drive times are free-flow estimates from OpenRouteService (OpenStreetMap data).
          Peak traffic can vary ±3–5 min.
        </>
      }
      askMore={{
        label: 'Book a visit from this side of town',
        query: data
          ? `Book a weekend visit · I'm coming from ${data.origin.label}`
          : 'Book a weekend site visit',
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
            placeholder="e.g. Jubilee Hills, Begumpet, or your office address"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(input);
            }}
            disabled={loading}
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
            onClick={() => submit(input)}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              background: loading || !input.trim() ? 'var(--mute, #9a958e)' : 'var(--ink)',
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? '…' : 'Calculate →'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {SUGGESTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              disabled={loading}
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

        {errorMsg && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--sienna-dark, #7a3d29)' }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Result */}
      {data && math && (
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
              From {data.origin.label} to ASBL Loft
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
            {data.toLoftKm != null && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>
                {data.toLoftKm.toFixed(1)} km · free-flow driving time · door-to-door
              </div>
            )}
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
              If you'd bought nearby instead
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
                <div
                  style={{
                    fontSize: 10.5,
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  ASBL Loft
                </div>
                <div className="display" style={{ fontSize: 28, lineHeight: 1, marginTop: 4 }}>
                  {math.toLoft}
                  <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 3 }}>min</span>
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 6 }}>Your pick</div>
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
                  body={`That's <b>${math.dailySavingMin} min a day</b>, <b>${Math.round(
                    math.yearlyHours,
                  )} hours a year</b>, or roughly <b>${math.sundays} Sundays of commute</b> handed back to you.`}
                />
              )}
              {math.savingsMin <= 0 && (
                <Pro
                  title={`Comparable to ${math.bestAltLabel}, with newer infrastructure`}
                  body={`Drive time is similar, but Loft sits on the ORR spur with <b>Nanakramguda exit 4 min away</b> — fewer bottlenecks than inner Gachibowli.`}
                />
              )}
              <Pro
                title="ORR access in ~4 minutes"
                body="Nanakramguda ORR exit puts you on the outer ring before most traffic even builds up."
              />
              <Pro
                title="Metro Phase II proposed"
                body="76.4 km Metro Phase II expansion covers FD — confidence multiplier on future connectivity."
              />
              <Pro
                title="Last-mile is walkable"
                body={`Unlike buildings deep inside ${math.bestAltLabel}, Loft faces a main road — no 15-minute crawl through internal lanes.`}
              />
            </div>
          </div>
        </>
      )}
    </TileShell>
  );
}

function ComparisonCard({
  label,
  min,
  baseline,
}: {
  label: string;
  min: number;
  baseline: number;
}) {
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
        {worse
          ? `+${min - baseline} min vs Loft`
          : min === baseline
            ? 'Same as Loft'
            : `${baseline - min} min better`}
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
