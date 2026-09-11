import { DELOAD_KEEPS_CORE_SETS, DELOAD_RIR, DELOAD_SET_ROUNDING, MINIMUM_SESSION } from '@/program/decisions';
import type { Prescription } from '@/program/types';

/**
 * Part 5.4 — the minimum session: first 3 exercises of the queued session,
 * 2 sets each, RIR 3. No progression attempts, no failure work. The core
 * block is dropped.
 */
export function minimumPrescriptions(session: readonly Prescription[]): Prescription[] {
  return session.slice(0, MINIMUM_SESSION.exercises).map((p) => ({
    ...p,
    sets: MINIMUM_SESSION.sets,
    rir: p.rir === null ? null : { ...MINIMUM_SESSION.rir },
    lastSet: undefined,
  }));
}

export function halveSets(sets: number): number {
  const half = sets / 2;
  return Math.max(1, DELOAD_SET_ROUNDING === 'ceil' ? Math.ceil(half) : Math.floor(half));
}

/**
 * Part 12 — scheduled/unscheduled deload: half the sets, ~60 % loads (the
 * load factor is applied by the prefill engine), RIR 4–5. Nothing near
 * failure, so per-set "last set 1" overrides are cleared.
 */
export function deloadPrescriptions(session: readonly Prescription[]): Prescription[] {
  return session.map((p) => ({
    ...p,
    sets: halveSets(p.sets),
    rir: p.rir === null ? null : { ...DELOAD_RIR },
    lastSet: undefined,
  }));
}

/** Core continues through a deload (bodyweight versions); loaded drills still get the 60 % factor and RIR 4–5. */
export function deloadCorePrescriptions(drills: readonly Prescription[]): Prescription[] {
  return drills.map((p) => ({
    ...p,
    sets: DELOAD_KEEPS_CORE_SETS ? p.sets : halveSets(p.sets),
    rir: p.rir === null ? null : { ...DELOAD_RIR },
    lastSet: undefined,
  }));
}
