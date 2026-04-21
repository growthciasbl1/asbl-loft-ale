'use client';

import { useState } from 'react';
import { TileShell } from './common';
import { useChatStore } from '@/lib/store/chatStore';

interface Props {
  subject?: string;
  originalQuery?: string;
}

export default function ShareRequestTile({ subject, originalQuery }: Props) {
  const lead = useChatStore((s) => s.lead);
  const setLead = useChatStore((s) => s.setLead);
  const [name, setName] = useState(lead?.name ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const displaySubject = subject || 'the document you asked for';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          reason: `Share request · ${displaySubject}`,
          query: originalQuery,
        }),
      });
    } catch {
      // non-blocking
    }
    setLead({ name, phone, source: 'share_request' });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <TileShell
      eyebrow="Share · WhatsApp"
      title={done ? 'Thanks — on its way.' : 'Where should we send this?'}
      sub={
        done
          ? `We'll WhatsApp ${displaySubject} to ${phone} in under 2 minutes.`
          : `You asked for: ${displaySubject}. Drop your name + WhatsApp and we'll send it right away.`
      }
      footer={
        done ? (
          <>A named RM will follow up on WhatsApp. No spam calls, no auto-dialers.</>
        ) : (
          <>Your number stays with ASBL · never shared · opt-out anytime.</>
        )
      }
      relatedAsks={
        done
          ? [
              { label: 'Book a site visit', query: 'Book a weekend site visit' },
              { label: 'Price breakdown', query: 'Show full price breakdown 1695 East' },
              { label: 'Can I afford it?', query: 'Check affordability · salary 30L' },
            ]
          : [
              { label: "I'd rather see it here", query: 'Just show me the floor plan inline' },
              { label: 'Prefer email instead', query: 'Can you email me the brochure?' },
            ]
      }
    >
      {done ? (
        <div
          style={{
            padding: '28px 26px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 10,
            background: 'var(--sienna-soft)',
          }}
        >
          <div
            className="display"
            style={{ fontSize: 28, color: 'var(--sienna-dark)', fontWeight: 400 }}
          >
            ✓ Sent to {phone}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 420 }}>
            Check your WhatsApp — <b>{displaySubject}</b> arrives inside 2 minutes. If it doesn&apos;t
            land, reply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>resend</code>{' '}
            in the same thread.
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          style={{
            padding: '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--mute)',
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Your name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--hairline)',
                background: 'var(--paper)',
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--mute)',
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              WhatsApp number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98XXXXXXXX"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--hairline)',
                background: 'var(--paper)',
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim() || !phone.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: 100,
              background: submitting ? 'var(--paper-3)' : 'var(--ink)',
              color: 'white',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {submitting ? 'Sending…' : `Send ${displaySubject} on WhatsApp →`}
          </button>
        </form>
      )}
    </TileShell>
  );
}
