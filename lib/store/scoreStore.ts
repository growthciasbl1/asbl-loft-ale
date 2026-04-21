import { create } from 'zustand';
import { LeadScore } from '@/types';

type Quadrant = 'HW-HR' | 'HW-LR' | 'LW-HR' | 'LW-LR';

interface ScoreState {
  leadScore: LeadScore | null;

  calculateLeadScore: (w2b: number, r2b: number) => void;
  getQuadrant: (w2b: number, r2b: number) => Quadrant;
  getRecommendedAction: (quadrant: Quadrant) => string;
  reset: () => void;
}

const quadrantFor = (w2b: number, r2b: number): Quadrant => {
  if (w2b >= 55 && r2b >= 55) return 'HW-HR';
  if (w2b >= 55 && r2b < 55) return 'HW-LR';
  if (w2b < 55 && r2b >= 55) return 'LW-HR';
  return 'LW-LR';
};

const actionFor = (quadrant: Quadrant): string => {
  const actions: Record<Quadrant, string> = {
    'HW-HR': 'CALL_TODAY - Hot lead, ready to buy',
    'HW-LR': 'NURTURE_EMAIL - Wants it, needs financing',
    'LW-HR': 'OFFER_ALT - Ready but wrong product',
    'LW-LR': 'LOW_TOUCH - Window shopper',
  };
  return actions[quadrant];
};

export const useScoreStore = create<ScoreState>((set) => ({
  leadScore: null,

  getQuadrant: quadrantFor,
  getRecommendedAction: actionFor,

  calculateLeadScore: (w2b, r2b) => {
    const quadrant = quadrantFor(w2b, r2b);
    const recommendedAction = actionFor(quadrant);

    set({
      leadScore: {
        w2bScore: w2b,
        r2bScore: r2b,
        quadrant,
        recommendedAction,
      },
    });
  },

  reset: () => set({ leadScore: null }),
}));
