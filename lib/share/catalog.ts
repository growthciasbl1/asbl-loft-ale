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
    filename: 'Loft Brochure.pdf',
    title: 'ASBL Loft Brochure',
    url: '/share/Loft Brochure.pdf',
    keywords: /brochure|overview|full\s*doc|about\s*the\s*project|loft\s*book|information|intro/i,
    caption: 'ASBL Loft — full project brochure (38 pages).',
  },
  {
    id: 'price_sheet',
    filename: 'Loft Price Sheet.pdf',
    title: 'Price Sheet',
    url: '/share/Loft Price Sheet.pdf',
    keywords: /price\s*sheet|pricing|cost\s*breakup|cost\s*sheet|rate|quote|ticket|per\s*sqft|₹|inr|crore|lakh/i,
    caption: 'ASBL Loft — unit-wise price breakup.',
  },
  {
    id: 'amenities',
    filename: 'LOFT AMENITIES.pdf',
    title: 'Amenities Catalogue',
    url: '/share/LOFT AMENITIES.pdf',
    keywords: /amenit|clubhouse|gym|pool|facility|facilit|outdoor|lifestyle|landscape|what.*do.*inside/i,
    caption: 'ASBL Loft — full amenities catalogue (55,000 sqft clubhouse + 26 zones).',
  },
  {
    id: 'specifications',
    filename: 'Loft Specifications.pdf',
    title: 'Specifications',
    url: '/share/Loft Specifications.pdf',
    keywords: /spec|specification|material|finish|fitting|quality|structure|rcc|kitchen|plumbing|electrical|fixture/i,
    caption: 'ASBL Loft — detailed construction + finish specifications.',
  },
  {
    id: 'payment_bhfl',
    filename: 'Loft Payment Structure Bajaj.pdf',
    title: 'Bajaj Housing Finance Payment Plan',
    url: '/share/Loft Payment Structure Bajaj.pdf',
    keywords: /bajaj|bhfl|housing\s*finance|10\s*l(akh)?\s*booking|low\s*entry|bhajaj/i,
    caption: 'BHFL payment plan — ₹10 L booking, construction-linked.',
  },
  {
    id: 'payment_other',
    filename: 'Loft Payment Structure Other Banks.pdf',
    title: 'Other Banks Payment Plan',
    url: '/share/Loft Payment Structure Other Banks.pdf',
    keywords: /other\s*bank|standard\s*bank|10%\s*booking|19.?\s*l(akh)?|conventional/i,
    caption: 'Standard bank payment plan — 10% booking.',
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

  // Payment plan — send BOTH so visitor can compare
  if (/payment\s*plan|payment\s*structure|payment\s*schedule|instal[lm]ent|first\s*che?que|how.*pay|how\s*payment|emi\s*plan/i.test(s)) {
    return CATALOG.filter((a) => PAYMENT_BOTH_IDS.includes(a.id));
  }

  // Match by keyword
  const matches = CATALOG.filter((a) => a.keywords.test(s));
  if (matches.length > 0) return matches.slice(0, 4);

  // Catch-all ("send me details", "everything", etc.)
  if (/detail|everything|all|full\s*info|complete|info\s*pack|whole\s*thing/i.test(s)) {
    return CATALOG.filter((a) => GENERIC_BUNDLE_IDS.includes(a.id));
  }

  // Fallback: brochure + price sheet (safest pair)
  return CATALOG.filter((a) => ['brochure', 'price_sheet'].includes(a.id));
}

export function getAssetById(id: string): ShareAsset | null {
  return CATALOG.find((a) => a.id === id) ?? null;
}

export function allAssets(): ShareAsset[] {
  return [...CATALOG];
}
