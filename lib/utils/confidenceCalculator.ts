import { ConfidenceScores } from '@/types';

export function getConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 80) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

export function getConfidenceColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

export function getMissingFields(confidence: ConfidenceScores): string[] {
  const missing: string[] = [];
  if (confidence.size === 0) missing.push('size');
  if (confidence.budget === 0) missing.push('budget');
  if (confidence.purpose === 0) missing.push('purpose');
  if (confidence.location === 0) missing.push('location');
  return missing;
}
