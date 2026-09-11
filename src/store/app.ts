import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_REST_SETTINGS, type RestSettings } from '@/engine/rest';
import type { ActiveLayoff } from '@/engine/session-builder';
import { advance } from '@/engine/queue';
import { zustandStorage } from '@/storage/kv';
import type { RestCategory } from '@/program/types';

export type ThemePref = 'system' | 'dark' | 'light';

interface AppState {
  hydrated: boolean;
  /** Anchor for the program week. Moves only when a 4+ week layoff restarts the block. */
  programStartDay: string | null;
  originalStartDay: string | null;
  queueIndex: number;
  theme: ThemePref;
  restSettings: RestSettings;
  activeLayoff: ActiveLayoff | null;
  /** Manual/unscheduled deload runs until this day (inclusive). */
  manualDeloadUntilDay: string | null;
  /** Substitutions that persist for the rest of the block. */
  slotOverrides: Record<string, string>;
  lastRirCalibrationAt: string | null;
  blockReviewsSeen: number[];

  setHydrated(): void;
  setStartDay(day: string, original?: boolean): void;
  setTheme(t: ThemePref): void;
  setRestSeconds(category: RestCategory, seconds: number): void;
  advanceQueue(): void;
  setQueueIndex(i: number): void;
  setActiveLayoff(l: ActiveLayoff | null): void;
  consumeLayoffSession(): void;
  setManualDeloadUntilDay(day: string | null): void;
  setSlotOverride(key: string, exerciseId: string | null): void;
  setLastRirCalibrationAt(iso: string): void;
  markBlockReviewSeen(block: number): void;
  /** "Reset program progress": queue position and everything derived from sessions. Start date, theme and rest settings stay. */
  resetProgress(): void;
  /** "Erase all data": back to factory defaults. */
  resetAll(): void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      programStartDay: null,
      originalStartDay: null,
      queueIndex: 0,
      theme: 'system',
      restSettings: { ...DEFAULT_REST_SETTINGS },
      activeLayoff: null,
      manualDeloadUntilDay: null,
      slotOverrides: {},
      lastRirCalibrationAt: null,
      blockReviewsSeen: [],

      setHydrated: () => set({ hydrated: true }),
      setStartDay: (day, original = false) =>
        set((s) => ({ programStartDay: day, originalStartDay: original || !s.originalStartDay ? day : s.originalStartDay })),
      setTheme: (theme) => set({ theme }),
      setRestSeconds: (category, seconds) => set((s) => ({ restSettings: { ...s.restSettings, [category]: seconds } })),
      advanceQueue: () => set((s) => ({ queueIndex: advance(s.queueIndex) })),
      setQueueIndex: (queueIndex) => set({ queueIndex }),
      setActiveLayoff: (activeLayoff) => set({ activeLayoff }),
      consumeLayoffSession: () => {
        const l = get().activeLayoff;
        if (!l) return;
        const remaining = l.sessionsRemaining - 1;
        set({ activeLayoff: remaining > 0 ? { ...l, sessionsRemaining: remaining } : null });
      },
      setManualDeloadUntilDay: (manualDeloadUntilDay) => set({ manualDeloadUntilDay }),
      setSlotOverride: (key, exerciseId) =>
        set((s) => {
          const next = { ...s.slotOverrides };
          if (exerciseId) next[key] = exerciseId;
          else delete next[key];
          return { slotOverrides: next };
        }),
      setLastRirCalibrationAt: (lastRirCalibrationAt) => set({ lastRirCalibrationAt }),
      markBlockReviewSeen: (block) => set((s) => ({ blockReviewsSeen: s.blockReviewsSeen.includes(block) ? s.blockReviewsSeen : [...s.blockReviewsSeen, block] })),
      resetProgress: () =>
        set({
          queueIndex: 0,
          activeLayoff: null,
          manualDeloadUntilDay: null,
          slotOverrides: {},
          lastRirCalibrationAt: null,
          blockReviewsSeen: [],
        }),
      resetAll: () =>
        set({
          programStartDay: null,
          originalStartDay: null,
          queueIndex: 0,
          theme: 'system',
          restSettings: { ...DEFAULT_REST_SETTINGS },
          activeLayoff: null,
          manualDeloadUntilDay: null,
          slotOverrides: {},
          lastRirCalibrationAt: null,
          blockReviewsSeen: [],
        }),
    }),
    {
      name: 'ppl-app',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        programStartDay: s.programStartDay,
        originalStartDay: s.originalStartDay,
        queueIndex: s.queueIndex,
        theme: s.theme,
        restSettings: s.restSettings,
        activeLayoff: s.activeLayoff,
        manualDeloadUntilDay: s.manualDeloadUntilDay,
        slotOverrides: s.slotOverrides,
        lastRirCalibrationAt: s.lastRirCalibrationAt,
        blockReviewsSeen: s.blockReviewsSeen,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
