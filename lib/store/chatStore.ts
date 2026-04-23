import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

export interface LeadData {
  name?: string;
  phone?: string;
  email?: string;
  capturedAt?: number;
  source?: string;
}

/** Persisted booking snapshot so VisitTile can surface an "already scheduled"
 *  state on re-entry instead of restarting the date/time/name/phone flow. */
export interface BookingData {
  type: 'site_visit' | 'virtual_visit' | 'call_back';
  slotIsoLocal: string;
  slotLabel: string;
  dayShortLabel: string;
  dayLongLabel: string;
  timezone: string;
  capturedAt: number;
}

export interface ChatState {
  pinnedUnitIds: string[];
  lead: LeadData | null;
  booking: BookingData | null;
  sessionCampaign: string | null;
  conversationId: string | null;

  pinUnit: (id: string) => void;
  unpinUnit: (id: string) => void;
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;

  setLead: (l: LeadData) => void;
  hasLead: () => boolean;

  setBooking: (b: Omit<BookingData, 'capturedAt'> | null) => void;
  clearBooking: () => void;

  setCampaign: (c: string | null) => void;
  setConversationId: (id: string | null) => void;
  reset: () => void;
}

const memoryStore: Record<string, string> = {};
const memoryStorage: StateStorage = {
  getItem: (k) => memoryStore[k] ?? null,
  setItem: (k, v) => {
    memoryStore[k] = v;
  },
  removeItem: (k) => {
    delete memoryStore[k];
  },
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      pinnedUnitIds: [],
      lead: null,
      booking: null,
      sessionCampaign: null,
      conversationId: null,

      pinUnit: (id) =>
        set((s) => (s.pinnedUnitIds.includes(id) ? s : { pinnedUnitIds: [...s.pinnedUnitIds, id] })),
      unpinUnit: (id) => set((s) => ({ pinnedUnitIds: s.pinnedUnitIds.filter((x) => x !== id) })),
      togglePin: (id) => {
        const { pinnedUnitIds } = get();
        if (pinnedUnitIds.includes(id)) {
          set({ pinnedUnitIds: pinnedUnitIds.filter((x) => x !== id) });
        } else {
          set({ pinnedUnitIds: [...pinnedUnitIds, id] });
        }
      },
      isPinned: (id) => get().pinnedUnitIds.includes(id),

      setLead: (l) => set({ lead: { ...l, capturedAt: Date.now() } }),
      hasLead: () => !!get().lead?.phone,

      setBooking: (b) =>
        set({ booking: b ? { ...b, capturedAt: Date.now() } : null }),
      clearBooking: () => set({ booking: null }),

      setCampaign: (c) => set({ sessionCampaign: c }),
      setConversationId: (id) => set({ conversationId: id }),
      reset: () =>
        set({
          pinnedUnitIds: [],
          lead: null,
          booking: null,
          sessionCampaign: null,
          conversationId: null,
        }),
    }),
    {
      name: 'asbl-loft-chat',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : memoryStorage
      ),
    }
  )
);
