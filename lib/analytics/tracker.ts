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
