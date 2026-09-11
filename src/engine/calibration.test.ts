import { describe, expect, it } from 'vitest';
import {
  calibrationDelta,
  calorieInstruction,
  rirCalibrationDue,
  rollingAverage7,
  waistChangeOverMonth,
  weeklyRate,
  type WeighIn,
} from './calibration';

function series(startDay: string, days: number, lbAt: (i: number) => number): WeighIn[] {
  const [y, m, d] = startDay.split('-').map(Number);
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(y, m - 1, d + i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return { day: key, lb: lbAt(i) };
  });
}

describe('RIR calibration (Part 1.5)', () => {
  it('is due every 3 weeks, first time 3 weeks after the program start', () => {
    const start = new Date(2026, 0, 5);
    expect(rirCalibrationDue(null, start, new Date(2026, 0, 20))).toBe(false);
    expect(rirCalibrationDue(null, start, new Date(2026, 0, 26))).toBe(true);
    expect(rirCalibrationDue(new Date(2026, 0, 26), start, new Date(2026, 1, 10))).toBe(false);
    expect(rirCalibrationDue(new Date(2026, 0, 26), start, new Date(2026, 1, 16))).toBe(true);
  });

  it('delta = actual RIR at the prediction point − predicted', () => {
    // Predicted RIR 1 at rep 12, actually failed at rep 15 → actual RIR was 3, delta +2.
    expect(calibrationDelta(1, 12, 15)).toEqual({ actualRir: 3, delta: 2 });
    expect(calibrationDelta(2, 12, 12)).toEqual({ actualRir: 0, delta: -2 });
  });
});

describe('bodyweight (Part 8.1)', () => {
  it('7-day rolling average smooths daily noise', () => {
    const w = series('2026-02-01', 10, (i) => 170 + (i % 2 ? 1.5 : -1.5));
    const avg = rollingAverage7(w);
    expect(avg[0].n).toBe(1);
    expect(avg[6].n).toBe(7);
    expect(Math.abs(avg[9].avg - 170)).toBeLessThan(0.5);
  });

  it('weekly rate is the slope of the averages, in lb/week', () => {
    const w = series('2026-02-01', 28, (i) => 170 + i * (0.5 / 7)); // +0.5 lb/week, no noise
    const rate = weeklyRate(w, new Date(2026, 1, 28));
    expect(rate).not.toBeNull();
    expect(Math.abs(rate! - 0.5)).toBeLessThan(0.05);
  });

  it('needs 3 weeks of data before it says anything', () => {
    const w = series('2026-02-01', 10, () => 170);
    const r = calorieInstruction(w, [], new Date(2026, 1, 10));
    expect(r.action).toBe('insufficient');
    expect(r.text).toContain('3 weeks');
  });

  it('+0.3 to +0.6 lb/week → hold', () => {
    const w = series('2026-02-01', 28, (i) => 170 + i * (0.45 / 7));
    expect(calorieInstruction(w, [], new Date(2026, 1, 28)).action).toBe('hold');
  });

  it('flat or falling → add 200 kcal', () => {
    const flat = series('2026-02-01', 28, () => 170);
    expect(calorieInstruction(flat, [], new Date(2026, 1, 28))).toMatchObject({ action: 'add' });
    const falling = series('2026-02-01', 28, (i) => 170 - i * 0.05);
    expect(calorieInstruction(falling, [], new Date(2026, 1, 28)).text).toContain('Add 200');
  });

  it('> 0.75 lb/week → subtract 200 kcal', () => {
    const w = series('2026-02-01', 28, (i) => 170 + i * (1.0 / 7));
    expect(calorieInstruction(w, [], new Date(2026, 1, 28)).action).toBe('subtract');
  });

  it('between 0.6 and 0.75 neither rule fires → hold', () => {
    const w = series('2026-02-01', 28, (i) => 170 + i * (0.68 / 7));
    expect(calorieInstruction(w, [], new Date(2026, 1, 28)).action).toBe('hold');
  });

  it('waist up more than 0.5" in a month → subtract, even when weight is on target', () => {
    const w = series('2026-02-01', 28, (i) => 170 + i * (0.45 / 7));
    const waists = [
      { day: '2026-01-31', inches: 33.0 },
      { day: '2026-02-14', inches: 33.25 },
      { day: '2026-02-28', inches: 33.75 },
    ];
    expect(waistChangeOverMonth(waists, new Date(2026, 1, 28))).toBe(0.75);
    expect(calorieInstruction(w, waists, new Date(2026, 1, 28)).action).toBe('subtract');
  });
});
