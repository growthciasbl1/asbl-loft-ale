import type { ArtifactKind } from './queryRouter';

export type IntentLevel = 'low' | 'medium' | 'high';

/**
 * Intent classification. "high" = wrap in LeadGate before showing the tile.
 * Any query that signals the visitor is transacting (exact price, specific unit,
 * exact payment schedule, wants a doc sent) must capture the lead first.
 *
 * share_request itself is a form tile, so it doesn't need a gate wrapper.
 */
export const ARTIFACT_INTENT: Record<ArtifactKind, IntentLevel> = {
  price: 'high',
  unit_detail: 'high',
  plans: 'high',
  unit_plans: 'medium',
  finance: 'medium',
  affordability: 'medium',
  yield: 'medium',
  share_request: 'low', // the tile IS the form
  visit: 'low',
  master_plan: 'low',
  urban_corridors: 'low',
  trends: 'low',
  why_fd: 'low',
  commute: 'low',
  amenity: 'low',
  schools: 'low',
  none: 'low',
};

export function requiresLead(kind: ArtifactKind): boolean {
  return ARTIFACT_INTENT[kind] === 'high';
}
