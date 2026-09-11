import { describe, expect, it } from 'vitest';
import { BLOCKS, blockForWeek, DELOAD_WEEKS, getBlock } from './blocks';
import { CORE_STAGES } from './core';
import { EXERCISES, getExercise, isCalibrationEligible, isExerciseId } from './exercises';
import { FULL_BODY } from './fullbody';
import type { Prescription } from './types';

const allPrescriptions = (): Prescription[] => [
  ...BLOCKS.flatMap((b) => [...b.sessions.PUSH, ...b.sessions.PULL, ...b.sessions.LEGS]),
  ...CORE_STAGES.flatMap((s) => [...s.drills]),
  ...FULL_BODY.flatMap((f) => [...f.exercises]),
];

describe('seed integrity', () => {
  it('every prescription, alternative and substitute references a catalogued exercise', () => {
    for (const p of allPrescriptions()) {
      expect(isExerciseId(p.exerciseId), p.exerciseId).toBe(true);
      for (const alt of p.alternatives ?? []) expect(isExerciseId(alt), alt).toBe(true);
    }
    for (const [id, def] of Object.entries(EXERCISES)) {
      for (const sub of def.substitutes) {
        expect(isExerciseId(sub), `${id} → ${sub}`).toBe(true);
        expect(sub).not.toBe(id);
      }
    }
  });

  it('every non-core exercise has an ordered Part 3 substitute list', () => {
    for (const [id, def] of Object.entries(EXERCISES)) {
      if (def.pattern === 'core-bracing') continue;
      expect(def.substitutes.length, id).toBeGreaterThan(0);
    }
  });

  it('substitutes stay inside the movement pattern', () => {
    // Part 3 lists cable pull-through under both hip hinge and hip thrust.
    const shared = new Set(['cable-pull-through']);
    for (const [id, def] of Object.entries(EXERCISES)) {
      for (const sub of def.substitutes) {
        if (shared.has(sub)) continue;
        expect(getExercise(sub).pattern, `${id} → ${sub}`).toBe(def.pattern);
      }
    }
  });

  it('blocks tile weeks 1–52 with deloads at 9, 17, 26, 35, 43, 52', () => {
    expect(DELOAD_WEEKS).toEqual([9, 17, 26, 35, 43, 52]);
    let next = 1;
    for (const b of BLOCKS) {
      expect(b.firstWeek).toBe(next);
      expect(b.deloadWeek).toBe(b.lastWeek);
      next = b.lastWeek + 1;
    }
    expect(next).toBe(53);
    expect(blockForWeek(1).number).toBe(1);
    expect(blockForWeek(9).number).toBe(1);
    expect(blockForWeek(10).number).toBe(2);
    expect(blockForWeek(41).number).toBe(5);
    expect(blockForWeek(52).number).toBe(6);
  });

  it('superset keys always come in pairs (or pair with the core block)', () => {
    for (const b of BLOCKS) {
      for (const type of ['PUSH', 'PULL', 'LEGS'] as const) {
        const counts = new Map<string, number>();
        for (const p of b.sessions[type]) {
          if (p.superset) counts.set(p.superset, (counts.get(p.superset) ?? 0) + 1);
        }
        for (const [key, n] of counts) {
          if (key === 'CORE') {
            expect(type).toBe('LEGS');
            expect(n).toBe(1);
          } else {
            expect(n, `${b.number} ${type} ${key}`).toBe(2);
          }
        }
      }
    }
  });

  it('every rep range and RIR target is well-formed', () => {
    for (const p of allPrescriptions()) {
      expect(p.sets).toBeGreaterThan(0);
      expect(p.reps.min).toBeLessThanOrEqual(p.reps.max);
      if (p.rir) expect(p.rir.min).toBeLessThanOrEqual(p.rir.max);
      if (p.lastSet?.reps) expect(p.lastSet.reps.min).toBeLessThanOrEqual(p.lastSet.reps.max);
    }
  });

  it('core stage is selected by block (1→B1, 2→B2, 3→B3, 4→B4–6)', () => {
    expect(BLOCKS.map((b) => b.coreStage)).toEqual([1, 2, 3, 4, 4, 4]);
  });
});

describe('the document, spot-checked', () => {
  it('week 41 PULL is Block 5 PULL: weighted pull-up 4×4–6, barbell row 4×5–8, …, hammer + wrist curl SS', () => {
    const pull = blockForWeek(41).sessions.PULL;
    expect(pull.map((p) => p.exerciseId)).toEqual([
      'pull-up',
      'barbell-row',
      'reverse-pec-deck',
      'db-lateral-raise',
      'ez-bar-curl',
      'hammer-curl',
      'db-wrist-curl',
    ]);
    expect(pull[0]).toMatchObject({ sets: 4, reps: { min: 4, max: 6 }, rir: { min: 2, max: 2 }, rest: 'main-strength' });
    expect(pull[1]).toMatchObject({ sets: 4, reps: { min: 5, max: 8 } });
    expect(pull[5].superset).toBe(pull[6].superset);
  });

  it('Block 3 bench is 4×4–6, RIR 2 with the last set at RIR 1', () => {
    const bench = getBlock(3).sessions.PUSH[0];
    expect(bench).toMatchObject({ exerciseId: 'barbell-bench-press', sets: 4, reps: { min: 4, max: 6 }, rir: { min: 2, max: 2 } });
    expect(bench.lastSet?.rir).toEqual({ min: 1, max: 1 });
  });

  it('Block 5 squat and bench top set goes to 3–5 at RIR 1–2; deadlift stays 3–5 at RIR 2–3', () => {
    const b5 = getBlock(5);
    expect(b5.sessions.PUSH[0].lastSet).toEqual({ reps: { min: 3, max: 5 }, rir: { min: 1, max: 2 } });
    expect(b5.sessions.LEGS[0].lastSet).toEqual({ reps: { min: 3, max: 5 }, rir: { min: 1, max: 2 } });
    expect(b5.sessions.LEGS[1]).toMatchObject({ exerciseId: 'conventional-deadlift', reps: { min: 3, max: 5 }, rir: { min: 2, max: 3 } });
  });

  it('Block 4 LEGS applies the swaps: hack squat, hip thrust 3×8–12, RDL kept at 2×8–10, lying leg curl, stage 4 core', () => {
    const legs = getBlock(4).sessions.LEGS;
    expect(legs.map((p) => p.exerciseId)).toEqual([
      'hack-squat',
      'barbell-hip-thrust',
      'romanian-deadlift',
      'leg-extension',
      'lying-leg-curl',
      'standing-calf-raise',
      'seated-calf-raise',
    ]);
    expect(legs[1]).toMatchObject({ sets: 3, reps: { min: 8, max: 12 } });
    expect(legs[2]).toMatchObject({ sets: 2, reps: { min: 8, max: 10 }, rir: { min: 2, max: 2 } });
    expect(legs[0].alternatives).toEqual(['leg-press']);
    expect(getBlock(4).coreStage).toBe(4);
  });

  it('Block 4 PUSH swaps: incline barbell bench 3×6–10 RIR 2, machine chest press, seated barbell OHP 3×6–10', () => {
    const push = getBlock(4).sessions.PUSH;
    expect(push[0]).toMatchObject({ exerciseId: 'incline-barbell-bench', sets: 3, reps: { min: 6, max: 10 }, rir: { min: 2, max: 2 } });
    expect(push[1]).toMatchObject({ exerciseId: 'machine-chest-press', sets: 3, reps: { min: 8, max: 12 } });
    expect(push[2]).toMatchObject({ exerciseId: 'seated-barbell-ohp', sets: 3, reps: { min: 6, max: 10 } });
    // Unlisted stays as Block 1, supersets included.
    expect(push.slice(3).map((p) => p.exerciseId)).toEqual(getBlock(1).sessions.PUSH.slice(3).map((p) => p.exerciseId));
  });

  it('Block 6 is Block 2 with isolation ranges up one notch and compounds unchanged', () => {
    const b2 = getBlock(2);
    const b6 = getBlock(6);
    for (const type of ['PUSH', 'PULL', 'LEGS'] as const) {
      expect(b6.sessions[type].map((p) => p.exerciseId)).toEqual(b2.sessions[type].map((p) => p.exerciseId));
      b6.sessions[type].forEach((p, i) => {
        const src = b2.sessions[type][i];
        const role = getExercise(p.exerciseId).role;
        if (role === 'isolation') {
          expect(p.reps.min, p.exerciseId).toBeGreaterThan(src.reps.min);
        } else {
          expect(p.reps, p.exerciseId).toEqual(src.reps);
        }
      });
    }
    expect(b6.sessions.PUSH.find((p) => p.exerciseId === 'pec-deck')?.reps).toEqual({ min: 15, max: 20 });
  });

  it('Block 1 LEGS seated calf raise is supersetted with the core block', () => {
    const legs = getBlock(1).sessions.LEGS;
    expect(legs[6]).toMatchObject({ exerciseId: 'seated-calf-raise', superset: 'CORE' });
  });

  it('calibration nudge is only ever eligible on machine/cable isolation', () => {
    expect(isCalibrationEligible('cable-lateral-raise')).toBe(true);
    expect(isCalibrationEligible('leg-extension')).toBe(true);
    expect(isCalibrationEligible('barbell-bench-press')).toBe(false);
    expect(isCalibrationEligible('high-bar-back-squat')).toBe(false);
    expect(isCalibrationEligible('conventional-deadlift')).toBe(false);
    expect(isCalibrationEligible('standing-barbell-ohp')).toBe(false);
    expect(isCalibrationEligible('leg-press')).toBe(false); // secondary compound, not isolation
    expect(isCalibrationEligible('db-lateral-raise')).toBe(false); // dumbbell, not machine
  });

  it('leg press and hack squat carry the +10 lb lower-body increment', () => {
    expect(getExercise('leg-press').defaultIncrementLb).toBe(10);
    expect(getExercise('hack-squat').defaultIncrementLb).toBe(10);
  });
});
