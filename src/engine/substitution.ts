import { JOINT_FALLBACK } from '@/program/decisions';
import { getExercise } from '@/program/exercises';
import type { Prescription } from '@/program/types';

export interface SubstituteOption {
  exerciseId: string;
  name: string;
  /** 'alternative' = the document's "X or Y"; 'part3' = the Part 3 table. */
  source: 'alternative' | 'part3';
  machineGuided: boolean;
}

/**
 * Part 3 — ordered substitute list for a slot. Program alternatives ("hack
 * squat or leg press") come first, then the pattern's Part 3 list.
 */
export function substituteOptions(prescription: Prescription, currentExerciseId: string): SubstituteOption[] {
  const seen = new Set<string>([currentExerciseId]);
  const out: SubstituteOption[] = [];
  for (const id of prescription.alternatives ?? []) {
    if (seen.has(id)) continue;
    seen.add(id);
    const def = getExercise(id);
    out.push({ exerciseId: id, name: def.name, source: 'alternative', machineGuided: !!def.machineGuided });
  }
  // Also offer the original prescribed lift when the slot is currently substituted.
  if (prescription.exerciseId !== currentExerciseId && !seen.has(prescription.exerciseId)) {
    seen.add(prescription.exerciseId);
    const def = getExercise(prescription.exerciseId);
    out.push({ exerciseId: prescription.exerciseId, name: def.name, source: 'alternative', machineGuided: !!def.machineGuided });
  }
  for (const id of getExercise(currentExerciseId).substitutes) {
    if (seen.has(id)) continue;
    seen.add(id);
    const def = getExercise(id);
    out.push({ exerciseId: id, name: def.name, source: 'part3', machineGuided: !!def.machineGuided });
  }
  return out;
}

/**
 * Part 3, last row — "Joint bothering you": the most machine-guided,
 * pain-free variant in the pattern. Returns the first machine-guided option
 * (or the first option at all when the pattern has none).
 */
export function jointFallbackExercise(prescription: Prescription, currentExerciseId: string): string | null {
  const options = substituteOptions(prescription, currentExerciseId);
  if (options.length === 0) return null;
  const machine = options.find((o) => o.machineGuided);
  return (machine ?? options[0]).exerciseId;
}

/** Load −20 %, 10–15 reps, RIR 2. The load factor is applied by the prefill engine. */
export function jointFallbackPrescription(prescription: Prescription, exerciseId: string): Prescription {
  return {
    ...prescription,
    exerciseId,
    reps: { ...JOINT_FALLBACK.reps },
    rir: { ...JOINT_FALLBACK.rir },
    lastSet: undefined,
    notes: 'Joint fallback: load −20 %, 10–15 reps, RIR 2. Pain that alters technique gets substituted, not pushed through.',
  };
}

export const JOINT_FALLBACK_LOAD_FACTOR = JOINT_FALLBACK.loadFactor;
