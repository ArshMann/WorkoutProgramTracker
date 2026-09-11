import { CALIBRATION_INTERVAL_DAYS, CALORIE_CALIBRATION_MIN_DAYS } from '@/program/decisions';
import { addDays, dayKey, daysBetween, parseDayKey, startOfDay } from './dates';

// ─────────────────────────────────────────────────────────────────────────────
// Part 1.5 — RIR calibration
// ─────────────────────────────────────────────────────────────────────────────

/** Due every 3–4 weeks. Never calibrated → due once the program is 3 weeks old. */
export function rirCalibrationDue(lastCalibration: Date | null, programStart: Date, now: Date): boolean {
  const anchor = lastCalibration ?? programStart;
  return daysBetween(anchor, now) >= CALIBRATION_INTERVAL_DAYS;
}

/**
 * Prediction is made at `repsAtPrediction` (the prefilled rep target), then
 * the set goes to true concentric failure at `actualReps`. Actual RIR at the
 * prediction point = actualReps − repsAtPrediction. Delta = actual − predicted
 * (positive = you had more in the tank than you thought).
 */
export function calibrationDelta(predictedRir: number, repsAtPrediction: number, actualReps: number) {
  const actualRir = Math.max(0, actualReps - repsAtPrediction);
  return { actualRir, delta: actualRir - predictedRir };
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 8.1 — bodyweight / waist calibration
// ─────────────────────────────────────────────────────────────────────────────

export interface WeighIn {
  day: string; // 'YYYY-MM-DD'
  lb: number;
}

export interface WaistEntry {
  day: string;
  inches: number;
}

export interface AveragePoint {
  day: string;
  avg: number;
  /** Number of weigh-ins inside the 7-day window. */
  n: number;
}

/** 7-day trailing average for every day that has a weigh-in. Daily numbers are noise; this is what gets displayed and evaluated. */
export function rollingAverage7(weighIns: readonly WeighIn[]): AveragePoint[] {
  const sorted = [...weighIns].sort((a, b) => a.day.localeCompare(b.day));
  return sorted.map((w) => {
    const end = parseDayKey(w.day);
    const begin = addDays(end, -6);
    const window = sorted.filter((x) => {
      const d = parseDayKey(x.day);
      return d >= begin && d <= end;
    });
    const avg = window.reduce((s, x) => s + x.lb, 0) / window.length;
    return { day: w.day, avg: Math.round(avg * 100) / 100, n: window.length };
  });
}

/**
 * Weekly rate of change in lb/week: least-squares slope of the 7-day
 * averages over the last `windowDays` days. Null with fewer than 2 points.
 */
export function weeklyRate(weighIns: readonly WeighIn[], now: Date, windowDays = CALORIE_CALIBRATION_MIN_DAYS): number | null {
  const pts = rollingAverage7(weighIns);
  const cutoff = addDays(startOfDay(now), -windowDays);
  const recent = pts.filter((p) => parseDayKey(p.day) >= cutoff);
  if (recent.length < 2) return null;
  const xs = recent.map((p) => daysBetween(cutoff, parseDayKey(p.day)));
  const ys = recent.map((p) => p.avg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return Math.round((num / den) * 7 * 100) / 100;
}

/** Days covered by weigh-ins (first to last). */
export function weighInSpanDays(weighIns: readonly WeighIn[]): number {
  if (weighIns.length < 2) return 0;
  const days = weighIns.map((w) => w.day).sort();
  return daysBetween(parseDayKey(days[0]), parseDayKey(days[days.length - 1]));
}

/** Waist change (inches) between the latest entry and the closest entry at least ~28 days earlier. Null without both. */
export function waistChangeOverMonth(waists: readonly WaistEntry[], now: Date): number | null {
  if (waists.length < 2) return null;
  const sorted = [...waists].sort((a, b) => a.day.localeCompare(b.day));
  const latest = sorted[sorted.length - 1];
  const latestDay = parseDayKey(latest.day);
  const target = addDays(latestDay, -28);
  const earlier = sorted.filter((w) => parseDayKey(w.day) <= addDays(target, 3));
  if (earlier.length === 0) return null;
  const ref = earlier[earlier.length - 1];
  void now;
  return Math.round((latest.inches - ref.inches) * 100) / 100;
}

export type CalorieAction = 'insufficient' | 'hold' | 'add' | 'subtract';

export interface CalorieInstruction {
  action: CalorieAction;
  text: string;
  ratePerWeek: number | null;
  waistDeltaMonth: number | null;
}

/**
 * Part 8.1 rules, applied mechanically after 3 weeks of data:
 *  +0.3 to +0.6 lb/week → hold · flat or falling → +200 kcal ·
 *  >0.75 lb/week or waist +0.5" in a month → −200 kcal.
 * Between 0.6 and 0.75: neither rule fires — hold.
 */
export function calorieInstruction(weighIns: readonly WeighIn[], waists: readonly WaistEntry[], now: Date): CalorieInstruction {
  const span = weighInSpanDays(weighIns);
  const rate = weeklyRate(weighIns, now);
  const waistDelta = waistChangeOverMonth(waists, now);

  if (span < CALORIE_CALIBRATION_MIN_DAYS - 1 || rate === null) {
    const remaining = Math.max(0, CALORIE_CALIBRATION_MIN_DAYS - 1 - span);
    return {
      action: 'insufficient',
      text: `Calibration needs 3 weeks of weigh-ins. ${remaining} more day${remaining === 1 ? '' : 's'} of data.`,
      ratePerWeek: rate,
      waistDeltaMonth: waistDelta,
    };
  }
  const rateText = `${rate >= 0 ? '+' : ''}${rate.toFixed(2)} lb/week`;
  if (waistDelta !== null && waistDelta > 0.5) {
    return {
      action: 'subtract',
      text: `Waist +${waistDelta.toFixed(2)}" over the month. Subtract 200 kcal/day.`,
      ratePerWeek: rate,
      waistDeltaMonth: waistDelta,
    };
  }
  if (rate > 0.75) {
    return { action: 'subtract', text: `${rateText}. Subtract 200 kcal/day.`, ratePerWeek: rate, waistDeltaMonth: waistDelta };
  }
  if (rate < 0.3) {
    return {
      action: 'add',
      text: `${rateText}. Add 200 kcal/day, reassess in 2 weeks.`,
      ratePerWeek: rate,
      waistDeltaMonth: waistDelta,
    };
  }
  return { action: 'hold', text: `${rateText}. Hold calories.`, ratePerWeek: rate, waistDeltaMonth: waistDelta };
}

export function todayKey(now: Date): string {
  return dayKey(now);
}
