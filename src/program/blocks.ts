import type { Block, Prescription, RepRange, RirTarget } from './types';

/**
 * Part 2 — the six blocks, fully expanded.
 *
 * Blocks 4, 5 and 6 are written out in full (not derived at runtime) so that
 * any week's session can be read directly from this file. Where a block is
 * defined in the document as a modification of another block, the source
 * line and the rule applied are noted inline.
 *
 * Conventions:
 *  - `rir: {min, max}`; a single document value is min === max.
 *  - The document's "SS" pairings are not encoded: every exercise runs as
 *    straight sets in table order, and the core block follows the calf work
 *    on LEGS days. Set counts are the document's, unchanged.
 *  - `rest` follows Part 1.6 by the exercise's role and the block's emphasis.
 */

const reps = (min: number, max: number): RepRange => ({ min, max });
const rir = (min: number, max = min): RirTarget => ({ min, max });

// ─────────────────────────────────────────────────────────────────────────────
// Block 1 — Hypertrophy 1 (Weeks 1–9; deload week 9)
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK1_PUSH: readonly Prescription[] = [
  {
    exerciseId: 'barbell-bench-press',
    sets: 3,
    reps: reps(6, 10),
    rir: rir(2),
    rest: 'main-hypertrophy',
    notes: 'Anchor lift. Full pause not required; control the descent.',
  },
  { exerciseId: 'incline-db-press', sets: 3, reps: reps(8, 12), rir: rir(1, 2), rest: 'secondary' },
  { exerciseId: 'seated-db-ohp', sets: 3, reps: reps(8, 12), rir: rir(1, 2), rest: 'secondary' },
  { exerciseId: 'cable-fly', sets: 2, reps: reps(12, 15), rir: rir(1), rest: 'isolation' },
  {
    exerciseId: 'cable-lateral-raise',
    sets: 4,
    reps: reps(12, 20),
    rir: rir(0, 1),
    rest: 'isolation',
    notes: 'One arm at a time is fine.',
  },
  {
    exerciseId: 'overhead-cable-triceps-extension',
    sets: 2,
    reps: reps(10, 15),
    rir: rir(1),
    rest: 'isolation',
  },
  { exerciseId: 'cable-pressdown', sets: 2, reps: reps(12, 15), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK1_PULL: readonly Prescription[] = [
  {
    exerciseId: 'lat-pulldown',
    sets: 3,
    reps: reps(8, 12),
    rir: rir(1, 2),
    rest: 'secondary',
    notes: 'Switch to weighted pull-ups if/when you get 8+ strict.',
  },
  { exerciseId: 'chest-supported-row', sets: 3, reps: reps(8, 12), rir: rir(1, 2), rest: 'secondary' },
  { exerciseId: 'seated-cable-row', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'reverse-pec-deck', sets: 3, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-lateral-raise', sets: 3, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'ez-bar-curl', sets: 3, reps: reps(8, 12), rir: rir(1), rest: 'isolation' },
  { exerciseId: 'hammer-curl', sets: 2, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-wrist-curl', sets: 2, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK1_LEGS: readonly Prescription[] = [
  { exerciseId: 'high-bar-back-squat', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy', notes: 'Anchor lift.' },
  { exerciseId: 'romanian-deadlift', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy', notes: 'Anchor lift.' },
  { exerciseId: 'leg-press', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'leg-extension', sets: 2, reps: reps(12, 15), rir: rir(0, 1), rest: 'isolation' },
  {
    exerciseId: 'seated-leg-curl',
    sets: 4,
    reps: reps(10, 15),
    rir: rir(0, 1),
    rest: 'isolation',
    notes: 'Seated > lying for hamstring growth (reasonably supported).',
  },
  {
    exerciseId: 'standing-calf-raise',
    sets: 4,
    reps: reps(8, 12),
    rir: rir(0, 1),
    rest: 'isolation',
    notes: 'Full stretch at bottom, 2s pause.',
  },
  {
    exerciseId: 'seated-calf-raise',
    sets: 3,
    reps: reps(10, 15),
    rir: rir(0, 1),
    rest: 'isolation',
  },
  // #8 Core/APT block — Stage 1 is appended by the session builder (coreStage: 1).
];

// ─────────────────────────────────────────────────────────────────────────────
// Block 2 — Hypertrophy 2 (Weeks 10–17; deload week 17)
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK2_PUSH: readonly Prescription[] = [
  { exerciseId: 'barbell-bench-press', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'machine-shoulder-press', sets: 3, reps: reps(8, 12), rir: rir(1, 2), rest: 'secondary' },
  { exerciseId: 'flat-db-press', sets: 3, reps: reps(8, 12), rir: rir(1, 2), rest: 'secondary' },
  { exerciseId: 'pec-deck', sets: 2, reps: reps(12, 15), rir: rir(1), rest: 'isolation' },
  { exerciseId: 'db-lateral-raise', sets: 4, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'skullcrusher-ez', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'isolation' },
  { exerciseId: 'rope-pressdown', sets: 2, reps: reps(12, 15), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK2_PULL: readonly Prescription[] = [
  {
    exerciseId: 'pull-up',
    sets: 3,
    reps: reps(6, 10),
    rir: rir(1, 2),
    rest: 'secondary',
    alternatives: ['assisted-pull-up-machine'],
    notes: 'Pull-up or assisted pull-up.',
  },
  { exerciseId: 'barbell-row', sets: 3, reps: reps(8, 12), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'single-arm-cable-row', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'cable-rear-delt-fly', sets: 3, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'cable-lateral-raise', sets: 3, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'incline-db-curl', sets: 3, reps: reps(8, 12), rir: rir(1), rest: 'isolation' },
  { exerciseId: 'reverse-ez-curl', sets: 2, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'behind-back-wrist-curl', sets: 2, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK2_LEGS: readonly Prescription[] = [
  { exerciseId: 'high-bar-back-squat', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'romanian-deadlift', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'bulgarian-split-squat-db', sets: 2, reps: reps(8, 12), rir: rir(1), rest: 'secondary', notes: 'Per leg.' },
  { exerciseId: 'barbell-hip-thrust', sets: 2, reps: reps(8, 12), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'lying-leg-curl', sets: 4, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'standing-calf-raise', sets: 4, reps: reps(8, 12), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'seated-calf-raise', sets: 3, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  // #8 Core/APT block — Stage 2 (coreStage: 2).
];

// ─────────────────────────────────────────────────────────────────────────────
// Block 3 — Strength emphasis 1 (Weeks 18–26; deload week 26)
// "Rest 3–5 min on all main lifts." "First week at RIR 3 to groove the
// heavier bar speed" → entryWeekMainRir.
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK3_PUSH: readonly Prescription[] = [
  {
    exerciseId: 'barbell-bench-press',
    sets: 4,
    reps: reps(4, 6),
    rir: rir(2),
    lastSet: { rir: rir(1) },
    rest: 'main-strength',
    notes: 'RIR 2 (last set 1).',
  },
  { exerciseId: 'standing-barbell-ohp', sets: 3, reps: reps(4, 6), rir: rir(2), rest: 'main-strength' },
  { exerciseId: 'incline-db-press', sets: 2, reps: reps(8, 12), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'cable-lateral-raise', sets: 4, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  // The document writes "Pressdown" here; encoded as the same lift as Block 1's cable pressdown.
  { exerciseId: 'cable-pressdown', sets: 3, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK3_PULL: readonly Prescription[] = [
  {
    exerciseId: 'pull-up',
    sets: 4,
    reps: reps(4, 6),
    rir: rir(2),
    rest: 'main-strength',
    notes: 'Weighted (or strict) pull-up.',
  },
  { exerciseId: 'barbell-row', sets: 4, reps: reps(5, 8), rir: rir(2), rest: 'main-strength' },
  { exerciseId: 'reverse-pec-deck', sets: 3, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-lateral-raise', sets: 3, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'ez-bar-curl', sets: 3, reps: reps(8, 12), rir: rir(1), rest: 'isolation' },
  // "Hammer curl + wrist curl | 2 + 2 × 12–20"
  { exerciseId: 'hammer-curl', sets: 2, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-wrist-curl', sets: 2, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK3_LEGS: readonly Prescription[] = [
  { exerciseId: 'high-bar-back-squat', sets: 4, reps: reps(4, 6), rir: rir(2), rest: 'main-strength' },
  {
    exerciseId: 'conventional-deadlift',
    sets: 3,
    reps: reps(3, 5),
    rir: rir(2, 3),
    rest: 'main-strength',
    notes: 'Never grind deadlifts.',
  },
  { exerciseId: 'leg-press', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'seated-leg-curl', sets: 3, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'standing-calf-raise', sets: 4, reps: reps(8, 12), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'seated-calf-raise', sets: 2, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  // #7 Core/APT block — Stage 3 (coreStage: 3).
];

// ─────────────────────────────────────────────────────────────────────────────
// Block 4 — Hypertrophy 3 (Weeks 27–35; deload week 35)
// "Run Block 1's tables with these swaps. Everything unlisted stays as in
// Block 1." Rule applied: a replacement inherits any attribute the swap table
// does not state (RIR, rest) from the Block 1 slot it replaces. An
// exercise that is the same lift as in Block 1 keeps its own values.
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK4_PUSH: readonly Prescription[] = [
  // Barbell bench → Incline barbell bench (30°), 3 × 6–10, RIR 2
  {
    exerciseId: 'incline-barbell-bench',
    sets: 3,
    reps: reps(6, 10),
    rir: rir(2),
    rest: 'main-hypertrophy',
    notes: 'Block 4 swap for barbell bench. Anchor lift.',
  },
  // Incline DB press → Machine chest press, 3 × 8–12 (RIR 1–2 inherited from the slot)
  {
    exerciseId: 'machine-chest-press',
    sets: 3,
    reps: reps(8, 12),
    rir: rir(1, 2),
    rest: 'secondary',
    notes: 'Block 4 swap for incline DB press.',
  },
  // Seated DB OHP → Seated barbell OHP, 3 × 6–10 (RIR 1–2 inherited from the slot)
  {
    exerciseId: 'seated-barbell-ohp',
    sets: 3,
    reps: reps(6, 10),
    rir: rir(1, 2),
    rest: 'secondary',
    notes: 'Block 4 swap for seated DB OHP.',
  },
  // Unlisted — as Block 1:
  { exerciseId: 'cable-fly', sets: 2, reps: reps(12, 15), rir: rir(1), rest: 'isolation' },
  {
    exerciseId: 'cable-lateral-raise',
    sets: 4,
    reps: reps(12, 20),
    rir: rir(0, 1),
    rest: 'isolation',
    notes: 'One arm at a time is fine.',
  },
  {
    exerciseId: 'overhead-cable-triceps-extension',
    sets: 2,
    reps: reps(10, 15),
    rir: rir(1),
    rest: 'isolation',
  },
  { exerciseId: 'cable-pressdown', sets: 2, reps: reps(12, 15), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK4_PULL: readonly Prescription[] = [
  // Lat pulldown → Neutral-grip pulldown or pull-ups, 3 × 8–12
  {
    exerciseId: 'neutral-grip-pulldown',
    sets: 3,
    reps: reps(8, 12),
    rir: rir(1, 2),
    rest: 'secondary',
    alternatives: ['pull-up'],
    notes: 'Block 4 swap for lat pulldown. Neutral-grip pulldown or pull-ups.',
  },
  // Chest-supported row → T-bar or Meadows row, 3 × 8–12
  {
    exerciseId: 't-bar-row',
    sets: 3,
    reps: reps(8, 12),
    rir: rir(1, 2),
    rest: 'secondary',
    alternatives: ['meadows-row'],
    notes: 'Block 4 swap for chest-supported row. T-bar or Meadows row.',
  },
  // Unlisted — as Block 1:
  { exerciseId: 'seated-cable-row', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'reverse-pec-deck', sets: 3, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-lateral-raise', sets: 3, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'ez-bar-curl', sets: 3, reps: reps(8, 12), rir: rir(1), rest: 'isolation' },
  { exerciseId: 'hammer-curl', sets: 2, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-wrist-curl', sets: 2, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK4_LEGS: readonly Prescription[] = [
  // High-bar squat → Hack squat or leg press (heavy), 3 × 6–10 (RIR 2 inherited)
  {
    exerciseId: 'hack-squat',
    sets: 3,
    reps: reps(6, 10),
    rir: rir(2),
    rest: 'main-hypertrophy',
    alternatives: ['leg-press'],
    notes: 'Block 4 swap for high-bar squat. Hack squat or leg press (heavy). Anchor slot.',
  },
  // RDL → Barbell hip thrust 3 × 8–12 (RIR 2 inherited from the RDL slot) ...
  {
    exerciseId: 'barbell-hip-thrust',
    sets: 3,
    reps: reps(8, 12),
    rir: rir(2),
    rest: 'main-hypertrophy',
    notes: 'Block 4 swap for RDL.',
  },
  // ... plus keep RDL at 2 × 8–10 (replaces the leg press slot; RDL keeps its own RIR 2)
  {
    exerciseId: 'romanian-deadlift',
    sets: 2,
    reps: reps(8, 10),
    rir: rir(2),
    rest: 'main-hypertrophy',
    notes: 'Kept at 2 × 8–10 in the leg press slot.',
  },
  // Unlisted — as Block 1:
  { exerciseId: 'leg-extension', sets: 2, reps: reps(12, 15), rir: rir(0, 1), rest: 'isolation' },
  // Seated leg curl → Lying leg curl, 4 × 10–15
  {
    exerciseId: 'lying-leg-curl',
    sets: 4,
    reps: reps(10, 15),
    rir: rir(0, 1),
    rest: 'isolation',
    notes: 'Block 4 swap for seated leg curl.',
  },
  {
    exerciseId: 'standing-calf-raise',
    sets: 4,
    reps: reps(8, 12),
    rir: rir(0, 1),
    rest: 'isolation',
    notes: 'Full stretch at bottom, 2s pause.',
  },
  {
    exerciseId: 'seated-calf-raise',
    sets: 3,
    reps: reps(10, 15),
    rir: rir(0, 1),
    rest: 'isolation',
  },
  // Core block → Stage 4 (coreStage: 4).
];

// ─────────────────────────────────────────────────────────────────────────────
// Block 5 — Strength emphasis 2 (Weeks 36–43; deload week 43)
// "Run Block 3's tables exactly, with: squat and bench top sets may go to
// 3–5 reps, RIR 1–2 on the final set only; deadlift stays 3–5 at RIR 2–3.
// Accessories unchanged." Encoded as: squat and bench keep 4 × 4–6 RIR 2 on
// sets 1–3; the final (top) set is 3–5 at RIR 1–2.
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK5_PUSH: readonly Prescription[] = [
  {
    exerciseId: 'barbell-bench-press',
    sets: 4,
    reps: reps(4, 6),
    rir: rir(2),
    lastSet: { reps: reps(3, 5), rir: rir(1, 2) },
    rest: 'main-strength',
    notes: 'Block 5: top set may go to 3–5 reps, RIR 1–2 on the final set only. Goal: clear your Block 3 bests.',
  },
  { exerciseId: 'standing-barbell-ohp', sets: 3, reps: reps(4, 6), rir: rir(2), rest: 'main-strength' },
  { exerciseId: 'incline-db-press', sets: 2, reps: reps(8, 12), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'cable-lateral-raise', sets: 4, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'cable-pressdown', sets: 3, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK5_PULL: readonly Prescription[] = [
  {
    exerciseId: 'pull-up',
    sets: 4,
    reps: reps(4, 6),
    rir: rir(2),
    rest: 'main-strength',
    notes: 'Weighted (or strict) pull-up.',
  },
  { exerciseId: 'barbell-row', sets: 4, reps: reps(5, 8), rir: rir(2), rest: 'main-strength' },
  { exerciseId: 'reverse-pec-deck', sets: 3, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-lateral-raise', sets: 3, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'ez-bar-curl', sets: 3, reps: reps(8, 12), rir: rir(1), rest: 'isolation' },
  { exerciseId: 'hammer-curl', sets: 2, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'db-wrist-curl', sets: 2, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation' },
];

const BLOCK5_LEGS: readonly Prescription[] = [
  {
    exerciseId: 'high-bar-back-squat',
    sets: 4,
    reps: reps(4, 6),
    rir: rir(2),
    lastSet: { reps: reps(3, 5), rir: rir(1, 2) },
    rest: 'main-strength',
    notes: 'Block 5: top set may go to 3–5 reps, RIR 1–2 on the final set only. Goal: clear your Block 3 bests.',
  },
  {
    exerciseId: 'conventional-deadlift',
    sets: 3,
    reps: reps(3, 5),
    rir: rir(2, 3),
    rest: 'main-strength',
    notes: 'Stays 3–5 at RIR 2–3. Never grind deadlifts.',
  },
  { exerciseId: 'leg-press', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'seated-leg-curl', sets: 3, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'standing-calf-raise', sets: 4, reps: reps(8, 12), rir: rir(0, 1), rest: 'isolation' },
  { exerciseId: 'seated-calf-raise', sets: 2, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation' },
  // Core/APT block — Stage 4 (coreStage: 4).
];

// ─────────────────────────────────────────────────────────────────────────────
// Block 6 — Hypertrophy 4 + conditioning peak (Weeks 44–52; deload + review 52)
// "Run Block 2's tables with two changes: 1. Isolation rep ranges shift up
// one notch (12–15 → 15–20). 2. Conditioning rises to 2 zone-2 + 1 interval
// session/week." Compounds are unchanged. Each shifted range notes its
// Block 2 source; the ladder is BLOCK6_NOTCH_LADDER in decisions.ts (D8).
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK6_PUSH: readonly Prescription[] = [
  { exerciseId: 'barbell-bench-press', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'machine-shoulder-press', sets: 3, reps: reps(8, 12), rir: rir(1, 2), rest: 'secondary' },
  { exerciseId: 'flat-db-press', sets: 3, reps: reps(8, 12), rir: rir(1, 2), rest: 'secondary' },
  { exerciseId: 'pec-deck', sets: 2, reps: reps(15, 20), rir: rir(1), rest: 'isolation', notes: 'Block 6: 12–15 → 15–20.' },
  { exerciseId: 'db-lateral-raise', sets: 4, reps: reps(15, 25), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 12–20 → 15–25.' },
  { exerciseId: 'skullcrusher-ez', sets: 2, reps: reps(12, 20), rir: rir(1), rest: 'isolation', notes: 'Block 6: 10–15 → 12–20.' },
  { exerciseId: 'rope-pressdown', sets: 2, reps: reps(15, 20), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 12–15 → 15–20.' },
];

const BLOCK6_PULL: readonly Prescription[] = [
  {
    exerciseId: 'pull-up',
    sets: 3,
    reps: reps(6, 10),
    rir: rir(1, 2),
    rest: 'secondary',
    alternatives: ['assisted-pull-up-machine'],
    notes: 'Pull-up or assisted pull-up.',
  },
  { exerciseId: 'barbell-row', sets: 3, reps: reps(8, 12), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'single-arm-cable-row', sets: 2, reps: reps(10, 15), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'cable-rear-delt-fly', sets: 3, reps: reps(15, 25), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 12–20 → 15–25.' },
  { exerciseId: 'cable-lateral-raise', sets: 3, reps: reps(20, 25), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 15–20 → 20–25.' },
  { exerciseId: 'incline-db-curl', sets: 3, reps: reps(10, 15), rir: rir(1), rest: 'isolation', notes: 'Block 6: 8–12 → 10–15.' },
  { exerciseId: 'reverse-ez-curl', sets: 2, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 10–15 → 12–20.' },
  { exerciseId: 'behind-back-wrist-curl', sets: 2, reps: reps(20, 25), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 15–20 → 20–25.' },
];

const BLOCK6_LEGS: readonly Prescription[] = [
  { exerciseId: 'high-bar-back-squat', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'romanian-deadlift', sets: 3, reps: reps(6, 10), rir: rir(2), rest: 'main-hypertrophy' },
  { exerciseId: 'bulgarian-split-squat-db', sets: 2, reps: reps(8, 12), rir: rir(1), rest: 'secondary', notes: 'Per leg.' },
  { exerciseId: 'barbell-hip-thrust', sets: 2, reps: reps(8, 12), rir: rir(1), rest: 'secondary' },
  { exerciseId: 'lying-leg-curl', sets: 4, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 10–15 → 12–20.' },
  { exerciseId: 'standing-calf-raise', sets: 4, reps: reps(10, 15), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 8–12 → 10–15.' },
  { exerciseId: 'seated-calf-raise', sets: 3, reps: reps(12, 20), rir: rir(0, 1), rest: 'isolation', notes: 'Block 6: 10–15 → 12–20.' },
  // Core/APT block — Stage 4 (coreStage: 4).
];

// ─────────────────────────────────────────────────────────────────────────────

export const BLOCKS: readonly Block[] = [
  {
    number: 1,
    name: 'Hypertrophy 1',
    emphasis: 'hypertrophy',
    firstWeek: 1,
    lastWeek: 9,
    deloadWeek: 9,
    coreStage: 1,
    sessions: { PUSH: BLOCK1_PUSH, PULL: BLOCK1_PULL, LEGS: BLOCK1_LEGS },
    notes: 'With 3-week intensity on-ramp (Part 1.3).',
  },
  {
    number: 2,
    name: 'Hypertrophy 2',
    emphasis: 'hypertrophy',
    firstWeek: 10,
    lastWeek: 17,
    deloadWeek: 17,
    coreStage: 2,
    sessions: { PUSH: BLOCK2_PUSH, PULL: BLOCK2_PULL, LEGS: BLOCK2_LEGS },
    notes: 'Same set/rep logic; accessories rotate. Barbell anchors stay.',
  },
  {
    number: 3,
    name: 'Strength emphasis 1',
    emphasis: 'strength',
    firstWeek: 18,
    lastWeek: 26,
    deloadWeek: 26,
    coreStage: 3,
    entryWeekMainRir: rir(3),
    sessions: { PUSH: BLOCK3_PUSH, PULL: BLOCK3_PULL, LEGS: BLOCK3_LEGS },
    notes:
      'Main lifts go heavy; accessories at the volume floor. Entering loads for 4–6 rep work: best recent 6–10 set + ~5–7 %; first week at RIR 3.',
  },
  {
    number: 4,
    name: 'Hypertrophy 3',
    emphasis: 'hypertrophy',
    firstWeek: 27,
    lastWeek: 35,
    deloadWeek: 35,
    coreStage: 4,
    sessions: { PUSH: BLOCK4_PUSH, PULL: BLOCK4_PULL, LEGS: BLOCK4_LEGS },
    notes: "Block 1's tables with the Block 4 swaps (fresh progression runway).",
  },
  {
    number: 5,
    name: 'Strength emphasis 2',
    emphasis: 'strength',
    firstWeek: 36,
    lastWeek: 43,
    deloadWeek: 43,
    coreStage: 4,
    entryWeekMainRir: rir(3),
    sessions: { PUSH: BLOCK5_PUSH, PULL: BLOCK5_PULL, LEGS: BLOCK5_LEGS },
    notes: "Block 3's tables; squat and bench top set may go to 3–5 reps. Goal: clear your Block 3 bests.",
  },
  {
    number: 6,
    name: 'Hypertrophy 4 + conditioning peak',
    emphasis: 'hypertrophy',
    firstWeek: 44,
    lastWeek: 52,
    deloadWeek: 52,
    coreStage: 4,
    sessions: { PUSH: BLOCK6_PUSH, PULL: BLOCK6_PULL, LEGS: BLOCK6_LEGS },
    notes: "Block 2's tables with isolation rep ranges up one notch. Conditioning: 2 zone-2 + 1 interval/week. Week 52: deload + year-end review.",
  },
];

export const DELOAD_WEEKS: readonly number[] = BLOCKS.map((b) => b.deloadWeek);

export function getBlock(number: number): Block {
  const b = BLOCKS.find((x) => x.number === number);
  if (!b) throw new Error(`No block ${number}`);
  return b;
}

/** Block for a 1–52 program week. Weeks past 52 map to Block 6. */
export function blockForWeek(week: number): Block {
  const w = Math.max(1, week);
  return BLOCKS.find((b) => w >= b.firstWeek && w <= b.lastWeek) ?? BLOCKS[BLOCKS.length - 1];
}
