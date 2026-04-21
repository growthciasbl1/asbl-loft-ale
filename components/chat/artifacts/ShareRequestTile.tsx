'use client';

import { useState } from 'react';
import { TileShell, TileIcon } from './common';
import { useChatStore } from '@/lib/store/chatStore';
import ChannelToggle, { Channel } from '../ChannelToggle';
import { track } from '@/lib/analytics/tracker';
import { readWebTracker } from '@/lib/analytics/leadTracking';

interface Props {
  subject?: string;
  originalQuery?: string;
  preferredChannel?: Channel;
}

export default function ShareRequestTile({ subject, originalQuery, preferredChannel = 'whatsapp' }: Props) {
  const lead = useChatStore((s) => s.lead);
  const setLead = useChatStore((s) => s.setLead);
  const [name, setName] = useState(lead?.name ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [channel, setChannel] = useState<Channel>(preferredChannel);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const displaySubject = subject || 'the document you asked for';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    track('submit', 'lead_submit', {
      form: 'share_request',
      subject: displaySubject,
      channel,
      originalQuery,
    });
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          reason: `Share request · ${displaySubject}`,
          query: originalQuery,
          preferredChannel: channel,
          webTracker: readWebTracker(),
        }),
      });
    } catch {
      // non-blocking
    }
    setLead({ name, phone, source: 'share_request' });
    setSubmitting(false);
    setDone(true);
    track('view', 'lead_success', { form: 'share_request', channel });
  };

  const subHeading = done
    ? channel === 'call'
      ? `Expect a call on ${phone} shortly.`
      : `We'll WhatsApp ${displaySubject} to ${phone} in under 2 minutes.`
    : `You asked for: ${displaySubject}. Drop your name + phone and pick how we reach you.`;

  return (
    <TileShell
      eyebrow={done ? 'Request received' : 'Share · details'}
      title={done ? 'Thanks — on its way.' : 'Where should we send this?'}
      sub={subHeading}
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
          </svg>
        </TileIcon>
      }
      footer={
        done ? (
          <>A named RM follows up personally. No spam calls, no auto-dialers.</>
        ) : (
          <>Your number stays with ASBL · never shared · opt-out anytime.</>
        )
      }
      relatedAsks={
        done
          ? [
              { label: 'Book a site visit', query: 'Book a weekend site visit' },
              { label: 'Pricing', query: 'What is the pricing for ASBL Loft?' },
              { label: 'Floor plans', query: 'Tell me about the floor plans' },
            ]
          : [{ label: 'Someone should call me', query: 'Please have someone call me' }]
      }
    >
      {done ? (
        <div
          style={{
            padding: '22px 0 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--plum-pale)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div
            className="serif"
            style={{ fontSize: 22, color: 'var(--charcoal)', fontWeight: 500 }}
          >
            {channel === 'call' ? `We'll call ${phone} soon` : `Sent to ${phone}`}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--mid-gray)', maxWidth: 420 }}>
            {channel === 'call'
              ? 'A named RM will call you within 30 minutes (9am – 8pm). You can reply in this chat anytime.'
              : (
                <>
                  Check your WhatsApp — <b>{displaySubject}</b> arrives inside 2 minutes. If it doesn&apos;t
                  land, reply <code style={{ fontFamily: 'DM Sans', fontSize: 12 }}>resend</code> in
                  the same thread.
                </>
              )}
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          style={{
            paddingTop: 4,
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
                color: 'var(--mid-gray)',
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
                border: '1px solid var(--border)',
                background: 'var(--cream)',
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
                color: 'var(--mid-gray)',
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Phone number
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
                border: '1px solid var(--border)',
                background: 'var(--cream)',
                fontSize: 14,
              }}
            />
          </div>

          <ChannelToggle value={channel} onChange={setChannel} />

          <button
            type="submit"
            disabled={submitting || !name.trim() || !phone.trim()}
            className="btn-plum"
            style={{ justifyContent: 'center', padding: '12px 20px', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting
              ? 'Sending…'
              : channel === 'call'
                ? 'Request a call →'
                : `Send on WhatsApp →`}
          </button>
        </form>
      )}
    </TileShell>
  );
}
