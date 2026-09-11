import { describe, expect, it } from 'vitest';
import { attendanceByWeek, buildReportHtml, exerciseProgress, reportFilename, svgLine, verdictHistory, type ReportInput, type ReportSession } from './build';

const session = (id: string, day: string, type: string, sets: Array<[string, number, number, number]>): ReportSession => ({
  id,
  startedAt: `${day}T10:00:00.000Z`,
  kind: 'queue',
  sessionType: type,
  block: 1,
  week: 1,
  editedAt: null,
  sets: sets.map(([exerciseId, load, reps, rir], i) => ({
    exerciseId,
    substitutedFrom: null,
    cardIndex: 0,
    slotIndex: 0,
    setIndex: i,
    load,
    reps,
    rir,
    pain: false,
    toFailure: false,
  })),
});

const input = (): ReportInput => ({
  generatedAt: new Date(2026, 1, 20),
  programStartDay: '2026-01-05',
  range: 'all',
  rangeFrom: new Date(2026, 0, 5),
  rangeTo: new Date(2026, 1, 20),
  sessions: [
    session('a', '2026-01-06', 'PUSH', [['barbell-bench-press', 135, 8, 2], ['barbell-bench-press', 135, 8, 2]]),
    session('b', '2026-01-13', 'PUSH', [['barbell-bench-press', 135, 10, 2], ['barbell-bench-press', 135, 10, 2]]),
    { ...session('c', '2026-01-20', 'PUSH', [['barbell-bench-press', 140, 6, 2]]), editedAt: '2026-01-21T10:00:00.000Z' },
  ],
  activeStalls: ['barbell-bench-press'],
  weighIns: Array.from({ length: 30 }, (_, i) => ({ day: `2026-01-${String(5 + (i % 27)).padStart(2, '0')}`, lb: 170 + i * 0.05 })),
  waists: [{ day: '2026-01-06', inches: 33 }],
  calibrations: [{ date: '2026-01-27T10:00:00.000Z', exerciseId: 'cable-lateral-raise', predictedRir: 1, actualRir: 3, delta: 2 }],
  photos: [],
});

describe('report', () => {
  it('filename is queue-report-YYYY-MM-DD.pdf', () => {
    expect(reportFilename(new Date(2026, 1, 20))).toBe('queue-report-2026-02-20.pdf');
  });

  it('attendance counts per program week, including empty weeks in the range', () => {
    const w = attendanceByWeek(input().sessions, '2026-01-05', new Date(2026, 0, 5), new Date(2026, 1, 1));
    expect(w).toEqual([
      { week: 1, count: 1 },
      { week: 2, count: 1 },
      { week: 3, count: 1 },
      { week: 4, count: 0 }, // Feb 1 is day 27 → week 4
    ]);
  });

  it('per-exercise progression: first/last load and e1RM, stall marker', () => {
    const p = exerciseProgress(input().sessions, ['barbell-bench-press']);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ name: 'Barbell bench press', appearances: 3, firstLoad: 135, lastLoad: 140, stalled: true });
    expect(p[0].trend).toHaveLength(3);
  });

  it('svg line chart draws a polyline with the range labelled', () => {
    const svg = svgLine([100, 110, 105], { labels: ['a', 'b', 'c'] });
    expect(svg).toContain('<polyline');
    expect(svg).toContain('>110<');
    expect(svg).toContain('>100<');
    expect(svgLine([100])).toBe('');
  });

  it('verdict history lists only changes', () => {
    const v = verdictHistory(input().weighIns, [], new Date(2026, 0, 5), new Date(2026, 1, 20));
    expect(v.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < v.length; i++) expect(v[i].action).not.toBe(v[i - 1].action);
  });

  it('html has every section in order, the session tables, and the edited marker', () => {
    const html = buildReportHtml(input());
    const order = ['1. Attendance', '2. Session log', '3. Per-exercise progression', '4. Body metrics', '5. RIR calibration'];
    let last = -1;
    for (const h of order) {
      const i = html.indexOf(h);
      expect(i, h).toBeGreaterThan(last);
      last = i;
    }
    expect(html).toContain('135 × 8 · RIR 2');
    expect(html).toContain('edited');
    expect(html).toContain('STALLED');
    expect(html).toContain('Cable lateral raise');
    expect(html).not.toContain('7. Progress photos');
    expect(buildReportHtml({ ...input(), photos: [{ day: '2026-01-06', view: 'front', dataUri: 'data:image/jpeg;base64,AA==' }] })).toContain('7. Progress photos');
  });
});
