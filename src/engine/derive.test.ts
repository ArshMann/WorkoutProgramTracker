import { describe, expect, it } from 'vitest';
import { deriveQueueIndex, replayLayoff, type HistoricSession } from './derive';

const s = (startedAt: string, kind: HistoricSession['kind'] = 'queue', finished = true): HistoricSession => ({
  startedAt: `${startedAt}T10:00:00.000Z`,
  finishedAt: finished ? `${startedAt}T11:00:00.000Z` : null,
  kind,
});

describe('derived state from history', () => {
  it('queue index = finished non-full-body sessions mod 3', () => {
    expect(deriveQueueIndex([])).toBe(0);
    expect(deriveQueueIndex([s('2026-01-05'), s('2026-01-07')])).toBe(2);
    expect(deriveQueueIndex([s('2026-01-05'), s('2026-01-07'), s('2026-01-09', 'minimum')])).toBe(0);
    expect(deriveQueueIndex([s('2026-01-05'), s('2026-01-07', 'fullbody')])).toBe(1);
    expect(deriveQueueIndex([s('2026-01-05'), s('2026-01-07', 'queue', false)])).toBe(1);
  });

  it('inserting a forgotten session shifts the queue as if it had been logged then', () => {
    const before = [s('2026-01-05'), s('2026-01-09')];
    expect(deriveQueueIndex(before)).toBe(2);
    expect(deriveQueueIndex([...before, s('2026-01-07')])).toBe(0);
  });

  it('replays the return loop: a 2–3 week gap leaves −10 % running for the next three sessions', () => {
    const h = [s('2026-01-05'), s('2026-01-25')];
    const a = replayLayoff(h)!;
    expect(a).toMatchObject({ loadFactor: 0.9, sessionsRemaining: 2 });
    expect(a.resumedAt).toBe('2026-01-25T10:00:00.000Z');
    expect(replayLayoff([...h, s('2026-01-27'), s('2026-01-29')])).toBeNull();
  });

  it('short gaps leave nothing running; a full-body session does not consume the loop', () => {
    expect(replayLayoff([s('2026-01-05'), s('2026-01-08'), s('2026-01-11')])).toBeNull();
    const a = replayLayoff([s('2026-01-05'), s('2026-01-25'), s('2026-01-27', 'fullbody')])!;
    expect(a.sessionsRemaining).toBe(2);
  });
});
