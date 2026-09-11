/**
 * Every place where the program document is ambiguous when turned into code,
 * the interpretation lives here as a named constant with the alternative
 * noted. Change the constant; nothing else needs to move.
 *
 * See DECISIONS.md at the repo root for the same list in prose.
 */

import type { RepRange, RestCategory, RirTarget } from './types';

/**
 * D1 — RIR chip default for a range target ("1–2", "0–1", "2–3", "3–4").
 * The chip row needs one number. 'min' puts the unexamined default at the
 * harder end (1–2 → 1), because the lifter is more likely to undershoot
 * effort than overshoot it. Alternative: 'max'.
 */
export const RIR_DEFAULT_FROM_RANGE: 'min' | 'max' = 'min';

/**
 * D2 — "at the target RIR" in the progression check. A set counts toward
 * progression only if the logged RIR is not *lower* than the target's minimum
 * (i.e. you did not need to exceed the target effort to hit the reps).
 * Alternative: ignore RIR entirely and check reps only.
 */
export const PROGRESSION_REQUIRES_RIR_AT_OR_ABOVE_TARGET_MIN = true;

/** D3 — Deload halves sets. 3 sets → 2 with 'ceil', 1 with 'floor'. */
export const DELOAD_SET_ROUNDING: 'ceil' | 'floor' = 'ceil';
export const DELOAD_LOAD_FACTOR = 0.6;
export const DELOAD_RIR: RirTarget = { min: 4, max: 5 };
/** D3b — Core drills continue through deload at full sets ("core continues"). Loaded core (cable crunch) still drops to 60%. */
export const DELOAD_KEEPS_CORE_SETS = true;

/**
 * D4 — Layoff matrix day thresholds (Part 5 gives "1–3 days", "a full week",
 * "2–3 weeks", "4+ weeks"; the gaps between them are filled here).
 */
export const LAYOFF_DAYS = {
  /** ≤ this many days since the last session: nothing. "Miss 2–3 days" is 3–4 days since the last session. */
  nothingUpTo: 4,
  /** 5..weekUpTo → repeat last loads, no progression. */
  weekUpTo: 13,
  /** 14..twoToThreeWeeksUpTo → −10 %, RIR 2–3 for one full loop. */
  twoToThreeWeeksUpTo: 27,
  /** ≥ 28 → restart current block at its week 1, −15 %, first week on-ramp RIR 3–4. */
} as const;
export const LAYOFF_LOAD_FACTOR_2_3_WEEKS = 0.9;
export const LAYOFF_LOAD_FACTOR_4_PLUS_WEEKS = 0.85;
export const LAYOFF_RIR_2_3_WEEKS: RirTarget = { min: 2, max: 3 };
export const LAYOFF_RIR_4_PLUS_WEEKS: RirTarget = { min: 3, max: 4 };
/** "For one full loop" = the next three queue sessions. */
export const LAYOFF_LOOP_SESSIONS = 3;

/**
 * D5 — Stall trigger: "zero total reps added across 3 consecutive
 * appearances". Read as three consecutive appearances that each added no
 * reps relative to the appearance before them at the same load (so four
 * appearances are involved: a baseline plus three failed attempts).
 * Alternative: 2 (three appearances, two comparisons).
 */
export const STALL_CONSECUTIVE_NO_GAIN = 3;
/** Part 11 works "one step per week". */
export const STALL_STEP_DAYS = 7;
/** Part 11 step 7 — "multiple lifts stalled at once". */
export const STALL_MULTI_THRESHOLD = 3;

/** D6 — Calibration nudge "every 3–4 weeks". */
export const CALIBRATION_INTERVAL_DAYS = 21;

/**
 * D7 — Rest timer seconds. The document gives ranges; one value is needed.
 * Supersets are not run (equipment availability), so their time saving is
 * recovered from isolation rests instead: 60 s rather than the document's
 * 1–1.5 min. Compound rests are unchanged. All are editable in Settings.
 */
export const REST_SECONDS_DEFAULT: Record<RestCategory, number> = {
  'main-hypertrophy': 180, // 2.5–3 min
  'main-strength': 240, // 3–5 min
  secondary: 150, // 2–3 min
  isolation: 60, // document: 1–1.5 min; shortened to recover superset time
};

/**
 * D8 — Block 6 "isolation rep ranges shift up one notch (12–15 → 15–20)".
 * The document only gives that one example; the ladder below extends it to
 * the other isolation ranges present in Block 2. Block 6 is fully expanded in
 * blocks.ts using this ladder, with the source range noted on each line.
 */
export const BLOCK6_NOTCH_LADDER: ReadonlyArray<{ from: RepRange; to: RepRange }> = [
  { from: { min: 8, max: 12 }, to: { min: 10, max: 15 } },
  { from: { min: 10, max: 15 }, to: { min: 12, max: 20 } },
  { from: { min: 12, max: 15 }, to: { min: 15, max: 20 } }, // the document's example
  { from: { min: 12, max: 20 }, to: { min: 15, max: 25 } },
  { from: { min: 15, max: 20 }, to: { min: 20, max: 25 } },
];

/**
 * D9 — Entering a strength block: "take your best recent 6–10 set and add
 * ~5–7 %". Used when an exercise's rep range moves *down* versus its last
 * appearance. When it moves back *up* (Block 5 → Block 6) the document is
 * silent; the engine re-derives a load from estimated 1RM instead.
 */
export const STRENGTH_ENTRY_LOAD_FACTOR = 1.06;

/** D10 — Default increments by equipment (Part 1.4). Machines: "smallest pin or half-plate" — set per machine once; until then this value. */
export const DEFAULT_INCREMENT_LB = {
  'barbell-lower': 10,
  'barbell-upper': 5,
  dumbbell: 5, // per hand, "next available pair"
  'machine-cable': 5,
  bodyweight: 5,
} as const;

/** D11 — Dumbbells (and coarse isolation increments) must first reach top-of-range + this many reps on all sets. */
export const EXTENDED_RANGE_EXTRA_REPS = 2;

/** D12 — After week 52 the week number clamps at 52 (Block 6 tables continue). Alternative: loop to week 1. */
export const CLAMP_WEEK_AT_52 = true;

/** D13 — The Part 3 "joint bothering you" fallback. */
export const JOINT_FALLBACK = { loadFactor: 0.8, reps: { min: 10, max: 15 } as RepRange, rir: { min: 2, max: 2 } as RirTarget };

/** D14 — Minimum session (Part 5.4): first 3 table slots, 2 sets each, RIR 3. */
export const MINIMUM_SESSION = { exercises: 3, sets: 2, rir: { min: 3, max: 3 } as RirTarget };

/** D15 — First-ever appearance of a barbell lift prefills the empty bar; everything else prefills 0. */
export const FIRST_APPEARANCE_BARBELL_LOAD_LB = 45;

/** D16 — Bodyweight calibration (Part 8.1) needs this many days of weigh-ins before it evaluates. */
export const CALORIE_CALIBRATION_MIN_DAYS = 21;

/**
 * D18 — Not a stall: an exercise that keeps hitting the top of its range but
 * only at an RIR below the target's minimum never earns an increase under
 * D2. After this many consecutive appearances of that pattern the copy says
 * "load too heavy, drop 5 % and rebuild" instead of the Part 11 steps.
 */
export const LOAD_TOO_HEAVY_APPEARANCES = 3;
export const LOAD_TOO_HEAVY_DROP = 0.05;
