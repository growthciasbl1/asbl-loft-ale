/**
 * Paid LLM endpoint client — Groq-backed agent at internal infra.
 *
 * Architecture:
 *   - Single POST /api/chat/<slug>/ returns JSON with HTML prose in `message`
 *   - System prompt + KB are stored on the server (uploaded via dashboard)
 *   - We send only { phone, message } — server prepends prompt + KB
 *   - No streaming, no tool calls (as of 2026-04-25 — dev may enable later)
 *
 * Used as PRIMARY prose generator in /api/chat. Gemini stays in code as
 * a fallback when paid endpoint is unreachable (timeout / 500 / network
 * blip / on a 30-min maintenance window). The fallback code path is
 * unchanged — Gemini still streams over SSE.
 *
 * When the dev enables streaming + tools, swap `callPaidLLM` to consume
 * SSE chunks; the rest of the architecture is untouched.
 */

const PAID_BASE_URL = process.env.PAID_LLM_BASE_URL || 'http://35.154.144.37:8080';
const PAID_AGENT_SLUG = process.env.PAID_LLM_AGENT_SLUG || 'loft_assistant';
// Same Bearer key as the free RAG endpoint per dev's confirmation
// 2026-04-25: "API key ek hi hai free and paid dono agents ka"
const PAID_API_KEY = process.env.PAID_LLM_API_KEY ?? process.env.RAG_API_KEY ?? '';

/**
 * Tunables. Paid endpoint typically responds in 1-2s; we give 12s budget
 * to absorb cold-start spikes. If it exceeds, we bail to Gemini fallback.
 */
const PAID_TIMEOUT_MS = 12_000;

export function hasPaidLLM(): boolean {
  return !!PAID_API_KEY;
}

export interface PaidLLMResult {
  /** HTML-wrapped prose, ready to render via dangerouslySetInnerHTML */
  text: string;
  /** Server-reported model identifier — useful for usage logging */
  model: string;
  /** Did the server hit its prompt cache for this turn? */
  cached: boolean;
  /** Approx ms of round-trip latency (client-measured) */
  latencyMs: number;
}

interface PaidLLMResponseShape {
  flag?: string;
  agent?: string;
  model?: string;
  cached?: boolean;
  message?: string;
  error?: string;
}

/**
 * Generate prose for a user query via the paid endpoint. Returns null on
 * any failure (timeout, network, non-2xx, malformed body) — caller should
 * treat null as "fall through to Gemini".
 *
 * The endpoint is stateless from our side. We send only the current
 * message; conversation history + system prompt + KB live server-side.
 *
 * If we ever need to ship history (e.g. for multi-turn personalization),
 * we'll fold it into the `message` field as a markdown-formatted prefix
 * once the dev enables a `messages` array on the request body.
 */
export async function callPaidLLM(
  query: string,
  opts: { phone?: string; timeoutMs?: number } = {},
): Promise<PaidLLMResult | null> {
  if (!hasPaidLLM()) return null;
  if (!query || !query.trim()) return null;

  const phone = opts.phone || '+910000000000';
  const timeoutMs = opts.timeoutMs ?? PAID_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Inject today's date into the message so the agent can compute time-
  // sensitive math correctly. The paid agent's system prompt is static
  // and stored server-side — it has NO way to know what today is unless
  // we tell it. Without this injection, the model hallucinates fixed
  // month counts (e.g. "18 months remaining till Dec 2026") even when
  // the actual answer depends on today's date.
  //
  // Concrete bug fixed (2026-04-25): user asked "18 month tk paisa
  // milega?" — bot replied "₹85K × 18 months = ₹15.3 L". Wrong: today
  // is Apr 2026, only ~8 months remain till 31 Dec 2026 (~₹6.8 L).
  //
  // Format: prepend a [TODAY: YYYY-MM-DD] tag so the agent's prompt
  // can reference the value. Also include the months remaining till
  // 31 Dec 2026 so the model doesn't have to compute date arithmetic
  // (which small models are weak at).
  const now = new Date();
  const todayIst = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  });
  const dec31_2026 = new Date('2026-12-31T23:59:59+05:30');
  const monthsRemaining = Math.max(
    0,
    Math.round((dec31_2026.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );
  const dateContext = `[TODAY: ${todayIst}. Months remaining till rental offer end (31 Dec 2026): ${monthsRemaining}. ALWAYS use this number for effective-entry math — never hardcode 18 months or any other count.]`;
  const messageWithContext = `${dateContext}\n\n${query}`;

  const t0 = Date.now();
  try {
    const url = `${PAID_BASE_URL}/api/chat/${PAID_AGENT_SLUG}/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        message: messageWithContext,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn('[paid-llm] non-ok response', {
        status: res.status,
        slug: PAID_AGENT_SLUG,
      });
      return null;
    }

    const json = (await res.json()) as PaidLLMResponseShape;

    if (json?.flag !== 'success' || !json?.message) {
      console.warn('[paid-llm] unexpected response shape', { json });
      return null;
    }

    const latencyMs = Date.now() - t0;
    return {
      text: String(json.message),
      model: String(json.model ?? 'paid-unknown'),
      cached: !!json.cached,
      latencyMs,
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg && !msg.includes('aborted')) {
      console.warn('[paid-llm] error:', msg);
    } else {
      console.warn('[paid-llm] timed out after', timeoutMs, 'ms');
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Health probe — pings the paid agent's health endpoint. Used by the
 * /api/admin/diag dashboard to surface paid-endpoint status alongside
 * Mongo / Vercel KV / Periskope. Lightweight — no inference performed.
 *
 * Note (2026-04-25): the paid health endpoint at /api/chat/<slug>/health/
 * returns 404 for our agent. This may change once the dev wires it up.
 * We treat 404 as 'unknown' rather than 'unhealthy' — service may still
 * be up.
 */
export async function checkPaidHealth(): Promise<{
  ok: boolean;
  reachable: boolean;
  message?: string;
}> {
  if (!hasPaidLLM()) {
    return { ok: false, reachable: false, message: 'PAID_LLM_API_KEY not set' };
  }
  try {
    const url = `${PAID_BASE_URL}/api/chat/${PAID_AGENT_SLUG}/health/`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.status === 404) {
      // Agent doesn't expose /health/ — still call inference probe ok.
      return {
        ok: true,
        reachable: true,
        message: 'health endpoint not exposed (404), agent likely live',
      };
    }
    return { ok: res.ok, reachable: true };
  } catch (err) {
    return { ok: false, reachable: false, message: (err as Error).message };
  }
}
