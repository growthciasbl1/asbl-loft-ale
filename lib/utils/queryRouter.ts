export type ArtifactKind =
  | 'price'
  | 'yield'
  | 'rental_offer'
  | 'amenity'
  | 'trends'
  | 'why_fd'
  | 'project_comparison'
  | 'commute'
  | 'commute_from_you'
  | 'unit_plans'
  | 'master_plan'
  | 'urban_corridors'
  | 'unit_detail'
  | 'finance'
  | 'affordability'
  | 'plans'
  | 'schools'
  | 'visit'
  | 'share_request'
  | 'resale_framework'
  | 'roi_calculator'
  | 'none';

export interface RouterResult {
  text: string;
  artifact: ArtifactKind;
  artifactLabel?: string;
  unitId?: string;
  salaryLakh?: number;
  existingEmi?: number;
  /** Optional variant for the visit artifact: default | no_model_flat | live_inventory */
  visitIntro?: 'default' | 'no_model_flat' | 'live_inventory';
  /** For share_request: what the user wants sent (used as form subject). */
  shareSubject?: string;
  /** For share_request: raw user query for CRM. */
  originalQuery?: string;
  /** For any lead form: pre-select WhatsApp or Call. */
  preferredChannel?: 'whatsapp' | 'call';
  /** For visit artifact: pre-select booking type. */
  initialBookingType?: 'site_visit' | 'call_back';
  /** Parsed <signal> payload from LLM. API-layer saves this to Mongo and strips before returning to frontend. */
  signal?: Record<string, unknown> | null;
  /** Token usage metadata from LLM. API-layer saves this to llm_usage collection and strips before returning to frontend. */
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    totalTokenCount?: number;
  } | null;
  /** Model name used for the LLM call (if LLM was used). */
  model?: string;
}

/**
 * Detect "send me / share me / WhatsApp me this" style asks.
 * These are high-intent lead-capture moments — regex must not mis-route
 * them to unit_plans or similar browse artifacts.
 */
const SHARE_INTENT =
  /\b(send|share|mail|email|whatsapp|drop|ping|forward|shoot)\b.*\b(me|it|this|to\s*my|on\s*whatsapp|on\s*email|over)?\b|\b(i\s*want|i'?d\s*like|can\s*you|could\s*you|please)\s+(send|share|mail|email|whatsapp|get|receive|have)\b|\b(get|have|receive)\s+(the|a)?\s*(pdf|brochure|doc|document|details|price\s*sheet|floor\s*plan).*(whatsapp|email|mail|phone)\b/i;

function extractShareSubject(q: string): string {
  // strip leading imperatives and polite tokens
  const cleaned = q
    .replace(
      /^(please\s+)?(can\s+you\s+|could\s+you\s+|i'?d\s+like\s+to\s+|i\s+want\s+to\s+|i\s+want\s+)?/i,
      ''
    )
    .replace(/^(send|share|mail|email|whatsapp|get|shoot|drop|ping|forward)\s+(me|it|us)?\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+(to\s+my\s+whatsapp|on\s+whatsapp|on\s+email|to\s+my\s+email|to\s+me)\.?$/i, '')
    .trim();
  if (!cleaned) return 'the document you asked for';
  // Title-case first letter, cap length
  const trimmed = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return trimmed.length > 80 ? trimmed.slice(0, 77) + '…' : trimmed;
}

function parseSalary(q: string): number | undefined {
  const m = q.match(/(\d+(?:\.\d+)?)\s*L\b/i);
  if (m) return Number(m[1]);
  const m2 = q.match(/salary\s*(\d+(?:\.\d+)?)/i);
  if (m2) return Number(m2[1]);
  return undefined;
}

function parseExistingEmi(q: string): number | undefined {
  const m = q.match(/existing\s*EMI\s*(\d+)(?:[kK])?/i);
  if (m) {
    const n = Number(m[1]);
    return n < 1000 ? n * 1000 : n;
  }
  return undefined;
}

export function routeQuery(q: string): RouterResult {
  const ql = q.toLowerCase().trim();

  // Call-back intent — explicit "call me" / "callback" / "phone me". Routes to the
  // visit tile with "call_back" preselected so the visitor picks an actual slot
  // (9 AM–9 PM, next 7 days) rather than just submitting a name + phone.
  if (
    /\b(call\s*me|call\s*back|callback|someone\s*(call|phone)|please\s*call|give\s*me\s*a\s*call|i\s*want\s*a\s*call|ring\s*me|get\s*on\s*(a\s*)?call|phone\s*me|schedule\s*a\s*call|book\s*a\s*call)\b/i.test(q)
  ) {
    return {
      text: `<p>Pick a slot when you want the call — we&apos;ll ring on the dot. Available every day 9 AM–9 PM over the next week.</p>`,
      artifact: 'visit',
      artifactLabel: 'Call-back · pick a slot',
      initialBookingType: 'call_back',
    };
  }

  // Share intent (send me / WhatsApp me / share PDF) — ALWAYS capture lead first.
  // Runs before every other rule so "Send me the floor plan PDF" doesn't leak to unit_plans.
  if (SHARE_INTENT.test(q)) {
    const subject = extractShareSubject(q);
    return {
      text: `<p>Drop your name and WhatsApp — we&apos;ll send <strong>${subject}</strong> over in under 2 minutes. Our RM follows up from there.</p>`,
      artifact: 'share_request',
      artifactLabel: 'Share · WhatsApp',
      shareSubject: subject,
      originalQuery: q,
    };
  }

  // Unit detail — look for unit id like "A-45E-1870"
  const unitIdMatch = q.match(/\b([AB])[-\s]?(\d{1,2})([EW])[-\s]?(1695|1870)\b/i);
  if (unitIdMatch) {
    const [, tower, floor, facing, size] = unitIdMatch;
    const unitId = `${tower.toUpperCase()}-${floor}${facing.toUpperCase()}-${size}`;
    return {
      text: `<p>Opening the dossier for <strong>${unitId}</strong> — floor, facing, room dimensions, balcony, base price.</p>`,
      artifact: 'unit_detail',
      artifactLabel: `Unit dossier · ${unitId}`,
      unitId,
    };
  }

  // Master plan / site plan / landscape
  if (/master\s*plan|site\s*plan|landscape|site\s*layout|campus|overall\s*plan|where.*amenities/.test(ql)) {
    return {
      text: `<p>The site, walked from above. 26 zones — clubhouse, courts, water features, jogging loop — arranged around Tower A and Tower B.</p>`,
      artifact: 'master_plan',
      artifactLabel: 'Master plan · 26 zones',
    };
  }

  // Commute from user's specific place — interactive distance calculator.
  // Covers: "how far from my office", "how long to commute from Jubilee Hills",
  // "distance from HITEC to Loft", "travel time from my home", etc.
  if (
    /\b(how\s*(far|long|much\s*time).{0,40}(from|commute|reach|drive|travel|to\s*loft)|commute\s*from\s+\w|distance\s*from\s+\w|travel\s*time\s*from|drive\s*time\s*from|calculate.*distance|from\s*my\s*(office|home|school|work|house|place|apartment)|reach\s*loft\s*from|loft\s*from\s*(jubilee|banjara|hitec|madhapur|kondapur|gachibowli|kokapet|begumpet|ameerpet|kukatpally|secunderabad|airport|tolichowki|manikonda|raidurg|nanakramguda|mehdipatnam|nallagandla|attapur|khajaguda))\b/i.test(q)
  ) {
    return {
      text: `<p>Tell me where you're coming from — office, home, anywhere in Hyderabad — and I'll pull the real drive time vs Gachibowli and Kokapet as alternates.</p>`,
      artifact: 'commute_from_you',
      artifactLabel: 'Your drive time to Loft',
    };
  }

  // Urban corridors / location / neighborhood
  if (/urban\s*corridor|connectivity|location\s*map|where is|which area|neighbour|neighborhood|micro[-\s]?market|nearby\s*area|area\s*around/.test(ql)) {
    return {
      text: `<p><strong>ASBL Loft sits in Financial District, Hyderabad</strong> — the southern anchor of the IT corridor. 4 minutes to the Nanakramguda ORR exit, then IT hubs (Google / Apple / Amazon · 5 min), schools (6 in 12 min), hospitals (Continental / Apollo · 5 min), and RGI airport at 35 min.</p>`,
      artifact: 'urban_corridors',
      artifactLabel: 'Urban corridors · FD',
    };
  }

  // Model flat — none at Loft (all FD projects under construction). Pivot to site visit.
  if (/model\s*(flat|apartment|unit|home|house)|show\s*flat|sample\s*flat|experience\s*centre|experience\s*center/.test(ql)) {
    return {
      text: `<p>A site visit at ASBL Loft is designed to be comprehensive yet efficient. While we don&apos;t have a model flat at Loft as it&apos;s under construction, we can arrange for you to see live inventory at <strong>ASBL Spectra</strong> in Financial District, where possession has already begun, to give you a sense of the finishes and quality. Schedule your visit to know more.</p>`,
      artifact: 'visit',
      artifactLabel: 'Site visit · Loft',
      visitIntro: 'no_model_flat',
    };
  }

  // Live inventory — we don't publish, push to visit
  if (/live\s*inventory|real[-\s]?time\s*units|current\s*availability|what\s*is\s*available\s*now|which\s*units\s*are\s*open/.test(ql)) {
    return {
      text: `<p>We don&apos;t publish live inventory in chat — pricing and availability change daily as construction progresses. Our RM will walk you through exactly what&apos;s open.</p>`,
      artifact: 'visit',
      artifactLabel: 'Get current availability on visit',
      visitIntro: 'live_inventory',
    };
  }

  // Visit booking
  if (/book.*visit|site\s*visit|schedule\s*tour|book\s*a\s*tour|book.*slot|slot\s*to\s*visit|saturday\s*tour|weekend\s*tour/.test(ql)) {
    return {
      text: `<p>Pick any slot — <strong>one of our RMs</strong> will be there to help and guide you, not a sales desk.</p>`,
      artifact: 'visit',
      artifactLabel: 'Pick a visit slot',
    };
  }

  // Affordability / pre-approval
  if (/afford|eligibility|eligible|pre[-\s]?approval|qualify|can\s*i\s*buy/.test(ql)) {
    return {
      text: `<p>FOIR is variable by profile. Move the sliders — we&apos;ll show the max ticket that fits.</p>`,
      artifact: 'affordability',
      artifactLabel: 'Affordability check',
      salaryLakh: parseSalary(q),
      existingEmi: parseExistingEmi(q),
    };
  }

  // Projected ROI calculator — interactive, market-informed
  if (/roi\s*calc|return\s*on\s*investment|projected\s*roi|roi\s*projection|appreciation\s*calc|what.*roi|how\s*much\s*(will|would).*make|exit\s*(value|math)|5\s*year\s*return|long\s*term\s*return/i.test(q)) {
    return {
      text: `<p>Adjust the sliders — size, horizon, assumed appreciation, loan mix — to see a market-informed ROI projection. Based on FD's 14.2% YoY historical, GCC expansion, and TDR scarcity. Numbers are scenarios, not guarantees.</p>`,
      artifact: 'roi_calculator',
      artifactLabel: 'Projected ROI · interactive',
    };
  }

  // Levered finance calculator
  if (/levered|cash[-\s]?on[-\s]?cash|irr|finance\s*calc|loan\s*calc|emi\s*calc|down\s*payment\s*math/.test(ql)) {
    return {
      text: `<p>With 25% down, you&apos;re not buying a home — you&apos;re buying a <strong>yield multiplier</strong>. Play with ticket, down, rate, tenure to see cash-on-cash.</p>`,
      artifact: 'finance',
      artifactLabel: 'Levered finance · cash-on-cash',
    };
  }

  // Payment schedule
  if (/payment\s*plan|payment\s*schedule|first\s*cheque|bajaj|booking\s*amount|installment|construction[-\s]?linked/.test(ql)) {
    return {
      text: `<p>Two approved structures. <strong>Bajaj starts at 5.5% down (₹10 L)</strong>, standard banks at 10% (₹19.4 L). Both follow a fixed 5-milestone schedule till handover.</p>`,
      artifact: 'plans',
      artifactLabel: 'Payment schedule',
    };
  }

  // Schools
  if (/school|kid|children|cbse|ib\b|icse|education|kg\b|creche|day[-\s]?care/.test(ql)) {
    return {
      text: `<p>Six K–12 schools within a 12-minute drive. Honest fee brackets below so you can shortlist.</p>`,
      artifact: 'schools',
      artifactLabel: 'Schools · 12-min radius',
    };
  }

  // Floor plan / unit plan / room dimensions / inventory-style asks all go here now
  if (/inventory|available|availability|units left|show me.*unit|list.*unit|find.*unit|pick a unit|choose a unit|plan|floor\s*plan|layout|bedroom\s*size|room\s*size|balcony\s*size|dimension|how big|sqft|square\s*feet|carpet|3bhk\s*plan|unit\s*type/.test(ql)) {
    return {
      text: `<p>Two 3BHK configurations — 1,695 sqft and 1,870 sqft. Here&apos;s the typical-floor cluster (10 units per floor) with the layout highlighted, plus room-by-room dimensions.</p>`,
      artifact: 'unit_plans',
      artifactLabel: 'Unit plans',
    };
  }

  // Trends (price trajectory, appreciation, YoY, GCC, TDR) — run BEFORE price
  // so "price trend" / "price trajectory" resolve to trends, not a generic breakdown.
  if (/trend|trajectory|appreciation|history|growth|last.*year|past.*year|moved\s*over|₹\/sqft|price\s*trend|yoy|year\s*on\s*year|gcc|tdr|how\s*much.*grown|how\s*much.*gone\s*up/i.test(q)) {
    return {
      text: `<p>FD is up <strong>~14.2% YoY</strong> and <strong>~33% in 2.5 years</strong> — fastest-appreciating micro-market in Hyderabad. District median today is <strong>₹11,200/sqft</strong>. The GCC boom and TDR-led land scarcity are the two structural drivers.</p>`,
      artifact: 'trends',
      artifactLabel: 'FD 3BHK price trajectory',
    };
  }

  if (/price|cost|breakdown|all\s*in|gst|stamp|registration|ticket/.test(ql)) {
    return {
      text: `<p>Full breakdown for <strong>1,695 sqft East-facing</strong> — the most common config. Stamp duty and registration are extra.</p>`,
      artifact: 'price',
      artifactLabel: 'Price breakdown · 1,695 East',
    };
  }

  // Rental offer — headline, ₹85K/mo assured on ₹10L booking till Dec 2026
  if (/rental\s*offer|guaranteed\s*rent|rent\s*offer|85k|85,000|assured\s*rent|rental\s*scheme|10l.*book|book.*10l|10\s*lakh.*book/i.test(q)) {
    return {
      text: `<p>Here&apos;s the headline: book at just <strong>₹10 L</strong> and earn an assured rental income directly from ASBL till 31 December 2026. For a 1,695 sqft unit, that&apos;s <strong>₹85,000/month</strong>; for 1,870 sqft it&apos;s <strong>₹95,000/month</strong>. TDS applicable as per government rules.</p>`,
      artifact: 'rental_offer',
      artifactLabel: 'Rental offer · ₹85K/mo till Dec 2026',
    };
  }

  if (/yield|rent|roi|return|cash\s*flow|rental\s*income/.test(ql)) {
    return {
      text: `<p>FD 3BHKs lease in the <strong>₹75,000 – ₹85,000/mo</strong> range. At ₹1.94 Cr base for 1,695 sqft, that&apos;s roughly <strong>5% gross yield</strong> — and our <strong>₹50/sqft rental guarantee till Dec 2026</strong> locks ~₹85K/mo on top of whatever the open market pays. Book with just ₹10 L.</p>`,
      artifact: 'rental_offer',
      artifactLabel: 'Rental yield · with rental offer',
    };
  }

  if (/amenity|amenities|clubhouse|gym|pool|pet|play|creche|work[-\s]?space|co[-\s]?working/.test(ql)) {
    return {
      text: `<p>Full landscape layer plus a clubhouse tier. Nine of the 23 most-used in everyday life.</p>`,
      artifact: 'amenity',
      artifactLabel: 'Amenities · lifestyle cut',
    };
  }

  // Project comparison — "vs other projects in FD", head-to-head tables
  if (/compare.*project|other\s*project|vs\s*(other|another|any)|projects?\s*in\s*fd|other.*3bhk|head[-\s]?to[-\s]?head|shortlist|better\s*than.*project|competitor|alternatives/.test(ql)) {
    return {
      text: `<p>Here&apos;s Loft vs the three FD 3BHK projects buyers usually shortlist against us. Same radius, same spec, very different economics — especially with the rental offer on top.</p>`,
      artifact: 'project_comparison',
      artifactLabel: 'ASBL Loft vs competition',
    };
  }

  if (/gachibowli|kokapet|why.*fd|why.*financial|compare|vs\s|versus/.test(ql)) {
    return {
      text: `<p>FD has Gachibowli&apos;s commercial catchment with newer infrastructure and a softer entry price.</p>`,
      artifact: 'why_fd',
      artifactLabel: 'Financial District in context',
    };
  }

  if (/commute|hitec|hitech|drive|metro|distance|airport|how far|tenant\s*demograph/.test(ql)) {
    return {
      text: `<p>Typical drive times from Loft. Nanakramguda ORR is 4 minutes away.</p>`,
      artifact: 'commute',
      artifactLabel: 'Commute · typical drives',
    };
  }

  return {
    text: `<p>I can show <strong>unit plans</strong>, the master plan, urban corridors, price breakdown, rental comps, cash-on-cash calculator, affordability check, payment plans, schools, or a visit slot.</p><p>What would help most right now?</p>`,
    artifact: 'none',
  };
}
