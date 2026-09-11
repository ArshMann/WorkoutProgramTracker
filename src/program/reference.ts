/**
 * Static reference text rendered read-only on the Program screen. Kept to
 * what the document says you need after the first read: the progression
 * rule, the missed-day matrix, plus the short tables the app acts on.
 */

export const PROGRESSION_RULE: readonly string[] = [
  'Double progression. Every exercise has a rep range and an RIR target.',
  '1. Work at a fixed load. Each session, try to add reps to each set, at the target RIR.',
  '2. When all prescribed sets hit the top of the rep range at the target RIR → increase load next session, dropping back toward the bottom of the range.',
  '3. Increments: lower-body barbell +10 lb · upper-body barbell +5 lb · dumbbells next pair, but only after all sets reach top-of-range +2 · machines/cables smallest pin or half-plate · isolation: reps first, always.',
  '4. Zero total reps added across 3 consecutive sessions of an exercise → stall → Part 11.',
  '5. Log every set. The rule is only as good as the log.',
];

export const MISSED_DAY_MATRIX: ReadonlyArray<{ scenario: string; action: string }> = [
  { scenario: 'Miss 1 day', action: 'Nothing. Do the next queued session whenever you are back.' },
  { scenario: 'Miss 2–3 days', action: 'Same. No load changes.' },
  {
    scenario: 'Miss a full week',
    action: 'Resume the queue. Repeat the same loads as each exercise’s last appearance. Match, not beat.',
  },
  {
    scenario: 'Miss 2–3 weeks',
    action: 'Resume the queue at −10 % load on everything, same rep targets, RIR 2–3 for one full loop, then normal rules.',
  },
  {
    scenario: 'Miss 4+ weeks',
    action: 'Restart the current block from its week 1 at −15 % load; first week back is an on-ramp (RIR 3–4).',
  },
  {
    scenario: 'Only 2 sessions possible this week (known in advance)',
    action: 'Do the two full-body fallback sessions instead of the queue, then resume the queue where it left off.',
  },
  { scenario: 'Only 2 sessions happened (not planned)', action: 'Continue the queue. One low week changes nothing.' },
  {
    scenario: 'Exhausted after a long shift',
    action: 'Do the minimum session. It counts as the queued session — the queue advances.',
  },
  {
    scenario: 'Catch-up double session?',
    action: 'No. Never two sessions in a day, never added sets to make up volume.',
  },
];

export const REST_TABLE: ReadonlyArray<{ type: string; rest: string }> = [
  { type: 'Main barbell lifts, hypertrophy blocks', rest: '2.5–3 min' },
  { type: 'Main barbell lifts, strength blocks', rest: '3–5 min' },
  { type: 'Secondary compounds', rest: '2–3 min' },
  { type: 'Isolation', rest: '1–1.5 min' },
  { type: 'Superset pairs (SS)', rest: 'Alternate exercises, ~60–75 s between efforts' },
];

export const ON_RAMP: ReadonlyArray<{ week: string; rir: string; loads: string }> = [
  { week: '1', rir: '3–4', loads: 'Deliberately conservative: a weight you are sure you could do for the top of the rep range +3.' },
  { week: '2', rir: '3', loads: 'Progress per the normal rule.' },
  { week: '3', rir: '2–3', loads: 'Progress per the normal rule.' },
  { week: '4 onward', rir: 'Block’s prescribed RIR', loads: 'Normal.' },
];

export const DELOAD_RULE =
  'Final week of every block (weeks 9, 17, 26, 35, 43, 52). Same session queue, but: half the sets, ~60 % of current working loads, RIR 4–5, nothing near failure. Conditioning easy-only; mobility and core continue.';

export const UNSCHEDULED_DELOAD_CRITERIA: readonly string[] = [
  'Multiple lifts stalled or regressed',
  'Resting joints ache',
  'Sleep degraded despite opportunity',
  'Elevated resting heart rate or feeling run-down',
  'Dread (not mere reluctance) before sessions',
];

export const STALL_PROTOCOL_STEPS: readonly string[] = [
  'Audit the cheap stuff first: sleep this week? Calories tracking to 8.1? Rest periods honest? If any is broken, fix it — that was the stall.',
  'Audit effort: run the RIR calibration. Undershooting effort masquerades as a plateau constantly.',
  'Hold load, chase reps for 2 more sessions with genuinely honest RIR.',
  'Micro-load: add 2.5 lb (microplates) instead of the standard jump.',
  'Drop 10 % and rebuild over 2–3 weeks with slightly higher reps.',
  'Swap the variant (Part 3, same pattern) for the rest of the block.',
];

export const STALL_STEP_7 =
  'Multiple lifts stalled at once → that is not a lift problem, it is a fatigue problem → unscheduled deload, then reassess sleep and calories before blaming the program.';

export const WARM_UP: readonly string[] = [
  '3–4 min easy incline walk or bike.',
  'Upper days: 15 band pull-aparts + 10 scap pull-ups or wall slides. Leg days: 10 leg swings each direction/leg + 10 bodyweight squats + 30 s couch stretch per side.',
  'Ramp the first lift only: empty bar × 10 → ~50 % × 5 → ~70 % × 3 → ~85–90 % × 1 → work sets. Later exercises need at most one light feeler set.',
];

export const NUTRITION_TARGETS: ReadonlyArray<{ item: string; target: string }> = [
  { item: 'Protein', target: '150–170 g/day (~0.9–1 g/lb), spread over 3–5 feedings' },
  { item: 'Fat', target: '≥ 60 g/day (~0.35 g/lb minimum)' },
  { item: 'Carbs', target: 'Everything remaining' },
  { item: 'Fibre', target: '30–40 g/day' },
  { item: 'Hydration', target: 'Urine pale yellow; electrolytes on long sweaty shifts' },
  { item: 'Creatine monohydrate', target: '5 g/day, every day' },
  { item: 'Vitamin D3', target: '1,000–2,000 IU/day' },
];

export const CALORIE_RULES: readonly string[] = [
  'Start at 2,900 kcal/day.',
  'Weekly-average weight rising +0.3 to +0.6 lb/week → hold.',
  'Flat or falling → add 200 kcal, reassess in 2 weeks.',
  'Rising faster than ~0.75 lb/week, or waist up >0.5" in a month → subtract 200 kcal.',
];

export const MOBILITY_ROUTINE: ReadonlyArray<{ drill: string; dose: string }> = [
  { drill: 'Couch stretch', dose: '1 min/side' },
  { drill: '90/90 hip switches', dose: '2 min total' },
  { drill: 'Deep bodyweight squat hold', dose: '2 × 45 s' },
  { drill: 'Cat-cow', dose: '10 slow reps' },
  { drill: 'Thoracic extension over foam roller or bench', dose: '1 min' },
  { drill: 'Hamstring toe-touch with tucked pelvis, slow', dose: '1 min' },
];

export const CONDITIONING_RULE: ReadonlyArray<{ blocks: string; dose: string }> = [
  { blocks: '1–5', dose: '2 × 20–35 min zone 2 per week — incline treadmill walk or bike' },
  { blocks: '6', dose: 'Add 1 × interval session: 6–8 × 1 min hard / 2 min easy on the bike' },
];

export const BLOCK_REVIEW_CHECKLIST: readonly string[] = [
  'Attendance: average sessions/week this block?',
  'Which lifts progressed (load or reps up over the block)? Which stalled 3+ sessions?',
  'Weight trend vs. the 8.1 rules — adjust calories?',
  'Waist trend vs. photos — is composition moving the right way?',
  'Any joint that complained more than once → apply the substitution rule for next block.',
  'Anything stalled all block despite Part 11 → replace it at the block boundary and note it.',
];
