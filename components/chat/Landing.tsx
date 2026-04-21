'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { campaignFromParams, CAMPAIGNS } from '@/lib/utils/campaigns';
import { useChatStore } from '@/lib/store/chatStore';

const SUGGEST = [
  'Show me available units · east facing · floor 30+',
  'Price breakdown for 1,695 East',
  'What amenities does Loft offer?',
  "What's the commute to Hitech City?",
];

export default function Landing() {
  const router = useRouter();
  const params = useSearchParams();
  const setCampaign = useChatStore((s) => s.setCampaign);

  const campaign = campaignFromParams(new URLSearchParams(params?.toString() ?? ''));
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCampaign(campaign.key);
    if (!campaign.prefilledQuery) {
      taRef.current?.focus();
      return;
    }
    let i = 0;
    const text = campaign.prefilledQuery;
    setValue('');
    const timer = setInterval(() => {
      if (i >= text.length) {
        clearInterval(timer);
        taRef.current?.focus();
        return;
      }
      setValue((v) => v + text[i]);
      i++;
      autoGrow();
    }, 24);
    return () => clearInterval(timer);
  }, [campaign.key, campaign.prefilledQuery, setCampaign]);

  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  const go = (q?: string) => {
    const query = (q ?? value).trim();
    if (!query) return;
    const qs = new URLSearchParams();
    qs.set('q', query);
    if (campaign.key !== 'default') qs.set('utm_campaign', campaign.campaign);
    router.push(`/chat?${qs.toString()}`);
  };

  return (
    <main
      className="relative flex flex-col min-h-screen"
      style={{ padding: '28px 24px' }}
    >
      <div className="grain" />

      <header
        className="flex justify-between items-center mx-auto w-full"
        style={{ maxWidth: 1120, position: 'relative', zIndex: 2 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.asblloft-hyderabad.com/images/logo.png"
          alt="ASBL Loft"
          style={{ height: 36, width: 'auto', objectFit: 'contain' }}
        />
        <nav className="flex gap-5" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          <Link href="/demo" className="py-1.5 hover:border-b hover:border-[var(--ink)]">
            Campaign demo
          </Link>
          <Link href="/chat?q=show me available units" className="py-1.5 hover:border-b hover:border-[var(--ink)]">
            Live inventory
          </Link>
        </nav>
      </header>

      <section
        className="flex-1 flex flex-col justify-center items-center mx-auto w-full"
        style={{ maxWidth: 720, paddingBottom: '10vh', position: 'relative', zIndex: 2 }}
      >
        {campaign.key !== 'default' && (
          <div
            className="inline-flex items-center gap-2 animate-msg-in"
            style={{
              padding: '6px 14px',
              background: 'var(--sienna-soft)',
              borderRadius: 100,
              fontSize: 12,
              color: 'var(--sienna-dark)',
              marginBottom: 28,
            }}
          >
            <span
              style={{ width: 5, height: 5, background: 'var(--sienna)', borderRadius: '50%' }}
            />
            {campaign.pill}
          </div>
        )}

        <h1
          className="display"
          style={{
            fontSize: 'clamp(54px, 10vw, 96px)',
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            marginBottom: 14,
            textAlign: 'center',
          }}
        >
          Ask Loft{' '}
          <em style={{ color: 'var(--sienna)', fontStyle: 'italic', fontWeight: 300 }}>anything.</em>
        </h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, marginBottom: 42, textAlign: 'center' }}>
          3BHK residences · Financial District, Hyderabad · Handover Dec 2026
        </p>

        <div className="w-full animate-msg-in">
          <div
            style={{
              background: 'white',
              border: '1px solid var(--hairline)',
              borderRadius: 20,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 200ms, box-shadow 200ms',
            }}
          >
            <textarea
              ref={taRef}
              rows={1}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                autoGrow();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  go();
                }
              }}
              placeholder="Ask about plans, prices, rental yield, amenities, location…"
              style={{
                flex: 1,
                fontSize: 16,
                resize: 'none',
                minHeight: 28,
                maxHeight: 140,
                lineHeight: 1.4,
                paddingTop: 4,
              }}
            />
            <button
              onClick={() => go()}
              disabled={!value.trim()}
              aria-label="Send"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: value.trim() ? 'var(--ink)' : 'var(--paper-3)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 200ms',
                cursor: value.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {SUGGEST.map((s) => (
              <button
                key={s}
                onClick={() => go(s)}
                style={{
                  padding: '7px 14px',
                  fontSize: 12.5,
                  borderRadius: 100,
                  background: 'white',
                  border: '1px solid var(--hairline)',
                  color: 'var(--ink-2)',
                  transition: 'all 200ms',
                }}
                className="hover:border-[var(--ink)] hover:text-[var(--ink)]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer
        className="text-center mx-auto w-full flex justify-between items-center flex-wrap gap-2 pt-6"
        style={{
          maxWidth: 1120,
          fontSize: 11,
          color: 'var(--mute)',
          borderTop: '1px solid var(--hairline)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span>228 units remain · Tower A &amp; B</span>
        <span className="mono" style={{ letterSpacing: '0.05em' }}>
          TS RERA P02400006761
        </span>
      </footer>
    </main>
  );
}
