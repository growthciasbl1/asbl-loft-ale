import { create } from 'zustand';
import { SearchIntent, ConfidenceScores } from '@/types';

interface SearchState {
  rawQuery: string;
  extracted: SearchIntent | null;
  confidence: ConfidenceScores | null;
  primaryPath: 'INVESTOR' | 'END_USER' | 'NEUTRAL';
  moduleOrder: string[];

  setQuery: (query: string) => void;
  setExtracted: (
    data: SearchIntent,
    conf: ConfidenceScores,
    path: 'INVESTOR' | 'END_USER' | 'NEUTRAL'
  ) => void;
  setModuleOrder: (order: string[]) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  rawQuery: '',
  extracted: null,
  confidence: null,
  primaryPath: 'NEUTRAL',
  moduleOrder: [],

  setQuery: (query) => set({ rawQuery: query }),

  setExtracted: (data, conf, path) =>
    set({
      extracted: data,
      confidence: conf,
      primaryPath: path,
    }),

  setModuleOrder: (order) => set({ moduleOrder: order }),

  reset: () =>
    set({
      rawQuery: '',
      extracted: null,
      confidence: null,
      primaryPath: 'NEUTRAL',
      moduleOrder: [],
    }),
}));
