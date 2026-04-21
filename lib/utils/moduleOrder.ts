import { ConfidenceScores } from '@/types';

export function calculateModuleOrder(
  primaryPath: 'INVESTOR' | 'END_USER' | 'NEUTRAL',
  confidence: ConfidenceScores
): string[] {
  const baseModules = ['EMI_CALC', 'LOCATION', 'FLOOR_PLANS', 'AMENITIES', 'SPECS'];

  if (primaryPath === 'INVESTOR' && confidence.overall > 70) {
    return ['EMI_CALC', 'LOCATION', 'FLOOR_PLANS', 'AMENITIES', 'SPECS'];
  }

  if (primaryPath === 'END_USER' && confidence.overall > 70) {
    return ['FLOOR_PLANS', 'LOCATION', 'AMENITIES', 'EMI_CALC', 'SPECS'];
  }

  return baseModules;
}

export function calculateConfidenceCoverage(confidence: ConfidenceScores): number {
  const scores = [
    confidence.size,
    confidence.budget,
    confidence.purpose,
    confidence.location,
    confidence.features,
  ];
  const filled = scores.filter((s) => s > 0).length;
  return Math.round((filled / scores.length) * 100);
}
