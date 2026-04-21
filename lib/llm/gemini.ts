import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
  type FunctionDeclaration,
} from '@google/generative-ai';
import { RouterResult, ArtifactKind } from '@/lib/utils/queryRouter';

export function hasLLM(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ARTIFACT_KINDS: ArtifactKind[] = [
  'price',
  'yield',
  'amenity',
  'trends',
  'why_fd',
  'commute',
  'unit_plans',
  'master_plan',
  'urban_corridors',
  'unit_detail',
  'finance',
  'affordability',
  'plans',
  'schools',
  'visit',
  'share_request',
  'none',
];

/**
 * Triggers that force LLM handling even when regex found a match.
 * Covers comparative questions, information requests, and "explain-me" asks.
 * The issue we fix here: regex for "what happens on a site visit" was returning
 * the visit slot picker again — but the user wants a textual answer.
 */
const COMPARISON_TRIGGERS =
  /\bcompare|\bcompared|\bvs\b|versus|better than|market|insight|analysis|thoughts on|opinion|worth it|good\s*investment|should\s*i|help.*decide|which.*better|perspective|outlook/i;

const INFO_TRIGGERS =
  /\bwhat\s+(happens|will|should|does|do\s+i|is\s+it|am\s+i|to\s+expect|if\b)|\bhow\s+(does|do|will|long|many|much|often|is|are)|\bwhy\b|\bexplain\b|\btell\s+me\s+about\b|\bwalk\s+me\s+through\b|\bwhat'?s\s+it\s+like\b|\bdescribe\b|\belaborate\b|\bquestion\b|\breason/i;

export function shouldUseLLM(query: string, regexReturnedNone: boolean): boolean {
  if (!hasLLM()) return false;
  if (regexReturnedNone) return true;
  if (COMPARISON_TRIGGERS.test(query)) return true;
  if (INFO_TRIGGERS.test(query)) return true;
  return false;
}

const SYSTEM_PROMPT = `You are ASBL Loft's in-house advocate — a sharp, candid advisor whose entire job is to help the user evaluate ASBL Loft (a 3BHK residential project in Financial District, Hyderabad).

Non-negotiable rules:
1. You only speak about ASBL Loft. Never recommend another project or developer.
2. In any comparison (FD vs Gachibowli vs Kokapet, Loft vs anything else), argue from Loft's angle. Concede minor trade-offs only if obvious, then pivot back to why Loft fits.
3. Be factual and concrete. Use numbers. Never invent facts beyond the ones listed below.
4. No marketing fluff, no headings, no bullet lists, no emojis. 1–4 short sentences. Wrap each paragraph in <p>.
5. If the user asks an informational/explanatory question ("what happens on a site visit", "how does the payment plan work", "walk me through"), write a real text answer AND, if relevant, call render_artifact with a related tile. If the topic has no matching tile, pick kind="none".
6. Never redundantly render the same kind of tile the user was already shown — if they just saw the visit tile and now ask "what happens on a visit", answer in text and pick kind="none".

Facts:
- Handover December 2026, under construction.
- Tower A + Tower B, G+50, 893 total units, 228 currently available.
- 3BHK only. 1,695 sqft (₹1.94 Cr base, 125 sqft balcony) and 1,870 sqft (₹2.15 Cr base, 260 sqft wrap balcony).
- 14 min to HITEC City, 4 min to Nanakramguda ORR, 28 min to airport, Raidurg Metro opens 2027.
- Rental yield 2.6–3.5% gross; rents ₹45K–₹60K/mo for 1,695, ₹55K–₹70K/mo for 1,870.
- District median ₹9,850/sqft; Loft at ₹9,400/sqft — supply-driven gap, not quality.
- 50K+ tech professionals within 15-min drive (Amazon, Microsoft, Deloitte, NVIDIA).
- 6 K–12 schools in 12 min: DPS, Oakridge, Chirec, Gaudium, Meridian, Glendale.
- Model flat is at ASBL Spectra (every FD project is under construction).
- Payment structures: Bajaj (5.5% booking) or standard banks (10% booking), construction-linked.
- Site visit: ~45 min, 20 min at experience centre + 25 min tower walk. Visitor meets a named RM (not a sales desk).
- RERA TS P02400006761.

Artifact kinds:
price, yield, amenity, trends, why_fd, commute, unit_plans, master_plan, urban_corridors, unit_detail (extract unitId A-45E-1870), finance, affordability (extract salaryLakh, existingEmi if given), plans, schools, visit (visitIntro: no_model_flat | live_inventory | default), share_request (ANY send/share/WhatsApp/PDF request — never return a browse artifact in that case), none.

Always call render_artifact exactly once.`;

const renderArtifactDecl: FunctionDeclaration = {
  name: 'render_artifact',
  description:
    'Render the most relevant tile for the user query. If no tile fits and you are giving a plain text answer, use kind="none".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      kind: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ARTIFACT_KINDS,
        description: 'Which artifact tile to render.',
      },
      label: {
        type: SchemaType.STRING,
        description: 'Short title for the tile strip.',
      },
      unitId: {
        type: SchemaType.STRING,
        description: 'For unit_detail only — unit id like A-45E-1870.',
      },
      salaryLakh: {
        type: SchemaType.NUMBER,
        description: 'For affordability — annual salary in lakhs.',
      },
      existingEmi: {
        type: SchemaType.NUMBER,
        description: 'For affordability — existing monthly EMI in rupees.',
      },
      visitIntro: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['default', 'no_model_flat', 'live_inventory'],
        description: 'For visit — pick a framing.',
      },
      shareSubject: {
        type: SchemaType.STRING,
        description:
          'For share_request — short noun phrase of what the visitor wants sent, e.g. "1,695 sqft East floor plan PDF".',
      },
    },
    required: ['kind'],
  },
};

export interface LLMContext {
  seenArtifacts?: string[];
  pinnedUnits?: string[];
  campaign?: string;
}

interface ToolArgs {
  kind?: string;
  label?: string;
  unitId?: string;
  salaryLakh?: number;
  existingEmi?: number;
  visitIntro?: 'default' | 'no_model_flat' | 'live_inventory';
  shareSubject?: string;
}

function normalizeText(text: string): string {
  const clean = text.trim();
  if (!clean) return '';
  if (clean.startsWith('<p>')) return clean;
  // split on blank lines, wrap each in <p>
  return clean
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para.trim())}</p>`)
    .join('');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

export async function routeWithLLM(
  query: string,
  ctx: LLMContext = {},
  opts?: { timeoutMs?: number }
): Promise<RouterResult | null> {
  if (!hasLLM()) return null;

  const ctxLines: string[] = [];
  if (ctx.campaign && ctx.campaign !== 'default')
    ctxLines.push(`Visitor arrived from campaign: ${ctx.campaign}.`);
  if (ctx.seenArtifacts?.length)
    ctxLines.push(`Already shown (most recent first): ${ctx.seenArtifacts.join(', ')}.`);
  if (ctx.pinnedUnits?.length)
    ctxLines.push(`User has pinned: ${ctx.pinnedUnits.join(', ')}.`);
  const sessionBlock = ctxLines.length ? `\n\nSession context:\n${ctxLines.join('\n')}` : '';

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT + sessionBlock,
      tools: [{ functionDeclarations: [renderArtifactDecl] }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
      generationConfig: { temperature: 0.35 },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 12000);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: query }] }],
    });
    clearTimeout(timeoutId);

    const response = result.response;
    const rawText = response.text() || '';
    const text = normalizeText(rawText);

    const calls = response.functionCalls();
    const firstCall = calls?.[0];

    if (!firstCall) {
      return {
        text: text || '<p>Happy to dig deeper — what matters most to you?</p>',
        artifact: 'none',
      };
    }

    const args = (firstCall.args || {}) as ToolArgs;
    const rawKind = (args.kind ?? 'none') as ArtifactKind;
    const kind: ArtifactKind = ARTIFACT_KINDS.includes(rawKind) ? rawKind : 'none';

    return {
      text: text || '<p>Here you go.</p>',
      artifact: kind,
      artifactLabel: args.label,
      unitId: args.unitId,
      salaryLakh: args.salaryLakh,
      existingEmi: args.existingEmi,
      visitIntro: args.visitIntro,
      shareSubject: args.shareSubject,
      originalQuery: query,
    };
  } catch (err) {
    console.error('[llm/gemini] failed, falling back to regex:', err);
    return null;
  }
}

/**
 * Context-aware "what next" suggestion row. Falls back to a heuristic if no key or on failure.
 */
export async function suggestNext(
  ctx: LLMContext,
  opts?: { timeoutMs?: number }
): Promise<{ label: string; query: string }[]> {
  const fallback = heuristicSuggestions(ctx);
  if (!hasLLM()) return fallback;

  const seenLine = ctx.seenArtifacts?.length
    ? `Already seen: ${ctx.seenArtifacts.join(', ')}.`
    : 'Just arrived.';
  const campaignLine = ctx.campaign && ctx.campaign !== 'default' ? `Campaign: ${ctx.campaign}.` : '';
  const pinLine = ctx.pinnedUnits?.length ? `Pinned: ${ctx.pinnedUnits.join(', ')}.` : '';

  const prompt = `You are ASBL Loft's advisor. Given the session context, propose the 3 best next things the visitor should look at. Rules:
- 3 suggestions, do not repeat already-seen.
- Each label under 28 characters.
- Each query 4–12 words, sounds like a buyer would ask.
- Pro-Loft: nudge toward conversion-relevant tiles (visit, affordability, price, finance).
- Return JSON only: {"suggestions":[{"label":"...","query":"..."}]}

Session:
${seenLine}
${campaignLine}
${pinLine}`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) return fallback;
    const parsed = JSON.parse(text) as { suggestions?: { label: string; query: string }[] };
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) return fallback;
    return parsed.suggestions
      .filter((s) => s?.label && s?.query)
      .slice(0, 3)
      .map((s) => ({ label: String(s.label).slice(0, 32), query: String(s.query).slice(0, 140) }));
  } catch (err) {
    console.error('[llm/suggestNext] fallback:', err);
    return fallback;
  }
}

function heuristicSuggestions(ctx: LLMContext): { label: string; query: string }[] {
  const seen = new Set((ctx.seenArtifacts ?? []).map((s) => s.toLowerCase()));
  const all: { key: string; label: string; query: string }[] = [
    { key: 'unit_plans', label: 'Unit floor plans', query: 'Show me the 3BHK unit floor plans' },
    { key: 'master_plan', label: 'Master plan', query: 'Show me the master plan' },
    { key: 'price', label: 'Price breakdown', query: 'Show full price breakdown 1695 East' },
    { key: 'affordability', label: 'Can I afford it?', query: 'Check affordability · salary 30L' },
    { key: 'finance', label: 'Cash-on-cash', query: 'Open the levered finance calculator' },
    { key: 'yield', label: 'Rental yield', query: 'What rental yield can I expect?' },
    { key: 'schools', label: 'Schools nearby', query: 'What schools are within 12 minutes?' },
    { key: 'visit', label: 'Book a visit', query: 'Book a weekend site visit' },
  ];
  return all.filter((x) => !seen.has(x.key)).slice(0, 3);
}
