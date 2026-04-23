import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from './mongo';

/**
 * Gemini 2.5 Flash pricing (as of Jan 2026) — $/1M tokens.
 * https://ai.google.dev/pricing
 */
export const PRICING = {
  input: 0.075 / 1_000_000,
  output: 0.3 / 1_000_000,
  cachedInput: 0.01875 / 1_000_000,
} as const;

export const USD_TO_INR = 87; // manual constant; update as needed

export interface LlmUsageDoc {
  _id?: ObjectId;
  conversationId: string;
  turnNumber: number;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  cachedContentTokens: number;
  totalTokens: number;
  costUsd: number;
  costInr: number;
  artifactKind?: string;
  createdAt: Date;
}

export interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  cachedContentTokenCount?: number;
  totalTokenCount?: number;
}

export function computeCost(meta: UsageMetadata): { usd: number; inr: number } {
  const prompt = meta.promptTokenCount ?? 0;
  const cached = meta.cachedContentTokenCount ?? 0;
  const billedPrompt = Math.max(0, prompt - cached);
  const output = meta.candidatesTokenCount ?? 0;

  const usd =
    billedPrompt * PRICING.input + cached * PRICING.cachedInput + output * PRICING.output;

  return { usd, inr: usd * USD_TO_INR };
}

export async function insertUsage(
  conversationId: string,
  turnNumber: number,
  model: string,
  meta: UsageMetadata,
  artifactKind?: string,
): Promise<string | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const col = db.collection<LlmUsageDoc>('llm_usage');
    const { usd, inr } = computeCost(meta);
    const doc: LlmUsageDoc = {
      conversationId,
      turnNumber,
      model,
      promptTokens: meta.promptTokenCount ?? 0,
      candidatesTokens: meta.candidatesTokenCount ?? 0,
      cachedContentTokens: meta.cachedContentTokenCount ?? 0,
      totalTokens: meta.totalTokenCount ?? 0,
      costUsd: Number(usd.toFixed(6)),
      costInr: Number(inr.toFixed(4)),
      artifactKind,
      createdAt: new Date(),
    };
    const res = await col.insertOne(doc);
    return res.insertedId.toString();
  } catch (err) {
    console.error('[db/usage] insertUsage failed:', err);
    return null;
  }
}
