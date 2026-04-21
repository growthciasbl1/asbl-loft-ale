import { create } from 'zustand';
import { BehaviorEvent } from '@/types';

interface BehaviorState {
  events: BehaviorEvent[];
  w2bScore: number;
  r2bScore: number;

  addEvent: (event: BehaviorEvent) => void;
  updateW2B: (points: number) => void;
  updateR2B: (points: number) => void;
  getScore: () => { w2b: number; r2b: number };
  reset: () => void;
}

export const useBehaviorStore = create<BehaviorState>((set, get) => ({
  events: [],
  w2bScore: 0,
  r2bScore: 0,

  addEvent: (event) => {
    set((state) => ({
      events: [...state.events, event],
    }));
  },

  updateW2B: (points) => {
    set((state) => ({
      w2bScore: Math.min(100, state.w2bScore + points),
    }));
  },

  updateR2B: (points) => {
    set((state) => ({
      r2bScore: Math.min(100, state.r2bScore + points),
    }));
  },

  getScore: () => {
    const state = get();
    return { w2b: state.w2bScore, r2b: state.r2bScore };
  },

  reset: () =>
    set({
      events: [],
      w2bScore: 0,
      r2bScore: 0,
    }),
}));
