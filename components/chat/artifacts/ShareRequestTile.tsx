'use client';

import { useEffect, useState } from 'react';
import { TileShell, TileIcon } from './common';
import { useChatStore } from '@/lib/store/chatStore';
import ChannelToggle, { Channel } from '../ChannelToggle';
import { track, sessionId } from '@/lib/analytics/tracker';
import { readWebTracker } from '@/lib/analytics/leadTracking';
import { getOrCreateVisitorId } from '@/lib/analytics/visitorId';
import { isValidIndiaPhone, phoneValidationHint } from '@/lib/utils/phone';

// Matches lib/wa/periskope.ts ANANDITA_E164 — the assigned RM for share flows.
const ANANDITA_SENDER = '917995284040';
const ANANDITA_NAME = 'Anandita';

interface Props {
  subject?: string;
  originalQuery?: string;
  preferredChannel?: Channel;
}

type Step = 'form' | 'otp' | 'done';

export default function ShareRequestTile({
  subject,
  originalQuery,
  preferredChannel = 'whatsapp',
}: Props) {
  const lead = useChatStore((s) => s.lead);
  const setLead = useChatStore((s) => s.setLead);

  const alreadyVerified = Boolean(lead?.phone && lead?.name);
  const [editingIdentity, setEditingIdentity] = useState(!alreadyVerified);

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState(lead?.name ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [channel, setChannel] = useState<Channel>(preferredChannel);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Stay in sync if another tile verifies the lead mid-session.
  useEffect(() => {
    if (lead?.phone && lead?.name && !editingIdentity) {
      setName(lead.name);
      setPhone(lead.phone);
    }
  }, [lead?.phone, lead?.name, editingIdentity]);

  const displaySubject = subject || 'the document you asked for';

  // Resend cooldown countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // Step 1: check if already verified in session → skip OTP and deliver
  // directly. Otherwise send a fresh OTP from Anandita's number.
  const phoneHint = phoneValidationHint(phone);
  const phoneValid = isValidIndiaPhone(phone);

  const sendOtp = async () => {
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Name and phone are both required.');
      return;
    }
    // Phone-format gate intentionally disabled — was blocking real users
    // with a 400 in production. Server-side normalisePhone is lenient.
    setBusy(true);
    setErrorMsg(null);

    // First check server-side: is this phone already OTP-verified in the
    // last 10 min? If yes, skip OTP step entirely — user already proved
    // ownership on a prior tile in this session.
    try {
      const statusRes = await fetch('/api/otp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const statusJson = await statusRes.json();
      if (statusJson?.verified) {
        track('view', 'share_otp_skipped_recently_verified', { subject: displaySubject });
        setStep('done');
        setLead({ name: name.trim(), phone: phone.trim(), source: 'share_request' });
        deliverAndSaveLead();
        setBusy(false);
        return;
      }
    } catch {
      // network hiccup — just proceed with OTP send
    }

    // Optimistic UI — switch to OTP panel immediately
    setStep('otp');
    setCode('');
    setInfoMsg(`Sending OTP to ${phone}. Please check your WhatsApp.`);
    setResendIn(30);

    track('submit', 'share_otp_send_click', {
      subject: displaySubject,
      channel,
      originalQuery,
    });

    try {
      const visitorId = getOrCreateVisitorId();
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          reason: `share_request: ${displaySubject}`,
          form: 'share_request_tile',
          artifactKind: 'share_request',
          visitorId,
          sessionId: sessionId(),
          // Pin to Anandita's number so she's the one thread the user has.
          senderE164: ANANDITA_SENDER,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.error === 'invalid phone') {
          setStep('form');
          setErrorMsg('That phone number doesn\u2019t look right.');
        } else {
          // WhatsApp leg may have delivered even though server reported
          // error (saveOtp flake etc.). Stay on OTP step so user can
          // enter the code they received; verify is source of truth.
          setErrorMsg(
            'Delivery hiccup \u2014 if the OTP arrived on WhatsApp, please enter it. Otherwise tap Resend.',
          );
        }
      } else {
        setInfoMsg(`OTP sent on WhatsApp to ${phone}. Code valid for 5 minutes.`);
      }
    } catch {
      setErrorMsg('Network hiccup \u2014 if the OTP arrived, please enter it. Otherwise tap Resend.');
    } finally {
      setBusy(false);
    }
  };

  // Extracted: the post-verification fulfilment (deliver docs + save lead).
  // Called either after OTP verify OR directly when skip path is taken.
  const deliverAndSaveLead = () => {
    const visitorId = getOrCreateVisitorId();

    // Deliver documents via Anandita (primary user-facing value)
    fetch('/api/share/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.trim(),
        name: name.trim(),
        subject: subject ?? originalQuery ?? null,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.assetCount) setSentCount(j.assetCount);
      })
      .catch(() => {});

    // Also save lead in Mongo/Zoho (non-blocking)
    fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        reason: `share_request: ${displaySubject}`,
        query: originalQuery,
        preferredChannel: channel,
        webTracker: readWebTracker(),
        otpVerified: true,
        visitorId,
      }),
    }).catch(() => {});
  };

  // Step 2: verify OTP → send documents via Anandita
  const verifyAndSend = async () => {
    const clean = code.replace(/\D/g, '').trim();
    if (clean.length !== 6) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const v = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: clean }),
      });
      const vJson = await v.json();
      if (!v.ok || !vJson.ok) {
        setErrorMsg(
          vJson.error === 'wrong_code'
            ? 'Wrong code. Please try again.'
            : vJson.error === 'expired'
              ? 'Code expired — please tap Resend.'
              : 'Verification failed. Please try again.',
        );
        return;
      }

      // OTP OK → deliver docs + save lead (fire-and-forget)
      setLead({ name: name.trim(), phone: phone.trim(), source: 'share_request' });
      setStep('done');
      track('view', 'lead_success', {
        form: 'share_request',
        subject: displaySubject,
        verified: true,
      });
      deliverAndSaveLead();
    } catch {
      setErrorMsg('Network error — please retry.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || busy) return;
    setCode('');
    setErrorMsg(null);
    await sendOtp();
  };

  return (
    <TileShell
      eyebrow={
        step === 'done' ? 'Sent · Anandita assigned' : step === 'otp' ? 'Step 2 · Verify' : 'Share · details'
      }
      title={
        step === 'done'
          ? `${ANANDITA_NAME} will follow up on WhatsApp.`
          : step === 'otp'
            ? `Verify your number`
            : 'Where should we send this?'
      }
      sub={
        step === 'done'
          ? `${sentCount > 0 ? `${sentCount} document${sentCount === 1 ? '' : 's'} sent` : 'Documents sent'} to ${phone}. ${ANANDITA_NAME} is your assigned RM — reply in that thread for any follow-up.`
          : step === 'otp'
            ? infoMsg ?? `6-digit OTP sent to ${phone}.`
            : `You asked for: ${displaySubject}. Drop name + phone, verify via OTP, and ${ANANDITA_NAME} will send it over.`
      }
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
          </svg>
        </TileIcon>
      }
      footer={
        step === 'done' ? (
          <>Your number stays with ASBL · never shared · opt-out anytime.</>
        ) : (
          <>Your number stays with ASBL · never shared · opt-out anytime.</>
        )
      }
      relatedAsks={
        step === 'done'
          ? [
              { label: 'Book a site visit', query: 'Book a site visit' },
              { label: 'Pricing', query: 'What is the pricing for ASBL Loft?' },
              { label: 'Unit plans', query: 'Tell me about the unit plans' },
            ]
          : step === 'form'
            ? [{ label: 'Someone should call me', query: 'Please have someone call me' }]
            : []
      }
    >
      {step === 'done' && (
        <div
          style={{
            padding: '22px 0 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--plum-pale)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div
            className="serif"
            style={{ fontSize: 22, color: 'var(--charcoal)', fontWeight: 500 }}
          >
            Delivered
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--mid-gray)', maxWidth: 420 }}>
            Check your WhatsApp — <b>{ANANDITA_NAME}</b> has sent over <b>{displaySubject}</b>. You can reply in the same thread with any follow-up questions.
          </div>
        </div>
      )}

      {step === 'form' && (
        <div
          style={{
            paddingTop: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {alreadyVerified && !editingIdentity ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid var(--plum-border, var(--border))',
                background: 'var(--plum-pale)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--charcoal)' }}>
                <div
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--plum-dark)',
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  Sending to · verified
                </div>
                <b>{lead?.name}</b>{' '}
                <span style={{ color: 'var(--mid-gray)' }}>· {lead?.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingIdentity(true);
                  track('click', 'share_change_identity');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--plum-dark)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Change details →
              </button>
            </div>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Your name</label>
                <input
                  type="text"
                  id="share-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => track('focus', 'share_name_focus', { subject: displaySubject })}
                  placeholder="Full name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Phone number</label>
                <input
                  type="tel"
                  id="share-phone"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => track('focus', 'share_phone_focus', { subject: displaySubject })}
                  placeholder="+91 98XXXXXXXX"
                  style={{
                    ...inputStyle,
                    borderColor: phoneHint ? '#b42318' : phoneValid ? '#15803d' : 'var(--border)',
                  }}
                />
                {phoneHint && (
                  <div style={{ fontSize: 11.5, color: '#b42318', marginTop: 6 }}>{phoneHint}</div>
                )}
              </div>
            </>
          )}

          <ChannelToggle value={channel} onChange={setChannel} />

          {errorMsg && <div style={errStyle}>{errorMsg}</div>}

          <button
            type="button"
            onClick={sendOtp}
            disabled={busy || !name.trim() || !phone.trim()}
            className="btn-plum"
            style={{ justifyContent: 'center', padding: '12px 20px', opacity: busy ? 0.6 : 1 }}
          >
            {busy
              ? alreadyVerified && !editingIdentity
                ? 'Sending…'
                : 'Sending OTP…'
              : alreadyVerified && !editingIdentity
                ? `Send on WhatsApp →`
                : `Verify & send on WhatsApp →`}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--gray-2)',
              background: 'var(--plum-pale)',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--plum-border)',
            }}
          >
            {infoMsg ?? `Enter the 6-digit code.`}
          </div>
          <input
            type="text"
            id="share-otp"
            name="otp"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            maxLength={6}
            autoFocus
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onFocus={() => track('focus', 'share_otp_focus', { subject: displaySubject })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6) verifyAndSend();
            }}
            style={{
              ...inputStyle,
              fontSize: 20,
              textAlign: 'center',
              letterSpacing: '0.5em',
              fontWeight: 600,
            }}
          />
          {errorMsg && <div style={errStyle}>{errorMsg}</div>}
          <button
            type="button"
            onClick={() => {
              track('submit', 'share_otp_verify_click', { subject: displaySubject });
              verifyAndSend();
            }}
            disabled={busy || code.length !== 6}
            className="btn-plum"
            style={{
              justifyContent: 'center',
              padding: '12px 20px',
              opacity: busy || code.length !== 6 ? 0.5 : 1,
            }}
          >
            {busy ? 'Verifying…' : `Verify & send →`}
          </button>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              color: 'var(--mid-gray)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                track('click', 'share_change_details', { subject: displaySubject });
                setStep('form');
                setCode('');
                setErrorMsg(null);
              }}
              style={linkStyle}
            >
              ← Change details
            </button>
            <button
              type="button"
              onClick={() => {
                track('click', 'share_otp_resend', { subject: displaySubject, cooldown_left: resendIn });
                resend();
              }}
              disabled={resendIn > 0 || busy}
              style={{
                ...linkStyle,
                color: resendIn > 0 ? 'var(--light-gray)' : 'var(--plum)',
                cursor: resendIn > 0 ? 'default' : 'pointer',
              }}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
            </button>
          </div>
        </div>
      )}
    </TileShell>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--mid-gray)',
  fontWeight: 600,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--cream)',
  fontSize: 14,
};

const errStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#b42318',
  background: '#fef3f2',
  padding: '8px 12px',
  borderRadius: 8,
};

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--plum)',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
};
