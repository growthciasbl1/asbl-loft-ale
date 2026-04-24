'use client';

import { TileShell } from './common';

const FD_APPRECIATION = {
  yoy: 14.2,
  over25yrs: 33,
  currentMedian: 11200,
  previousMedian: Math.round(11200 / 1.33), // ~8,421
};

const GCC_TIMELINE: { company: string; scale: string; hires: string }[] = [
  { company: 'Eli Lilly', scale: '2.2 lakh sqft', hires: '1,500 by 2027' },
  { company: 'HCA Healthcare', scale: '4 lakh sqft', hires: '3,000' },
  { company: 'Heineken', scale: '1 lakh+ sqft', hires: '2,500 – 3,000 over 5 yrs' },
  { company: 'Bristol Myers Squibb', scale: '3.18 lakh sqft', hires: '1,500' },
  { company: 'MSD Pharma', scale: '3 lakh sqft', hires: '2,000' },
  { company: 'Evernorth', scale: '4.4 lakh sqft', hires: '1,000+' },
  { company: "McDonald's", scale: '1.56 lakh sqft', hires: '1,500' },
  { company: 'Netflix (2nd India office)', scale: '41,000 sqft', hires: '—' },
];

const TDR_BURDEN: { area: string; burden: number; isFd?: boolean }[] = [
  { area: 'Nanakramguda (FD core)', burden: 551, isFd: true },
  { area: 'Khajaguda', burden: 384 },
  { area: 'Kondapur', burden: 322 },
  { area: 'Kukatpally', burden: 297 },
  { area: 'Manchirevula', burden: 274 },
  { area: 'Puppalguda', burden: 233 },
  { area: 'Attapur', burden: 222 },
  { area: 'Nallagandla', burden: 193 },
  { area: 'Kokapet', burden: 181 },
  { area: 'Neopolis', burden: 177 },
  { area: 'Tellapur', burden: 175 },
  { area: 'Narsingi', burden: 155 },
];

const YIELD_COMPARISON: { label: string; yield: string; note: string; highlight?: boolean }[] = [
  {
    label: 'ASBL Loft (with offer)',
    yield: '5.26% gross',
    note: '₹10.2L/yr on ₹1.94 Cr · contractual till Dec 2026',
    highlight: true,
  },
  { label: 'FD 3BHK market avg', yield: '4.5 – 5.0%', note: '₹75 – 85K/mo for premium 3BHK' },
  { label: 'Indian residential avg', yield: '2 – 3%', note: 'Colliers / Knight Frank industry data' },
  { label: 'Bank FD', yield: '7 – 7.5%', note: 'No leverage · no asset appreciation' },
];

const DRIVERS: { title: string; body: string }[] = [
  {
    title: 'Employment density',
    body: '200+ GCCs opened in Hyderabad in 3 years. Senior hires earn ₹20 – 50L+/yr and rent at ₹75 – 85K in FD today.',
  },
  {
    title: 'Land scarcity',
    body: 'FD is land-locked. New launches must absorb ₹500+/sqft of TDR cost — structural price floor.',
  },
  {
    title: 'Historical track',
    body: 'FD has appreciated 33% in 2.5 years, 14.2% YoY — fastest-moving micro-market in Hyderabad.',
  },
  {
    title: 'Yield floor',
    body: 'Assured Rental Offer of ₹85K/mo (1,695) · ₹95K/mo (1,870) till 31 Dec 2026 — ~5% gross yield vs 2–3% residential average.',
  },
  {
    title: 'Infrastructure catalysts',
    body: 'Metro Phase II (76.4 km proposed), Godavari water (+50% supply in 2 yrs), H-CITI flyovers — confidence multipliers.',
  },
];

export default function ResaleFrameworkTile() {
  const maxTdr = Math.max(...TDR_BURDEN.map((t) => t.burden));

  return (
    <TileShell
      eyebrow="RESALE · STRUCTURAL DRIVERS"
      title="What drives value in Financial District"
      sub="We don't forecast a specific future number. Here's what actually shapes resale — weigh them yourself."
      footer={
        <span style={{ fontSize: 11, color: 'var(--mid-gray)' }}>
          Past performance isn't a guarantee. The structural drivers are strong — the call is yours on how to weigh them.
        </span>
      }
      relatedAsks={[
        { label: 'See full trend data', query: 'Show me the FD price trend data' },
        { label: 'Explain the rental offer', query: 'Walk me through the rental offer' },
        { label: 'Book a site visit', query: 'Book a site visit' },
      ]}
    >
      {/* ───── 1. FD Appreciation ───── */}
      <div style={{ padding: '14px 0' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--plum)',
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Historical track — FD median
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard
            big={`↑${FD_APPRECIATION.yoy}%`}
            label="Year-on-year"
            sub="Q1 2026 vs Q1 2025"
          />
          <StatCard
            big={`↑${FD_APPRECIATION.over25yrs}%`}
            label="Over 2.5 years"
            sub="Fastest-moving micro-market in Hyderabad"
          />
          <StatCard
            big={`₹${FD_APPRECIATION.currentMedian.toLocaleString('en-IN')}`}
            label="FD median ₹/sqft today"
            sub={`Up from ~₹${FD_APPRECIATION.previousMedian.toLocaleString('en-IN')} (2.5 yrs ago)`}
          />
        </div>
      </div>

      <Divider />

      {/* ───── 2. GCC Tenant Demand ───── */}
      <div style={{ padding: '14px 0' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--plum)',
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Tenant demand — senior GCC hires
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--gray-2)', marginBottom: 10 }}>
          200+ GCCs opened in Hyderabad in the last 3 years. Recent additions anchor the tenant pool for FD
          3BHKs at ₹75 – 85K/month.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 8,
          }}
        >
          {GCC_TIMELINE.map((g) => (
            <div
              key={g.company}
              style={{
                background: 'var(--paper, #faf7f2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--charcoal)' }}>
                {g.company}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--mid-gray)', marginTop: 2 }}>{g.scale}</div>
              <div style={{ fontSize: 11.5, color: 'var(--plum)', marginTop: 4, fontWeight: 500 }}>
                {g.hires}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ───── 3. TDR Cost Table ───── */}
      <div style={{ padding: '14px 0' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--plum)',
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Land scarcity — TDR cost floor
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--gray-2)', marginBottom: 12 }}>
          FD is land-locked. New developers pay TDR per-sqft just for FSI rights — that floor has only moved
          up every quarter. Loft locked its FSI at launch (Aug 2023).
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TDR_BURDEN.map((t) => {
            const pct = (t.burden / maxTdr) * 100;
            return (
              <div key={t.area} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    flex: '0 0 clamp(96px, 28vw, 160px)',
                    fontSize: 'clamp(10.5px, 2.8vw, 11.5px)',
                    color: t.isFd ? 'var(--plum)' : 'var(--gray-2)',
                    fontWeight: t.isFd ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t.area}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 18,
                    background: 'var(--paper, #faf7f2)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: t.isFd ? 'var(--plum)' : 'var(--mid-gray)',
                      transition: 'width 500ms ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    flex: '0 0 70px',
                    textAlign: 'right',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: t.isFd ? 'var(--plum)' : 'var(--charcoal)',
                  }}
                >
                  ₹{t.burden}/sqft
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* ───── 4. Yield Comparison ───── */}
      <div style={{ padding: '14px 0' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--plum)',
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Yield floor vs alternatives
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {YIELD_COMPARISON.map((y) => (
            <div
              key={y.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: y.highlight ? 'var(--plum-pale, #faf0f5)' : 'var(--paper, #faf7f2)',
                border: y.highlight ? '1px solid var(--plum-border)' : '1px solid var(--border)',
                borderRadius: 10,
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: y.highlight ? 600 : 500,
                    color: y.highlight ? 'var(--plum)' : 'var(--charcoal)',
                  }}
                >
                  {y.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mid-gray)', marginTop: 2 }}>{y.note}</div>
              </div>
              <div
                className="display"
                style={{
                  fontSize: 20,
                  color: y.highlight ? 'var(--plum)' : 'var(--charcoal)',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {y.yield}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ───── 5. The 5 drivers ───── */}
      <div style={{ padding: '14px 0 4px' }}>
        <div
          style={{
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--plum)',
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          The 5 structural drivers
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          {DRIVERS.map((d, i) => (
            <div
              key={d.title}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                background: '#fff',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--plum)',
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--charcoal)',
                  marginBottom: 4,
                }}
              >
                {d.title}
              </div>
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--gray-2)' }}>{d.body}</div>
            </div>
          ))}
        </div>
      </div>
    </TileShell>
  );
}

function StatCard({ big, label, sub }: { big: string; label: string; sub: string }) {
  return (
    <div
      style={{
        flex: '1 1 150px',
        minWidth: 150,
        padding: '12px 14px',
        background: 'var(--paper, #faf7f2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      <div
        className="display"
        style={{ fontSize: 26, lineHeight: 1, color: 'var(--plum)', fontWeight: 500 }}
      >
        {big}
      </div>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--mid-gray)',
          fontWeight: 600,
          marginTop: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--gray-2)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--border)',
        margin: '4px 0',
      }}
    />
  );
}
