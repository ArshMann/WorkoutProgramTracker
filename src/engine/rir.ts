import { RIR_DEFAULT_FROM_RANGE } from '@/program/decisions';
import type { RirTarget } from '@/program/types';

/** The chip row is 0 / 1 / 2 / 3 / 4+. "4+" is stored as 4. */
export const RIR_CHIPS = [0, 1, 2, 3, 4] as const;
export const RIR_MAX_CHIP = 4;

/** Single number to prefill for a target range (decision D1). */
export function defaultRir(target: RirTarget | null): number | null {
  if (!target) return null;
  const v = RIR_DEFAULT_FROM_RANGE === 'max' ? target.max : target.min;
  return Math.min(RIR_MAX_CHIP, v);
}

export function formatRirTarget(target: RirTarget | null): string {
  if (!target) return '—';
  if (target.min === target.max) return String(target.min);
  return `${target.min}–${target.max}`;
}

export function formatRirChip(v: number | null): string {
  if (v === null) return '—';
  return v >= RIR_MAX_CHIP ? '4+' : String(v);
}
