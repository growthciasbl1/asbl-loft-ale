/**
 * Booking utilities for VisitTile / CallBack flow.
 *
 * - Slot generator: 7 days starting today (if before 5 PM) or tomorrow (if after).
 *   9 AM to 8 PM start times (each slot ends at +1 hour, so last slot runs 8–9 PM).
 *   "Today" slots in the past / within next hour are disabled.
 * - Timezone helpers: browser timezone fallback, geolocation permission request,
 *   and a server-backed lat/lng → IANA resolver for location-correct confirmations.
 */

export interface TimeSlot {
  hour: number; // 9..20
  /** Local-clock ISO string without timezone offset, e.g. "2026-04-22T15:00:00" */
  isoLocal: string;
  /** Human label, e.g. "3:00 PM" */
  label: string;
  disabled: boolean;
  disabledReason?: 'past' | 'too_soon' | 'outside_window';
}

export interface DaySlots {
  /** Midnight of this day in visitor's local clock. */
  date: Date;
  /** "Wed · Apr 22" */
  shortLabel: string;
  /** "Wednesday · 22 April 2026" */
  longLabel: string;
  slots: TimeSlot[];
}

const START_HOUR = 9;   // first slot start
const END_HOUR = 20;    // last slot start (runs 20:00 → 21:00)
const CUTOFF_HOUR = 17; // after 5 PM, today is no longer bookable — start from tomorrow

function formatDay(d: Date, variant: 'short' | 'long'): string {
  const opts: Intl.DateTimeFormatOptions =
    variant === 'short'
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return d.toLocaleDateString(undefined, opts);
}

function formatHour(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function padIso(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function generate7DaySlots(now: Date = new Date()): DaySlots[] {
  const offsetDays = now.getHours() >= CUTOFF_HOUR ? 1 : 0;
  const days: DaySlots[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + offsetDays + i);
    date.setHours(0, 0, 0, 0);
    days.push(buildDaySlots(date, now));
  }

  return days;
}

/**
 * Build a DaySlots entry for a specific date (used by the calendar picker for
 * dates beyond the default 7-day window). Past and too-soon slots are disabled
 * using the same rules as the 7-day generator.
 */
export function generateSlotsForDate(date: Date, now: Date = new Date()): DaySlots {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return buildDaySlots(d, now);
}

function buildDaySlots(date: Date, now: Date): DaySlots {
  const isToday = date.toDateString() === now.toDateString();
  const soonWindowMs = 60 * 60 * 1000;
  const slots: TimeSlot[] = [];

  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const slotDate = new Date(date);
    slotDate.setHours(h, 0, 0, 0);

    let disabled = false;
    let reason: TimeSlot['disabledReason'];
    if (isToday) {
      if (slotDate.getTime() <= now.getTime()) {
        disabled = true;
        reason = 'past';
      } else if (slotDate.getTime() - now.getTime() < soonWindowMs) {
        disabled = true;
        reason = 'too_soon';
      }
    }

    const y = slotDate.getFullYear();
    const m = padIso(slotDate.getMonth() + 1);
    const day = padIso(slotDate.getDate());
    const hh = padIso(h);

    slots.push({
      hour: h,
      isoLocal: `${y}-${m}-${day}T${hh}:00:00`,
      label: formatHour(h),
      disabled,
      disabledReason: reason,
    });
  }

  return {
    date,
    shortLabel: formatDay(date, 'short'),
    longLabel: formatDay(date, 'long'),
    slots,
  };
}

/**
 * Earliest date the calendar picker allows: day 8 (one beyond the default 7-day
 * pill row). Returned as YYYY-MM-DD (local, not UTC) so `<input type="date">`'s
 * `min` attribute works predictably.
 */
export function calendarMinDateISO(now: Date = new Date()): string {
  const offsetDays = now.getHours() >= CUTOFF_HOUR ? 1 : 0;
  const min = new Date(now);
  min.setDate(now.getDate() + offsetDays + 7);
  min.setHours(0, 0, 0, 0);
  return `${min.getFullYear()}-${padIso(min.getMonth() + 1)}-${padIso(min.getDate())}`;
}

/** Max calendar window — 90 days out is enough for real-world site planning. */
export function calendarMaxDateISO(now: Date = new Date()): string {
  const max = new Date(now);
  max.setDate(now.getDate() + 90);
  return `${max.getFullYear()}-${padIso(max.getMonth() + 1)}-${padIso(max.getDate())}`;
}

/* ─── Timezone ─────────────────────────────────────────── */

export function getBrowserTimezone(): string {
  if (typeof Intl === 'undefined') return 'Asia/Kolkata';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

/**
 * Ask the browser for the visitor's geolocation. Resolves with null if the
 * visitor denies, the API isn't available, or the request times out.
 */
export function requestGeolocation(timeoutMs = 10000): Promise<GeoPosition | null> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 300000 },
    );
  });
}

/**
 * Server-backed timezone resolution. Returns null on error.
 */
export async function resolveTimezoneFromGeo(
  geo: GeoPosition,
): Promise<string | null> {
  try {
    const u = new URL('/api/geo/tz', window.location.origin);
    u.searchParams.set('lat', String(geo.lat));
    u.searchParams.set('lng', String(geo.lng));
    const res = await fetch(u.toString());
    if (!res.ok) return null;
    const json = (await res.json()) as { timezone?: string };
    return json.timezone ?? null;
  } catch {
    return null;
  }
}

/**
 * Format a local ISO slot ("2026-04-22T15:00:00") in a given IANA timezone.
 * Example: "Wed, 22 Apr · 3:00 PM IST"
 */
export function formatSlotInTimezone(isoLocal: string, timezone: string): string {
  // Interpret isoLocal as local wall-clock; present in target timezone by constructing
  // a Date that respects the visitor's clock. The slot is *in* the visitor's local
  // wall-clock, so it's most truthful to display with THEIR timezone even if they
  // manually override.
  const d = new Date(isoLocal);
  try {
    const date = d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: timezone,
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
      timeZoneName: 'short',
    });
    return `${date} · ${time}`;
  } catch {
    return isoLocal;
  }
}

/**
 * A small curated list of timezones for the "Change timezone" dropdown.
 * Prioritises IST + common NRI locations.
 */
export const COMMON_TIMEZONES: { label: string; value: string }[] = [
  { label: 'IST · India', value: 'Asia/Kolkata' },
  { label: 'GST · Dubai / UAE', value: 'Asia/Dubai' },
  { label: 'SGT · Singapore', value: 'Asia/Singapore' },
  { label: 'AEDT · Sydney', value: 'Australia/Sydney' },
  { label: 'GMT · London', value: 'Europe/London' },
  { label: 'CET · Europe', value: 'Europe/Paris' },
  { label: 'EST · New York', value: 'America/New_York' },
  { label: 'CST · Chicago', value: 'America/Chicago' },
  { label: 'PST · San Francisco', value: 'America/Los_Angeles' },
  { label: 'JST · Tokyo', value: 'Asia/Tokyo' },
  { label: 'UTC', value: 'UTC' },
];
