'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/store/chatStore';

interface Props {
  children: React.ReactNode;
  reason: string;
  preview?: React.ReactNode;
}

export default function LeadGate({ children, reason, preview }: Props) {
  const lead = useChatStore((s) => s.lead);
  const setLead = useChatStore((s) => s.setLead);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (lead?.phone) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !name.trim()) return;
    setSubmitting(true);

    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, query: reason }),
      });
    } catch (err) {
      // Non-blocking
    }

    setLead({ name, phone, source: reason });
    setSubmitting(false);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-sm)' }}
    >
      {preview && (
        <div className="relative">
          <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>{preview}</div>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(246, 241, 232, 0.6) 50%, rgba(246, 241, 232, 1) 100%)',
            }}
          />
        </div>
      )}
      <div className="p-6 md:p-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{ background: 'var(--sienna-soft)', color: 'var(--sienna-dark)', fontSize: 11, letterSpacing: '0.1em' }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sienna)' }} />
          UNLOCK · one-time
        </div>
        <h4 className="display" style={{ fontSize: 22, marginBottom: 8 }}>
          {reason}
        </h4>
        <p className="text-sm" style={{ color: 'var(--mute)', marginBottom: 18 }}>
          Name + WhatsApp so we can send follow-up details, floor plans and the price sheet directly
          to you. No spam, no pushy calls.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl"
            style={{ background: 'var(--paper)', border: '1px solid var(--hairline)' }}
          />
          <input
            type="tel"
            placeholder="WhatsApp number (+91…)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl"
            style={{ background: 'var(--paper)', border: '1px solid var(--hairline)' }}
          />
          <button
            type="submit"
            disabled={submitting || !phone.trim() || !name.trim()}
            className="w-full py-3.5 rounded-full font-semibold transition"
            style={{
              background: submitting ? 'var(--paper-3)' : 'var(--ink)',
              color: 'white',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Unlocking…' : 'Unlock details →'}
          </button>
          <p className="text-xs" style={{ color: 'var(--mute)' }}>
            RERA TS P02400006761 · Data stays with ASBL. Opt out anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
