import {
  EXTENDED_RANGE_EXTRA_REPS,
  FIRST_APPEARANCE_BARBELL_LOAD_LB,
  PROGRESSION_REQUIRES_RIR_AT_OR_ABOVE_TARGET_MIN,
  STRENGTH_ENTRY_LOAD_FACTOR,
} from '@/program/decisions';
import type { ExerciseDef, Prescription, RepRange, RirTarget } from '@/program/types';
import { bestE1rm, loadForReps } from './e1rm';
import { floorToIncrement, plateRounding, roundToIncrement } from './increments';
import { defaultRir } from './rir';
import type { Appearance, LoggedSet, PrefillResult, SetPrefill, Suggestion } from './types';

/**
 * Part 1.4 — double progression, as a pure function of an exercise's history.
 *
 * The prefilled numbers ARE the suggestion. No dialog, no confirmation.
 */

/** D17 — an increment counts as "coarse" when it is ≥ this fraction of the working load. */
export const COARSE_INCREMENT_RATIO = 0.1;

export interface PrefillInput {
  exercise: ExerciseDef;
  /** The effective prescription for today (after any variant transform). */
  prescription: Prescription;
  /** Past appearances of this exercise id, oldest first. */
  history: readonly Appearance[];
  incrementLb: number;
  /** 1 normally; 0.6 deload; 0.9 / 0.85 layoff; 0.8 joint fallback. */
  loadFactor?: number;
  /** When set, the factor applies only if the base appearance started before this ISO date (layoff). */
  loadFactorBefore?: string;
  rirOverride?: RirTarget | null;
  /** False in minimum / deload sessions and during a layoff week. */
  allowProgression?: boolean;
  /** 'ignore' carries the last load regardless of a rep-range change (joint fallback: last load −20 % at 10–15). */
  rangeShiftMode?: 'auto' | 'ignore';
}

export function setRepRange(p: Prescription, setIndex: number): RepRange {
  if (setIndex === p.sets - 1 && p.lastSet?.reps) return p.lastSet.reps;
  return p.reps;
}

export function setRirTarget(p: Prescription, setIndex: number): RirTarget | null {
  if (setIndex === p.sets - 1 && p.lastSet?.rir) return p.lastSet.rir;
  return p.rir;
}

/** The most recent appearance whose loads are real working loads (deload sets are 60 % and are skipped). */
export function lastLoadBearing(history: readonly Appearance[]): Appearance | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].kind !== 'deload' && history[i].sets.length > 0) return history[i];
  }
  return null;
}

function maxLoad(sets: readonly LoggedSet[]): number {
  return sets.reduce((m, s) => Math.max(m, s.load), Number.NEGATIVE_INFINITY);
}

/**
 * Dumbbells always need top-of-range + 2. Isolation work needs it when the
 * increment is coarse relative to the load ("reps first, always").
 */
export function requiresExtendedRange(exercise: ExerciseDef, incrementLb: number, load: number): boolean {
  if (exercise.equipment === 'dumbbell') return true;
  if (exercise.role === 'isolation') {
    if (load <= 0) return true;
    return incrementLb / Math.abs(load) >= COARSE_INCREMENT_RATIO;
  }
  return false;
}

export interface EarnedResult {
  earned: boolean;
  reason: string;
}

/**
 * Rule 2: all prescribed sets hit the top of the rep range at the target
 * RIR. The rep ranges checked are the ones prescribed when the sets were
 * logged (stored on the appearance), so a range change between blocks never
 * awards a phantom increase.
 */
export function evaluateEarned(
  exercise: ExerciseDef,
  base: Appearance,
  incrementLb: number,
  rirTargetsAtBase: ReadonlyArray<RirTarget | null>,
): EarnedResult {
  if (base.kind !== 'queue' && base.kind !== 'fullbody') {
    return { earned: false, reason: `${base.kind} session — no progression attempt` };
  }
  const prescribed = base.repRanges.length;
  if (prescribed === 0) return { earned: false, reason: 'no prescription recorded' };
  if (base.sets.length < prescribed) {
    return { earned: false, reason: `${base.sets.length}/${prescribed} sets logged` };
  }
  for (let i = 0; i < prescribed; i++) {
    const s = base.sets[i];
    const range = base.repRanges[i] ?? base.repRanges[base.repRanges.length - 1];
    const extra = requiresExtendedRange(exercise, incrementLb, s.load) ? EXTENDED_RANGE_EXTRA_REPS : 0;
    const top = range.max + extra;
    if (s.reps < top) return { earned: false, reason: `set ${i + 1}: ${s.reps} < ${top}` };
    const target = rirTargetsAtBase[i] ?? rirTargetsAtBase[rirTargetsAtBase.length - 1] ?? null;
    if (PROGRESSION_REQUIRES_RIR_AT_OR_ABOVE_TARGET_MIN && target && s.rir !== null && s.rir < target.min) {
      return { earned: false, reason: `set ${i + 1}: RIR ${s.rir} below target ${target.min}` };
    }
  }
  return { earned: true, reason: 'all sets at top of range' };
}

type RangeShift = 'same' | 'down' | 'up';

/** A range has moved when both of its bounds moved the same way (6–10 → 4–6 is 'down'; 8–10 vs 6–10 is 'same'). */
function rangeShift(current: RepRange, previous: RepRange | undefined): RangeShift {
  if (!previous) return 'same';
  if (current.max < previous.max && current.min < previous.min) return 'down';
  if (current.min > previous.min && current.max > previous.max) return 'up';
  return 'same';
}

function applyFactor(load: number, factor: number, rounding: number): number {
  if (factor === 1) return load;
  // Negative loads are assistance: −10 % load means more assistance, not less.
  const scaled = load < 0 ? load / factor : load * factor;
  return roundToIncrement(scaled, rounding);
}

export function prefill(input: PrefillInput): PrefillResult {
  const {
    exercise,
    prescription: p,
    history,
    incrementLb,
    loadFactor = 1,
    loadFactorBefore,
    rirOverride = null,
    allowProgression = true,
    rangeShiftMode = 'auto',
  } = input;

  const rounding = plateRounding(exercise, incrementLb);
  const loadable = exercise.loadable !== false;
  const ranges = Array.from({ length: p.sets }, (_, i) => setRepRange(p, i));
  const rirTargets = Array.from({ length: p.sets }, (_, i) => (p.rir === null ? null : (rirOverride ?? setRirTarget(p, i))));

  const base = lastLoadBearing(history);

  // First appearance ever: nothing to progress from.
  if (!base) {
    const isBarbell = exercise.equipment === 'barbell-lower' || exercise.equipment === 'barbell-upper';
    const startLoad = loadable && isBarbell ? FIRST_APPEARANCE_BARBELL_LOAD_LB : 0;
    const sets: SetPrefill[] = ranges.map((range, i) => ({
      load: startLoad,
      reps: range.min,
      rir: defaultRir(rirTargets[i]),
      repRange: range,
      rirTarget: rirTargets[i],
    }));
    return {
      sets,
      suggestion: {
        kind: 'first',
        note: loadable
          ? 'First appearance. Set a load you are sure of for the top of the range +3.'
          : 'First appearance.',
      },
    };
  }

  const factorApplies = loadFactor !== 1 && (!loadFactorBefore || base.date < loadFactorBefore);
  const shift = rangeShiftMode === 'ignore' ? 'same' : rangeShift(ranges[0], base.repRanges[0]);
  const lastSetOf = (i: number): LoggedSet => base.sets[Math.min(i, base.sets.length - 1)];

  let suggestion: Suggestion;
  let sets: SetPrefill[];

  if (!loadable) {
    sets = ranges.map((range, i) => ({
      load: 0,
      reps: Math.max(range.min, Math.min(range.max, lastSetOf(i).reps)),
      rir: defaultRir(rirTargets[i]),
      repRange: range,
      rirTarget: rirTargets[i],
    }));
    suggestion = { kind: 'hold', note: 'Bodyweight drill — log what you did.' };
  } else if (shift === 'down') {
    // Entering heavier work (e.g. Block 2 → Block 3): best recent set + ~6 %, bottom of the new range.
    const bestLoad = maxLoad(base.sets);
    const load = roundToIncrement(bestLoad * STRENGTH_ENTRY_LOAD_FACTOR, rounding);
    sets = ranges.map((range, i) => ({
      load: applyFactor(load, factorApplies ? loadFactor : 1, rounding),
      reps: range.min,
      rir: defaultRir(rirTargets[i]),
      repRange: range,
      rirTarget: rirTargets[i],
    }));
    suggestion = {
      kind: 'range-shift',
      note: `New rep range ${ranges[0].min}–${ranges[0].max}. Load set from your best recent set +6 %.`,
    };
  } else if (shift === 'up') {
    // Back to lighter, higher-rep work: derive a load from estimated 1RM for the bottom of the range.
    const oneRm = bestE1rm(base.sets);
    sets = ranges.map((range, i) => {
      const rir = defaultRir(rirTargets[i]) ?? 0;
      const load = floorToIncrement(loadForReps(oneRm, range.min, rir), rounding);
      return {
        load: applyFactor(load, factorApplies ? loadFactor : 1, rounding),
        reps: range.min,
        rir: defaultRir(rirTargets[i]),
        repRange: range,
        rirTarget: rirTargets[i],
      };
    });
    suggestion = {
      kind: 'range-shift',
      note: `New rep range ${ranges[0].min}–${ranges[0].max}. Load derived from your estimated 1RM.`,
    };
  } else {
    const baseRirTargets = base.repRanges.map((_, i) => rirTargets[Math.min(i, rirTargets.length - 1)] ?? null);
    const earnedResult =
      allowProgression && !factorApplies
        ? evaluateEarned(exercise, base, incrementLb, baseRirTargets)
        : { earned: false, reason: 'progression suppressed' };

    if (earnedResult.earned) {
      sets = ranges.map((range, i) => ({
        load: roundToIncrement(lastSetOf(i).load + incrementLb, rounding),
        reps: range.min,
        rir: defaultRir(rirTargets[i]),
        repRange: range,
        rirTarget: rirTargets[i],
      }));
      suggestion = {
        kind: 'increase',
        deltaLb: incrementLb,
        note: `+${incrementLb} lb — all sets hit the top of the range last time.`,
      };
    } else {
      sets = ranges.map((range, i) => {
        const last = lastSetOf(i);
        return {
          load: applyFactor(last.load, factorApplies ? loadFactor : 1, rounding),
          reps: rangeShiftMode === 'ignore' ? Math.max(range.min, Math.min(range.max, last.reps)) : last.reps,
          rir: defaultRir(rirTargets[i]),
          repRange: range,
          rirTarget: rirTargets[i],
        };
      });
      if (factorApplies) {
        const pct = Math.round((1 - loadFactor) * 100);
        suggestion = { kind: 'suppressed', note: `Loads −${pct} %. No progression this session.` };
      } else if (!allowProgression) {
        suggestion = { kind: 'suppressed', note: 'No progression attempt this session.' };
      } else {
        suggestion = { kind: 'hold', note: `Hold load, add reps (${earnedResult.reason}).` };
      }
    }
  }

  return { sets, suggestion };
}

/** Rep target to display for a range shift when the user wants to see what "top of range" means. */
export function topOfRangeFor(exercise: ExerciseDef, range: RepRange, incrementLb: number, load: number): number {
  return range.max + (requiresExtendedRange(exercise, incrementLb, load) ? EXTENDED_RANGE_EXTRA_REPS : 0);
}
