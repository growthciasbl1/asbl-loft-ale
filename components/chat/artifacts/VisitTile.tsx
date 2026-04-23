'use client';

import { useEffect, useMemo, useState } from 'react';
import { TileShell, TileIcon } from './common';
import { useChatStore } from '@/lib/store/chatStore';
import { track } from '@/lib/analytics/tracker';
import { readWebTracker } from '@/lib/analytics/leadTracking';
import {
  generate7DaySlots,
  generateSlotsForDate,
  calendarMinDateISO,
  calendarMaxDateISO,
  getBrowserTimezone,
  requestGeolocation,
  resolveTimezoneFromGeo,
  formatSlotInTimezone,
  COMMON_TIMEZONES,
  type DaySlots,
  type GeoPosition,
} from '@/lib/utils/booking';
import { getOrCreateVisitorId } from '@/lib/analytics/visitorId';

type BookingType = 'site_visit' | 'virtual_visit' | 'call_back';

interface VisitTileProps {
  intro?: 'default' | 'no_model_flat' | 'live_inventory';
  initialBookingType?: BookingType;
}

const INTROS = {
  default: null,
  no_model_flat: {
    title: 'No model flat at Loft — but the site visit shows you more.',
    body:
      "Loft is still under construction, so there's no model flat here. The static model with our finish spec lives at ASBL Spectra. More useful: book a Loft site visit and one of our RMs will walk you through the actual tower, views from your floor band, and unit-specific details a sample flat can't give.",
  },
  live_inventory: {
    title: "We don't publish live inventory in chat.",
    body:
      "Pricing and unit availability change daily as construction progresses. One of our RMs will walk you through exactly what's open in your size and floor band — takes ~45 min on-site.",
  },
};

function eyebrowFor(type: BookingType): string {
  if (type === 'site_visit') return 'Site visits · 45 minutes';
  if (type === 'virtual_visit') return 'Virtual visit · 30 minutes on video';
  return 'Call back from Loft team';
}

function titleFor(type: BookingType): string {
  if (type === 'site_visit') return 'Pick a date + time. Our RM meets you.';
  if (type === 'virtual_visit') return 'Pick a slot — RM walks you through on video.';
  return 'Pick when you want the call.';
}

function subFor(type: BookingType): string {
  if (type === 'site_visit')
    return '20 min at experience centre · 25 min walking the actual tower.';
  if (type === 'virtual_visit')
    return 'RM joins on Google Meet · shares master plan, unit walkthrough, payment plans, and your floor-band view.';
  return 'One of our RMs will call at the slot you pick, no earlier, no later.';
}

function successEyebrowFor(type: BookingType): string {
  if (type === 'site_visit') return 'Site visit confirmed';
  if (type === 'virtual_visit') return 'Virtual visit confirmed';
  return 'Call back confirmed';
}

function successTitleFor(type: BookingType): string {
  if (type === 'site_visit') return 'See you at Loft.';
  if (type === 'virtual_visit') return "We'll send a Meet link 15 min before.";
  return "You'll hear from us soon.";
}

function reasonFor(type: BookingType): string {
  if (type === 'site_visit') return 'site_visit_booking';
  if (type === 'virtual_visit') return 'virtual_visit_booking';
  return 'call_booking';
}

function channelFor(type: BookingType): 'whatsapp' | 'call' {
  if (type === 'call_back') return 'call';
  return 'whatsapp';
}

function bookingLabelFor(type: BookingType): string {
  if (type === 'site_visit') return 'Site visit';
  if (type === 'virtual_visit') return 'Virtual visit';
  return 'Call back';
}

export default function VisitTile({
  intro = 'default',
  initialBookingType = 'site_visit',
}: VisitTileProps) {
  const lead = useChatStore((s) => s.lead);
  const setLead = useChatStore((s) => s.setLead);

  const [bookingType, setBookingType] = useState<BookingType>(initialBookingType);
  const [dayIndex, setDayIndex] = useState(0);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);

  // Identity comes from zustand lead if already verified this session. Visitor
  // can still hit "Change details" to override — tracked via editingIdentity.
  const alreadyVerified = Boolean(lead?.phone && lead?.name);
  const [editingIdentity, setEditingIdentity] = useState(!alreadyVerified);
  const [name, setName] = useState(lead?.name ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // OTP verification state — form gate before booking
  const [otpStep, setOtpStep] = useState<'idle' | 'otp'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Calendar-picker state for dates beyond the 7-day pill row
  const [customDay, setCustomDay] = useState<DaySlots | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateInput, setCustomDateInput] = useState('');

  const [geo, setGeo] = useState<GeoPosition | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [detectedTz, setDetectedTz] = useState<string>('Asia/Kolkata');
  const [userTz, setUserTz] = useState<string>('Asia/Kolkata');
  const [userTzOverridden, setUserTzOverridden] = useState(false);

  const baseDays = useMemo(() => generate7DaySlots(), []);
  const allDays: DaySlots[] = useMemo(
    () => (customDay ? [...baseDays, customDay] : baseDays),
    [baseDays, customDay],
  );
  const selectedDay: DaySlots | undefined = allDays[dayIndex];
  const selectedSlot = slotIdx != null && selectedDay ? selectedDay.slots[slotIdx] : null;

  const note = INTROS[intro];

  // Browser tz instantly; then upgrade to geo-based tz if visitor grants permission
  useEffect(() => {
    const tz = getBrowserTimezone();
    setDetectedTz(tz);
    setUserTz(tz);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGeoStatus('requesting');
    requestGeolocation().then(async (pos) => {
      if (cancelled) return;
      if (!pos) {
        setGeoStatus('denied');
        return;
      }
      setGeo(pos);
      setGeoStatus('granted');
      track('view', 'geo_granted', { accuracy: pos.accuracy });
      const tz = await resolveTimezoneFromGeo(pos);
      if (cancelled) return;
      if (tz) {
        setDetectedTz(tz);
        setUserTz((prev) => (userTzOverridden ? prev : tz));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If lead changes under us (e.g. another tile completes OTP), adopt it and
  // collapse the form — unless visitor is already editing.
  useEffect(() => {
    if (lead?.phone && lead?.name && !editingIdentity) {
      setName(lead.name);
      setPhone(lead.phone);
    }
  }, [lead?.phone, lead?.name, editingIdentity]);

  const canSubmit = Boolean(selectedSlot && !selectedSlot.disabled && name.trim() && phone.trim());

  /** On custom-date pick from the native date picker — build the DaySlots and
   *  select it. Resets the slot selection so visitor picks a fresh time. */
  const onPickCustomDate = (iso: string) => {
    if (!iso) return;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return;
    const date = new Date(y, m - 1, d);
    const slots = generateSlotsForDate(date);
    setCustomDay(slots);
    setShowDatePicker(false);
    setCustomDateInput(iso);
    // Select the newly-added custom day (it's appended at the end of allDays)
    setDayIndex(baseDays.length);
    setSlotIdx(null);
    track('click', 'custom_date_pick', { iso });
  };

  /** Extracted: the actual book path, used by both submit() and the already-
   *  verified identity quick-book path. */
  const bookDirectly = () => {
    setLead({ name, phone, source: bookingType });
    setOtpStep('idle');
    setDone(true);
    fireBookingWebhook();
  };

  /** Step 1 of 2: send an OTP to the phone. If identity is already verified in
   *  this session AND visitor hasn't edited details, skip OTP entirely.
   *  Otherwise show the OTP input panel optimistically while Periskope delivers. */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedSlot || !selectedDay) return;

    setSubmitting(true);
    setOtpError(null);

    // Fast path: if visitor is a returning verified lead and hasn't edited
    // identity, book immediately without OTP. The zustand lead acts as the
    // in-session trust marker; server-side /api/otp/status is the authority.
    const identityUnchanged =
      alreadyVerified && !editingIdentity && name.trim() === lead?.name && phone.trim() === lead?.phone;

    try {
      const statusRes = await fetch('/api/otp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const statusJson = await statusRes.json();
      if (statusJson?.verified) {
        track('view', 'visit_otp_skipped_recently_verified', {
          bookingType,
          identityUnchanged,
        });
        bookDirectly();
        setSubmitting(false);
        return;
      }
    } catch {
      // Network hiccup — fall through to OTP send.
    }

    // ─── Optimistic UI: show OTP panel immediately ───
    setOtpStep('otp');
    setOtpCode('');
    setOtpInfo(`OTP ${phone} pe bhej rahe hain. WhatsApp check karo.`);
    setResendIn(30);

    track('submit', 'visit_otp_send_click', {
      bookingType,
      slotIso: selectedSlot.isoLocal,
    });

    // ─── Fire server call in background ───
    try {
      const visitorId = getOrCreateVisitorId();
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          reason: reasonFor(bookingType),
          form: 'visit_tile',
          artifactKind: 'visit',
          visitorId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setOtpStep('idle');
        setOtpError(
          json.error === 'invalid phone'
            ? 'Ye phone number sahi nahi lag raha — please check.'
            : 'OTP bhej nahi paye. Try again in a moment.',
        );
        return;
      }
      setOtpInfo(`OTP WhatsApp pe bhej diya hai ${phone}. Code valid 5 minutes.`);
    } catch {
      setOtpStep('idle');
      setOtpError('Network error — please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Step 2 of 2: verify OTP then show success immediately. */
  const verifyAndBook = async () => {
    const clean = otpCode.replace(/\D/g, '').trim();
    if (clean.length !== 6 || !selectedSlot || !selectedDay) {
      setOtpError('Please enter the 6-digit code.');
      return;
    }
    setSubmitting(true);
    setOtpError(null);
    try {
      const v = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: clean }),
      });
      const vJson = await v.json();
      if (!v.ok || !vJson.ok) {
        setOtpError(
          vJson.error === 'wrong_code'
            ? 'Galat code. Try again.'
            : vJson.error === 'expired'
              ? 'Code expire ho gaya — resend karo.'
              : 'Verification fail ho gaya.',
        );
        return;
      }

      setLead({ name, phone, source: bookingType });
      setOtpStep('idle');
      setDone(true);
      track('view', 'lead_success', { form: bookingType, verified: true });
      fireBookingWebhook();
    } catch {
      setOtpError('Network error — please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const fireBookingWebhook = () => {
    if (!selectedSlot || !selectedDay) return;
    const webhookEvent =
      bookingType === 'site_visit'
        ? 'visit_booking'
        : bookingType === 'virtual_visit'
          ? 'virtual_visit_booking'
          : 'call_booking';
    track('submit', webhookEvent, {
      slotIso: selectedSlot.isoLocal,
      timezone: userTz,
      tzOverridden: userTzOverridden,
      bookingType,
      geoGranted: geoStatus === 'granted',
    });

    fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        query: `${bookingLabelFor(bookingType)} · ${selectedDay.longLabel} · ${selectedSlot.label}`,
        reason: reasonFor(bookingType),
        preferredChannel: channelFor(bookingType),
        webTracker: readWebTracker(),
        otpVerified: true,
        visitorId: getOrCreateVisitorId(),
        booking: {
          type: bookingType,
          slotIsoLocal: selectedSlot.isoLocal,
          timezone: userTz,
          timezoneDetected: detectedTz,
          timezoneUserOverridden: userTzOverridden,
        },
        geo: geo
          ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy, timezone: detectedTz }
          : null,
      }),
    }).catch((err) => {
      console.warn('[visit] webhook failed:', err);
    });
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  /* ─── SUCCESS VIEW ─── */
  if (done && selectedSlot && selectedDay) {
    return (
      <TileShell
        eyebrow={successEyebrowFor(bookingType)}
        title={successTitleFor(bookingType)}
        sub={formatSlotInTimezone(selectedSlot.isoLocal, userTz)}
        icon={
          <TileIcon>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </TileIcon>
        }
        footer={<>Your phone stays with ASBL · never shared · opt-out anytime.</>}
        relatedAsks={[
          { label: 'Rental offer', query: 'Tell me about the rental offer' },
          { label: 'Price breakdown', query: 'Show me the price breakdown' },
          { label: 'Floor plans', query: 'Tell me about the floor plans' },
        ]}
      >
        <div
          style={{
            padding: '18px 0 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--plum-pale)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="var(--plum-dark)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div className="serif" style={{ fontSize: 22, color: 'var(--charcoal)', fontWeight: 500 }}>
            {bookingLabelFor(bookingType)} · {selectedDay.shortLabel} · {selectedSlot.label}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-2)', maxWidth: 460, lineHeight: 1.55 }}>
            {bookingType === 'site_visit' ? (
              <>
                One of our RMs will WhatsApp <b>{phone}</b> with the meeting point + their direct
                number. Shown here in <b>{tzShortLabel(userTz)}</b>.
              </>
            ) : bookingType === 'virtual_visit' ? (
              <>
                One of our RMs will WhatsApp <b>{phone}</b> with the Google Meet link ~15 min before
                your slot. Shown here in <b>{tzShortLabel(userTz)}</b>.
              </>
            ) : (
              <>
                One of our RMs will call <b>{phone}</b> at this time in{' '}
                <b>{tzShortLabel(userTz)}</b>. If you&apos;re travelling, adjust the timezone below
                so we call at the right hour.
              </>
            )}
          </div>

          <TimezoneEditor
            current={userTz}
            overridden={userTzOverridden}
            onChange={(tz) => {
              setUserTz(tz);
              setUserTzOverridden(true);
              track('click', 'timezone_override', { from: detectedTz, to: tz });
            }}
          />
        </div>
      </TileShell>
    );
  }

  /* ─── BOOKING FORM ─── */
  return (
    <TileShell
      eyebrow={eyebrowFor(bookingType)}
      title={titleFor(bookingType)}
      sub={subFor(bookingType)}
      icon={
        <TileIcon>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--plum)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <rect x={3} y={5} width={18} height={16} rx={2} />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </TileIcon>
      }
      footer={<>Available every day 9 AM – 9 PM · next 7 days + any future date.</>}
      relatedAsks={[
        { label: 'What to expect on-site', query: 'What happens on a site visit?' },
        { label: 'Prep checklist', query: 'What documents should I bring to a site visit?' },
      ]}
    >
      {note && (
        <div
          style={{
            padding: 14,
            background: 'var(--plum-pale)',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--plum-dark)',
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Quick context
          </div>
          <div
            className="serif"
            style={{ fontSize: 17, lineHeight: 1.3, color: 'var(--charcoal)', marginBottom: 4 }}
          >
            {note.title}
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--gray-2)', margin: 0, lineHeight: 1.55 }}>
            {note.body}
          </p>
        </div>
      )}

      {/* Booking type toggle */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--mid-gray)',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          I want to
        </label>
        <div
          style={{
            display: 'inline-flex',
            padding: 3,
            background: 'var(--cream)',
            border: '1px solid var(--border)',
            borderRadius: 100,
            flexWrap: 'wrap',
          }}
        >
          <BookingTypePill
            active={bookingType === 'site_visit'}
            onClick={() => {
              setBookingType('site_visit');
              track('click', 'booking_type_select', { type: 'site_visit' });
            }}
            label="Visit the site"
          />
          <BookingTypePill
            active={bookingType === 'virtual_visit'}
            onClick={() => {
              setBookingType('virtual_visit');
              track('click', 'booking_type_select', { type: 'virtual_visit' });
            }}
            label="Virtual visit"
          />
          <BookingTypePill
            active={bookingType === 'call_back'}
            onClick={() => {
              setBookingType('call_back');
              track('click', 'booking_type_select', { type: 'call_back' });
            }}
            label="Get a call"
          />
        </div>
      </div>

      {/* Date picker */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: 'block',
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.13em',
            color: 'var(--mid-gray)',
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Date
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(108px, 1fr))',
            gap: 6,
          }}
        >
          {allDays.map((day, i) => {
            const active = i === dayIndex;
            const weekday = day.shortLabel.split(',')[0];
            const rest = day.shortLabel.replace(weekday + ',', '').trim();
            const isCustom = customDay != null && i === allDays.length - 1 && i >= baseDays.length;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDayIndex(i);
                  setSlotIdx(null);
                }}
                style={{
                  padding: '10px 8px',
                  borderRadius: 12,
                  background: active ? 'var(--plum)' : 'white',
                  color: active ? '#fff' : 'var(--charcoal)',
                  border:
                    '1px solid ' +
                    (active
                      ? 'var(--plum)'
                      : isCustom
                        ? 'var(--plum-dark)'
                        : 'var(--border)'),
                  transition: 'all 160ms',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    opacity: active ? 0.85 : 0.55,
                  }}
                >
                  {isCustom ? 'Custom' : weekday}
                </div>
                <div className="serif" style={{ fontSize: 16, fontWeight: 500, marginTop: 3 }}>
                  {rest || day.shortLabel}
                </div>
              </button>
            );
          })}

          {/* "+ More dates" trigger — opens the native date picker */}
          <button
            type="button"
            onClick={() => setShowDatePicker((v) => !v)}
            style={{
              padding: '10px 8px',
              borderRadius: 12,
              background: showDatePicker ? 'var(--plum-pale)' : 'white',
              color: 'var(--plum-dark)',
              border: '1px dashed var(--plum-dark)',
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                opacity: 0.65,
              }}
            >
              Other
            </div>
            <div className="serif" style={{ fontSize: 15, fontWeight: 500, marginTop: 3 }}>
              + More dates
            </div>
          </button>
        </div>

        {showDatePicker && (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              background: 'var(--cream)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <label
              style={{
                fontSize: 12,
                color: 'var(--gray-2)',
                fontWeight: 500,
              }}
            >
              Pick any date up to 90 days out:
            </label>
            <input
              type="date"
              min={calendarMinDateISO()}
              max={calendarMaxDateISO()}
              value={customDateInput}
              onChange={(e) => onPickCustomDate(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'white',
                fontSize: 13,
                color: 'var(--charcoal)',
              }}
            />
          </div>
        )}
      </div>

      {/* Time picker */}
      {selectedDay && (
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.13em',
              color: 'var(--mid-gray)',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Time · {tzShortLabel(userTz)}
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
              gap: 6,
            }}
          >
            {selectedDay.slots.map((s, i) => {
              const active = i === slotIdx;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={s.disabled}
                  onClick={() => {
                    setSlotIdx(i);
                    track('click', 'slot_select', { slotIso: s.isoLocal });
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 10,
                    background: active
                      ? 'var(--plum)'
                      : s.disabled
                        ? 'var(--beige)'
                        : 'white',
                    color: active
                      ? '#fff'
                      : s.disabled
                        ? 'var(--light-gray)'
                        : 'var(--charcoal)',
                    border: '1px solid ' + (active ? 'var(--plum)' : 'var(--border)'),
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: s.disabled ? 'not-allowed' : 'pointer',
                    textDecoration: s.disabled ? 'line-through' : 'none',
                    transition: 'all 160ms',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Name + phone + timezone + submit OR OTP verification */}
      {otpStep === 'idle' ? (
        <form
          onSubmit={submit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
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
                  Booking as · verified
                </div>
                <b>{lead?.name}</b>{' '}
                <span style={{ color: 'var(--mid-gray)' }}>· {lead?.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingIdentity(true);
                  track('click', 'visit_change_identity');
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
                style={{
                  flex: '1 1 160px',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--cream)',
                  fontSize: 14,
                }}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                autoComplete="tel"
                required
                style={{
                  flex: '1 1 160px',
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--cream)',
                  fontSize: 14,
                }}
              />
            </div>
          )}

          <TimezoneEditor
            current={userTz}
            overridden={userTzOverridden}
            geoStatus={geoStatus}
            onChange={(tz) => {
              setUserTz(tz);
              setUserTzOverridden(true);
              track('click', 'timezone_override', { from: detectedTz, to: tz });
            }}
          />

          {otpError && (
            <div
              style={{
                fontSize: 12,
                color: '#b42318',
                background: '#fef3f2',
                padding: '8px 12px',
                borderRadius: 8,
              }}
            >
              {otpError}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="btn-plum"
            style={{
              justifyContent: 'center',
              padding: '12px 20px',
              opacity: canSubmit && !submitting ? 1 : 0.5,
            }}
          >
            {submitting
              ? alreadyVerified && !editingIdentity
                ? 'Confirming…'
                : 'Sending OTP…'
              : selectedSlot
                ? alreadyVerified && !editingIdentity
                  ? `Confirm ${bookingLabelFor(bookingType).toLowerCase()} · ${selectedSlot.label}`
                  : `Verify & confirm ${bookingLabelFor(bookingType).toLowerCase()} · ${selectedSlot.label}`
                : 'Pick a date & time'}
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            {otpInfo ?? `6-digit OTP enter karo (WhatsApp check karo).`}
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={otpCode}
            maxLength={6}
            autoFocus
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && otpCode.length === 6) verifyAndBook();
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--cream)',
              fontSize: 20,
              textAlign: 'center',
              letterSpacing: '0.5em',
              fontWeight: 600,
            }}
          />
          {otpError && (
            <div
              style={{
                fontSize: 12,
                color: '#b42318',
                background: '#fef3f2',
                padding: '8px 12px',
                borderRadius: 8,
              }}
            >
              {otpError}
            </div>
          )}
          <button
            type="button"
            onClick={verifyAndBook}
            disabled={submitting || otpCode.length !== 6}
            className="btn-plum"
            style={{
              justifyContent: 'center',
              padding: '12px 20px',
              opacity: submitting || otpCode.length !== 6 ? 0.5 : 1,
            }}
          >
            {submitting
              ? 'Verifying…'
              : `Verify & book ${bookingLabelFor(bookingType).toLowerCase()} →`}
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
                setOtpStep('idle');
                setOtpCode('');
                setOtpError(null);
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
              ← Change details
            </button>
            <button
              type="button"
              onClick={() => {
                if (resendIn > 0 || submitting) return;
                setOtpCode('');
                setOtpError(null);
                submit(new Event('submit') as unknown as React.FormEvent);
              }}
              disabled={resendIn > 0 || submitting}
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
      )}
    </TileShell>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function BookingTypePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 100,
        background: active ? 'var(--plum)' : 'transparent',
        color: active ? '#fff' : 'var(--gray-2)',
        fontSize: 12.5,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        transition: 'all 180ms',
      }}
    >
      {label}
    </button>
  );
}

function TimezoneEditor({
  current,
  overridden,
  onChange,
  geoStatus,
}: {
  current: string;
  overridden: boolean;
  onChange: (tz: string) => void;
  geoStatus?: 'idle' | 'requesting' | 'granted' | 'denied';
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--cream)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        fontSize: 12,
        color: 'var(--gray-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span style={{ color: 'var(--mid-gray)' }}>Timezone:</span>{' '}
          <b style={{ color: 'var(--plum-dark)' }}>{tzShortLabel(current)}</b>
          {overridden && <em style={{ color: 'var(--mid-gray)', marginLeft: 6 }}>(manual)</em>}
          {!overridden && geoStatus === 'granted' && (
            <em style={{ color: 'var(--light-gray)', marginLeft: 6 }}>· from your location</em>
          )}
          {!overridden && geoStatus === 'denied' && (
            <em style={{ color: 'var(--light-gray)', marginLeft: 6 }}>· from browser clock</em>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: 'var(--plum-dark)',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {open ? 'Cancel' : 'Want to change timezone?'}
        </button>
      </div>
      {open && (
        <select
          value={current}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(false);
          }}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'white',
            fontSize: 13,
            color: 'var(--charcoal)',
            cursor: 'pointer',
          }}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function tzShortLabel(tz: string): string {
  const match = COMMON_TIMEZONES.find((t) => t.value === tz);
  if (match) return match.label.split(' · ')[0];
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
}
