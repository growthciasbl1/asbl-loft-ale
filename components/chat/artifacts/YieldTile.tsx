'use client';

import { TileShell, TileIcon } from './common';

export default function YieldTile() {
  return (
    <TileShell
      eyebrow="Rental yield · realistic"
      title="₹75K – ₹85K/month · ~5% gross"
      sub="FD 3BHKs today · plus ASBL's Assured Rental Offer of ₹85,000/mo (1,695 sqft) till Dec 2026"
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5}>
            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </TileIcon>
      }
      footer={
        <>
          Open-market comps drawn from Magicbricks + NoBroker · Q1 2026 · ASBL&apos;s assured
          component is a separate direct payment.
        </>
      }
      askMore={{
        label: 'See the rental offer in detail',
        query: 'Tell me about the rental offer',
      }}
      relatedAsks={[
        { label: 'Nearby offices, schools & hospitals', query: 'What facilities are near ASBL Loft?' },
        { label: 'Why FD not Gachibowli', query: 'Why FD and not Gachibowli or Kokapet?' },
        { label: 'Unit plans', query: 'Show me the 3BHK unit plans' },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <div style={{ padding: 14, background: 'var(--cream)', borderRadius: 10 }}>
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--mid-gray)',
                fontWeight: 500,
              }}
            >
              Monthly rent (open market)
            </div>
            <div className="serif" style={{ fontSize: 22, marginTop: 4, fontWeight: 500 }}>
              ₹75K <span style={{ fontSize: 13, color: 'var(--mid-gray)' }}>–</span> ₹85K
            </div>
            <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 4 }}>
              FD 3BHK comps, both sizes
            </div>
          </div>
          <div style={{ padding: 14, background: 'var(--plum-pale)', borderRadius: 10 }}>
            <div
              style={{
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--plum-dark)',
                fontWeight: 500,
              }}
            >
              ASBL Assured Rental Offer
            </div>
            <div
              className="serif"
              style={{ fontSize: 22, marginTop: 4, fontWeight: 500, color: 'var(--plum-dark)' }}
            >
              ₹85K <span style={{ fontSize: 13, color: 'var(--mid-gray)' }}>/</span> ₹95K
              <span style={{ fontSize: 13 }}>/mo</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--plum-dark)', marginTop: 4 }}>
              1,695 / 1,870 sqft · till 31 Dec 2026 · direct from ASBL
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            background: 'var(--cream)',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--mid-gray)',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Gross yield (on ₹1.94 Cr base, 1,695 sqft)
          </div>
          <div
            className="serif"
            style={{ fontSize: 26, fontWeight: 500, color: 'var(--charcoal)' }}
          >
            ~5.0% – 5.3% <span style={{ fontSize: 13, color: 'var(--mid-gray)' }}>per annum</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--mid-gray)', marginTop: 4 }}>
            Before appreciation. The ASBL offer pays ₹85,000/month on 1,695 sqft (₹95,000 on 1,870) till 31 December 2026.
          </div>
        </div>
      </div>
    </TileShell>
  );
}
