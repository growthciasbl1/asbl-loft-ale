'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import CommuteFromYouTile from './artifacts/CommuteFromYouTile';
import UnitDetailTile from './artifacts/UnitDetailTile';
import UnitPlansTile from './artifacts/UnitPlansTile';
import MasterPlanTile from './artifacts/MasterPlanTile';
import UrbanCorridorsTile from './artifacts/UrbanCorridorsTile';
import AffordabilityTile from './artifacts/AffordabilityTile';
import PlansTile from './artifacts/PlansTile';
import SchoolsTile from './artifacts/SchoolsTile';
import VisitTile from './artifacts/VisitTile';
import ShareRequestTile from './artifacts/ShareRequestTile';
import RentalOfferTile from './artifacts/RentalOfferTile';
import ProjectComparisonTile from './artifacts/ProjectComparisonTile';
import ResaleFrameworkTile from './artifacts/ResaleFrameworkTile';
import RoiCalculatorTile from './artifacts/RoiCalculatorTile';
import LeadGate from './LeadGate';
import { AskContext, useAsk } from './AskContext';
import { SeenArtifactsContext } from './SeenArtifactsContext';
import { useSpeechRecognition } from '@/lib/voice/useSpeechRecognition';
import { useSpeechSynthesis } from '@/lib/voice/useSpeechSynthesis';
import { track } from '@/lib/analytics/tracker';
import { useTrackView } from '@/lib/analytics/useTrackView';
import { getOrCreateVisitorId } from '@/lib/analytics/visitorId';

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
  initialBookingType?: 'site_visit' | 'call_back';
  focus?: 'schools' | 'hospitals';
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
    case 'commute_from_you':
      return <CommuteFromYouTile />;
    case 'unit_plans':
      return <UnitPlansTile />;
    case 'master_plan':
      return <MasterPlanTile />;
    case 'urban_corridors':
      return <UrbanCorridorsTile />;
    case 'unit_detail':
      return m.unitId ? <UnitDetailTile unitId={m.unitId} /> : null;
    case 'affordability':
      return <AffordabilityTile initialSalary={m.salaryLakh} initialExistingEmi={m.existingEmi} />;
    case 'plans':
      return <PlansTile />;
    case 'schools':
      return <SchoolsTile focus={m.focus} />;
    case 'visit':
      return (
        <VisitTile
          intro={m.visitIntro ?? 'default'}
          initialBookingType={m.initialBookingType}
        />
      );
    case 'share_request':
      return (
        <ShareRequestTile
          subject={m.shareSubject}
          originalQuery={m.originalQuery}
          preferredChannel={m.preferredChannel}
        />
      );
    case 'resale_framework':
      return <ResaleFrameworkTile />;
    case 'roi_calculator':
      return <RoiCalculatorTile />;
    default:
      return null;
  }
}

const DEFAULT_CHIPS: { label: string; query: string }[] = [
  { label: 'Rental offer', query: 'Tell me about the rental offer' },
  { label: 'Price trend', query: 'How has FD price trend moved?' },
  { label: 'Compare projects', query: 'Compare ASBL Loft with other FD projects' },
  { label: 'Unit plans', query: 'Tell me about the unit plans' },
  { label: 'Pricing', query: 'What is the pricing for ASBL Loft?' },
  { label: 'Amenities', query: 'What amenities does ASBL Loft offer?' },
  { label: 'Location', query: 'Where is ASBL Loft and what is nearby?' },
  { label: 'Book a site visit', query: 'Book a site visit' },
];

export default function ChatView() {
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const campaign = campaignFromParams(new URLSearchParams(params?.toString() ?? ''));
  const setCampaign = useChatStore((s) => s.setCampaign);

  const [messages, setMessages] = useState<Message[]>([]);
  // Counter instead of boolean — lets multiple questions be in-flight at once
  // (queued rather than blocking). typing-indicator shows whenever any
  // request is pending.
  const [pendingCount, setPendingCount] = useState(0);
  const typing = pendingCount > 0;
  const [composerValue, setComposerValue] = useState('');

  // Voice: mic button next to send. Web Speech API — works on Chrome, Edge,
  // Safari. onFinal fires when the browser detects end-of-utterance.
  const mic = useSpeechRecognition({
    lang: 'en-IN',
    onFinal: (text) => {
      setComposerValue((prev) => (prev ? `${prev} ${text}`.trim() : text));
      track('submit', 'voice_input_final', { chars: text.length });
    },
  });
  const initRef = useRef(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCampaign(campaign.key);
    track('view', 'chat_view', { campaign: campaign.key, initialQuery: initialQ || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.key, setCampaign]);

  // Resolve visitor identity on chat load — if returning and verified, auto-fill the lead
  // so LeadGate never prompts again. Also bumps lastSeenAt + visitCount.
  const setLead = useChatStore((s) => s.setLead);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const visitorId = getOrCreateVisitorId();
    const urlParams = new URLSearchParams(params?.toString() ?? '');
    fetch('/api/visitor/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        utm: {
          source: urlParams.get('utm_source'),
          campaign: urlParams.get('utm_campaign'),
          medium: urlParams.get('utm_medium'),
        },
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.verified && data.lead?.phoneE164 && data.lead?.name) {
          setLead({
            name: data.lead.name,
            phone: data.lead.phoneE164,
            email: data.lead.email ?? undefined,
            source: 'returning-user',
          });
          track('view', 'returning_user_auto_unlocked', {
            visitCount: data.visitCount,
            globalId: data.lead.globalId,
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-trigger on landing based on URL signals:
  //   1. Explicit `q` param (overrides everything) — submit it
  //   2. utm_campaign contains rental-related keyword → pre-fill composer
  //      with "Learn more about rental offer" so the user sees a ready
  //      prompt aligned with why they clicked the ad
  useEffect(() => {
    if (initRef.current) return;
    if (initialQ.trim()) {
      initRef.current = true;
      submit(initialQ);
      return;
    }
    // Rental-campaign detection
    const utmCampaign = (params.get('utm_campaign') ?? '').toLowerCase();
    const rentalKeywords = /(rental|rent[-_]?offer|85k|guaranteed[-_]?rent|yield|roi|income)/i;
    if (utmCampaign && rentalKeywords.test(utmCampaign)) {
      initRef.current = true;
      track('view', 'rental_campaign_landing', { utm_campaign: utmCampaign });
      // Pre-fill the composer with a natural prompt — user just hits Send
      // (or we could auto-submit; prefilling is less aggressive and gives
      // agency).
      setComposerValue('Learn more about rental offer');
      // Focus the composer so Enter sends immediately.
      setTimeout(() => {
        composerRef.current?.focus();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  // Auto-scroll only when a new message actually lands. Previously this
  // ran on BOTH `messages` and `typing` changes, so every Q&A cycle fired
  // 4 scrollTo calls (user msg → typing on → bot msg → typing off). Each
  // call crosses GA4's 90% scroll-depth threshold and emits a `scroll`
  // event to GTM — that was the root cause of the "scroll firing 4 times
  // per message" issue Kshitij flagged. Keying on messages.length skips
  // the typing-indicator toggles.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = window.setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [messages.length]);

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    track('submit', 'message_send', { query: text, campaign: campaign.key });
    const userMsg: Message = { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setPendingCount((c) => c + 1);

    const seenArtifacts = Array.from(
      new Set(
        messages
          .filter((m) => m.role === 'bot' && m.artifact && m.artifact !== 'none')
          .map((m) => m.artifact as string)
          .reverse()
      )
    ).slice(0, 8);
    const pinnedUnits = useChatStore.getState().pinnedUnitIds;

    // Build conversation history (user + bot pairs) for LLM context
    const history = messages.map((m) => ({ role: m.role, text: m.text }));

    const existingConvId = useChatStore.getState().conversationId;

    // Reserve a bot message id up-front. We'll mutate this message's text
    // as stream chunks arrive so the user sees text flowing in real time,
    // then attach the artifact metadata when the 'final' SSE event fires.
    const botMsgId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    let finalResult: (RouterResult & { conversationId?: string }) | null = null;
    let streamedText = '';
    let streamStarted = false;

    /**
     * Render streamed text. Gemini outputs <p>-wrapped HTML per system
     * prompt, so we use it directly. If a chunk lands mid-tag (e.g.
     * "<p>Two " then "3BHK..."), the browser's innerHTML handles partial
     * tags gracefully — unclosed tags auto-close at the element boundary.
     * We also strip the <signal>{...}</signal> tail the bot emits at the
     * end; that's internal sales-telemetry, not user-facing prose.
     */
    const applyText = (chunk: string) => {
      streamedText += chunk;
      // Hide the signal block the moment it starts streaming, not after
      // it fully lands. The bot writes `<signal>` literally before the
      // JSON — we trim from that marker onward.
      const sigIdx = streamedText.indexOf('<signal>');
      const display = sigIdx >= 0 ? streamedText.slice(0, sigIdx) : streamedText;
      setMessages((prev) => {
        if (!streamStarted) {
          streamStarted = true;
          setPendingCount((c) => Math.max(0, c - 1));
          return [
            ...prev,
            { id: botMsgId, role: 'bot' as const, text: display },
          ];
        }
        return prev.map((m) => (m.id === botMsgId ? { ...m, text: display } : m));
      });
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          seenArtifacts,
          pinnedUnits,
          campaign: campaign.key,
          history,
          conversationId: existingConvId,
        }),
      });

      const contentType = res.headers.get('content-type') ?? '';

      if (!res.ok) {
        // Non-OK response — fall back to regex route.
        finalResult = routeQuery(text);
      } else if (contentType.includes('text/event-stream') && res.body) {
        // STREAMING path — read SSE frames.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE frames are separated by double newline. Parse any complete
          // frames in the buffer; leave trailing partial frame for the
          // next iteration.
          let idx: number;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const lines = frame.split('\n');
            let evName = 'message';
            let dataRaw = '';
            for (const line of lines) {
              if (line.startsWith('event:')) evName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataRaw += line.slice(5).trim();
            }
            if (!dataRaw) continue;
            try {
              const parsed = JSON.parse(dataRaw);
              if (evName === 'text') {
                applyText(String(parsed.chunk ?? ''));
              } else if (evName === 'final') {
                finalResult = parsed as RouterResult & { conversationId?: string };
              } else if (evName === 'meta') {
                if (parsed.conversationId) {
                  useChatStore.getState().setConversationId(parsed.conversationId);
                }
              } else if (evName === 'error') {
                // Stream errored mid-flight — keep whatever text we have,
                // regex-route for the artifact.
                finalResult = routeQuery(text);
              }
            } catch {
              // Ignore malformed frame (shouldn't happen)
            }
          }
        }
      } else {
        // Non-stream JSON response (e.g. regex-only path) — parse normally.
        finalResult = (await res.json()) as RouterResult & { conversationId?: string };
      }
    } catch {
      finalResult = routeQuery(text);
    }

    // Guarantee a final result even if everything failed.
    if (!finalResult) finalResult = routeQuery(text);

    if (finalResult.conversationId && finalResult.conversationId !== existingConvId) {
      useChatStore.getState().setConversationId(finalResult.conversationId);
    }

    // Commit the final message — use the server's text if we got one
    // (it's already wrapped in <p>), otherwise keep our streamed HTML.
    setPendingCount((c) => (streamStarted ? c : Math.max(0, c - 1)));
    setMessages((prev) => {
      const finalText = finalResult!.text || streamedText;
      const botMsg: Message = {
        id: botMsgId,
        role: 'bot',
        text: finalText,
        artifact: finalResult!.artifact,
        artifactLabel: finalResult!.artifactLabel,
        unitId: finalResult!.unitId,
        salaryLakh: finalResult!.salaryLakh,
        existingEmi: finalResult!.existingEmi,
        visitIntro: finalResult!.visitIntro,
        shareSubject: finalResult!.shareSubject,
        originalQuery: finalResult!.originalQuery,
        preferredChannel: finalResult!.preferredChannel,
        initialBookingType: finalResult!.initialBookingType,
        focus: finalResult!.focus,
      };
      return streamStarted
        ? prev.map((m) => (m.id === botMsgId ? botMsg : m))
        : [...prev, botMsg];
    });
    track('view', 'bot_response', {
      query: text,
      artifact: finalResult.artifact,
      label: finalResult.artifactLabel,
    });
  };

  const autoGrow = () => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 110) + 'px';
  };

  const seenArtifacts = useMemo(() => {
    const set = new Set<ArtifactKind>();
    for (const m of messages) {
      if (m.artifact && m.artifact !== 'none') set.add(m.artifact);
    }
    return set;
  }, [messages]);

  return (
    <AskContext.Provider value={submit}>
      <SeenArtifactsContext.Provider value={seenArtifacts}>
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
        <Link href="/" onClick={() => track('click', 'header_logo_click', { from: 'chat' })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.webp"
            alt="ASBL Loft"
            style={{ height: 'clamp(32px, 9vw, 44px)', display: 'block' }}
          />
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/"
            className="btn-outline chat-header-new"
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
              id="chat-composer"
              name="composer"
              rows={1}
              value={composerValue}
              onChange={(e) => {
                setComposerValue(e.target.value);
                autoGrow();
              }}
              onFocus={() => track('focus', 'chat_composer_focus')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (composerValue.trim()) {
                    // Queue path — even if a prior reply is still streaming,
                    // the new question fires in parallel. Send button +
                    // Enter key behave identically now.
                    submit(composerValue);
                    setComposerValue('');
                    autoGrow();
                  }
                }
              }}
              placeholder="Ask anything about ASBL Loft…"
              style={{
                width: '100%',
                // 16px min on phones prevents iOS auto-zoom on focus.
                fontSize: 16,
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
              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {mic.supported && (
                <button
                  type="button"
                  onClick={() => {
                    if (mic.listening) {
                      mic.stop();
                      track('click', 'voice_input_stop');
                    } else {
                      mic.start();
                      track('click', 'voice_input_start');
                    }
                  }}
                  aria-label={mic.listening ? 'Stop voice input' : 'Start voice input'}
                  title={mic.listening ? 'Listening… tap to stop' : 'Ask by voice'}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    border: '1px solid var(--border)',
                    background: mic.listening ? '#ffe9e3' : '#fff',
                    color: mic.listening ? '#b42318' : 'var(--charcoal)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 180ms ease',
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={9} y={2} width={6} height={12} rx={3} />
                    <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3M8 21h8" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => {
                  if (composerValue.trim()) {
                    submit(composerValue);
                    setComposerValue('');
                    autoGrow();
                  }
                }}
                disabled={!composerValue.trim()}
                aria-label="Send"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: composerValue.trim() ? 'var(--plum)' : 'var(--light-gray)',
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
      </div>
      </SeenArtifactsContext.Provider>
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
  const tts = useSpeechSynthesis({ lang: 'en-IN' });
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
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>ASBL Loft Assistant</span>
          {tts.supported && m.text && (
            <button
              type="button"
              onClick={() => {
                if (tts.speaking) {
                  tts.stop();
                  track('click', 'voice_aloud_stop');
                } else {
                  tts.speak(m.text);
                  track('click', 'voice_aloud_start', { artifact: m.artifact });
                }
              }}
              aria-label={tts.speaking ? 'Stop reading aloud' : 'Read aloud'}
              title={tts.speaking ? 'Stop reading' : 'Read aloud'}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: tts.speaking ? 'var(--plum)' : 'var(--mid-gray)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                {tts.speaking && <path d="M15 9a5 5 0 0 1 0 6M19 5a10 10 0 0 1 0 14" />}
              </svg>
            </button>
          )}
        </div>

        {/* Unified bot message — text answer + artifact tile as ONE card with a divider */}
        {(m.text || (m.artifact && m.artifact !== 'none')) && (
          <div className="asbl-unified-msg animate-artifact-in">
            {m.text && (
              <div
                className="asbl-unified-msg-text"
                dangerouslySetInnerHTML={{ __html: m.text }}
              />
            )}
            {m.artifact && m.artifact !== 'none' && (
              <div className="asbl-unified-msg-tile">
                {requiresLead(m.artifact) ? (
                  <LeadGate reason={m.artifactLabel ?? 'Unlock detail'} preview={renderArtifact(m)}>
                    {renderArtifact(m)}
                  </LeadGate>
                ) : (
                  renderArtifact(m)
                )}
              </div>
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
