'use client';

import { useEffect, useState } from 'react';

interface Window {
  prompt?: number;
  promptTokens?: number;
  cached?: number;
  cachedContentTokens?: number;
  candidates?: number;
  candidatesTokens?: number;
  total?: number;
  totalTokens?: number;
  usd?: number;
  costUsd?: number;
  inr?: number;
  costInr?: number;
  calls?: number;
}

interface UsageResponse {
  now: string;
  pricing: {
    input_per_1m_tokens_usd: string;
    cached_input_per_1m_tokens_usd: string;
    output_per_1m_tokens_usd: string;
    usd_to_inr: number;
  };
  windows: {
    today: Window;
    last7days: Window;
    last30days: Window;
    allTime: Window;
  };
  byArtifact: { _id: string | null; calls: number; totalTokens: number; costInr: number }[];
  byDay: { _id: string; calls: number; totalTokens: number; costInr: number }[];
  topConversationsByCost: {
    _id: string;
    calls: number;
    totalTokens: number;
    costInr: number;
    lastAt: string;
  }[];
  scalingAssumption: {
    assumed_daily_users_at_scale: number;
    daily_calls_today: number;
    projected_monthly_usd: number | null;
    note: string;
  };
}

function fmtNum(n: number | undefined): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtInr(n: number | undefined): string {
  if (n == null) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtUsd(n: number | undefined): string {
  if (n == null) return '$0';
  return `$${n.toFixed(4)}`;
}

export default function UsagePage() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('asbl-admin-token') : null;
    if (saved) setToken(saved);
  }, []);

  const load = async () => {
    if (!token.trim()) {
      setErr('Paste admin token');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/usage?token=${encodeURIComponent(token.trim())}`);
      if (!res.ok) {
        setErr(`HTTP ${res.status}`);
      } else {
        const json = (await res.json()) as UsageResponse;
        setData(json);
        window.localStorage.setItem('asbl-admin-token', token.trim());
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#faf7f2',
        padding: '40px 20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#1c1a1a',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#8b2f7a', fontWeight: 600 }}>
            ASBL Loft · Admin Dashboard
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 600, marginTop: 4, fontFamily: 'Playfair Display, serif' }}>
            LLM Usage & Cost
          </h1>
          <p style={{ fontSize: 13, color: '#6a6563', marginTop: 4 }}>
            Every Gemini call logs tokens + cost to <code>llm_usage</code>. Pricing live from Gemini 2.5 Flash rate card.
          </p>
        </header>

        {/* Auth */}
        <section
          style={{
            background: '#fff',
            border: '1px solid rgba(28,26,26,0.12)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Admin token"
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: 13,
              border: '1px solid rgba(28,26,26,0.12)',
              borderRadius: 8,
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              background: '#8b2f7a',
              color: '#fff',
              fontWeight: 500,
              fontSize: 13,
              border: 'none',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Loading…' : 'Load data'}
          </button>
        </section>

        {err && (
          <div style={{ background: '#fef2f2', color: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {err}
          </div>
        )}

        {data && (
          <>
            {/* ───── Time windows ───── */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
              {(
                [
                  ['Today', data.windows.today],
                  ['Last 7 days', data.windows.last7days],
                  ['Last 30 days', data.windows.last30days],
                  ['All time', data.windows.allTime],
                ] as const
              ).map(([label, w]) => {
                const calls = w.calls ?? 0;
                const pTok = w.promptTokens ?? w.prompt ?? 0;
                const cTok = w.candidatesTokens ?? w.candidates ?? 0;
                const cachedTok = w.cachedContentTokens ?? w.cached ?? 0;
                const totalTok = w.totalTokens ?? w.total ?? 0;
                const inr = w.costInr ?? w.inr ?? 0;
                const usd = w.costUsd ?? w.usd ?? 0;
                return (
                  <div
                    key={label}
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(28,26,26,0.12)',
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 10.5, color: '#6a6563', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 30, color: '#8b2f7a', fontWeight: 500, marginTop: 6, fontFamily: 'Playfair Display, serif' }}>
                      {fmtInr(inr)}
                    </div>
                    <div style={{ fontSize: 11, color: '#6a6563', marginTop: 2 }}>
                      {fmtUsd(usd)} · {calls} call{calls === 1 ? '' : 's'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 11, color: '#3a3636' }}>
                      <Stat label="Input" value={fmtNum(pTok)} />
                      <Stat label="Cached" value={fmtNum(cachedTok)} />
                      <Stat label="Output" value={fmtNum(cTok)} />
                      <Stat label="Total" value={fmtNum(totalTok)} bold />
                    </div>
                  </div>
                );
              })}
            </section>

            {/* ───── Projection ───── */}
            <section
              style={{
                background: '#fff',
                border: '1px solid rgba(28,26,26,0.12)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 28,
              }}
            >
              <div style={{ fontSize: 10.5, color: '#8b2f7a', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600 }}>
                At-scale projection
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8, alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 36, color: '#8b2f7a', fontWeight: 500, fontFamily: 'Playfair Display, serif', lineHeight: 1 }}>
                    {data.scalingAssumption.projected_monthly_usd != null
                      ? fmtInr(data.scalingAssumption.projected_monthly_usd * data.pricing.usd_to_inr)
                      : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6a6563', marginTop: 4 }}>
                    Projected monthly cost @ 20,000 daily users (5 turns avg)
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#6a6563', maxWidth: 520, lineHeight: 1.6 }}>
                  {data.scalingAssumption.note} Projection = today&apos;s avg cost per call × 100,000 calls/day × 30
                  days. Drops to &lt;60% with Gemini implicit prompt caching kicking in.
                </div>
              </div>
            </section>

            {/* ───── By artifact ───── */}
            {data.byArtifact.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid rgba(28,26,26,0.12)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 10.5, color: '#8b2f7a', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 12 }}>
                  Cost by artifact (last 30 days)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(28,26,26,0.12)' }}>
                      <Th>Artifact</Th>
                      <Th align="right">Calls</Th>
                      <Th align="right">Tokens</Th>
                      <Th align="right">Cost (INR)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byArtifact.map((r) => (
                      <tr key={r._id ?? 'none'} style={{ borderBottom: '1px solid rgba(28,26,26,0.06)' }}>
                        <Td>{r._id || 'none'}</Td>
                        <Td align="right">{r.calls}</Td>
                        <Td align="right">{fmtNum(r.totalTokens)}</Td>
                        <Td align="right">{fmtInr(r.costInr)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* ───── By day ───── */}
            {data.byDay.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid rgba(28,26,26,0.12)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 10.5, color: '#8b2f7a', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 12 }}>
                  Daily trend (last 30 days)
                </div>
                <DailyBars rows={data.byDay} />
              </section>
            )}

            {/* ───── Top expensive conversations ───── */}
            {data.topConversationsByCost.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid rgba(28,26,26,0.12)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 10.5, color: '#8b2f7a', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 600, marginBottom: 12 }}>
                  Top 15 conversations by cost
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(28,26,26,0.12)' }}>
                      <Th>Conversation ID</Th>
                      <Th align="right">Turns</Th>
                      <Th align="right">Tokens</Th>
                      <Th align="right">Cost (INR)</Th>
                      <Th>Last activity</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topConversationsByCost.map((r) => (
                      <tr key={r._id} style={{ borderBottom: '1px solid rgba(28,26,26,0.06)' }}>
                        <Td mono>{r._id.slice(0, 26)}…</Td>
                        <Td align="right">{r.calls}</Td>
                        <Td align="right">{fmtNum(r.totalTokens)}</Td>
                        <Td align="right">{fmtInr(r.costInr)}</Td>
                        <Td>{new Date(r.lastAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* ───── Pricing card ───── */}
            <section style={{ background: '#f6eef4', border: '1px solid rgba(139,47,122,0.2)', borderRadius: 12, padding: 16, fontSize: 12, color: '#3a3636' }}>
              <strong style={{ color: '#8b2f7a' }}>Current Gemini 2.5 Flash pricing</strong>
              <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Input: ${data.pricing.input_per_1m_tokens_usd}/1M</span>
                <span>Cached: ${data.pricing.cached_input_per_1m_tokens_usd}/1M</span>
                <span>Output: ${data.pricing.output_per_1m_tokens_usd}/1M</span>
                <span>USD → INR: {data.pricing.usd_to_inr}</span>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: '#6a6563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#1c1a1a', fontWeight: bold ? 600 : 400, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '8px 10px',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#6a6563',
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  mono?: boolean;
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: '8px 10px',
        fontFamily: mono ? 'monospace' : 'inherit',
      }}
    >
      {children}
    </td>
  );
}

function DailyBars({ rows }: { rows: { _id: string; calls: number; costInr: number }[] }) {
  const maxCost = Math.max(...rows.map((r) => r.costInr), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map((r) => {
        const pct = (r.costInr / maxCost) * 100;
        return (
          <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: '0 0 95px', fontSize: 11, color: '#6a6563', fontFamily: 'monospace' }}>{r._id}</div>
            <div style={{ flex: 1, height: 16, background: '#faf7f2', borderRadius: 4, position: 'relative' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: '#8b2f7a',
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ flex: '0 0 80px', textAlign: 'right', fontSize: 11.5, fontWeight: 500 }}>
              {fmtInr(r.costInr)}
            </div>
            <div style={{ flex: '0 0 55px', textAlign: 'right', fontSize: 11, color: '#6a6563' }}>
              {r.calls}
            </div>
          </div>
        );
      })}
    </div>
  );
}
