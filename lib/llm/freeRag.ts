/**
 * Free RAG intent classifier client.
 *
 * Calls the qwen2.5:1.5b agent at the ASBL RAG server and returns one of
 * our ArtifactKind tokens. Used as a routing hint BETWEEN regex (which
 * handles 80% of queries deterministically) and Gemini (which writes the
 * actual prose). The classifier doesn't generate user-facing text — only
 * a single token like "price" / "amenity" / "unsure".
 *
 * Resilience: 3-second hard timeout, validates the response against the
 * allowed-token list, treats anything off-list (or "unsure") as null so
 * the caller falls through to Gemini doing both routing + prose. If the
 * server is down (maintenance window, network blip), we silently return
 * null — the chat keeps working via the existing Gemini path.
 *
 * Cost: $0 (free agent on internal infra).
 */

import type { ArtifactKind } from '@/lib/utils/queryRouter';

const RAG_BASE_URL =
  process.env.RAG_BASE_URL || 'http://35.154.144.37:8080';
const RAG_INTENT_SLUG =
  process.env.RAG_INTENT_SLUG || 'web_intent_classifier';
const RAG_API_KEY = process.env.RAG_API_KEY ?? process.env.GROQ_API_KEY ?? '';

/**
 * The exact 19-token vocabulary the classifier is prompted to output.
 * Anything outside this list is coerced to null so we fall through to
 * Gemini. Must stay in sync with the prompt pasted in the dashboard.
 */
const ALLOWED_INTENTS: ReadonlySet<string> = new Set<string>([
  'price',
  'rental_offer',
  'plans',
  'affordability',
  'roi_calculator',
  'yield',
  'unit_plans',
  'master_plan',
  'urban_corridors',
  'amenity',
  'schools',
  'commute',
  'visit',
  'share_request',
  'project_comparison',
  'why_fd',
  'trends',
  'resale_framework',
]);

export function hasFreeRag(): boolean {
  return !!RAG_API_KEY;
}

interface RagResponse {
  flag?: string;
  agent?: string;
  message?: string;
}

/**
 * Classify a user query into an ArtifactKind. Returns null if:
 *   - Server is down / unreachable
 *   - Server responds outside the 3-second timeout
 *   - Server returns a non-2xx status
 *   - Server returns the literal token "unsure"
 *   - Server returns anything outside the 19-token allowed list
 *
 * Caller should treat null as "regex didn't classify, fall through to
 * Gemini" — never throws.
 *
 * @param query    The user's chat message
 * @param phone    Optional E.164 phone for server-side audit logs
 *                 (defaults to a sentinel if not yet captured)
 * @param timeoutMs Hard timeout — keep tight (default 3000ms) so a slow
 *                 RAG server doesn't degrade chat latency
 */
export async function classifyIntentRAG(
  query: string,
  phone?: string,
  timeoutMs = 3000,
): Promise<ArtifactKind | null> {
  if (!hasFreeRag()) return null;
  if (!query || query.trim().length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${RAG_BASE_URL}/api/chat_rag/${RAG_INTENT_SLUG}/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RAG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone || '+910000000000',
        message: query,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // 500 = server-side error or maintenance; 401/403 = auth issue;
      // 429 = rate-limited. Either way, fall through to Gemini.
      console.warn('[freeRag] non-ok response', {
        status: res.status,
        slug: RAG_INTENT_SLUG,
      });
      return null;
    }

    const json = (await res.json()) as RagResponse;
    const raw = String(json?.message ?? '').trim().toLowerCase();

    // 'unsure' is a valid classifier output that means "fall through to
    // Gemini" — return null so the caller does exactly that.
    if (raw === 'unsure' || raw === '') return null;

    // Defensive: strip any quotes / punctuation the model might add.
    const cleaned = raw.replace(/[^a-z_]/g, '');

    if (ALLOWED_INTENTS.has(cleaned)) {
      return cleaned as ArtifactKind;
    }

    // Off-list (e.g. model wrote "₹85K" or "hello") — log + null.
    console.warn('[freeRag] off-list response', { raw, cleaned });
    return null;
  } catch (err) {
    // AbortError (timeout), network failure, JSON parse error — all
    // degrade silently to null so chat keeps working.
    const msg = (err as Error).message;
    if (msg && !msg.includes('aborted')) {
      console.warn('[freeRag] error:', msg);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Health check — pings the RAG server to confirm it's alive. No auth
 * required for /health/ endpoint per the docs. Used by /api/admin/diag
 * to surface RAG state on the dashboard.
 */
export async function checkRagHealth(): Promise<{
  ok: boolean;
  model?: string;
  message?: string;
}> {
  if (!hasFreeRag()) return { ok: false, message: 'RAG_API_KEY not set' };
  try {
    const url = `${RAG_BASE_URL}/api/chat_rag/${RAG_INTENT_SLUG}/health/`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      ok: res.ok && json.status === 'ok',
      model: typeof json.model === 'string' ? json.model : undefined,
      message: typeof json.message === 'string' ? json.message : undefined,
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
