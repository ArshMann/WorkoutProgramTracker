/**
 * Date helpers. The app reasons in *local calendar days* ("never two sessions
 * in one day") and in elapsed days for the program week and layoff matrix.
 * Dates are exchanged as ISO strings; day keys are 'YYYY-MM-DD' in local time.
 */

const MS_PER_DAY = 86_400_000;

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Whole local calendar days from `a` to `b` (b − a). Time of day ignored. */
export function daysBetween(a: Date, b: Date): number {
  const sa = startOfDay(a);
  const sb = startOfDay(b);
  // Use UTC midpoints to be immune to DST offsets.
  const ua = Date.UTC(sa.getFullYear(), sa.getMonth(), sa.getDate());
  const ub = Date.UTC(sb.getFullYear(), sb.getMonth(), sb.getDate());
  return Math.round((ub - ua) / MS_PER_DAY);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function toIso(d: Date): string {
  return d.toISOString();
}

export function fromIso(s: string): Date {
  return new Date(s);
}
