'use client';

import { useEffect, useRef, useState } from 'react';
import { TileShell, TileIcon } from './common';

/**
 * Animated YoY price trajectory for Financial District 3BHK average.
 * Bars reveal left-to-right; a counter ticks up to the current ₹11,200/sqft.
 */

interface Point {
  quarter: string;
  fd: number; // district median ₹/sqft
  loft?: number;
}

const SERIES: Point[] = [
  { quarter: 'Q3·23', fd: 8400 },
  { quarter: 'Q1·24', fd: 9000 },
  { quarter: 'Q3·24', fd: 9650 },
  { quarter: 'Q1·25', fd: 10200, loft: 11000 },
  { quarter: 'Q3·25', fd: 10700, loft: 11250 },
  { quarter: 'Q1·26', fd: 11200, loft: 11446 },
];

export default function TrendsTile() {
  const latest = SERIES[SERIES.length - 1];

  // Animated counter for the headline ₹11,200 number
  const [displayFd, setDisplayFd] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayFd(Math.round(latest.fd * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [latest.fd]);

  const min = 8000;
  const max = 12000;

  return (
    <TileShell
      eyebrow="FD 3BHK price trajectory"
      title="Financial District is now ₹11,200/sqft."
      sub="Up ~33% in 2.5 years. Loft is priced in line with the district."
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M14 7h7v7" />
          </svg>
        </TileIcon>
      }
      footer={
        <>
          Source: 99acres + Magicbricks closing data, Q2 2026 snapshot. Loft tracks district median
          with the added rental offer on top.
        </>
      }
      askMore={{
        label: 'See Loft vs other FD projects',
        query: 'Compare ASBL Loft with other Financial District projects',
      }}
      relatedAsks={[
        { label: 'Rental offer', query: 'Tell me about the rental offer' },
        { label: 'Why FD not Gachibowli', query: 'Why FD and not Gachibowli or Kokapet?' },
        { label: 'Current pricing', query: 'What is the pricing for ASBL Loft?' },
      ]}
    >
      {/* Headline counter */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: 14,
            background: 'var(--plum)',
            color: '#fff',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              opacity: 0.75,
            }}
          >
            FD average today
          </div>
          <div className="serif" style={{ fontSize: 26, fontWeight: 500, marginTop: 4 }}>
            ₹{displayFd.toLocaleString('en-IN')}
            <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>/sqft</span>
          </div>
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              opacity: 0.85,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: '#a7f3d0',
                borderRadius: '50%',
                boxShadow: '0 0 0 3px rgba(167,243,208,0.25)',
              }}
            />
            Live · updated weekly
          </div>
        </div>
        <div
          style={{
            padding: 14,
            background: 'linear-gradient(135deg, #f6eef4 0%, #eddff0 100%)',
            border: '1px solid var(--plum-border)',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              color: 'var(--plum-dark)',
              fontWeight: 600,
            }}
          >
            YoY growth (FD)
          </div>
          <div
            className="serif"
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: 'var(--plum-dark)',
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--plum-dark)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17l5-5 4 4 5-9" />
              <path d="M17 7h4v4" />
            </svg>
            +14.2%
          </div>
          <div style={{ fontSize: 11, color: 'var(--plum-dark)', marginTop: 4, fontWeight: 500 }}>
            Q1 2025 → Q1 2026 · fastest micro-market in Hyderabad
          </div>
        </div>
      </div>

      {/* Animated bar chart */}
      <div>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--mid-gray)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          ₹/sqft · FD district median
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SERIES.length}, 1fr)`,
            gap: 8,
            alignItems: 'end',
            height: 180,
          }}
        >
          {SERIES.map((p, i) => {
            const ratio = Math.max(0, (p.fd - min) / (max - min));
            const height = Math.max(10, ratio * 160);
            const isLatest = i === SERIES.length - 1;
            return (
              <div
                key={p.quarter}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: isLatest ? 'var(--plum-dark)' : 'var(--mid-gray)',
                    fontWeight: isLatest ? 600 : 400,
                    marginBottom: 4,
                  }}
                >
                  ₹{(p.fd / 1000).toFixed(1)}k
                </div>
                <div
                  style={{
                    width: '80%',
                    background: isLatest ? 'var(--plum)' : 'var(--plum-pale)',
                    border: '1px solid ' + (isLatest ? 'var(--plum-dark)' : 'var(--plum-border)'),
                    borderRadius: '6px 6px 2px 2px',
                    height: 0,
                    animation: `rise 800ms ${i * 100}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                  }}
                />
                <div
                  style={{
                    fontSize: 9.5,
                    color: 'var(--mid-gray)',
                    marginTop: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {p.quarter}
                </div>

                <style>{`
                  @keyframes rise {
                    from { height: 0; }
                    to   { height: ${height}px; }
                  }
                `}</style>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loft callout */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--cream)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          fontSize: 12.5,
          color: 'var(--gray-2)',
          lineHeight: 1.55,
        }}
      >
        <b style={{ color: 'var(--charcoal)' }}>Where Loft sits: </b>
        at ₹{latest.loft?.toLocaleString('en-IN') ?? '11,446'}/sqft, Loft is priced right on the
        district curve — but the <b style={{ color: 'var(--plum-dark)' }}>₹85K/mo rental offer till
        Dec 2026</b> is unique to us. Net effective entry is lower than the sticker suggests.
      </div>

      {/* GCC + TDR drivers — the WHY behind the growth */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--mid-gray)',
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          What&apos;s pushing FD prices up
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 10,
          }}
        >
          <div
            style={{
              padding: 14,
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.13em',
                color: 'var(--plum)',
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={12} cy={12} r={9} />
                <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
              </svg>
              GCC boom
            </div>
            <div
              className="serif"
              style={{ fontSize: 16, fontWeight: 500, color: 'var(--charcoal)', marginBottom: 6 }}
            >
              Hyderabad leads India in new Global Capability Centres — and FD is the epicentre.
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-2)', lineHeight: 1.55 }}>
              200+ GCCs opened in Hyderabad in the last 3 years · Google Phase 2, Apple, Amazon HQ,
              Microsoft, Waverock SEZ all sit within a 5–10 minute drive of Loft. Their senior
              engineers are exactly the tenants paying ₹75K–₹85K for 3BHKs right now. Loft&apos;s
              location is literally walking distance to that demand.
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 11.5,
                color: 'var(--plum-dark)',
                fontWeight: 500,
              }}
            >
              → For Loft buyers: tenant pool keeps deepening, rent-ceiling keeps rising.
            </div>
          </div>

          <div
            style={{
              padding: 14,
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10.5,
                textTransform: 'uppercase',
                letterSpacing: '0.13em',
                color: 'var(--plum)',
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21V9l9-6 9 6v12" />
                <path d="M9 21V12h6v9" />
              </svg>
              TDR-led scarcity
            </div>
            <div
              className="serif"
              style={{ fontSize: 16, fontWeight: 500, color: 'var(--charcoal)', marginBottom: 6 }}
            >
              FD land is effectively supply-capped — Transferable Development Rights are the only
              way to build more here.
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-2)', lineHeight: 1.55 }}>
              Developers have to buy TDR certificates (surrendered land elsewhere) to unlock extra
              FSI inside FD. That pushes land cost up every quarter — and every new FD launch is
              priced higher than the last. Loft got its FSI early in the cycle, so today&apos;s
              ticket is locked lower than what&apos;ll launch next.
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 11.5,
                color: 'var(--plum-dark)',
                fontWeight: 500,
              }}
            >
              → For Loft buyers: next 3BHK launch in this radius will be 15–20% costlier. You&apos;re
              in at today&apos;s price.
            </div>
          </div>
        </div>
      </div>
    </TileShell>
  );
}
