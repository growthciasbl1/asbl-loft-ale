'use client';

import { useRouter } from 'next/navigation';
import { CAMPAIGNS } from '@/lib/utils/campaigns';

const SOURCES = [
  {
    key: 'yield',
    kicker: 'Google Ads · Search',
    label: '"Rental yield Hyderabad"',
    url: '?utm_source=google&utm_medium=cpc&utm_campaign=rental_yield_fd',
  },
  {
    key: 'life',
    kicker: 'Instagram · Reel',
    label: '"Mornings at Loft"',
    url: '?utm_source=instagram&utm_medium=paid_social&utm_campaign=life_mornings',
  },
  {
    key: 'trends',
    kicker: 'Email · Nurture',
    label: 'Q4 price watchlist',
    url: '?utm_source=email&utm_medium=crm&utm_campaign=price_trends_q4',
  },
  {
    key: 'why_fd',
    kicker: 'Organic · Search',
    label: '"FD vs Gachibowli"',
    url: '?utm_source=google&utm_medium=organic&utm_campaign=why_financial_district',
  },
  {
    key: 'inventory',
    kicker: 'WhatsApp · Direct',
    label: '"What units are available?"',
    url: '?utm_source=whatsapp&utm_medium=referral&utm_campaign=inventory_live',
  },
] as const;

export default function DemoPage() {
  const router = useRouter();

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ padding: 24 }}
    >
      <div style={{ maxWidth: 720, width: '100%' }}>
        <div
          className="flex items-center gap-2 mb-5"
          style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--mute)' }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sienna)' }} />
          <span>Prototype · UTM flow</span>
        </div>
        <h1
          className="display"
          style={{
            fontSize: 'clamp(32px, 5vw, 44px)',
            lineHeight: 1.05,
            fontWeight: 400,
            marginBottom: 10,
          }}
        >
          Simulate the visitor&apos;s{' '}
          <em style={{ color: 'var(--sienna)', fontStyle: 'italic' }}>arrival.</em>
        </h1>
        <p style={{ color: 'var(--ink-2)', maxWidth: 520, marginBottom: 36 }}>
          Pick a traffic source. The landing page will open with the query already framed — the
          chatbot reads UTM params and primes what it thinks the visitor came here to ask.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {SOURCES.map((s) => (
            <button
              key={s.key}
              onClick={() => router.push('/' + s.url)}
              className="group"
              style={{
                textAlign: 'left',
                padding: 20,
                background: 'white',
                border: '1px solid var(--hairline)',
                borderRadius: 14,
                transition: 'all 220ms ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--mute)',
                  marginBottom: 6,
                }}
              >
                {s.kicker}
              </div>
              <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6, color: 'var(--ink)' }}>
                {s.label}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: 'var(--sienna-dark)',
                  lineHeight: 1.4,
                  wordBreak: 'break-all',
                }}
              >
                {s.url.replace(/&/g, '\n&')}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
