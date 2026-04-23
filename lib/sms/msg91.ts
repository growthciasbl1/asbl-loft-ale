/**
 * MSG91 SMS OTP client.
 *
 * India DLT compliance means every SMS needs a pre-approved DLT template.
 * Free-tier trial works without DLT only when testing to the signup phone.
 * For production, MSG91_TEMPLATE_ID env var must be set to a DLT-registered
 * template id in your MSG91 account.
 *
 * If MSG91_TEMPLATE_ID is missing, sendMsg91Otp is a silent no-op and returns
 * { ok: false, reason: 'not_configured' }. This lets the rest of the OTP flow
 * (WhatsApp via Periskope) proceed normally while SMS waits for DLT setup.
 */

const AUTHKEY = process.env.MSG91_AUTH_KEY || '';
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const SENDER_ID = process.env.MSG91_SENDER_ID || '';

export function hasMsg91(): boolean {
  return !!AUTHKEY && !!TEMPLATE_ID;
}

export interface Msg91SendResult {
  ok: boolean;
  reason?: 'not_configured' | 'http_error' | 'network_error' | 'api_error';
  status?: number;
  data?: unknown;
  error?: string;
}

/**
 * Send a WhatsApp / SMS OTP via MSG91. The `otp` we pass in is the exact code
 * MSG91 inserts into the DLT template (via the `otp` variable we registered).
 * MSG91 handles delivery + retry internally.
 *
 * The template on MSG91 should be:
 *   "Dear ##name##, your ASBL Loft verification code is ##otp##.
 *    Valid for 5 minutes. Do not share. - ASBL"
 * and the template registered on DLT with the same body.
 */
export async function sendMsg91Otp(input: {
  toE164: string; // 919876543210 (country-code + number, no +)
  otp: string;
  name?: string;
  timeoutMs?: number;
}): Promise<Msg91SendResult> {
  if (!hasMsg91()) return { ok: false, reason: 'not_configured' };

  const url = new URL('https://control.msg91.com/api/v5/otp');
  url.searchParams.set('template_id', TEMPLATE_ID);
  url.searchParams.set('mobile', input.toE164);
  url.searchParams.set('otp', input.otp);
  url.searchParams.set('otp_expiry', '5'); // minutes
  if (SENDER_ID) url.searchParams.set('sender', SENDER_ID);
  // Pass custom variables into the DLT template
  if (input.name) {
    url.searchParams.set(
      'extra_param',
      JSON.stringify({ name: input.name.split(/\s+/)[0] }),
    );
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), input.timeoutMs ?? 10000);
  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        authkey: AUTHKEY,
        'Content-Type': 'application/json',
      },
      // MSG91 v5 API also accepts POST body — we pass the extra var there
      body: JSON.stringify(
        input.name ? { name: input.name.split(/\s+/)[0] } : {},
      ),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    const apiOk = data?.type === 'success' || res.ok;
    return { ok: apiOk, status: res.status, data };
  } catch (err) {
    return { ok: false, reason: 'network_error', error: (err as Error).message };
  } finally {
    clearTimeout(t);
  }
}
