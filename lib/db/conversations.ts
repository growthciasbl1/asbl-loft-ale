import { getDb, hasMongo } from './mongo';
import type { ConversationDoc } from './schemas';

export interface ConversationTurnInput {
  campaign?: string;
  userText: string;
  botText: string;
  botArtifact?: string;
  botArtifactLabel?: string;
}

/**
 * Upsert a conversation document and append the user + bot messages as two entries.
 * Silent no-op when MONGODB_URI is missing. Never throws — errors logged, not surfaced.
 */
export async function appendConversationTurn(
  conversationId: string,
  input: ConversationTurnInput,
): Promise<void> {
  if (!hasMongo()) return;
  try {
    const db = await getDb();
    const col = db.collection<ConversationDoc>('conversations');
    const now = new Date();

    const userMsg = {
      role: 'user' as const,
      text: input.userText,
      at: now,
    };
    const botMsg = {
      role: 'bot' as const,
      text: input.botText,
      at: new Date(now.getTime() + 1),
      ...(input.botArtifact ? { artifact: input.botArtifact } : {}),
      ...(input.botArtifactLabel ? { artifactLabel: input.botArtifactLabel } : {}),
    };

    await col.updateOne(
      { conversationId },
      {
        $setOnInsert: {
          conversationId,
          createdAt: now,
          ...(input.campaign ? { campaign: input.campaign } : {}),
        },
        $set: { updatedAt: now },
        $push: { messages: { $each: [userMsg, botMsg] } },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('[db/conversations] appendConversationTurn failed:', err);
  }
}
