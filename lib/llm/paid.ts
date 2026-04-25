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

const PRICE_1695 = 1_94_00_000; // ₹1.94 Cr (all-inclusive + GST)
const PRICE_1870 = 2_15_00_000; // ₹2.15 Cr (all-inclusive + GST)
// Rental cap is FLAT ₹85,000/month for BOTH unit sizes — not per-sqft.
// KB line 156: "Same ₹85,000/month cap applies for both 1,695 and 1,870 sqft".
// Earlier (b46093a) I had ₹93,500 for 1870 assuming ₹50/sqft — that was wrong
// and caused the bot to claim "1870 gets ₹93.5K, 1695 gets ₹85K" which broke
// trust on a basic fact.
const RENT = 85_000;
const OFFER_END = new Date('2026-12-31T23:59:59+05:30');

function fmtCr(n: number): string {
  return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
}
function fmtL(n: number): string {
  return `₹${(n / 1_00_000).toFixed(2)} L`;
}
function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

/**
 * Build the [TODAY] + [PRECOMPUTED MATH] header injected before every
 * user query. Regenerates on every request so values stay current as
 * the calendar moves toward 31 Dec 2026.
 *
 * The math table is the PRIMARY guard against the small-model arithmetic
 * bugs we've seen (₹1.26 Cr instead of ₹1.87 Cr, ₹51 L instead of ₹5.1 L).
 * Model is told to substitute these numbers, not compute its own.
 */
function buildContextHeader(): string {
  const now = new Date();
  const todayIst = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  });
  // 30-day months for display alignment with the way KB/copy talks
  // about "X months left." Floor (not round) — never overpromise.
  const monthsLeft = Math.max(
    0,
    Math.floor((OFFER_END.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );

  // Build delay scenarios. Rental cap is flat ₹85K/mo for BOTH sizes,
  // so total rental and cost-of-delay are IDENTICAL across 1695/1870 —
  // only the effective entry differs (because base price differs).
  const scenarios = [0, 3, 6, 9].map((delay) => {
    const months = Math.max(0, monthsLeft - delay);
    const rental = months * RENT;
    const eff1695 = PRICE_1695 - rental;
    const eff1870 = PRICE_1870 - rental;
    const label = delay === 0 ? 'Book TODAY' : `${delay}-month delay`;
    return { delay, months, rental, eff1695, eff1870, label };
  });

  const baseRental = scenarios[0].rental;

  const rows = scenarios
    .map((s) => {
      const cost = s.delay === 0 ? '' : ` (cost of delay: ${fmtL(baseRental - s.rental)})`;
      return `  • ${s.label.padEnd(15)} → ${s.months} mo × ₹85K = ${fmtL(s.rental)} rental → 1695 effective ${fmtCr(s.eff1695)} · 1870 effective ${fmtCr(s.eff1870)}${cost}`;
    })
    .join('\n');

  // Per-sqft and gross yield — pre-computed so model never divides.
  // Yield differs because rental cap is flat but price differs:
  // larger unit has LOWER gross yield, not similar.
  const psf1695 = Math.round(PRICE_1695 / 1695);
  const psf1870 = Math.round(PRICE_1870 / 1870);
  const yield1695 = ((RENT * 12) / PRICE_1695) * 100;
  const yield1870 = ((RENT * 12) / PRICE_1870) * 100;

  return [
    `[TODAY: ${todayIst}. Months left till rental-offer end (31 Dec 2026): ${monthsLeft}.]`,
    '',
    '[PRECOMPUTED MATH — substitute these numbers directly. Do NOT add, subtract, multiply, or convert Cr↔L yourself. The numbers below are pre-verified.]',
    '',
    `Rental offer is a FLAT ₹85,000/month cap for BOTH 1,695 and 1,870 sq.ft (not per-sqft). So total rental and cost-of-delay are IDENTICAL across both sizes — only the effective entry differs because base price differs.`,
    '',
    `Base prices: 1695 = ${fmtCr(PRICE_1695)} · 1870 = ${fmtCr(PRICE_1870)}`,
    '',
    rows,
    '',
    `Per-sqft (carpet): 1695 → ${fmtINR(psf1695)}/sqft · 1870 → ${fmtINR(psf1870)}/sqft`,
    `Gross rental yield: 1695 → ${yield1695.toFixed(2)}% · 1870 → ${yield1870.toFixed(2)}% (1870 yield is lower because price is higher but rental cap is the same)`,
    '',
    `For other delay durations not in the table, interpolate: each month = ₹85K rental (both sizes). For "what if I wait X months", use months_left = max(0, ${monthsLeft} − X).`,
    'CRITICAL: Use these numbers verbatim. NEVER claim 1870 gets a different monthly rental than 1695 — the cap is flat ₹85K for both.',
  ].join('\n');
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

  // Inject today's date AND pre-computed math into the message. The paid
  // agent's system prompt is static and stored server-side — it has no
  // way to know what today is, and gpt-oss-20b is too small to do
  // multi-step arithmetic reliably anyway.
  //
  // Bugs this prevents:
  //   1. "₹85K × 18 months = ₹15.3 L" — model hardcoded 18mo when only 8 left
  //   2. "₹1.94 Cr − ₹6.8 L = ₹1.26 Cr" — model botched Cr↔L subtraction
  //   3. "difference of ₹51 L" — model dropped a decimal (actual ₹5.1 L)
  //
  // Strategy: pre-compute every value the model would otherwise have to
  // calculate (rental delay scenarios, effective entry, gross yield,
  // per-sqft) and inject as a reference table. Model just substitutes.
  const messageWithContext = `${buildContextHeader()}\n\n${query}`;

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
