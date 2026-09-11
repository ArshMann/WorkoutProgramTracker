import type { SessionType } from '@/program/types';
import { isSameDay } from './dates';

/** Part 1.1 — the fixed loop. There is nothing else to know about "what's next". */
export const QUEUE: readonly SessionType[] = ['PUSH', 'PULL', 'LEGS'];

export function sessionAt(index: number): SessionType {
  return QUEUE[((index % QUEUE.length) + QUEUE.length) % QUEUE.length];
}

export function advance(index: number): number {
  return (index + 1) % QUEUE.length;
}

/**
 * "Never do two sessions in one day." Any finished session (queue, minimum,
 * deload or full-body) blocks another start on the same local day.
 */
export function canStartToday(lastFinishedAt: Date | null, now: Date): boolean {
  if (!lastFinishedAt) return true;
  return !isSameDay(lastFinishedAt, now);
}
