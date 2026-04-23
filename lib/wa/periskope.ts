import { pickNextSender } from './numbers';

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
 * - strips spaces, dashes, parens, leading +
 * - if starts with "0" and length 11 → assume India, replace 0 with 91
 * - if length 10 → prepend 91
 * Returns null on obvious garbage.
 */
export function normalisePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 14) return digits;
  return null;
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
 * Send a WhatsApp document (PDF/image) via Periskope. The `url` must be a
 * publicly reachable HTTPS URL (Periskope fetches it on their side).
 * Returns success once Periskope acknowledges the queue entry.
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
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), input.timeoutMs ?? 20000);
  try {
    const res = await fetch(`${BASE}/message/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'x-phone': input.fromE164,
      },
      body: JSON.stringify({
        chat_id: `${input.toE164}@c.us`,
        message: input.caption ?? '',
        media: {
          type: 'document',
          url: input.url,
          filename: input.filename,
        },
      }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, fromE164: input.fromE164, status: res.status, data };
  } catch (err) {
    return { ok: false, fromE164: input.fromE164, status: 0, error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Send a WhatsApp message, using round-robin across connected business numbers.
 * On failure, retries up to 2 more numbers (redundancy) before giving up.
 */
export async function sendWhatsApp(input: SendMessageInput): Promise<SendMessageResult> {
  const attempted = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const from = input.fromE164 ?? (await pickNextSender());
    if (!from || attempted.has(from)) {
      // Nothing picked or already tried — stop
      if (!from) return { ok: false, fromE164: null, status: 0, error: 'no active sender numbers' };
      break;
    }
    attempted.add(from);
    const result = await sendViaNumber(from, input.toE164, input.message);
    if (result.ok) return result;
    console.warn('[periskope/sendWhatsApp] attempt failed, retrying:', from, result.status, result.error);
    // If user explicitly passed fromE164, don't retry
    if (input.fromE164) return result;
  }
  return { ok: false, fromE164: null, status: 0, error: 'all sender numbers failed' };
}

/**
 * Build the OTP WhatsApp message — personal, branded, safe.
 */
export function buildOtpMessage(name: string | null | undefined, otp: string): string {
  const greet = name && name.trim() ? `Hi ${name.split(/\s+/)[0]},` : 'Hi,';
  return (
    `${greet} your *ASBL Loft* verification code is *${otp}*.\n\n` +
    `This code is valid for 5 minutes. Please do not share it with anyone.\n\n` +
    `— ASBL Loft Team`
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
