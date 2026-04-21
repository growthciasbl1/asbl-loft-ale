import { SearchIntent, ConfidenceScores } from '@/types';

const INVESTOR_KEYWORDS = ['rent', 'income', 'yield', 'roi', 'appreciate', 'investment', 'money'];
const ENDUSER_KEYWORDS = ['family', 'school', 'kids', 'living', 'home', 'move', 'commute', 'lifestyle'];
const SIZE_REGEX = /(3bhk|2bhk|1bhk|3-bhk|2-bhk|1-bhk)/i;
const BUDGET_REGEX = /(\d+\.?\d*)\s*(cr|crore|lac|lakh|l|k)/i;
const LOCATION_KEYWORDS = ['hitec', 'gachibowli', 'raidurg', 'fd', 'financial district', 'hitech'];

export function parseSearch(query: string): {
  intent: SearchIntent;
  confidence: ConfidenceScores;
} {
  const intent: SearchIntent = {
    rawQuery: query,
    features: [],
  };

  const confScores: ConfidenceScores = {
    size: 0,
    budget: 0,
    purpose: 0,
    location: 0,
    features: 0,
    overall: 0,
  };

  const sizeMatch = query.match(SIZE_REGEX);
  if (sizeMatch) {
    intent.size = sizeMatch[1].toUpperCase();
    confScores.size = 95;
  }

  const budgetMatch = query.match(BUDGET_REGEX);
  if (budgetMatch) {
    intent.budget = `${budgetMatch[1]} ${budgetMatch[2]}`;
    confScores.budget = 98;
  }

  const lowerQuery = query.toLowerCase();
  const investorMatch = INVESTOR_KEYWORDS.some((kw) => lowerQuery.includes(kw));
  const endUserMatch = ENDUSER_KEYWORDS.some((kw) => lowerQuery.includes(kw));

  if (investorMatch && !endUserMatch) {
    intent.purpose = 'INVESTMENT';
    confScores.purpose = 90;
  } else if (endUserMatch && !investorMatch) {
    intent.purpose = 'RESIDENTIAL';
    confScores.purpose = 90;
  } else if (investorMatch && endUserMatch) {
    intent.purpose = 'MIXED';
    confScores.purpose = 70;
  }

  LOCATION_KEYWORDS.forEach((loc) => {
    if (lowerQuery.includes(loc)) {
      intent.location = loc.toUpperCase();
      confScores.location = 85;
    }
  });

  const amenityKeywords = ['gym', 'pool', 'school', 'park', 'security', 'garden', 'balcony', 'parking'];
  amenityKeywords.forEach((amenity) => {
    if (lowerQuery.includes(amenity)) {
      intent.features.push(amenity);
    }
  });

  if (intent.features.length > 0) {
    confScores.features = Math.min(100, 60 + intent.features.length * 10);
  }

  const scores = [
    confScores.size,
    confScores.budget,
    confScores.purpose,
    confScores.location,
    confScores.features,
  ].filter((s) => s > 0);

  confScores.overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    intent,
    confidence: confScores,
  };
}

export function determinePrimaryPath(intent: SearchIntent): 'INVESTOR' | 'END_USER' | 'NEUTRAL' {
  if (intent.purpose === 'INVESTMENT') return 'INVESTOR';
  if (intent.purpose === 'RESIDENTIAL') return 'END_USER';
  return 'NEUTRAL';
}
