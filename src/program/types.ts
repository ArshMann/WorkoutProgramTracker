/**
 * Types for the program seed. Everything in `src/program` is static data
 * describing the 52-week document; nothing here touches the device.
 */

export type SessionType = 'PUSH' | 'PULL' | 'LEGS';

export type Equipment =
  | 'barbell-lower'
  | 'barbell-upper'
  | 'dumbbell'
  | 'machine-cable'
  | 'bodyweight';

export type MovementPattern =
  | 'horizontal-press'
  | 'incline-press'
  | 'vertical-press'
  | 'chest-isolation'
  | 'side-delt'
  | 'vertical-pull'
  | 'horizontal-row'
  | 'rear-delt'
  | 'biceps'
  | 'triceps'
  | 'squat'
  | 'hip-hinge'
  | 'knee-flexion'
  | 'knee-extension'
  | 'hip-thrust'
  | 'calves'
  | 'forearms'
  | 'loaded-ab-flexion'
  | 'core-bracing';

/** Part 1.5 categories. Drives rest category and RIR defaults. */
export type ExerciseRole = 'main' | 'secondary' | 'isolation' | 'core';

/** Part 1.6 rest table. */
export type RestCategory =
  | 'main-hypertrophy'
  | 'main-strength'
  | 'secondary'
  | 'isolation'
  | 'superset';

export type RepUnit = 'reps' | 'seconds' | 'metres';

export interface RepRange {
  min: number;
  max: number;
}

/** A single value is encoded as min === max. */
export interface RirTarget {
  min: number;
  max: number;
}

export interface ExerciseDef {
  name: string;
  pattern: MovementPattern;
  equipment: Equipment;
  role: ExerciseRole;
  /** Defaults to 'reps'. Timed and distance drills are logged in this unit. */
  repUnit?: RepUnit;
  /** Prescribed per side/leg. Logged once per set; the set means both sides. */
  perSide?: boolean;
  /** Fixed-path machine or Smith variant — eligible for the "joint bothering you" fallback. */
  machineGuided?: boolean;
  /** Overrides the equipment-derived default increment (doc groups leg press/hack squat with +10 lb). */
  defaultIncrementLb?: number;
  /** False for unloaded bracing drills (dead bug, planks). Defaults to true. */
  loadable?: boolean;
  /** Ordered substitution list from Part 3 for this movement pattern. */
  substitutes: readonly string[];
  notes?: string;
}

export interface Prescription {
  exerciseId: string;
  sets: number;
  reps: RepRange;
  /** null for bracing drills the document marks "—". */
  rir: RirTarget | null;
  /** Per-set override on the final set (Block 3 "last set 1", Block 5 top sets). */
  lastSet?: { reps?: RepRange; rir?: RirTarget };
  rest: RestCategory;
  /** Exercises sharing a key inside one session are a superset pair and are interleaved. */
  superset?: string;
  /** The document's "X or Y" alternatives. Shown at the top of the substitute sheet. */
  alternatives?: readonly string[];
  /** 'double' (Part 1.4) unless the document gives no progression rule for the drill. */
  progression?: 'double' | 'log-only';
  notes?: string;
}

export interface CoreStage {
  stage: 1 | 2 | 3 | 4;
  label: string;
  drills: readonly Prescription[];
}

export type BlockEmphasis = 'hypertrophy' | 'strength';

export interface Block {
  number: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  emphasis: BlockEmphasis;
  firstWeek: number;
  lastWeek: number;
  deloadWeek: number;
  coreStage: 1 | 2 | 3 | 4;
  /** Block 3/5: "first week at RIR 3 to groove the heavier bar speed" — applied to main lifts. */
  entryWeekMainRir?: RirTarget;
  sessions: Record<SessionType, readonly Prescription[]>;
  notes?: string;
}

export interface FullBodySession {
  id: 'FBA' | 'FBB';
  name: string;
  exercises: readonly Prescription[];
  includeCore: boolean;
}
