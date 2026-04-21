'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { routeQuery, RouterResult, ArtifactKind } from '@/lib/utils/queryRouter';
import { requiresLead } from '@/lib/utils/intent';
import { campaignFromParams } from '@/lib/utils/campaigns';
import { useChatStore } from '@/lib/store/chatStore';
import PriceTile from './artifacts/PriceTile';
import YieldTile from './artifacts/YieldTile';
import AmenityTile from './artifacts/AmenityTile';
import TrendsTile from './artifacts/TrendsTile';
import WhyFdTile from './artifacts/WhyFdTile';
import CommuteTile from './artifacts/CommuteTile';
import UnitDetailTile from './artifacts/UnitDetailTile';
import UnitPlansTile from './artifacts/UnitPlansTile';
import MasterPlanTile from './artifacts/MasterPlanTile';
import UrbanCorridorsTile from './artifacts/UrbanCorridorsTile';
import FinanceTile from './artifacts/FinanceTile';
import AffordabilityTile from './artifacts/AffordabilityTile';
import PlansTile from './artifacts/PlansTile';
import SchoolsTile from './artifacts/SchoolsTile';
import VisitTile from './artifacts/VisitTile';
import ShareRequestTile from './artifacts/ShareRequestTile';
import LeadGate from './LeadGate';
import { AskContext } from './AskContext';

type MessageRole = 'user' | 'bot';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  artifact?: ArtifactKind;
  artifactLabel?: string;
  unitId?: string;
  salaryLakh?: number;
  existingEmi?: number;
  visitIntro?: 'default' | 'no_model_flat' | 'live_inventory';
  shareSubject?: string;
  originalQuery?: string;
}

function renderArtifact(
  m: Pick<
    Message,
    'artifact' | 'unitId' | 'salaryLakh' | 'existingEmi' | 'visitIntro' | 'shareSubject' | 'originalQuery'
  >
) {
  const kind = m.artifact;
  switch (kind) {
    case 'price':
      return <PriceTile />;
    case 'yield':
      return <YieldTile />;
    case 'amenity':
      return <AmenityTile />;
    case 'trends':
      return <TrendsTile />;
    case 'why_fd':
      return <WhyFdTile />;
    case 'commute':
      return <CommuteTile />;
    case 'unit_plans':
      return <UnitPlansTile />;
    case 'master_plan':
      return <MasterPlanTile />;
    case 'urban_corridors':
      return <UrbanCorridorsTile />;
    case 'unit_detail':
      return m.unitId ? <UnitDetailTile unitId={m.unitId} /> : null;
    case 'finance':
      return <FinanceTile />;
    case 'affordability':
      return <AffordabilityTile initialSalary={m.salaryLakh} initialExistingEmi={m.existingEmi} />;
    case 'plans':
      return <PlansTile />;
    case 'schools':
      return <SchoolsTile />;
    case 'visit':
      return <VisitTile intro={m.visitIntro ?? 'default'} />;
    case 'share_request':
      return <ShareRequestTile subject={m.shareSubject} originalQuery={m.originalQuery} />;
    default:
      return null;
  }
}

const DEFAULT_CHIPS: { label: string; query: string }[] = [
  { label: 'Unit floor plans', query: 'Show me the 3BHK unit floor plans and dimensions' },
  { label: 'Master plan', query: 'Show me the master plan and site landscape' },
  { label: 'Urban corridors', query: 'Show me the urban corridors and location map' },
  { label: 'Model flat', query: 'Can I see the model flat?' },
  { label: 'Live inventory', query: 'What live inventory do you have?' },
  { label: 'Price breakdown', query: 'Show full price breakdown 1695 East' },
  { label: 'Am I eligible?', query: 'Check affordability · salary 30L' },
  { label: 'Cash-on-cash', query: 'Open the levered finance calculator' },
  { label: 'Schools nearby', query: 'What schools are within 12 minutes?' },
];

const ARTIFACT_LABELS: Partial<Record<ArtifactKind, string>> = {
  unit_plans: 'Unit plans',
  master_plan: 'Master plan',
  urban_corridors: 'Urban corridors',
  price: 'Price breakdown',
  yield: 'Rental yield',
  amenity: 'Amenities',
  trends: 'Price trends',
  why_fd: 'Why FD',
  commute: 'Commute',
  finance: 'Cash-on-cash',
  affordability: 'Affordability',
  plans: 'Payment plan',
  schools: 'Schools',
  visit: 'Visit slots',
  unit_detail: 'Unit dossier',
};

export default function ChatView() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const campaign = campaignFromParams(new URLSearchParams(params?.toString() ?? ''));
  const setCampaign = useChatStore((s) => s.setCampaign);

  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const initRef = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCampaign(campaign.key);
  }, [campaign.key, setCampaign]);

  useEffect(() => {
    if (initRef.current) return;
    if (!initialQ.trim()) return;
    initRef.current = true;
    submit(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = window.setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [messages, typing]);

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);

    await new Promise((r) => setTimeout(r, 750));

    // Collect session context so LLM comparisons / suggestions are personalised
    const seenArtifacts = Array.from(
      new Set(
        messages
          .filter((m) => m.role === 'bot' && m.artifact && m.artifact !== 'none')
          .map((m) => m.artifact as string)
          .reverse()
      )
    ).slice(0, 8);
    const pinnedUnits = useChatStore.getState().pinnedUnitIds;

    let result: RouterResult;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          seenArtifacts,
          pinnedUnits,
          campaign: campaign.key,
        }),
      });
      if (res.ok) {
        result = (await res.json()) as RouterResult;
      } else {
        result = routeQuery(text);
      }
    } catch {
      result = routeQuery(text);
    }

    setTyping(false);
    const botMsg: Message = {
      id: `b-${Date.now()}`,
      role: 'bot',
      text: result.text,
      artifact: result.artifact,
      artifactLabel: result.artifactLabel,
      unitId: result.unitId,
      salaryLakh: result.salaryLakh,
      existingEmi: result.existingEmi,
      visitIntro: result.visitIntro,
      shareSubject: result.shareSubject,
      originalQuery: result.originalQuery,
    };
    setMessages((m) => [...m, botMsg]);
  };

  const autoGrow = () => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  // Last 4 distinct artifacts the user has seen, newest-first, excluding the very last one
  // (so the strip suggests "re-open previous", not the one already on screen).
  const recentArtifacts = (() => {
    const seen = new Set<string>();
    const out: { label: string; query: string }[] = [];
    const botMsgs = messages.filter((m) => m.role === 'bot' && m.artifact && m.artifact !== 'none');
    for (let i = botMsgs.length - 2; i >= 0 && out.length < 4; i--) {
      const msg = botMsgs[i];
      const kind = msg.artifact as ArtifactKind;
      if (!kind || seen.has(kind)) continue;
      seen.add(kind);
      const label = ARTIFACT_LABELS[kind] ?? kind;
      // Find the user query that triggered it — the user message immediately before this bot msg
      const idx = messages.indexOf(msg);
      const userBefore = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
      out.push({
        label: msg.unitId ? `${label} · ${msg.unitId}` : label,
        query: userBefore?.text ?? label,
      });
    }
    return out;
  })();

  return (
    <AskContext.Provider value={submit}>
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header
        style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--hairline)',
          position: 'sticky',
          top: 0,
          background: 'rgba(246, 241, 232, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span
            style={{
              width: 8,
              height: 8,
              background: 'var(--sage)',
              borderRadius: '50%',
              boxShadow: '0 0 0 4px rgba(90,107,79,0.15)',
            }}
          />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.asblloft-hyderabad.com/images/logo.png"
              alt="ASBL Loft"
              style={{ height: 26, width: 'auto', objectFit: 'contain' }}
            />
            <span style={{ color: 'var(--mute)' }}>· {campaign.shortLabel}</span>
          </span>
        </div>
        <Link
          href="/"
          style={{
            fontSize: 12,
            color: 'var(--mute)',
            padding: '6px 10px',
            borderRadius: 6,
          }}
          className="hover:text-[var(--ink)] hover:bg-[var(--paper-2)]"
        >
          ↺ Start over
        </Link>
      </header>

      {/* Messages */}
      <div
        ref={scrollerRef}
        style={{
          flex: 1,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            maxWidth: 820,
            width: '100%',
            margin: '0 auto',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          {messages.map((m) => (
            <div key={m.id} className="animate-msg-in">
              <div
                style={{
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--mute)',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: m.role === 'user' ? 'var(--ink)' : 'var(--sienna)',
                  }}
                />
                {m.role === 'user' ? 'You' : 'Loft assistant'}
              </div>
              {m.role === 'user' ? (
                <div
                  className="display"
                  style={{
                    fontSize: 24,
                    fontWeight: 400,
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                    color: 'var(--ink)',
                    padding: '8px 0',
                  }}
                >
                  {m.text}
                </div>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 15.5,
                      lineHeight: 1.6,
                      color: 'var(--ink-2)',
                    }}
                    dangerouslySetInnerHTML={{ __html: m.text }}
                  />
                  {m.artifact && m.artifact !== 'none' && (
                    <div className="animate-artifact-in" style={{ marginTop: 18 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.15em',
                          color: 'var(--mute)',
                          marginBottom: 10,
                        }}
                      >
                        <span>{m.artifactLabel ?? 'Generated interface'}</span>
                        <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
                      </div>
                      {requiresLead(m.artifact) ? (
                        <LeadGate
                          reason={m.artifactLabel ?? 'Unlock detail'}
                          preview={renderArtifact(m)}
                        >
                          {renderArtifact(m)}
                        </LeadGate>
                      ) : (
                        renderArtifact(m)
                      )}
                    </div>
                  )}
                  {m.artifact === 'none' && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 14,
                      }}
                    >
                      {DEFAULT_CHIPS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => submit(c.query)}
                          style={{
                            padding: '7px 14px',
                            fontSize: 12.5,
                            borderRadius: 100,
                            background: 'white',
                            border: '1px solid var(--hairline)',
                            color: 'var(--ink-2)',
                            fontWeight: 500,
                            transition: 'all 160ms',
                          }}
                          className="hover:border-[var(--ink)] hover:text-[var(--ink)]"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {typing && (
            <div className="animate-msg-in">
              <div
                style={{
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--mute)',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sienna)' }} />
                Loft assistant
              </div>
              <div style={{ display: 'flex', gap: 5, padding: '12px 0' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer (fixed bottom) */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '10px 24px 20px',
          background: 'linear-gradient(to bottom, transparent, var(--paper) 20px)',
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {/* Recent-artifacts recall strip */}
          {recentArtifacts.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 10,
                paddingLeft: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--mute)',
                  fontWeight: 600,
                  marginRight: 4,
                }}
              >
                Jump back
              </span>
              {recentArtifacts.map((r) => (
                <button
                  key={r.query}
                  type="button"
                  onClick={() => submit(r.query)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 100,
                    background: 'white',
                    border: '1px solid var(--hairline)',
                    fontSize: 11.5,
                    color: 'var(--ink-2)',
                    fontWeight: 500,
                  }}
                  className="hover:border-[var(--sienna)] hover:text-[var(--sienna-dark)]"
                >
                  ↻ {r.label}
                </button>
              ))}
            </div>
          )}
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
            }}
          >
            <textarea
              ref={composerRef}
              rows={1}
              value={composerValue}
              onChange={(e) => {
                setComposerValue(e.target.value);
                autoGrow();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (composerValue.trim() && !typing) {
                    submit(composerValue);
                    setComposerValue('');
                    autoGrow();
                  }
                }
              }}
              placeholder="Ask a follow-up…"
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
              onClick={() => {
                if (composerValue.trim() && !typing) {
                  submit(composerValue);
                  setComposerValue('');
                  autoGrow();
                }
              }}
              disabled={!composerValue.trim() || typing}
              aria-label="Send"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: composerValue.trim() && !typing ? 'var(--ink)' : 'var(--paper-3)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: composerValue.trim() && !typing ? 'pointer' : 'not-allowed',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    </AskContext.Provider>
  );
}
