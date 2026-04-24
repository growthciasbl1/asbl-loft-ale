/**
 * Client-side event tracker.
 *
 * - Buffers events in memory
 * - Batches POST to /api/events every 2 seconds OR when buffer hits 10 events
 * - Uses `navigator.sendBeacon` on `pagehide` / `beforeunload` for reliable flush
 * - Stores a session id in sessionStorage so a single tab's activity is grouped
 *
 * Usage (anywhere client-side):
 *   import { track } from '@/lib/analytics/tracker';
 *   track('click', 'landing_chip', { label: 'Plans' });
 */

export type EventType = 'view' | 'read' | 'click' | 'submit' | 'focus' | 'error' | 'system';

export interface TrackEvent {
  type: EventType;
  name: string;
  props?: Record<string, unknown>;
  /** client-side epoch ms; server also stamps */
  at: number;
  sessionId: string;
  path: string;
  referer?: string;
  utmCampaign?: string | null;
}

const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 2000;
const SESSION_KEY = 'asbl_session_id';

/**
 * Subset of events that ALSO get mirrored to window.dataLayer for GTM.
 * Scope: lead-creation + site-visit / virtual-visit / call-back booking.
 * Everything else (tile views, slider commits, lightbox nav, etc.) stays on
 * our own /api/events pipeline only — GTM doesn't need the noise, and
 * Kshitij's GTM workspace only needs commerce-critical signals for GA4 /
 * Google Ads conversion tracking.
 *
 * Events fire to dataLayer as `asbl_<name>` so GTM can trigger on them with
 * a single "Custom Event matches regex ^asbl_" rule or per-event triggers.
 */
const GTM_ALLOWED_EVENTS: ReadonlySet<string> = new Set<string>([
  // ───── Lead creation (LeadGate — universal gate before any locked content) ─────
  'lead_gate_name_focus',
  'lead_gate_phone_focus',
  'lead_gate_otp_focus',
  'lead_gate_otp_send_click',
  'otp_send_success',
  'lead_gate_otp_verify_click',
  'lead_gate_otp_verify_fail',
  'lead_gate_change_number',
  'lead_gate_otp_resend',
  'lead_success', // 🎯 PRIMARY lead-created conversion

  // ───── Lead creation (ShareRequestTile — doc / PDF share flow via Anandita) ─────
  'share_name_focus',
  'share_phone_focus',
  'share_otp_focus',
  'share_otp_send_click',
  'share_otp_verify_click',
  'share_otp_skipped_recently_verified',
  'share_change_details',
  'share_change_identity',
  'share_otp_resend',

  // ───── Site-visit / virtual-visit / call-back booking funnel ─────
  'booking_type_select', // site_visit | virtual_visit | call_back
  'visit_name_focus',
  'visit_phone_focus',
  'visit_otp_focus',
  'visit_otp_send_click',
  'visit_otp_verify_click',
  'visit_otp_skipped_recently_verified',
  'visit_otp_resend',
  'visit_change_details',
  'visit_change_identity',
  'visit_reschedule',
  'visit_date_select',
  'visit_more_dates_toggle',
  'custom_date_pick',
  'slot_select',
  'call_pref_select',
  'visit_timezone_toggle',
  'timezone_override',
  'visit_booking', // 🎯 site-visit booked
  'virtual_visit_booking', // 🎯 virtual visit booked
  'call_booking', // 🎯 call-back booked

  // ───── Cross-cutting CTAs that lead to the booking funnel ─────
  'header_book_site_visit',
  'affordability_site_visit_nudge',
]);

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function pushToGtmIfAllowed(e: TrackEvent): void {
  if (typeof window === 'undefined') return;
  if (!GTM_ALLOWED_EVENTS.has(e.name)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: `asbl_${e.name}`,
    asbl_event_type: e.type,
    asbl_session_id: e.sessionId,
    asbl_path: e.path,
    asbl_utm_campaign: e.utmCampaign ?? null,
    ...(e.props ?? {}),
  });
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = uuid();
    window.sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return uuid();
  }
}

class Tracker {
  private buffer: TrackEvent[] = [];
  private timer: number | null = null;
  private started = false;

  start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    this.timer = window.setInterval(() => this.flush(false), BATCH_INTERVAL_MS);

    // Flush on page hide — most reliable on mobile
    const flushBeacon = () => this.flush(true);
    window.addEventListener('pagehide', flushBeacon);
    window.addEventListener('beforeunload', flushBeacon);
    // Also flush when tab becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    });
  }

  push(e: Omit<TrackEvent, 'at' | 'sessionId' | 'path' | 'referer'>): void {
    if (typeof window === 'undefined') return;
    this.start();
    const utm = new URLSearchParams(window.location.search).get('utm_campaign');
    const full: TrackEvent = {
      ...e,
      at: Date.now(),
      sessionId: getSessionId(),
      path: window.location.pathname + window.location.search,
      referer: document.referrer || undefined,
      utmCampaign: utm,
    };
    // Mirror lead + booking events to GTM dataLayer (allowlist only). Our
    // own /api/events pipeline still receives EVERY event regardless.
    pushToGtmIfAllowed(full);
    this.buffer.push(full);
    if (this.buffer.length >= BATCH_SIZE) this.flush(false);
  }

  flush(useBeacon: boolean) {
    if (typeof window === 'undefined') return;
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    const payload = JSON.stringify({ events: batch });

    if (useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const ok = navigator.sendBeacon('/api/events', blob);
        if (ok) return;
      } catch {
        // fall through to fetch
      }
    }

    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // On failure, push back onto buffer so next flush retries
      this.buffer.unshift(...batch);
    });
  }
}

const tracker = new Tracker();

export function track(
  type: EventType,
  name: string,
  props?: Record<string, unknown>,
): void {
  tracker.push({ type, name, props });
}

/** Read the current session id (for linking lead submissions to their behaviour trail). */
export function sessionId(): string {
  return getSessionId();
}
