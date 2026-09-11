import type { Prescription, RepRange, RestCategory, RirTarget, SessionType } from '@/program/types';

/** How a stored session was run. Drives whether its sets feed progression and stall detection. */
export type SessionKind = 'queue' | 'minimum' | 'deload' | 'fullbody';

export type PlannedSessionType = SessionType | 'FBA' | 'FBB';

export interface LoggedSet {
  load: number;
  reps: number;
  /** null for bracing drills with no RIR target. */
  rir: number | null;
  pain?: boolean;
  /** Calibration set taken to true concentric failure. */
  toFailure?: boolean;
}

/** One past appearance of an exercise (all its sets in one session). Newest last when in a list. */
export interface Appearance {
  sessionId: string;
  /** ISO datetime of the session start. */
  date: string;
  kind: SessionKind;
  /** Rep range prescribed at the time (per set, in set order). */
  repRanges: RepRange[];
  sets: LoggedSet[];
  /** Load multiplier or RIR override was in effect (layoff/deload) — informational. */
  modified?: boolean;
}

export interface SetPrefill {
  load: number;
  reps: number;
  rir: number | null;
  repRange: RepRange;
  rirTarget: RirTarget | null;
}

export type Suggestion =
  | { kind: 'first'; note: string }
  | { kind: 'increase'; deltaLb: number; note: string }
  | { kind: 'hold'; note: string }
  | { kind: 'range-shift'; note: string }
  | { kind: 'suppressed'; note: string };

export interface PrefillResult {
  sets: SetPrefill[];
  suggestion: Suggestion;
}

export interface PlannedSetRow {
  key: string;
  cardIndex: number;
  slotIndex: number;
  exerciseId: string;
  setIndex: number;
  load: number;
  reps: number;
  rir: number | null;
  repRange: RepRange;
  rirTarget: RirTarget | null;
  /** Rest to start after this row is logged. */
  restSeconds: number;
  restCategory: RestCategory;
  loadable: boolean;
  repUnit: 'reps' | 'seconds' | 'metres';
  perSide: boolean;
  isLastSet: boolean;
  calibrationEligible: boolean;
  countsForProgression: boolean;
}

export interface PlannedExercise {
  slotIndex: number;
  exerciseId: string;
  name: string;
  prescription: Prescription;
  suggestion: Suggestion;
  /** Original exercise id if this slot was substituted for this session. */
  substitutedFrom?: string;
  jointFallback?: boolean;
  isCore?: boolean;
}

export interface PlannedCard {
  index: number;
  title: string;
  exercises: PlannedExercise[];
  /** Rows in execution order (interleaved for supersets). */
  rows: PlannedSetRow[];
  isSuperset: boolean;
  isCoreBlock: boolean;
}

export interface PlannedSession {
  kind: SessionKind;
  sessionType: PlannedSessionType;
  block: number;
  week: number;
  cards: PlannedCard[];
  /** One line explaining what the app did (layoff / deload / on-ramp). Null when nothing to say. */
  banner: string | null;
  advancesQueue: boolean;
  countsForProgression: boolean;
  loadFactor: number;
  rirOverride: RirTarget | null;
}
