'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import RentalOfferTile from './artifacts/RentalOfferTile';
import ProjectComparisonTile from './artifacts/ProjectComparisonTile';
import LeadGate from './LeadGate';
import { AskContext, useAsk } from './AskContext';
import { track } from '@/lib/analytics/tracker';
import { useTrackView } from '@/lib/analytics/useTrackView';

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
  preferredChannel?: 'whatsapp' | 'call';
}

function renderArtifact(m: Message) {
  switch (m.artifact) {
    case 'price':
      return <PriceTile />;
    case 'yield':
      return <YieldTile />;
    case 'rental_offer':
      return <RentalOfferTile />;
    case 'amenity':
      return <AmenityTile />;
    case 'trends':
      return <TrendsTile />;
    case 'why_fd':
      return <WhyFdTile />;
    case 'project_comparison':
      return <ProjectComparisonTile />;
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
      return (
        <ShareRequestTile
          subject={m.shareSubject}
          originalQuery={m.originalQuery}
          preferredChannel={m.preferredChannel}
        />
      );
    default:
      return null;
  }
}

const DEFAULT_CHIPS: { label: string; query: string }[] = [
  { label: 'Rental offer', query: 'Tell me about the rental offer' },
  { label: 'Price trend', query: 'How has FD price trend moved?' },
  { label: 'Compare projects', query: 'Compare ASBL Loft with other FD projects' },
  { label: 'Floor plans', query: 'Tell me about the floor plans' },
  { label: 'Pricing', query: 'What is the pricing for ASBL Loft?' },
  { label: 'Amenities', query: 'What amenities does ASBL Loft offer?' },
  { label: 'Location', query: 'Where is ASBL Loft and what is nearby?' },
  { label: 'Book a site visit', query: 'Book a weekend site visit' },
];

export default function ChatView() {
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const campaign = campaignFromParams(new URLSearchParams(params?.toString() ?? ''));
  const setCampaign = useChatStore((s) => s.setCampaign);

  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const initRef = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCampaign(campaign.key);
    track('view', 'chat_view', { campaign: campaign.key, initialQuery: initialQ || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [messages, typing]);

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    track('submit', 'message_send', { query: text, campaign: campaign.key });
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);

    await new Promise((r) => setTimeout(r, 400));

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
        body: JSON.stringify({ query: text, seenArtifacts, pinnedUnits, campaign: campaign.key }),
      });
      result = res.ok ? ((await res.json()) as RouterResult) : routeQuery(text);
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
      preferredChannel: result.preferredChannel,
    };
    setMessages((m) => [...m, botMsg]);
    track('view', 'bot_response', {
      query: text,
      artifact: result.artifact,
      label: result.artifactLabel,
    });
  };

  const autoGrow = () => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 110) + 'px';
  };

  return (
    <AskContext.Provider value={submit}>
      {/* ─── Header ─── */}
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
          borderBottom: '1px solid var(--border)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.75rem',
        }}
      >
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.webp" alt="ASBL Loft" style={{ height: 44, display: 'block' }} />
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/"
            className="btn-outline"
            onClick={() => track('click', 'header_new_chat', { from: 'chat' })}
          >
            New Chat
          </Link>
          <button
            onClick={() => {
              track('click', 'header_book_site_visit', { from: 'chat' });
              submit('Book a site visit');
            }}
            className="btn-plum"
          >
            Book Site Visit
          </button>
        </div>
      </header>

      {/* ─── Messages ─── */}
      <div
        style={{
          paddingTop: 88,
          paddingBottom: 140,
          minHeight: '100vh',
          background: 'var(--cream)',
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: '0 auto',
            padding: '0 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {messages.map((m) =>
            m.role === 'user' ? <UserBubble key={m.id} text={m.text} /> : <BotMessage key={m.id} m={m} />,
          )}
          {typing && <TypingCard />}
        </div>
      </div>

      {/* ─── Bottom input bar ─── */}
      <div
        className="asbl-bottom-bar"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0.7rem 1rem 0.85rem',
          background: 'rgba(250, 247, 242, 0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border)',
          zIndex: 300,
        }}
      >
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div
            style={{
              background: '#fff',
              border: '1.5px solid var(--border)',
              borderRadius: 16,
              padding: '10px 16px',
              transition: 'border-color 180ms ease, box-shadow 180ms ease',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--plum-border)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(139,47,122,0.07)';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
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
              placeholder="Ask anything about ASBL Loft…"
              style={{
                width: '100%',
                fontSize: 14,
                fontWeight: 300,
                resize: 'none',
                minHeight: 46,
                maxHeight: 110,
                lineHeight: 1.55,
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--light-gray)' }}>ASBL Loft Assistant</span>
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
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: composerValue.trim() && !typing ? 'var(--plum)' : 'var(--light-gray)',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 180ms ease',
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AskContext.Provider>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="animate-msg-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          background: 'var(--plum)',
          color: '#fff',
          fontSize: 13.5,
          lineHeight: 1.6,
          padding: '10px 16px',
          borderRadius: '16px 16px 4px 16px',
          maxWidth: '68%',
          fontWeight: 400,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function BotMessage({ m }: { m: Message }) {
  const ref = useTrackView(
    `tile:${m.artifact ?? 'none'}`,
    { artifact: m.artifact, label: m.artifactLabel, unitId: m.unitId },
  );
  return (
    <div
      ref={ref}
      className="animate-msg-in"
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#fff',
          border: '1px solid var(--border)',
          padding: 2,
          marginTop: 3,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logo.webp"
          alt="ASBL Loft"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--mid-gray)',
            marginBottom: 5,
            fontWeight: 500,
          }}
        >
          ASBL Loft Assistant
        </div>

        {/* Text bubble — rendered above the artifact tile */}
        {m.text && (
          <div
            className="animate-artifact-in"
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '12px 18px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              fontSize: 13.5,
              lineHeight: 1.7,
              color: 'var(--gray-2)',
              marginBottom: m.artifact && m.artifact !== 'none' ? 12 : 0,
            }}
            dangerouslySetInnerHTML={{ __html: m.text }}
          />
        )}

        {m.artifact && m.artifact !== 'none' && (
          <div className="animate-artifact-in">
            {requiresLead(m.artifact) ? (
              <LeadGate reason={m.artifactLabel ?? 'Unlock detail'} preview={renderArtifact(m)}>
                {renderArtifact(m)}
              </LeadGate>
            ) : (
              renderArtifact(m)
            )}
          </div>
        )}

        {m.artifact === 'none' && <DefaultChips />}
      </div>
    </div>
  );
}

function DefaultChips() {
  const ask = useAsk();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
      {DEFAULT_CHIPS.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => {
            track('click', 'default_chip_click', { label: c.label, query: c.query });
            ask(c.query);
          }}
          className="chip-followup"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function TypingCard() {
  return (
    <div className="animate-msg-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#fff',
          border: '1px solid var(--border)',
          padding: 2,
          marginTop: 3,
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logo.webp"
          alt="ASBL Loft"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--mid-gray)',
            marginBottom: 5,
            fontWeight: 500,
          }}
        >
          ASBL Loft Assistant
        </div>
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '14px 18px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            display: 'inline-flex',
            gap: 5,
          }}
        >
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}
