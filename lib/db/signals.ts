import { ObjectId } from 'mongodb';
import { getDb, hasMongo } from './mongo';

export interface ConversationSignalDoc {
  _id?: ObjectId;
  conversationId: string;
  turnNumber: number;
  userQuery: string;
  botReplyText: string;
  artifactKind?: string;
  createdAt: Date;
  // Parsed signal fields (best-effort)
  structuralAnchors?: {
    geo_context?: string;
    primary_intent?: string;
    decision_mode?: string;
    rtb_score?: number;
    wtb_score?: number;
    mind_shift_stage?: number;
    stage_delta?: number;
  };
  traitsObserved?: string[];
  keyFactsExtracted?: Record<string, unknown>;
  objectionSurface?: string[];
  conversationIntelligence?: Record<string, unknown>;
  edgeCaseFlag?: string;
  nextBestActionForSales?: string;
  briefing?: string;
  // Full raw payload for debugging / schema evolution
  rawSignal?: Record<string, unknown>;
}

/**
 * Extract the <signal>{...}</signal> JSON block from the LLM raw text.
 * Returns { cleanText, signal } — cleanText has the block stripped out.
 * Non-greedy multiline-safe regex. Never throws — on parse failure returns signal=null.
 */
export function extractSignal(rawText: string): {
  cleanText: string;
  signal: Record<string, unknown> | null;
} {
  // Well-formed case — one or more <signal>...</signal> blocks
  const m = rawText.match(/<signal>([\s\S]*?)<\/signal>/);
  if (m) {
    // Global strip handles the edge case where Gemini emits two blocks
    const cleanText = rawText.replace(/<signal>[\s\S]*?<\/signal>/g, '').trim();
    try {
      const parsed = JSON.parse(m[1].trim()) as Record<string, unknown>;
      return { cleanText, signal: parsed };
    } catch {
      // Malformed JSON inside the block — still strip so users never see raw JSON
      return { cleanText, signal: null };
    }
  }

  // Defensive: opening <signal> without a closing tag (rare, happens if the
  // model truncates mid-generation). Strip from opening to end of string.
  const openIdx = rawText.indexOf('<signal>');
  if (openIdx !== -1) {
    return { cleanText: rawText.substring(0, openIdx).trim(), signal: null };
  }

  return { cleanText: rawText, signal: null };
}

export async function insertSignal(
  conversationId: string,
  turnNumber: number,
  userQuery: string,
  botReplyText: string,
  signal: Record<string, unknown> | null,
  artifactKind?: string,
): Promise<string | null> {
  if (!hasMongo()) return null;
  try {
    const db = await getDb();
    const col = db.collection<ConversationSignalDoc>('conversation_signals');

    const sa = signal?.structural_anchors as Record<string, unknown> | undefined;

    const doc: ConversationSignalDoc = {
      conversationId,
      turnNumber,
      userQuery,
      botReplyText,
      artifactKind,
      createdAt: new Date(),
      structuralAnchors: sa
        ? {
            geo_context: typeof sa.geo_context === 'string' ? sa.geo_context : undefined,
            primary_intent: typeof sa.primary_intent === 'string' ? sa.primary_intent : undefined,
            decision_mode: typeof sa.decision_mode === 'string' ? sa.decision_mode : undefined,
            rtb_score: typeof sa.rtb_score === 'number' ? sa.rtb_score : undefined,
            wtb_score: typeof sa.wtb_score === 'number' ? sa.wtb_score : undefined,
            mind_shift_stage:
              typeof sa.mind_shift_stage === 'number' ? sa.mind_shift_stage : undefined,
            stage_delta: typeof sa.stage_delta === 'number' ? sa.stage_delta : undefined,
          }
        : undefined,
      traitsObserved: Array.isArray(signal?.traits_observed)
        ? (signal!.traits_observed as string[])
        : undefined,
      keyFactsExtracted: (signal?.key_facts_extracted as Record<string, unknown>) ?? undefined,
      objectionSurface: Array.isArray(signal?.objection_surface)
        ? (signal!.objection_surface as string[])
        : undefined,
      conversationIntelligence:
        (signal?.conversation_intelligence as Record<string, unknown>) ?? undefined,
      edgeCaseFlag: typeof signal?.edge_case_flag === 'string' ? signal!.edge_case_flag as string : undefined,
      nextBestActionForSales:
        typeof signal?.next_best_action_for_sales === 'string'
          ? (signal!.next_best_action_for_sales as string)
          : undefined,
      briefing: typeof signal?.briefing === 'string' ? (signal!.briefing as string) : undefined,
      rawSignal: signal ?? undefined,
    };

    const res = await col.insertOne(doc);
    return res.insertedId.toString();
  } catch (err) {
    console.error('[db/signals] insertSignal failed:', err);
    return null;
  }
}
