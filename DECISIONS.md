# Decisions where the document was ambiguous

Each of these is a named constant or an explicitly expanded table in
`src/program/decisions.ts` / `src/program/blocks.ts`. I did not want to
block the build on them, so each has a working default and the alternative
noted. Tell me which to change and it is a one-line edit.

| # | Question | Default in code | Alternative |
|---|---|---|---|
| D1 | A range RIR target ("1–2", "0–1", "2–3", "3–4") needs one chip prefilled. | The **min** of the range (1–2 → 1): the unexamined default sits at the harder end. | The max. |
| D2 | "Top of the range **at the target RIR**": does a set at RIR 0 when the target was 2 count? | No — the logged RIR must be ≥ the target's minimum (you did not need to exceed the target effort). | Ignore RIR in the check. |
| D3 | Deload "half the sets" for 3 sets. | ceil → 2. | floor → 1. |
| D3b | Core block in a deload week. | Core continues at full sets ("mobility and core continue"); cable crunch still drops to 60 % and RIR 4–5. | Halve core sets too. |
| D4 | Exact day thresholds for the layoff matrix. | ≤4 days since the last session nothing ("miss 2–3 days" = 3–4 days since) · 5–13 "a week" · 14–27 "2–3 weeks" · ≥28 "4+ weeks". | Shift the boundaries. |
| D5 | Stall trigger "zero reps added across 3 consecutive appearances". | Three consecutive appearances that each add no reps over the one before, at the same load (so four appearances are involved). A load change starts a new baseline. | Three appearances / two comparisons. |
| D6 | Calibration "every 3–4 weeks". | 21 days, first one 21 days after the program start. | 28 days. |
| D7 | Rest timer needs one number per category. | main/hypertrophy 3:00 · main/strength 4:00 · secondary 2:30 · isolation 1:00 (document says 1–1.5 min; shortened to recover the time supersets would have saved). All editable in Settings. | — |
| D8 | Block 6 "isolation rep ranges shift up one notch (12–15 → 15–20)": the other ranges. | Ladder: 8–12→10–15 · 10–15→12–20 · 12–15→15–20 · 12–20→15–25 · 15–20→20–25. Block 6 is written out with the source range on every line. | Cap the top at 20 (so 12–20 and 15–20 barely move). |
| D9 | Entering a strength block: "+5–7 %". | +6 % of the best recent set, bottom of the new range. Leaving a strength block (5 → 6) the document is silent: the load is derived from estimated 1RM for the bottom of the higher range. | — |
| D10 | Machine/cable default increment before you set one. | 5 lb. Set per machine on its history screen (1.25 / 2.5 / 5 / 10 / 15 / 20). | — |
| D11/D17 | "Isolation: reps first, always … if increments are coarse." When is an increment coarse? | When it is ≥ 10 % of the working load (5 lb on a 20 lb cable is coarse; 5 lb on a 60 lb EZ curl is not). Dumbbells always need top + 2. | Always require top + 2 on isolation. |
| D12 | After week 52. | Week clamps at 52, Block 6 tables continue. | Loop to week 1. |
| D14 | Minimum session "first 3 exercises". | First three table slots (never a superset pair in this program). | — |
| D15 | First-ever load for an exercise. | Barbell lifts prefill the empty bar (45); everything else 0. You set the first load. | — |
| — | Block 4 swaps give no RIR for machine chest press, seated barbell OHP, neutral-grip pulldown, T-bar row, hack squat, hip thrust. | "Everything unlisted stays as in Block 1" read as: the replacement inherits the RIR/rest/superset of the Block 1 slot it replaces; a lift that is the same exercise (RDL) keeps its own. So seated BB OHP is RIR 1–2, hip thrust RIR 2. | Treat seated BB OHP as a main lift (RIR 2) and hip thrust as in Block 2 (RIR 1). |
| — | Block 4 "hack squat **or** leg press", "neutral-grip pulldown **or** pull-ups", "T-bar **or** Meadows row". | First-named is the prescribed lift; the other is a "program alternative" at the top of the substitute sheet. | Swap the order. |
| — | Block 5 "squat and bench top sets may go to 3–5 reps, RIR 1–2 on the final set only". | Sets 1–3 stay 4–6 @ RIR 2; the final set is 3–5 @ RIR 1–2. | All four sets 3–5. |
| — | The document marks "SS" pairs in Blocks 1, 3, 4, 5. | No supersets anywhere: every exercise is straight sets in table order (equipment availability). Set counts are unchanged. | Encode the pairings. |
| — | Block 3 "Pressdown" vs Block 1 "Cable pressdown". | Same exercise (`cable-pressdown`), one history. | Separate lift. |
| — | Block 1 LEGS "seated calf raise SS with core block". | The core block runs after the calf work, as its own card. | Interleave them. |
| — | Full-body sessions give no RIR. | RIR inherited from each lift's Block 1 prescription; sets log against the same exercise ids and can earn a progression. | Log FB sessions as non-progression. |
| — | Pull-up load. | One `pull-up` exercise across blocks; load = added weight, 0 = strict, negative = assistance. | Separate assisted/weighted exercises. |
| — | Where a layoff's "−10 %" applies mid-loop. | Only to exercises whose last appearance predates the return date (so a lift already done post-return is not cut twice). | — |
| — | Bodyweight calibration math. | Weekly rate = least-squares slope of the 7-day averages over the last 21 days, ×7. Waist "in a month" = latest vs the closest measurement ≥ 28 days earlier. Between +0.6 and +0.75 lb/week neither rule fires → hold. | — |
| D18 | An exercise hitting the top of its range every time but only below the target RIR never earns an increase under D2 and looks stalled. | After 3 such consecutive appearances the stall card says "load too heavy — drop 5 % and rebuild" instead of the Part 11 steps. Detection is a pass over the last three appearances; no second engine. | — |
| D19 | Editing history: what state is "recomputed from the edited point forward"? | The queue position is derived from history (finished non-full-body sessions mod 3), the return-loop layoff effect is replayed over the gaps between sessions, and stall flags are re-evaluated; all run after any edit, delete or after-the-fact log. Prefill reads history live. A 4+ week gap's block restart (which moved the start date at the time) is not replayed. | Store per-session snapshots instead. |
| — | Logging a past session: which prescription and loads? | The block/week of the chosen date, prefilled from what was logged before that date, no layoff applied; every set is inserted and opened for editing; the session carries the "edited" marker. | Prefill from current loads. |
| — | "Reset program progress" scope. | Deletes sessions, sets, stall flags, calibration sets and block reviews; queue back to PUSH; keeps bodyweight, waist, photos, start date, increments and settings. | Also clear the start date. |
| — | PDF page size. | Rendered at US Letter (612 × 792 pt, 40 pt margins); A4 readers rescale it without clipping. Calorie verdict history is the Part 8.1 rule re-evaluated weekly through the range, listing only the changes. | Render A4. |
