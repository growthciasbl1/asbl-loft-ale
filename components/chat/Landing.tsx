'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { campaignFromParams } from '@/lib/utils/campaigns';
import { useChatStore } from '@/lib/store/chatStore';
import ReraWidget from './ReraWidget';

/* ── Colour tokens (mirror globals.css for typed use) ────────── */
const COLOR = {
  plum: '#8B2F7A',
  plumDark: '#6f2462',
  plumPale: '#F6EEF4',
  plumBorder: 'rgba(139, 47, 122, 0.2)',
  cream: '#FAF7F2',
  beige: '#F0EAE0',
  beige2: '#E8DFCF',
  charcoal: '#1C1A1A',
  gray2: '#3A3636',
  midGray: '#7A7472',
  lightGray: '#B0ACAA',
  white: '#FFFFFF',
  border: 'rgba(28, 26, 26, 0.12)',
};

/* ── Chip config ─────────────────────────────────────── */
const CHIPS: { label: string; query: string; icon: React.ReactNode }[] = [
  {
    label: 'Plans',
    query: 'Tell me about the floor plans',
    icon: (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
        <rect x={3} y={3} width={7} height={7} />
        <rect x={14} y={3} width={7} height={7} />
        <rect x={3} y={14} width={7} height={7} />
        <rect x={14} y={14} width={7} height={7} />
      </svg>
    ),
  },
  {
    label: 'Price',
    query: 'What is the pricing for ASBL Loft?',
    icon: (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5h12M6 10h12M15 5c0 5-5 5-9 5 6 1 9 4 9 9" />
      </svg>
    ),
  },
  {
    label: 'Amenities',
    query: 'What amenities does ASBL Loft offer?',
    icon: (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={9} />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    label: 'Location',
    query: 'Where is ASBL Loft and what is nearby?',
    icon: (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z" />
        <circle cx={12} cy={10} r={2.5} />
      </svg>
    ),
  },
  {
    label: 'Rental Offer',
    query: 'Tell me about the rental offer',
    icon: (
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <line x1={4} y1={7} x2={20} y2={7} />
        <line x1={4} y1={12} x2={16} y2={12} />
        <line x1={4} y1={17} x2={12} y2={17} />
      </svg>
    ),
  },
];

export default function Landing() {
  const router = useRouter();
  const params = useSearchParams();
  const setCampaign = useChatStore((s) => s.setCampaign);

  const campaign = campaignFromParams(new URLSearchParams(params?.toString() ?? ''));
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
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
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
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
    <>
      {/* ═══ Header ═══ */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          background: 'rgba(250, 247, 242, 0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${COLOR.border}`,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.75rem',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.webp" alt="ASBL Loft" style={{ height: 44, display: 'block' }} />
        </Link>
        <button
          onClick={() => go('Book a site visit this weekend')}
          style={{
            background: COLOR.plum,
            color: '#fff',
            padding: '9px 20px',
            borderRadius: 16,
            fontSize: 11.5,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 180ms ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = COLOR.plumDark)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = COLOR.plum)}
        >
          Book Site Visit
        </button>
      </header>

      <ReraWidget hidden={false} />

      {/* ═══ Landing body ═══ */}
      <main
        style={{
          paddingTop: 64,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: COLOR.cream,
        }}
      >
        {/* 3a. Center logo */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 32,
            animation: 'fadeUp 600ms ease both',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.webp"
            alt="ASBL Loft"
            style={{ height: 104, display: 'block', margin: '0 auto' }}
          />
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: COLOR.midGray,
              marginTop: 9,
              fontWeight: 500,
            }}
          >
            Financial District · Hyderabad
          </div>
        </div>

        {/* 3b. Property Info Bar */}
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            border: `1px solid ${COLOR.border}`,
            boxShadow: '0 1px 18px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexWrap: 'wrap',
            maxWidth: 1040,
            width: '100%',
            marginBottom: 28,
            animation: 'fadeUp 600ms 70ms ease both',
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          {[
            {
              label: 'Configuration',
              value: '3 BHKs',
              sub: 'Exclusive · West Facing',
              valueColor: COLOR.plum,
              valueFs: 21,
              serif: true,
            },
            {
              label: 'Floors',
              value: 'G + 45',
              sub: 'High-rise Tower',
              valueColor: COLOR.charcoal,
              valueFs: 21,
              serif: true,
            },
            {
              label: '1695 sq. ft',
              value: '₹ 1.94 Cr',
              sub: 'All Inclusive + GST',
              valueColor: COLOR.plum,
              valueFs: 19,
              serif: true,
            },
            {
              label: '1870 sq. ft',
              value: '₹ 2.15 Cr',
              sub: 'All Inclusive + GST',
              valueColor: COLOR.plum,
              valueFs: 19,
              serif: true,
            },
            {
              label: 'Location',
              value: 'Financial District',
              sub: '',
              valueColor: COLOR.plum,
              valueFs: 11,
              serif: false,
              bg: COLOR.plumPale,
              upper: true,
            },
          ].map((c, i) => (
            <div
              key={c.label}
              className="asbl-info-bar-cell"
              style={{
                flex: '1 1 180px',
                padding: '14px 20px',
                borderLeft: i === 0 ? 'none' : `1px solid ${COLOR.border}`,
                background: c.bg || '#fff',
                minWidth: 160,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.13em',
                  color: COLOR.midGray,
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: c.serif
                    ? "'Playfair Display', Georgia, serif"
                    : "'DM Sans', sans-serif",
                  fontSize: c.valueFs,
                  color: c.valueColor,
                  fontWeight: 500,
                  textTransform: c.upper ? 'uppercase' : 'none',
                  letterSpacing: c.upper ? '0.05em' : 'normal',
                  lineHeight: 1.15,
                }}
              >
                {c.value}
              </div>
              {c.sub && (
                <div
                  style={{ fontSize: 10, color: COLOR.lightGray, marginTop: 4 }}
                >
                  {c.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 3c. Inline Search Bar */}
        <div
          style={{
            width: '100%',
            maxWidth: 600,
            marginBottom: 16,
            animation: 'fadeUp 600ms 120ms ease both',
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: `1.5px solid ${focused ? COLOR.plumBorder : COLOR.border}`,
              borderRadius: 16,
              padding: '12px 16px 10px',
              boxShadow: focused ? '0 0 0 3px rgba(139, 47, 122, 0.07)' : 'none',
              transition: 'border-color 180ms ease, box-shadow 180ms ease',
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
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  go();
                }
              }}
              placeholder="Ask about floor plans, pricing, amenities…"
              style={{
                width: '100%',
                fontSize: 14,
                fontWeight: 300,
                resize: 'none',
                minHeight: 48,
                maxHeight: 100,
                lineHeight: 1.55,
                color: COLOR.charcoal,
                fontFamily: "'DM Sans', sans-serif",
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontStyle: value ? 'normal' : 'normal',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 10, color: COLOR.lightGray, fontWeight: 400 }}>
                ASBL Loft Assistant
              </span>
              <button
                onClick={() => go()}
                disabled={!value.trim()}
                aria-label="Send"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: value.trim() ? COLOR.plum : COLOR.lightGray,
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: value.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 180ms ease',
                }}
                onMouseEnter={(e) => {
                  if (value.trim())
                    (e.currentTarget as HTMLButtonElement).style.background = COLOR.plumDark;
                }}
                onMouseLeave={(e) => {
                  if (value.trim())
                    (e.currentTarget as HTMLButtonElement).style.background = COLOR.plum;
                }}
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 3d. Chip Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 7,
            justifyContent: 'center',
            maxWidth: 600,
            animation: 'fadeUp 600ms 180ms ease both',
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          {CHIPS.map((c) => (
            <ChipButton
              key={c.label}
              label={c.label}
              icon={c.icon}
              onClick={() => {
                setValue(c.query);
                autoGrow();
                taRef.current?.focus();
              }}
            />
          ))}
        </div>

        {/* Mobile-only RERA footer (desktop shows the floating widget) */}
        <div
          className="rera-mobile-footer"
          style={{
            marginTop: 28,
            textAlign: 'center',
            fontSize: 10,
            color: COLOR.midGray,
            letterSpacing: '0.04em',
            lineHeight: 1.55,
            maxWidth: 520,
          }}
        >
          <div style={{ fontWeight: 500, color: COLOR.gray2 }}>
            TG RERA No. <span style={{ color: COLOR.plum }}>P02400006761</span>
          </div>
          <div style={{ marginTop: 2 }}>
            Layout / Building Permission No. 057423/ZOA/R1/U6/HMDA/21102022
          </div>
          <a
            href="https://rera.telangana.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: COLOR.midGray, textDecoration: 'underline', fontSize: 10 }}
          >
            rera.telangana.gov.in
          </a>
        </div>
      </main>

      <style>{`
        /* Hide the mobile RERA footer on wide screens — the fixed widget handles it there */
        @media (min-width: 900px) {
          .rera-mobile-footer { display: none !important; }
        }
        /* On mobile, pull the logo slightly tighter so the viewport isn't wasted */
        @media (max-width: 640px) {
          header img[alt="ASBL Loft"] { height: 32px !important; }
        }
      `}</style>
    </>
  );
}

function ChipButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? COLOR.plumPale : '#fff',
        border: `1px solid ${hover ? COLOR.plumBorder : COLOR.border}`,
        color: hover ? COLOR.plum : COLOR.midGray,
        padding: '8px 14px',
        borderRadius: 20,
        fontSize: 12,
        fontFamily: "'DM Sans', sans-serif",
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        transition: 'all 180ms ease',
        fontWeight: 400,
      }}
    >
      <span style={{ display: 'inline-flex' }}>{icon}</span>
      {label}
    </button>
  );
}
