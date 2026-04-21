'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/store/chatStore';
import ChannelToggle, { Channel } from './ChannelToggle';
import { track } from '@/lib/analytics/tracker';
import { readWebTracker } from '@/lib/analytics/leadTracking';

interface Props {
  children: React.ReactNode;
  reason: string;
  preview?: React.ReactNode;
  preferredChannel?: Channel;
}

export default function LeadGate({ children, reason, preview, preferredChannel = 'whatsapp' }: Props) {
  const lead = useChatStore((s) => s.lead);
  const setLead = useChatStore((s) => s.setLead);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<Channel>(preferredChannel);
  const [submitting, setSubmitting] = useState(false);

  if (lead?.phone) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !name.trim()) return;
    setSubmitting(true);
    track('submit', 'lead_submit', { form: 'lead_gate', reason, channel });

    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          query: reason,
          preferredChannel: channel,
          webTracker: readWebTracker(),
        }),
      });
    } catch {
      // non-blocking
    }

    setLead({ name, phone, source: reason });
    setSubmitting(false);
    track('view', 'lead_success', { form: 'lead_gate', reason, channel });
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      {preview && (
        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
            {preview}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(250, 247, 242, 0.6) 50%, rgba(250, 247, 242, 1) 100%)',
            }}
          />
        </div>
      )}
      <div style={{ padding: '20px 22px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'var(--plum-pale)',
            color: 'var(--plum-dark)',
            borderRadius: 100,
            fontSize: 10.5,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--plum)' }}
          />
          Unlock · one-time
        </div>
        <h4 className="serif" style={{ fontSize: 20, marginBottom: 6, color: 'var(--charcoal)' }}>
          {reason}
        </h4>
        <p style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16 }}>
          Name + phone so we can follow up. No spam, no pushy dialers.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--cream)',
              fontSize: 14,
            }}
          />
          <input
            type="tel"
            placeholder="+91 98XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--cream)',
              fontSize: 14,
            }}
          />

          <ChannelToggle value={channel} onChange={setChannel} />

          <button
            type="submit"
            disabled={submitting || !phone.trim() || !name.trim()}
            className="btn-plum"
            style={{ justifyContent: 'center', padding: '12px 20px', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting
              ? 'Unlocking…'
              : channel === 'call'
                ? 'Request a call →'
                : 'Unlock on WhatsApp →'}
          </button>
          <p style={{ fontSize: 10.5, color: 'var(--light-gray)' }}>
            RERA TS P02400006761 · Data stays with ASBL. Opt out anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
