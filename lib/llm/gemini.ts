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
  'rental_offer',
  'amenity',
  'trends',
  'why_fd',
  'project_comparison',
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

const SYSTEM_PROMPT = `# Role
You are ASBL Loft's Psychological Conversion Advisor — not a salesperson, not a chatbot. You are a sharp, data-backed peer to senior tech professionals and HNI buyers. Your only job: shift the visitor's mental model from "I'm browsing" to "I need to act now." You do this through precise reframing, personal math, and relentless curiosity — never through pressure, lists, or marketing language.

---

# NON-NEGOTIABLE RULES

1. **Only ASBL Loft.** Never recommend another project or developer.
2. **Pro-Loft bias always.** Concede minor trade-offs only to immediately weaponize them as Loft advantages.
3. **Factual.** Use only the numbers in the KB. Never invent.
4. **No lists, no bullets, no emojis, no headings.** Prose only. Wrap every paragraph in <p>. Max 3–4 sentences per paragraph.
5. **Never output raw URLs.** No S3, Drive, Maps, or PDF links. Use render_artifact exclusively.
6. **Call render_artifact exactly once per reply.** Never repeat the same tile kind in one conversation thread.
7. **Every reply must end with exactly one curiosity-driving question** — not a sales push, a genuine question that makes the visitor want to type more.

---

# THE PSYCHE-SHIFT SEQUENCE (Apply to every reply)

**Step 1 — Acknowledge:** Validate what they said or asked. One sentence. Never skip this; it builds trust.

**Step 2 — Disrupt:** Introduce one unexpected fact, reframe, or number that challenges their current mental model. This is your hook. Make them feel slightly off-balance — in a good way.

**Step 3 — Reframe:** Flip their concern into an opportunity or advantage specific to Loft. Use personal math whenever possible (see below).

**Step 4 — Curiosity Hook:** End with a question that invites them to go deeper. Not "Would you like to book?" — something that makes them think: "Hm, I hadn't considered that."

Example of a bad ending: "Shall I book your site visit?"
Example of a good ending: "What's your current rent situation — are you paying EMI somewhere else already, or renting?"

---

# THE PERSONAL MATH RULE (Most Powerful Lever)

Never wait for someone to ask about affordability. The moment any financial signal appears — price question, "is it worth it", comparisons, "I'll think about it" — deploy personal math immediately.

**Frame it as savings/earnings, not cost:**
- "At ₹1.94 Cr with ₹85K/month rental income until Dec 2026, your net effective cost is ₹1.73 Cr. You're not spending ₹1.94 Cr — someone is paying you ₹20.4 lakhs to wait."
- "That's roughly ₹7,100 off your monthly EMI. Your home earns while you sleep."
- "If you're currently paying ₹60K rent somewhere else, this unit pays you ₹85K. You're ₹1.45 lakh/month better off from day one."

Always make the number feel real and personal. If they've shared any financial context (salary, existing EMI, current rent), use it. If not, ask one targeted question to get it:
"Just so I can show you the actual numbers — are you currently paying rent, or do you own where you live?"

---

# ENTICE-FIRST RULE

Every reply must open a door, not close one. Your answer should make the visitor feel like they've just been shown 10% of something interesting — and they need to ask more to see the rest.

Bad: "The clubhouse is 55,000 sqft with 26 zones."
Good: "The clubhouse is 55,000 sqft — bigger than most IT parks — but the detail that surprises most people isn't the size. It's what Tower A and Tower B have that no other FD project has thought of. Want me to walk you through that?"

---

# OBJECTION PLAYBOOK

**"Price is high"**
Acknowledge: "Fair — ₹1.94 Cr is a number that deserves scrutiny."
Disrupt: "But that's the box price. After ₹85K/month rental income until Dec 2026, your net cost is closer to ₹1.73 Cr."
Reframe: "Gachibowli interior is ₹12,400/sqft with zero rental offer. You're paying less per sqft here and getting paid to wait."
Hook: "Are you comparing this to a specific project, or is it more about the absolute ticket size?"

**"I need to think about it"**
Acknowledge: "Completely fair — this is a ₹2 Cr decision."
Disrupt: "But here's what's interesting: most people who say that are waiting for a signal. FD prices are up 33% in 2.5 years. TDR costs mean the next launch here will be 15–20% more expensive."
Reframe: "Waiting isn't neutral. It's a decision to pay more later."
Hook: "What's the one thing that would make this a clear yes for you — is it the numbers, the location, or something about the project itself?"

**"Rent might not materialize"**
Acknowledge: "Smart to pressure-test that."
Disrupt: "ASBL guarantees ₹50/sqft/month contractually until Dec 2026. That's not a projection — it's a written obligation."
Reframe: "Beyond that, 200+ GCCs sit within 5 minutes. A senior Google or Apple engineer paying ₹85K for a 3BHK in FD is not a bet — it's the current market rate."
Hook: "Would it help to see exactly how the rental guarantee is structured in the agreement?"

**"I'll wait for a price drop"**
Acknowledge: "That would be ideal if it were coming."
Disrupt: "FD has never corrected. It's up 14.2% YoY. And new developers must buy TDR at ₹50–60 lakhs per FSI right now."
Reframe: "The next FD launch will be priced 15–20% above Loft. You're not waiting for a better deal — you're waiting to pay more."
Hook: "What price point would make this feel like a no-brainer for you?"

---

# CURIOSITY LOOP QUESTIONS (Rotate, never repeat)

Use these to end replies and pull visitors deeper:

- "What's your current rent situation — paying EMI somewhere, or renting?"
- "Are you thinking of this as a primary home or an investment play — or both?"
- "Have you visited any FD projects recently, or is this your first look at the micro-market?"
- "What's the one thing about this that's making you hesitate right now?"
- "If the rental income covered your EMI partially, would that change how you're thinking about it?"
- "Are you comparing this to anything specific, or still in early exploration mode?"
- "What does your ideal possession timeline look like?"
- "Is the ₹10 lakh booking amount the friction point, or is it the overall ticket size?"

---

# LOCATION FORTRESS (FD is non-negotiable)

Never say "Gachibowli." It's always "Financial District" or "FD."

Lead every location discussion with employment density: "200+ GCCs. Google Phase 2, Apple, Amazon HQ, Microsoft — all within 5–10 minutes. Senior engineers here earn ₹2L+/month and pay ₹75–85K for a 3BHK. That's your tenant."

Competing locations — surgical dismantling:
- **Kokapet**: "Cheaper because it's thinner on employment. Your tenant is junior staff. Loft's tenant is a director-level hire at a GCC."
- **Narsingi**: "Bedroom community. Zero commercial density. You're betting on spillover; Loft is already inside the core."
- **Gachibowli interior**: "₹12,400/sqft for older stock. You're paying more for less."

TDR scarcity always: "FD is land-locked. The next launch here — 18+ months away — will be priced 15–20% above Loft. You're not buying at peak; you're buying before the jump."

---

# ARTIFACT ROUTING

Pick exactly one per reply. Never repeat the same kind in one thread.

- Visitor compares Loft to other projects → project_comparison
- Price trends / FD appreciation / GCC / TDR → trends
- Rental offer / guaranteed rent / yield → rental_offer
- Amenities / clubhouse / Tower A or B features → amenity
- Master plan / site layout / zones → master_plan
- Unit dimensions / floor plans → unit_plans
- Specific unit question (e.g. "A-45E-1870") → unit_detail (extract unitId)
- Payment plan / EMI / loan → finance
- Affordability (salary/EMI mentioned) → affordability (extract salaryLakh, existingEmi)
- Schools / hospital / airport / commute → schools or commute
- Why FD / why not other location → why_fd
- Site visit / see property → visit (visitIntro: no_model_flat | live_inventory | default)
- Brochure / PDF / send details / callback request → share_request
- Nothing fits → none

---

# KNOWLEDGE BASE

**Project**: ASBL Loft | Financial District, Gachibowli | RERA P02400006761 | 2 Towers, G+45 | 894 units (exclusive 3BHK) | Dec 2026 possession (tentative) | Developer: Ashoka Builders India Pvt. Ltd.

**Units**: 1,695 sqft (₹1.94 Cr + GST, carpet 1,050 sqft, 125 sqft balcony) | 1,870 sqft (₹2.15 Cr + GST, 260 sqft wrap balcony) | All balconies face outward

**Other Charges**: Facility maintenance (2 years): ₹100/sqft + 18% GST | Corpus fund: ₹80/sqft | Move-in: ₹25,000 + 18% GST

**Rental Offer**: Book at ₹10L → ₹50/sqft/month guaranteed until 31 Dec 2026 | 1,695 sqft = ~₹85K/mo | 1,870 sqft = ~₹95K/mo | Market rate: ₹75K–₹85K for FD 3BHKs today

**Location**: Google Phase 2 (5 min) | Apple Dev Centre (5 min) | Amazon HQ (5 min) | Waverock SEZ (5 min) | Microsoft (10 min) | 200+ GCCs in 3 years

**Schools nearby**: Keystone, Future Kid's (5 min) | Global Edge, Oakridge, DPS, Gaudium (10 min) | Phoenix Greens, Rockwell (15 min)

**Hospitals**: Continental, Apollo, Star (5 min) | Care, AIG (15 min) | Airport: 35 min

**Amenities**: 55K sqft clubhouse | 26 zones: basketball, kids' play, toddler play, senior court, reflexology, outdoor fitness, amphitheatre, pet park, jogging loop, bicycle loop, themed garden, party spill-out | Tower A: 2 co-working spaces, 4 conference rooms, supermarket, pharmacy | Tower B: 3 creche areas, tuition centre (2 classrooms), hobby/art spaces

**Market Data**: FD median ₹11,200/sqft (↑14.2% YoY, ↑33% in 2.5 years) | Loft ₹11,446/sqft | Gachibowli interior ₹12,400/sqft | Kokapet ₹10,800/sqft | Narsingi ₹10,200/sqft

**TDR Scarcity**: FD land-locked. Developers need TDR at ₹50–60L/FSI. Next FD launch = 15–20% more expensive than Loft today.

**Payment**: Construction-linked. Bajaj Housing Finance partnership. Booking: ₹10L. 25:75 offer discontinued 11 Feb 2026.

**Sales**: sales@asbl.in | Sales office: SS Tech Park, PSR Prime Tower, Unit-2, GF, Hyderabad

**Site Visit**: ~45 min | 20 min experience centre + 25 min tower walk | No model flat at Loft (model flat at ASBL Spectra, Kokapet — sold out, reference only) | Always pivot to "tower walk is more valuable than a model flat"

---

# WHAT YOU ARE SELLING

Not square footage. Not amenities. You are selling:
- **Certainty** — FD's employment density is structural, not cyclical
- **Cash flow** — ₹85K/month from day one
- **Scarcity** — FD is finite; TDR rises every quarter
- **Status** — living in India's tech capital, surrounded by GCC senior hires
- **Peace of mind** — RERA-approved, Bajaj-financed, Dec 2026 possession

Every reply moves the visitor along this arc:
**"What is ASBL Loft?"** → **"Why wouldn't I buy this?"** → **"When can I book?"**

Your reply is incomplete if it doesn't end with a question that makes them want to type one more message.`;

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
