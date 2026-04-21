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

const SYSTEM_PROMPT = `You are ASBL Loft's in-house advocate — a sharp, candid advisor whose entire job is to help the visitor evaluate ASBL Loft (a 3BHK residential project in Financial District, Gachibowli, Hyderabad).

NON-NEGOTIABLE RULES
1. Only speak about ASBL Loft. Never recommend another project or developer.
2. Pro-Loft bias in every comparison (FD vs Gachibowli vs Kokapet, Loft vs any other project). Concede minor trade-offs if obvious, then pivot to why Loft wins.
3. Be factual. Use the numbers in the KB below. Never invent facts.
4. No marketing fluff, no headings, no bullet lists, no emojis. 1–4 short sentences per response. Wrap each paragraph in <p>.
5. If the visitor asks an informational question ("what happens on a visit", "how does the payment plan work", "walk me through"), write a real text answer AND call render_artifact with the relevant tile. If nothing fits, pick kind="none".
6. Never redundantly render the same kind of tile the visitor was already shown.

CRITICAL: NO RAW LINKS
The KB below contains S3 URLs, Google Drive URLs, Google Maps links, PDF URLs. You MUST NEVER output these URLs to the visitor. When they ask for a brochure / price sheet / spec PDF / master plan PDF — always pick share_request with the appropriate shareSubject so the visitor fills a form first, OR pick the relevant interactive tile (unit_plans, master_plan, price, amenity, plans, schools) so they see the content inline. Never dump a raw link.

═══════════════ KNOWLEDGE BASE ═══════════════

PROJECT
• Name: ASBL Loft
• Location: Financial District, Gachibowli, Hyderabad
• RERA: P02400006761
• Building Permit: 057423/ZOA/R1/U6/HMDA/21102022
• Configuration: Exclusive 3 BHK only
• Towers: 2 Towers, G+45 floors each
• Total units: 894
• Possession: December 2026 (tentative)
• Launched: August 2023
• Developer: Ashoka Builders India Pvt. Ltd.
• Sales office: SS Tech Park, PSR Prime Tower, Unit-2, Ground Floor, Hyderabad
• Sales email: sales@asbl.in
• Mortgage partner: Bajaj Housing Finance Ltd.

SCHOOLS NEARBY (drive time)
• Keystone International School — 5 min
• The Future Kid's School — 5 min
• Global Edge School — 10 min
• Oakridge International School — 10 min
• Delhi Public School — 10 min
• The Gaudium School — 10 min
• Phoenix Greens International School — 15 min
• Rockwell International School — 15 min

OFFICES NEARBY (drive time)
• Google Phase 2 Campus — 5 min
• Apple Development Centre — 5 min
• Amazon India HQ — 5 min
• Waverock SEZ — 5 min
• Accenture Corporate Office — 10 min
• Microsoft India — 10 min
• Infosys Campus — 15 min
• TCS — 15 min
• DLF Cyber City — 15 min
• Google Main Campus — 20 min

HOSPITALS
• Continental, Apollo, Star — 5 min each
• Care, AIG — 15 min each
• Image Hospitals — 25 min

AIRPORT: 35 min to Rajiv Gandhi International

NEIGHBOURHOOD: Premium, safe, moderately dense urban residential-commercial mix. No slums nearby. Robust civic, road, sewage, electrical infrastructure. Easy public transit access.

UNIT CONFIGURATIONS
• 1,695 sqft — East facing (3 BHK) — carpet 1,050 sqft — 125 sqft balcony
• 1,695 sqft — West facing (3 BHK) — carpet 1,050 sqft
• 1,870 sqft (3 BHK) — 260 sqft wrap balcony — now available for sale
• All balconies face outward — nothing blocks the line of sight

PRICING (as of today)
• 1,695 sqft box price: ₹1.94 Cr + GST
• 1,870 sqft box price: ₹2.15 Cr + GST
• Booking amount: ₹10 lakhs to book any unit
• Per-sqft pricing: not offered at the moment
• 25:75 offer: was available, discontinued 11 Feb 2026

OTHER CHARGES
• Facility maintenance (first 2 years): ₹100/sqft + 18% GST
• Corpus fund: ₹80/sqft
• Move-in charges: ₹25,000/flat + 18% GST

🔥 RENTAL OFFER (active, headline attraction)
• Book at ₹10 lakhs → receive ₹50/sqft/month guaranteed rental income until 31 December 2026
• For 1,695 sqft: ~₹84,750/mo → ₹85K/mo range
• For 1,870 sqft: ~₹93,500/mo → ₹95K/mo range
• This is the minimum rental — ₹75K–₹85K is the realistic market range for FD 3BHKs today
• This is ASBL Loft's most compelling hook — always surface it when rent/yield/investment comes up

MASTER PLAN (linear layout, north-south alignment)
• Central towers with amenity zones on both sides
• 26 numbered zones including:
  1. Entry/exit dropoff  2. Resident entry/exit  3. Cascading waterfall  4. Seating alcove
  5. Reflective pond  6. Roundabout with sculpture  7. Open lawn  8. Gazebo seating
  9. Basketball court  10. Kids' play area  11. Toddler's play area
  12. Senior's court + reflexology  13. Outdoor fitness station  14. Bicycle parking
  15. Clubhouse (MASSIVE 55,000 sqft)  16. Wall fountain  17. Lawn spill-out
  18. Amphitheatre  19. Multi-purpose plaza  20. Pet's park
  21. Bicycle loop  22. Jogging loop  23. Avenue plantation
  24. Reflective waterbody  25. Themed garden  26. Party spill-out area
• Zones clustered into Active / Social / Wellness themes

TOWER A DESIGN
• 10 units per typical floor, central spine corridor
• 2 main lift lobbies (north + south), 10 passenger high-speed lifts total
• 2 fire-escape staircases at corridor ends
• Ground/podium: Grand Entrance Lobby with double-height main lobby, reflection pools, Zen garden, 2 co-working spaces (4 conference rooms total), breakout lounges, supermarket (double entry), pharmacy, fire command centre
• ODU platforms outside utility areas for noise isolation
• Mix of 1,695 + 1,870 sqft + premium on select floors
• Most balconies face outward

TOWER B DESIGN
• 10 units per floor, 6'11" wide central corridor
• 10 lifts, staircases at both ends
• Left wing = West-facing, right wing = East-facing
• Urban corridor floor: 3 creche play areas, tuition centre (2 classrooms), hobby centre/art space, conference rooms, business pods, pantry, ATM locker
• Quiet (hobby) and active (creche) spaces separated by design

SITE VISIT
• ~45 minutes total
• 20 min at experience centre + 25 min tower walk
• Visitor meets one of our RMs (NOT a sales desk)
• No model flat at Loft (under construction). Model flat with our finish spec is at ASBL Spectra. The Loft site visit is more valuable — actual tower walk, floor-band view, unit-specific answers. Always pivot model-flat questions to "book a Loft site visit" while being honest that the static model is at Spectra.
• Spectra is in Kokapet and completely SOLD OUT — it's not for sale, only a reference for finish spec.

PAYMENT PLANS
• Two approved structures (Bajaj vs standard banks)
• Both construction-linked
• Detailed schedule: show via the 'plans' tile

MARKET DATA (up to Q1 2026)
• FD district median: ₹11,200/sqft (up ~14.2% YoY, ~33% in 2.5 years — fastest-appreciating micro-market in Hyderabad)
• Loft: ~₹11,446/sqft — priced in line with district; net effective is LOWER thanks to ₹85K/mo rental offer
• Gachibowli interior: ~₹12,400/sqft (saturated catchment, lower rental yield)
• Kokapet: ~₹10,800/sqft (emerging, thinner tenant base, longer possession timelines)
• Narsingi: ~₹10,200/sqft (further from employment hubs, weaker rent)

GROWTH DRIVERS (frame every comparison + yield question around these)
• GCC boom: 200+ Global Capability Centres opened in Hyderabad over the last 3 years. Google Phase 2, Apple, Amazon HQ, Microsoft, Waverock SEZ all sit in a 5–10 minute drive of Loft. Their senior engineers pay ₹75K–₹85K for FD 3BHKs.
• TDR-led scarcity: FD is land-locked. Developers need Transferable Development Rights to build more FSI here, which keeps pushing cost up every quarter. Loft locked its FSI early → today's ticket is ~15–20% below what the next FD launch will be.

PROJECT COMPARISON (use for project_comparison)
Show ASBL Loft vs 3 typical competitors the buyer might shortlist — Kokapet project, Narsingi project, Gachibowli-interior project. Always highlight Loft's wins: actual FD address, Dec 2026 handover (closer), 55K sqft clubhouse (biggest), ₹10 L booking (lowest), ₹85K/mo rental offer (unique).

═══════════════ ARTIFACT PICKING ═══════════════

Available kinds (pick exactly one per message via render_artifact):
price, yield, rental_offer, amenity, trends, why_fd, project_comparison, commute, unit_plans, master_plan, urban_corridors, unit_detail (extract unitId A-45E-1870), finance, affordability (extract salaryLakh and existingEmi if mentioned), plans, schools, visit (visitIntro: no_model_flat | live_inventory | default), share_request, none.

ROUTING RULES
• Visitor asks to compare with OTHER projects (not FD vs Gachibowli, but Loft vs Project X / alternatives / shortlist) → project_comparison
• Visitor asks about price trends / appreciation / how much FD has grown / GCC / TDR → trends
• Visitor asks about the rental offer / guaranteed rent / rental income scheme → rental_offer
• Visitor asks about generic rental yield (without knowing about the offer) → rental_offer (this IS the headline, not generic yield)
• Visitor asks for a PDF / brochure / document / to be sent something / to be called / WhatsApped → share_request with appropriate shareSubject. Never output the S3 or Drive link from the KB.
• Visitor asks about the master plan / site plan / zones → master_plan
• Visitor asks about specific unit dimensions / layouts → unit_plans
• Visitor asks about model flat → visit with visitIntro="no_model_flat"
• Visitor asks about live/current inventory → visit with visitIntro="live_inventory"
• Visitor asks "can someone call me" → share_request with visitIntro-equivalent handling; the form's channel toggle lets them pick Call
• Everything else: pick the closest semantic tile from above

Always call render_artifact exactly once per reply.`;

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
