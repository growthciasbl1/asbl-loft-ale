'use client';

import { useEffect, useState } from 'react';

interface FunnelEntry {
  key: string;
  uniqueSessions: number;
}

interface WindowData {
  events: {
    total: number;
    uniqueSessions: number;
    byType: { type: string; count: number }[];
    topNames: { name: string; type: string; count: number }[];
  };
  funnel: FunnelEntry[];
  llm: { calls: number; totalTokens: number; costUsd: number; costInr: number };
  leads: { leads: number; bookings: number; reschedules: number };
}

interface TrafficResponse {
  ok: boolean;
  mongoConnected: boolean;
  now: string;
  windows: {
    lastHour: WindowData;
    last24h: WindowData;
    last7d: WindowData;
    last30d: WindowData;
    allTime: WindowData;
  };
}

const WINDOW_LABELS: { key: keyof TrafficResponse['windows']; label: string }[] = [
  { key: 'lastHour', label: 'Last hour' },
  { key: 'last24h', label: 'Last 24 h' },
  { key: 'last7d', label: 'Last 7 d' },
  { key: 'last30d', label: 'Last 30 d' },
  { key: 'allTime', label: 'All time' },
];

export default function TrafficDashboardPage() {
  const [data, setData] = useState<TrafficResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/traffic', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as TrafficResponse;
      setData(json);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000); // auto-refresh 30s
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#faf7f2',
        padding: '32px 24px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, margin: 0, color: '#22172a', fontWeight: 600 }}>
            Traffic + Compute
          </h1>
          <p style={{ fontSize: 13, color: '#7a6e65', marginTop: 6 }}>
            Events, funnel, LLM usage. Auto-refresh every 30 s.
            {data && (
              <span style={{ marginLeft: 12 }}>
                · Last update: {new Date(data.now).toLocaleTimeString()} · Mongo:{' '}
                <b style={{ color: data.mongoConnected ? '#15803d' : '#b42318' }}>
                  {data.mongoConnected ? 'connected' : 'offline'}
                </b>
              </span>
            )}
          </p>
        </header>

        {loading && !data && (
          <div style={{ padding: 24, color: '#7a6e65' }}>Loading…</div>
        )}
        {err && (
          <div
            style={{
              padding: 14,
              background: '#fef3f2',
              border: '1px solid #fda29b',
              color: '#b42318',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            Error loading traffic data: {err}
          </div>
        )}

        {data &&
          WINDOW_LABELS.map(({ key, label }) => {
            const w = data.windows[key];
            return <WindowCard key={key} label={label} data={w} />;
          })}

        <div style={{ marginTop: 28, fontSize: 11.5, color: '#8a7b6e' }}>
          Links · <a href="/admin/usage" style={{ color: '#8b2f7a' }}>Detailed LLM usage breakdown</a>
        </div>
      </div>
    </div>
  );
}

function WindowCard({ label, data }: { label: string; data: WindowData }) {
  const funnelMap = new Map(data.funnel.map((f) => [f.key, f.uniqueSessions]));
  const pageView = funnelMap.get('page_view') ?? 0;
  const formFocus = funnelMap.get('form_focus') ?? 0;
  const otpSend = funnelMap.get('otp_send') ?? 0;
  const lead = funnelMap.get('lead_success') ?? 0;
  const booking = funnelMap.get('booking') ?? 0;

  return (
    <section
      style={{
        background: 'white',
        border: '1px solid #e5ded0',
        borderRadius: 14,
        padding: 20,
        marginBottom: 18,
      }}
    >
      <h2 style={{ fontSize: 16, margin: '0 0 14px', color: '#22172a', fontWeight: 600 }}>
        {label}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <Stat label="Events" value={data.events.total.toLocaleString()} />
        <Stat label="Unique sessions" value={data.events.uniqueSessions.toLocaleString()} />
        <Stat label="Leads captured" value={data.leads.leads.toLocaleString()} />
        <Stat label="Bookings" value={data.leads.bookings.toLocaleString()} />
        <Stat label="Reschedules" value={data.leads.reschedules.toLocaleString()} />
        <Stat label="LLM calls" value={data.llm.calls.toLocaleString()} />
        <Stat
          label="Tokens"
          value={data.llm.totalTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <Stat label="Cost (INR)" value={`₹${data.llm.costInr.toFixed(2)}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 18, marginTop: 6 }}>
        <div>
          <h3 style={sectionTitle}>Funnel (unique sessions)</h3>
          <FunnelBar label="Page view" value={pageView} max={pageView} />
          <FunnelBar label="Form focus" value={formFocus} max={pageView} />
          <FunnelBar label="OTP send" value={otpSend} max={pageView} />
          <FunnelBar label="Lead created" value={lead} max={pageView} />
          <FunnelBar label="Booking" value={booking} max={pageView} />
        </div>
        <div>
          <h3 style={sectionTitle}>Top events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.events.topNames.slice(0, 12).map((r) => (
              <div
                key={r.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  background: '#faf7f2',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <span style={{ color: '#3b3238' }}>
                  {r.name}{' '}
                  <span style={{ fontSize: 10, color: '#8a7b6e' }}>· {r.type}</span>
                </span>
                <span className="mono" style={{ fontWeight: 500, color: '#22172a' }}>
                  {r.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: '#faf7f2',
        borderRadius: 10,
        border: '1px solid #ece4d3',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          textTransform: 'uppercase',
          letterSpacing: '0.13em',
          color: '#8a7b6e',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#22172a' }}>{value}</div>
    </div>
  );
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11.5,
          marginBottom: 2,
          color: '#3b3238',
        }}
      >
        <span>{label}</span>
        <span className="mono">
          {value.toLocaleString()}{' '}
          <span style={{ color: '#8a7b6e', fontWeight: 400 }}>({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: '#ece4d3',
          borderRadius: 100,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#8b2f7a',
            transition: 'width 300ms',
          }}
        />
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#8a7b6e',
  fontWeight: 600,
  margin: '0 0 10px',
};
