import { describe, expect, it } from 'vitest';
import { advance, canStartToday, QUEUE, sessionAt } from './queue';

describe('queue', () => {
  it('loops PUSH → PULL → LEGS forever', () => {
    expect(QUEUE).toEqual(['PUSH', 'PULL', 'LEGS']);
    let i = 0;
    const seen: string[] = [];
    for (let n = 0; n < 7; n++) {
      seen.push(sessionAt(i));
      i = advance(i);
    }
    expect(seen).toEqual(['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS', 'PUSH']);
  });

  it('never allows two sessions in one local day', () => {
    const morning = new Date(2026, 3, 10, 7, 0);
    const evening = new Date(2026, 3, 10, 21, 30);
    const nextDay = new Date(2026, 3, 11, 0, 5);
    expect(canStartToday(null, morning)).toBe(true);
    expect(canStartToday(morning, evening)).toBe(false);
    expect(canStartToday(morning, nextDay)).toBe(true);
  });
});
