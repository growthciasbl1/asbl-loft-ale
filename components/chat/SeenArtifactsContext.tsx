'use client';

import { createContext, useContext } from 'react';
import type { ArtifactKind } from '@/lib/utils/queryRouter';

/**
 * Set of artifact kinds the visitor has already seen in this session.
 * TileShell reads this and filters relatedAsks / askMore so we don't keep
 * suggesting tiles the visitor already explored (doc feedback: once a user
 * has seen rental_offer, don't keep suggesting it; suggest something new).
 */
export const SeenArtifactsContext = createContext<Set<ArtifactKind>>(new Set());

export const useSeenArtifacts = () => useContext(SeenArtifactsContext);
