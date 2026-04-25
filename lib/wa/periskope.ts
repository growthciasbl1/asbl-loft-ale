import { pickNextSender, getAllActiveSenders } from './numbers';

const BASE = process.env.PERISKOPE_API_BASE || 'https://api.periskope.app/v1';
const TOKEN = process.env.PERISKOPE_API_TOKEN || '';

/**
 * Pinned sender number for share_request + the "Anandita assigned" handoff.
 * The user wants a consistent RM face for document deliveries — so every
 * share-request flow (OTP + docs + intro) goes through this number.
 */
export const ANANDITA_E164 = '917995284040';
export const ANANDITA_NAME = 'Anandita';

function hasPeriskope(): boolean {
  return !!TOKEN;
}

/**
 * Normalise a user-entered phone to Periskope's expected form.
 * Lenient mode — we only reject when there are zero digits. Anything
 * else is best-effort-shaped and forwarded to Periskope, which has its
 * own number validation. Strict regex was blocking real users in prod.
 */
export function normalisePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 14) return digits;
  // Unusual length (e.g. 7, 8, 9, 15 digits) — forward anyway; Periskope
  // will return a meaningful error and our frontend will surface it.
  return digits;
}

interface SendMessageInput {
  toE164: string; // e.g. "919999999999"
  message: string;
  fromE164?: string; // override sender; otherwise picks round-robin
}

export interface SendMessageResult {
  ok: boolean;
  fromE164: string | null;
  status: number;
  data?: unknown;
  error?: string;
}

async function sendViaNumber(
  fromE164: string,
  toE164: string,
  message: string,
  timeoutMs = 12000,
): Promise<SendMessageResult> {
  if (!hasPeriskope()) {
    return { ok: false, fromE164, status: 0, error: 'PERISKOPE_API_TOKEN missing' };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/message/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'x-phone': fromE164,
      },
      body: JSON.stringify({
        chat_id: `${toE164}@c.us`,
        message,
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, fromE164, status: res.status, data };
  } catch (err) {
    return { ok: false, fromE164, status: 0, error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Internal: single-attempt document send via a specific sender number.
 * The fallback walking lives in `sendWhatsAppDocument` below.
 */
async function sendDocumentViaNumber(
  fromE164: string,
  input: { toE164: string; url: string; filename: string; caption?: string; timeoutMs?: number },
): Promise<SendMessageResult> {
  if (!hasPeriskope()) {
    return { ok: false, fromE164, status: 0, error: 'PERISKOPE_API_TOKEN missing' };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), input.timeoutMs ?? 20000);
  try {
    const res = await fetch(`${BASE}/message/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'x-phone': fromE164,
      },
      body: JSON.stringify({
        chat_id: `${input.toE164}@c.us`,
        message: input.caption ?? '',
        media: { type: 'document', url: input.url, filename: input.filename },
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, fromE164, status: res.status, data };
  } catch (err) {
    return { ok: false, fromE164, status: 0, error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Send a WhatsApp document (PDF/image) via Periskope, with the SAME pinned-
 * sender + full-pool fallback chain as `sendWhatsApp` for text. Earlier this
 * function had no fallback at all — when the pinned sender (Anandita)
 * returned 401 ("phone server instance switched off"), the document silently
 * vanished while the intro text still went out via sendWhatsApp's fallback.
 * Visitor saw "sharing the doc you requested" with no actual doc attached.
 *
 * `url` must be publicly reachable HTTPS — Periskope fetches it on their side.
 */
export async function sendWhatsAppDocument(input: {
  toE164: string;
  fromE164: string;
  url: string;
  filename: string;
  caption?: string;
  timeoutMs?: number;
}): Promise<SendMessageResult> {
  if (!hasPeriskope()) {
    return { ok: false, fromE164: input.fromE164, status: 0, error: 'PERISKOPE_API_TOKEN missing' };
  }
  const attempted = new Set<string>();
  let lastResult: SendMessageResult | null = null;

  // 1) Pinned sender first (e.g. Anandita for thread continuity).
  attempted.add(input.fromE164);
  const pinned = await sendDocumentViaNumber(input.fromE164, input);
  if (pinned.ok) return pinned;
  lastResult = pinned;
  console.warn(
    '[periskope/sendWhatsAppDocument] pinned sender failed, falling back to all active senders:',
    input.fromE164,
    pinned.status,
    pinned.error,
  );

  // 2) Walk every active sender — same logic as sendWhatsApp.
  const pool = await getAllActiveSenders();
  for (const from of pool) {
    if (attempted.has(from)) continue;
    attempted.add(from);
    const result = await sendDocumentViaNumber(from, input);
    if (result.ok) return result;
    lastResult = result;
    console.warn(
      '[periskope/sendWhatsAppDocument] sender failed, trying next:',
      from,
      result.status,
      result.error,
    );
  }
  return lastResult ?? { ok: false, fromE164: input.fromE164, status: 0, error: 'all sender numbers failed' };
}

/**
 * Send a WhatsApp message, walking ALL active sender numbers until one
 * succeeds. No more "give up after 3" — if 7 numbers are dead and the
 * 8th works, we deliver via the 8th. The cost is at most a few extra
 * fetch calls in the worst case, paid only on outright failure.
 *
 * Pinned-sender behaviour (input.fromE164):
 *   The caller pins a sender (e.g. ShareRequestTile pins Anandita for thread
 *   continuity). We try that number FIRST. If it succeeds, return — visitor
 *   sees the intended sender. If it FAILS (Periskope phone instance switched
 *   off, sender disconnected, etc.), we fall back to walking every other
 *   active number. Thread continuity is a nice-to-have; OTP delivery is
 *   the contract.
 *
 * Returns the LAST attempted result on full failure so the caller can see
 * the most recent Periskope error (e.g. UNAUTHORIZED_ERROR / phone off).
 */
export async function sendWhatsApp(input: SendMessageInput): Promise<SendMessageResult> {
  const attempted = new Set<string>();
  let lastResult: SendMessageResult | null = null;

  // Try pinned sender first (if any).
  if (input.fromE164) {
    attempted.add(input.fromE164);
    const pinned = await sendViaNumber(input.fromE164, input.toE164, input.message);
    if (pinned.ok) return pinned;
    lastResult = pinned;
    console.warn(
      '[periskope/sendWhatsApp] pinned sender failed, falling back to all active senders:',
      input.fromE164,
      pinned.status,
      pinned.error,
    );
  }

  // Walk EVERY active sender. Order: least-recently-used first (round-robin
  // courtesy) but we don't stop until either one works or we've tried them all.
  const pool = await getAllActiveSenders();
  if (pool.length === 0) {
    return lastResult ?? { ok: false, fromE164: null, status: 0, error: 'no active sender numbers' };
  }
  for (const from of pool) {
    if (attempted.has(from)) continue;
    attempted.add(from);
    const result = await sendViaNumber(from, input.toE164, input.message);
    if (result.ok) return result;
    lastResult = result;
    console.warn(
      '[periskope/sendWhatsApp] sender failed, trying next:',
      from,
      result.status,
      result.error,
    );
  }

  // All numbers exhausted. Return the last specific failure (so the caller
  // logs an actionable error like "phone instance switched off") rather
  // than a generic "all sender numbers failed".
  return (
    lastResult ?? { ok: false, fromE164: null, status: 0, error: 'all sender numbers failed' }
  );
}

/**
 * Re-export for callers that just want the round-robin pick (e.g. document
 * sends that don't need to walk every number on failure). The full-pool
 * walk is reserved for OTP sends where delivery is critical.
 */
export { pickNextSender };

/**
 * Build the OTP WhatsApp message. Professional, English-only, no em-dashes.
 */
export function buildOtpMessage(name: string | null | undefined, otp: string): string {
  const firstName = name && name.trim() ? name.trim().split(/\s+/)[0] : null;
  const greet = firstName ? `Hi ${firstName},` : 'Hello,';
  return (
    `${greet}\n\n` +
    `Your ASBL Loft verification code is *${otp}*.\n\n` +
    `This code is valid for 5 minutes. Please do not share it with anyone.\n\n` +
    `ASBL Loft Team`
  );
}

/**
 * Upsert a contact into Periskope. Sender number is needed because Periskope's
 * API scopes contacts per connected phone (multi-tenant by sender).
 */
export async function upsertPeriskopeContact(input: {
  toE164: string;
  name: string;
  labels?: string[];
  fromE164?: string;
}): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  if (!hasPeriskope()) return { ok: false, status: 0, error: 'PERISKOPE_API_TOKEN missing' };
  const from = input.fromE164 ?? (await pickNextSender());
  if (!from) return { ok: false, status: 0, error: 'no active sender' };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${BASE}/contacts/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'x-phone': from,
      },
      body: JSON.stringify({
        contact_name: input.name,
        contact_id: input.toE164,
        labels: (input.labels ?? []).join(','),
        is_internal: false,
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}
