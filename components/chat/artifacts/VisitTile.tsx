'use client';

import { useState } from 'react';
import { TileShell } from './common';
import { useChatStore } from '@/lib/store/chatStore';

const SLOTS = [
  { day: 'Sat', date: 'Nov 23', time: '10:00', sub: 'Experience centre' },
  { day: 'Sat', date: 'Nov 23', time: '11:30', sub: 'Experience centre' },
  { day: 'Sat', date: 'Nov 23', time: '16:00', sub: 'Tower walk-through' },
  { day: 'Sun', date: 'Nov 24', time: '10:00', sub: 'Experience centre' },
  { day: 'Sun', date: 'Nov 24', time: '14:00', sub: 'Tower walk-through' },
  { day: 'Sun', date: 'Nov 24', time: '17:00', sub: 'Sunset view · floor 45' },
];

interface VisitTileProps {
  intro?: 'default' | 'no_model_flat' | 'live_inventory';
}

const INTROS = {
  default: null,
  no_model_flat: {
    title: 'The model flat is at ASBL Spectra — not at Loft (yet).',
    body:
      "Every 3BHK project in Financial District is under construction — so physical model flats don't exist on-site. Our experience centre is at ASBL Spectra, which uses the same finish spec and fittings as Loft. Want to come see that?",
  },
  live_inventory: {
    title: "We don't publish live inventory in chat.",
    body:
      "Pricing and unit availability change daily as construction progresses. A named RM will walk you through exactly what's open in your size/floor band — takes ~45 min on-site.",
  },
};

export default function VisitTile({ intro = 'default' }: VisitTileProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [done, setDone] = useState(false);
  const setLead = useChatStore((s) => s.setLead);
  const note = INTROS[intro];

  const slot = picked != null ? SLOTS[picked] : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !name.trim() || !phone.trim()) return;

    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          query: `Visit booking · ${slot.day} ${slot.date} ${slot.time} · ${slot.sub}`,
        }),
      });
    } catch {
      // non-blocking
    }
    setLead({ name, phone, source: 'visit_booking' });
    setDone(true);
  };

  return (
    <TileShell
      eyebrow="Site visits · 45 minutes"
      title="Pick a slot. Named RM meets you."
      sub="20 min experience centre · 25 min walking the actual tower. No sales desk."
      footer={<>We&apos;ll WhatsApp confirmation and the RM&apos;s contact within 10 minutes.</>}
      relatedAsks={[
        { label: 'What to expect on-site', query: 'What happens on a site visit?' },
        { label: 'Prep checklist', query: 'What documents should I bring to a site visit?' },
      ]}
    >
      {note && (
        <div
          style={{
            padding: '18px 26px',
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
              marginBottom: 6,
            }}
          >
            Quick context
          </div>
          <div
            className="display"
            style={{ fontSize: 20, lineHeight: 1.25, color: 'var(--ink)', marginBottom: 8 }}
          >
            {note.title}
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>{note.body}</p>
        </div>
      )}
      <div style={{ padding: '18px 26px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 8,
          }}
        >
          {SLOTS.map((s, i) => {
            const active = picked === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setPicked(i)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  textAlign: 'left',
                  background: active ? 'var(--ink)' : 'var(--paper)',
                  color: active ? 'white' : 'var(--ink)',
                  border: '1px solid ' + (active ? 'var(--ink)' : 'var(--hairline)'),
                  transition: 'all 160ms',
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    opacity: active ? 0.7 : 1,
                    color: active ? 'rgba(255,255,255,0.7)' : 'var(--mute)',
                  }}
                >
                  {s.day} · {s.date}
                </div>
                <div className="display" style={{ fontSize: 20, marginTop: 3, fontWeight: 500 }}>
                  {s.time}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 3,
                    color: active ? 'rgba(255,255,255,0.7)' : 'var(--mute)',
                  }}
                >
                  {s.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {slot && !done && (
        <form
          onSubmit={submit}
          style={{
            padding: '18px 26px',
            borderTop: '1px solid var(--paper-2)',
            background: 'var(--paper)',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            style={{
              flex: '1 1 160px',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--hairline)',
              background: 'white',
              fontSize: 14,
            }}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp (+91…)"
            required
            style={{
              flex: '1 1 160px',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--hairline)',
              background: 'white',
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              borderRadius: 100,
              background: 'var(--ink)',
              color: 'white',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Confirm {slot.day} {slot.time} →
          </button>
        </form>
      )}

      {done && slot && (
        <div
          style={{
            padding: '18px 26px',
            borderTop: '1px solid var(--paper-2)',
            background: 'var(--sienna-soft)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--sienna-dark)',
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            ✓ Slot held
          </div>
          <div className="display" style={{ fontSize: 20 }}>
            {slot.day}, {slot.date} at {slot.time}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4 }}>
            WhatsApp confirmation on its way. Your RM&apos;s contact will arrive within 10 minutes.
          </div>
        </div>
      )}
    </TileShell>
  );
}
