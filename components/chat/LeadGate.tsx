'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/lib/store/chatStore';
import ChannelToggle, { Channel } from './ChannelToggle';
import { track } from '@/lib/analytics/tracker';
import { readWebTracker } from '@/lib/analytics/leadTracking';
import { getOrCreateVisitorId } from '@/lib/analytics/visitorId';
import { isValidIndiaPhone, phoneValidationHint } from '@/lib/utils/phone';

interface Props {
  children: React.ReactNode;
  reason: string;
  preview?: React.ReactNode;
  preferredChannel?: Channel;
  /** When true, drop LeadGate's own card chrome (border / radius / shadow / bg).
   *  Use when nesting LeadGate inside another tile that already has the
   *  container (e.g. PriceTile inline unlock) to avoid a double-card look. */
  flush?: boolean;
}

type Step = 'form' | 'otp' | 'done';

export default function LeadGate({ children, reason, preview, preferredChannel = 'whatsapp', flush = false }: Props) {
  const lead = useChatStore((s) => s.lead);
  const setLead = useChatStore((s) => s.setLead);

  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<Channel>(preferredChannel);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // CRITICAL: all hooks above any early-return. React enforces that the
  // SAME hooks run in the SAME order on every render. Previously this
  // component had `if (lead?.phone) return <>{children}</>` BEFORE the
  // useEffect calls — first render (no lead) ran 10 hooks, subsequent
  // render after verification (lead set) bailed out early at 7 hooks,
  // React threw minified error #300 and the whole chat crashed to an
  // Application error page. Moving the early-return below all hooks
  // keeps the hook count stable across renders.

  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) otpInputRef.current.focus();
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // Already verified via zustand lead → unlock immediately (AFTER all hooks)
  if (lead?.phone) return <>{children}</>;

  const phoneHint = phoneValidationHint(phone);
  const phoneValid = isValidIndiaPhone(phone);

  // ───── Step 1: send OTP ─────
  const sendOtp = async () => {
    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Name and phone are both required.');
      return;
    }
    // Phone-format validation intentionally disabled — the server's
    // normalisePhone is lenient enough, and this gate was blocking real
    // users while we diagnose the production 400 issue.
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    track('submit', 'otp_send_click', { form: 'lead_gate', reason, channel });
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        // Server returned an error — but WhatsApp may still have delivered
        // (seen in prod when saveOtp flaked after successful Periskope
        // send). Key UX rule: advance to 'otp' step ANYWAY so user can
        // enter the code they received. /api/otp/verify is the source of
        // truth — if code wasn't saved, verify returns wrong_code and user
        // taps Resend.
        const reasonMap: Record<string, string> = {
          'invalid phone': 'That phone number looks incorrect — please check.',
          rate_limited: `Too many attempts — try again in ${json.retryAfter ?? 30}s.`,
          all_channels_failed: 'Delivery hiccup — agar WhatsApp pe OTP aa gaya hai to enter kar do, warna Resend dabao.',
          otp_store_failed: 'Server flake — try entering the OTP you received; if verify fails, tap Resend.',
          'invalid request': 'Invalid request — please refresh and try again.',
        };
        const friendly = reasonMap[json.error] ?? `Agar OTP aa gaya hai to enter kar do, warna Resend dabao. (${json.error ?? `HTTP ${res.status}`})`;
        if (json.error === 'invalid phone' || json.error === 'invalid request') {
          setErrorMsg(friendly);
        } else {
          // Advance to OTP step so user CAN enter the code
          setStep('otp');
          setErrorMsg(friendly);
          setResendIn(30);
        }
        console.error('[LeadGate] otp/send failed', { status: res.status, body: json });
      } else {
        setStep('otp');
        setInfoMsg(`OTP sent on WhatsApp to ${phone}. Code valid for 5 minutes.`);
        setResendIn(30);
        track('view', 'otp_send_success', { form: 'lead_gate' });
      }
    } catch {
      setErrorMsg('Network error — please retry.');
    } finally {
      setBusy(false);
    }
  };

  // ───── Step 2: verify OTP ─────
  const verifyOtp = async () => {
    const clean = code.replace(/\D/g, '').trim();
    if (clean.length !== 6) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const verifyRes = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: clean }),
      });
      const vJson = await verifyRes.json();
      if (!verifyRes.ok || !vJson.ok) {
        track('error', 'lead_gate_otp_verify_fail', { reason, err: vJson?.error ?? 'unknown' });
        setErrorMsg(
          vJson.error === 'wrong_code'
            ? 'Wrong code. Please try again.'
            : vJson.error === 'expired'
              ? 'Code expired — please tap Resend.'
              : vJson.error === 'too_many_attempts'
                ? 'Too many attempts — please tap Resend to get a new code.'
                : 'Verification failed. Please try again.',
        );
        return;
      }

      // ✅ Verified. Now persist lead + link visitor identity.
      const visitorId = getOrCreateVisitorId();
      const webTracker = readWebTracker();

      // Fire-and-forget — webhook + visitor link in parallel, non-blocking for UX
      await Promise.allSettled([
        fetch('/api/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            query: reason,
            preferredChannel: channel,
            visitorId,
            otpVerified: true,
            webTracker,
          }),
        }),
        fetch('/api/visitor/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            phone: phone.trim(),
            name: name.trim(),
            preferredChannel: channel,
          }),
        }),
      ]);

      setLead({ name: name.trim(), phone: phone.trim(), source: reason });
      setStep('done');
      track('view', 'lead_success', { form: 'lead_gate', reason, channel, verified: true });
    } catch {
      setErrorMsg('Network error — please retry.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setCode('');
    setErrorMsg(null);
    await sendOtp();
  };

  // ───── RENDER ─────
  return (
    <div
      style={
        flush
          ? { overflow: 'hidden' }
          : {
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            }
      }
    >
      {preview && (
        <div style={{ position: 'relative' }}>
          <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>{preview}</div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(250, 247, 242, 0.6) 50%, rgba(250, 247, 242, 1) 100%)',
            }}
          />
        </div>
      )}

      <div style={{ padding: '20px 22px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'var(--plum-pale)',
            color: 'var(--plum-dark)',
            borderRadius: 100,
            fontSize: 10.5,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--plum)' }} />
          {step === 'otp' ? 'Step 2 · Verify' : 'Unlock · one-time'}
        </div>

        <h4 className="serif" style={{ fontSize: 20, marginBottom: 6, color: 'var(--charcoal)' }}>
          {reason}
        </h4>

        {step === 'form' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 16 }}>
              Name + phone. We&apos;ll send a 6-digit code to your WhatsApp for verification.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                id="lead-gate-name"
                name="name"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => track('focus', 'lead_gate_name_focus', { reason })}
                autoComplete="name"
                style={inputStyle}
              />
              <input
                type="tel"
                id="lead-gate-phone"
                name="phone"
                inputMode="tel"
                placeholder="+91 98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={() => track('focus', 'lead_gate_phone_focus', { reason })}
                autoComplete="tel"
                style={{
                  ...inputStyle,
                  borderColor: phoneHint ? '#b42318' : phoneValid ? '#15803d' : 'var(--border)',
                }}
              />
              {phoneHint && (
                <div style={{ fontSize: 11.5, color: '#b42318', marginTop: -4 }}>
                  {phoneHint}
                </div>
              )}
              {errorMsg && <div style={errStyle}>{errorMsg}</div>}

              <button
                type="button"
                onClick={sendOtp}
                disabled={busy || !phone.trim() || !name.trim()}
                className="btn-plum"
                style={{
                  justifyContent: 'center',
                  padding: '12px 20px',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? 'Sending OTP…' : 'Unlock →'}
              </button>

              {/* Consent-framed channel choice — moved BELOW the Unlock button per
                  doc 3.3 direction. Framed as follow-up preference, not a hurdle
                  between the visitor and the unlock action. */}
              <div
                style={{
                  marginTop: 4,
                  padding: '10px 12px',
                  background: 'var(--plum-pale)',
                  border: '1px solid var(--plum-border, var(--border))',
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--plum-dark)',
                    marginBottom: 6,
                  }}
                >
                  If we need to reach out, how should we?
                </div>
                <ChannelToggle value={channel} onChange={setChannel} />
                <div
                  style={{
                    fontSize: 10.5,
                    color: 'var(--mid-gray)',
                    marginTop: 6,
                    lineHeight: 1.4,
                  }}
                >
                  Only used to follow up on this enquiry — never for marketing blasts.
                </div>
              </div>

              <p style={{ fontSize: 10.5, color: 'var(--light-gray)' }}>
                RERA TS P02400006761 · Data stays with ASBL. Opt out anytime.
              </p>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--mid-gray)', marginBottom: 14 }}>
              {infoMsg ?? `Enter the 6-digit code we just sent.`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                ref={otpInputRef}
                type="text"
                id="lead-gate-otp"
                name="otp"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onFocus={() => track('focus', 'lead_gate_otp_focus', { reason })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.length === 6) verifyOtp();
                }}
                style={{
                  ...inputStyle,
                  letterSpacing: '0.5em',
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: 600,
                }}
              />
              {errorMsg && <div style={errStyle}>{errorMsg}</div>}

              <button
                type="button"
                onClick={() => {
                  track('submit', 'lead_gate_otp_verify_click', { reason });
                  verifyOtp();
                }}
                disabled={busy || code.length !== 6}
                className="btn-plum"
                style={{ justifyContent: 'center', padding: '12px 20px', opacity: busy ? 0.6 : 1 }}
              >
                {busy ? 'Verifying…' : 'Verify & Unlock →'}
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
                    track('click', 'lead_gate_change_number', { reason });
                    setStep('form');
                    setCode('');
                    setErrorMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--plum)',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  ← Change number
                </button>
                <button
                  type="button"
                  onClick={() => {
                    track('click', 'lead_gate_otp_resend', { reason, cooldown_left: resendIn });
                    resend();
                  }}
                  disabled={resendIn > 0 || busy}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendIn > 0 ? 'var(--light-gray)' : 'var(--plum)',
                    cursor: resendIn > 0 ? 'default' : 'pointer',
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'done' && (
          <p style={{ fontSize: 13, color: 'var(--plum-dark)' }}>✓ Verified. Unlocking…</p>
        )}
      </div>
    </div>
  );
}

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
