import { create } from 'zustand';

/** Transient UI hand-offs between screens. Not persisted. */
interface UiState {
  /** Session id the Home strip should scroll to next time it is focused; 'live' for the NEXT card. */
  homeJumpTo: string | null;
  setHomeJumpTo(id: string | null): void;
}

export const useUiStore = create<UiState>()((set) => ({
  homeJumpTo: null,
  setHomeJumpTo: (homeJumpTo) => set({ homeJumpTo }),
}));
