export type Variant = 'investor' | 'family' | 'luxury' | 'budget' | 'nri' | 'explore';

export interface VariantMatch {
  variant: Variant;
  confidence: number;
  reason: string;
}

const NRI_KEYWORDS = ['nri', 'overseas', 'abroad', 'remote', 'virtual tour', 'fema', 'non resident', 'non-resident', 'dubai', 'usa', 'singapore', 'uk resident'];
const LUXURY_KEYWORDS = ['luxury', 'premium', 'penthouse', 'top floor', 'top-floor', 'exclusive', 'high floor', '1870', 'sky', 'panorama', 'ultra'];
const BUDGET_KEYWORDS = ['emi', 'loan', 'affordable', 'cheap', 'under budget', 'financing', 'pre-approval', 'home loan', 'installment', 'monthly payment'];
const INVESTOR_KEYWORDS = ['rent', 'rental', 'yield', 'roi', 'investment', 'investor', 'appreciate', 'appreciation', 'tenant', 'lease', 'passive income', 'cash flow'];
const FAMILY_KEYWORDS = ['family', 'kids', 'children', 'school', 'schools', 'playground', 'play area', 'creche', 'pediatric', 'safe neighborhood', 'walkable'];

function score(query: string, words: string[]): number {
  const q = query.toLowerCase();
  return words.reduce((acc, w) => acc + (q.includes(w) ? 1 : 0), 0);
}

export function matchVariant(query: string): VariantMatch {
  const q = (query || '').toLowerCase().trim();

  if (!q) {
    return { variant: 'explore', confidence: 0, reason: 'empty query' };
  }

  const nri = score(q, NRI_KEYWORDS);
  const luxury = score(q, LUXURY_KEYWORDS);
  const budget = score(q, BUDGET_KEYWORDS);
  const investor = score(q, INVESTOR_KEYWORDS);
  const family = score(q, FAMILY_KEYWORDS);

  const scores: { v: Variant; s: number; r: string }[] = [
    { v: 'nri', s: nri * 3, r: 'NRI/remote signals' },
    { v: 'budget', s: budget * 2.5, r: 'budget/EMI signals' },
    { v: 'luxury', s: luxury * 2.2, r: 'premium/luxury signals' },
    { v: 'investor', s: investor * 2, r: 'rental/ROI signals' },
    { v: 'family', s: family * 2, r: 'family/school signals' },
  ];

  scores.sort((a, b) => b.s - a.s);
  const top = scores[0];

  if (top.s === 0) {
    return { variant: 'explore', confidence: 20, reason: 'no strong signal' };
  }

  const confidence = Math.min(100, 40 + top.s * 15);
  return { variant: top.v, confidence, reason: top.r };
}

export const VARIANT_META: Record<Variant, { label: string; tagline: string; route: string }> = {
  investor: {
    label: 'Investor',
    tagline: 'Yield. Appreciation. Exit.',
    route: '/v/investor',
  },
  family: {
    label: 'Family',
    tagline: 'Where your kids will grow up.',
    route: '/v/family',
  },
  luxury: {
    label: 'Luxury',
    tagline: 'Sky-floor residences, curated.',
    route: '/v/luxury',
  },
  budget: {
    label: 'Smart Buy',
    tagline: 'Own it for less than you rent.',
    route: '/v/budget',
  },
  nri: {
    label: 'NRI',
    tagline: 'Buy from anywhere. Own here.',
    route: '/v/nri',
  },
  explore: {
    label: 'Explore',
    tagline: 'Discover ASBL Loft your way.',
    route: '/v/explore',
  },
};
