export type ArtifactKind =
  | 'price'
  | 'yield'
  | 'amenity'
  | 'trends'
  | 'why_fd'
  | 'commute'
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

  // Share intent (send me / WhatsApp me / share PDF) — ALWAYS capture lead first.
  // Runs before every other rule so "Send me the floor plan PDF" doesn't leak to unit_plans.
  if (SHARE_INTENT.test(q)) {
    const subject = extractShareSubject(q);
    return {
      text: `<p>Drop your name and WhatsApp — we&apos;ll send <strong>${subject}</strong> over in under 2 minutes. A named RM follows up from there, no auto-dialers.</p>`,
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

  // Urban corridors / location / neighborhood
  if (/urban\s*corridor|connectivity|location\s*map|where is|which area|neighbour|neighborhood|micro[-\s]?market|nearby\s*area|area\s*around/.test(ql)) {
    return {
      text: `<p>Financial District is the southern anchor of Hyderabad&apos;s IT corridor. Every catchment a 3BHK buyer weighs — IT hubs, schools, hospitals, airport — within 30 minutes.</p>`,
      artifact: 'urban_corridors',
      artifactLabel: 'Urban corridors · FD',
    };
  }

  // Model flat — only at Spectra since all FD projects are under construction
  if (/model\s*(flat|apartment|unit|home|house)|show\s*flat|sample\s*flat|experience\s*centre|experience\s*center/.test(ql)) {
    return {
      text: `<p>Loft is under construction — the <strong>model flat is at ASBL Spectra</strong>, which uses the same finish spec. Pick a slot and we&apos;ll line up the walk-through.</p>`,
      artifact: 'visit',
      artifactLabel: 'Visit ASBL Spectra model flat',
      visitIntro: 'no_model_flat',
    };
  }

  // Live inventory — we don't publish, push to visit
  if (/live\s*inventory|real[-\s]?time\s*units|current\s*availability|what\s*is\s*available\s*now|which\s*units\s*are\s*open/.test(ql)) {
    return {
      text: `<p>We don&apos;t publish live inventory in chat — pricing and availability change daily as construction progresses. A named RM will walk you through exactly what&apos;s open.</p>`,
      artifact: 'visit',
      artifactLabel: 'Get current availability on visit',
      visitIntro: 'live_inventory',
    };
  }

  // Visit booking
  if (/book.*visit|site\s*visit|schedule\s*tour|book\s*a\s*tour|book.*slot|slot\s*to\s*visit|saturday\s*tour|weekend\s*tour/.test(ql)) {
    return {
      text: `<p>Pick any slot — you&apos;ll meet a <strong>named relationship manager</strong> on arrival, not a sales desk. Visit takes ~45 minutes.</p>`,
      artifact: 'visit',
      artifactLabel: 'Pick a visit slot',
    };
  }

  // Affordability / pre-approval
  if (/afford|eligibility|eligible|pre[-\s]?approval|qualify|can\s*i\s*buy/.test(ql)) {
    return {
      text: `<p>Banks cap <strong>FOIR at 50%</strong> of take-home. Move the sliders — we&apos;ll show the max ticket that fits.</p>`,
      artifact: 'affordability',
      artifactLabel: 'Affordability check',
      salaryLakh: parseSalary(q),
      existingEmi: parseExistingEmi(q),
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
      text: `<p>Two approved structures. <strong>Bajaj starts at 5.5% down</strong>, standard banks at 10%. Rest is construction-linked.</p>`,
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
      artifactLabel: 'Unit floor plans',
    };
  }

  if (/price|cost|breakdown|all\s*in|gst|stamp|registration|ticket/.test(ql)) {
    return {
      text: `<p>Full breakdown for <strong>1,695 sqft East-facing</strong> — the most common config. Stamp duty and registration are extra.</p>`,
      artifact: 'price',
      artifactLabel: 'Price breakdown · 1,695 East',
    };
  }

  if (/yield|rent|roi|return|cash\s*flow|rental\s*income/.test(ql)) {
    return {
      text: `<p>FD 3BHKs lease for <strong>₹45,000 – ₹60,000/mo</strong>. Against ₹2.07 Cr all-in, that&apos;s a <strong>~2.6 – 3.5% gross yield</strong> — before appreciation.</p>`,
      artifact: 'yield',
      artifactLabel: 'Rental yield · indicative',
    };
  }

  if (/amenity|amenities|clubhouse|gym|pool|pet|play|creche|work[-\s]?space|co[-\s]?working/.test(ql)) {
    return {
      text: `<p>Full landscape layer plus a clubhouse tier. Nine of the 23 most-used in everyday life.</p>`,
      artifact: 'amenity',
      artifactLabel: 'Amenities · lifestyle cut',
    };
  }

  if (/trend|appreciation|history|growth|last.*year|past.*year|moved\s*over|₹\/sqft|price\s*trend/.test(ql)) {
    return {
      text: `<p>FD 3BHK average <strong>₹/sqft</strong> over 10 quarters. District median has climbed ~26%; Loft tracks below.</p>`,
      artifact: 'trends',
      artifactLabel: 'Price trends · FD 3BHK',
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
