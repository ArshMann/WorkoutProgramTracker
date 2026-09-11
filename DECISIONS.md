# Decisions where the document was ambiguous

Each of these is a named constant or an explicitly expanded table in
`src/program/decisions.ts` / `src/program/blocks.ts`. I did not want to
block the build on them, so each has a working default and the alternative
noted. Tell me which to change and it is a one-line edit.

| # | Question | Default in code | Alternative |
|---|---|---|---|
| D1 | A range RIR target ("1–2", "0–1", "2–3", "3–4") needs one chip prefilled. | The **max** of the range (1–2 → 2). Conservative. | The min. |
| D2 | "Top of the range **at the target RIR**": does a set at RIR 0 when the target was 2 count? | No — the logged RIR must be ≥ the target's minimum (you did not need to exceed the target effort). | Ignore RIR in the check. |
| D3 | Deload "half the sets" for 3 sets. | ceil → 2. | floor → 1. |
| D3b | Core block in a deload week. | Core continues at full sets ("mobility and core continue"); cable crunch still drops to 60 % and RIR 4–5. | Halve core sets too. |
| D4 | Exact day thresholds for the layoff matrix. | ≤3 days nothing · 4–13 "a week" · 14–27 "2–3 weeks" · ≥28 "4+ weeks". | Shift the boundaries. |
| D5 | Stall trigger "zero reps added across 3 consecutive appearances". | Three consecutive appearances that each add no reps over the one before, at the same load (so four appearances are involved). A load change starts a new baseline. | Three appearances / two comparisons. |
| D6 | Calibration "every 3–4 weeks". | 21 days, first one 21 days after the program start. | 28 days. |
| D7 | Rest timer needs one number per category. | main/hypertrophy 3:00 · main/strength 4:00 · secondary 2:30 · isolation 1:30 · superset 1:00. All editable in Settings. | — |
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
| — | Block 2's tables carry no "SS" marks. | No supersets in Block 2 (or Block 6, which copies it). | Carry Block 1's pairings over. |
| — | Block 3 "Pressdown" vs Block 1 "Cable pressdown". | Same exercise (`cable-pressdown`), one history. | Separate lift. |
| — | Block 1 LEGS "seated calf raise SS with core block". | The calf sets are interleaved with the core drills (calf 1 → dead bug 1 → calf 2 …) in Blocks 1 and 4. | Run the core block after the calves. |
| — | Full-body sessions give no RIR. | RIR inherited from each lift's Block 1 prescription; sets log against the same exercise ids and can earn a progression. | Log FB sessions as non-progression. |
| — | Pull-up load. | One `pull-up` exercise across blocks; load = added weight, 0 = strict, negative = assistance. | Separate assisted/weighted exercises. |
| — | Where a layoff's "−10 %" applies mid-loop. | Only to exercises whose last appearance predates the return date (so a lift already done post-return is not cut twice). | — |
| — | Bodyweight calibration math. | Weekly rate = least-squares slope of the 7-day averages over the last 21 days, ×7. Waist "in a month" = latest vs the closest measurement ≥ 28 days earlier. Between +0.6 and +0.75 lb/week neither rule fires → hold. | — |
