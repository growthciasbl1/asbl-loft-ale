/**
 * Catalogue of shareable assets. The incoming "subject" string is usually the
 * LLM-extracted noun-phrase describing what the visitor asked for — e.g.
 * "the brochure", "1,695 sqft east price sheet", "bajaj payment plan".
 *
 * We match against keywords, pick 1–3 most relevant PDFs, and return their
 * public URLs so Periskope can send them as WhatsApp document attachments.
 */

export interface ShareAsset {
  id: string;
  filename: string;
  title: string;
  url: string; // public URL under /share — resolved at send time
  keywords: RegExp;
  /** Shown as the caption under the document in WhatsApp. */
  caption: string;
}

// URL will be prefixed with the host at send time.
const CATALOG: ShareAsset[] = [
  {
    id: 'brochure',
    filename: 'Loft Brochure.pdf', // Friendly display name WhatsApp shows
    title: 'ASBL Loft Brochure',
    url: '/share/Loft-Brochure.pdf', // Disk path — no spaces to avoid URL-encoding surprises
    keywords: /brochure|overview|full\s*doc|about\s*the\s*project|loft\s*book|information|intro/i,
    caption: 'ASBL Loft - full project brochure (38 pages).',
  },
  {
    id: 'price_sheet',
    filename: 'Loft Price Sheet.pdf',
    title: 'Price Sheet',
    url: '/share/Loft-Price-Sheet.pdf',
    // Lenient: plain "price" / "cost" / "ticket" should also match.
    // Earlier the regex required "price sheet" / "pricing" so a visitor
    // who asked "send me the price" got the full brochure as a fallback.
    keywords: /\bprice\b|\bcost\b|\bticket\b|price\s*sheet|pricing|cost\s*breakup|cost\s*sheet|rate|quote|per\s*sqft|₹|inr|crore|lakh/i,
    caption: 'ASBL Loft - unit-wise price breakup.',
  },
  {
    id: 'amenities',
    filename: 'Loft Amenities.pdf',
    title: 'Amenities Catalogue',
    url: '/share/Loft-Amenities.pdf',
    keywords: /amenit|clubhouse|gym|pool|facility|facilit|outdoor|lifestyle|landscape|what.*do.*inside/i,
    caption: 'ASBL Loft - full amenities catalogue (55,000 sqft clubhouse, 26 zones).',
  },
  {
    id: 'specifications',
    filename: 'Loft Specifications.pdf',
    title: 'Specifications',
    url: '/share/Loft-Specifications.pdf',
    keywords: /spec|specification|material|finish|fitting|quality|structure|rcc|kitchen|plumbing|electrical|fixture/i,
    caption: 'ASBL Loft - detailed construction and finish specifications.',
  },
  {
    id: 'payment_bhfl',
    filename: 'Loft Payment Plan - Bajaj.pdf',
    title: 'Bajaj Housing Finance Payment Plan',
    url: '/share/Loft-Payment-Bajaj.pdf',
    keywords: /bajaj|bhfl|housing\s*finance|10\s*l(akh)?\s*booking|low\s*entry|bhajaj/i,
    caption: 'BHFL payment plan - Rs.10 L booking, fixed 5-milestone schedule.',
  },
  {
    id: 'payment_other',
    filename: 'Loft Payment Plan - Other Banks.pdf',
    title: 'Other Banks Payment Plan',
    url: '/share/Loft-Payment-OtherBanks.pdf',
    keywords: /other\s*bank|standard\s*bank|10%\s*booking|19.?\s*l(akh)?|conventional/i,
    caption: 'Standard bank payment plan - 10% booking.',
  },
];

// Broader bundles for generic asks like "send me details" or "everything".
const PAYMENT_BOTH_IDS = ['payment_bhfl', 'payment_other'];
const GENERIC_BUNDLE_IDS = ['brochure', 'price_sheet', 'payment_bhfl'];

/**
 * Resolve the best set of assets for a requested subject. Deduped, max 4
 * to avoid spamming the user. Always returns at least the brochure.
 */
export function resolveAssets(subject: string | null | undefined): ShareAsset[] {
  const s = (subject ?? '').trim();
  if (!s) {
    return CATALOG.filter((a) => GENERIC_BUNDLE_IDS.includes(a.id));
  }

  // Payment plan — send BOTH so visitor can compare. Lenient: plain
  // "payment" matches now too (earlier required "payment plan" / "payment
  // structure" — "payment" alone fell through to brochure).
  if (/\bpayment\b|instal[lm]ent|first\s*che?que|how.*pay|emi\s*plan|milestone|down\s*payment/i.test(s)) {
    return CATALOG.filter((a) => PAYMENT_BOTH_IDS.includes(a.id));
  }

  // Unit plan / floor plan — these live INSIDE the brochure (pages 41-43)
  // not as a standalone PDF. Send the brochure with a hint so the visitor
  // knows where to look. Earlier this fell through silently to the same
  // brochure but with no signal that this was intentional.
  if (/\b(unit|floor|apartment|flat|room|home)\s*plan\b|layout|carpet\s*area|3\s*bhk\s*plan/i.test(s)) {
    return CATALOG.filter((a) => a.id === 'brochure');
  }

  // Match by keyword
  const matches = CATALOG.filter((a) => a.keywords.test(s));
  if (matches.length > 0) return matches.slice(0, 4);

  // Explicit bundle intent — only when the user clearly asks for multiple.
  // Must contain "everything" / "all docs" / "info pack" / etc. Single words
  // like "details" no longer trigger a bundle, since most users who say
  // "share details" are just paraphrasing "share the brochure".
  if (/\b(everything|all\s*(docs|documents|info|details)|info\s*pack|complete\s*(info|details|pack)|whole\s*thing|full\s*pack)\b/i.test(s)) {
    return CATALOG.filter((a) => GENERIC_BUNDLE_IDS.includes(a.id));
  }

  // Fallback — when nothing matched, send ONLY the brochure (safest single
  // doc). Previously this sent brochure + price_sheet, which caused users
  // asking for just the brochure to receive two documents.
  return CATALOG.filter((a) => a.id === 'brochure');
}

export function getAssetById(id: string): ShareAsset | null {
  return CATALOG.find((a) => a.id === id) ?? null;
}

export function allAssets(): ShareAsset[] {
  return [...CATALOG];
}
