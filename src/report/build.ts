import { rollingAverage7, calorieInstruction, type WaistEntry, type WeighIn, type CalorieAction } from '@/engine/calibration';
import { addDays, dayKey, parseDayKey } from '@/engine/dates';
import { bestE1rm } from '@/engine/e1rm';
import { formatRirChip } from '@/engine/rir';
import { weekInfo } from '@/engine/week';
import { getExercise, isExerciseId } from '@/program/exercises';

/**
 * Builds the printable report as plain HTML: black on white, real tables,
 * inline SVG charts, readable at A4 and US Letter. No device access here;
 * the service layer gathers the data and hands it in.
 */

export type ReportRange = 'block' | '90d' | 'all';

export interface ReportSet {
  exerciseId: string;
  substitutedFrom: string | null;
  cardIndex: number;
  slotIndex: number;
  setIndex: number;
  load: number;
  reps: number;
  rir: number | null;
  pain: boolean;
  toFailure: boolean;
}

export interface ReportSession {
  id: string;
  startedAt: string;
  kind: string;
  sessionType: string;
  block: number;
  week: number;
  editedAt: string | null;
  sets: ReportSet[];
}

export interface ReportInput {
  generatedAt: Date;
  programStartDay: string;
  range: ReportRange;
  rangeFrom: Date;
  rangeTo: Date;
  sessions: ReportSession[]; // within range, oldest first
  activeStalls: string[]; // exercise ids
  weighIns: WeighIn[]; // all, for the rolling average
  waists: WaistEntry[];
  calibrations: Array<{ date: string; exerciseId: string; predictedRir: number; actualRir: number; delta: number }>;
  photos: Array<{ day: string; view: string; dataUri: string }>;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtDate = (iso: string | Date) => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
const name = (id: string) => (isExerciseId(id) ? getExercise(id).name : id);

export function reportFilename(generatedAt: Date): string {
  return `queue-report-${dayKey(generatedAt)}.pdf`;
}

/** Simple line chart as inline SVG. Returns '' with fewer than two points. */
export function svgLine(values: number[], opts: { width?: number; height?: number; labels?: string[]; unit?: string } = {}): string {
  if (values.length < 2) return '';
  const w = opts.width ?? 320;
  const h = opts.height ?? 90;
  const padL = 36;
  const padR = 8;
  const padT = 8;
  const padB = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => padL + (i / (values.length - 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / span) * (h - padT - padB);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const first = opts.labels?.[0] ?? '';
  const last = opts.labels?.[opts.labels.length - 1] ?? '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#000">
<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="#999" stroke-width="0.5"/>
<line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="#999" stroke-width="0.5"/>
<text x="${padL - 3}" y="${padT + 3}" text-anchor="end">${fmt(max)}${opts.unit ?? ''}</text>
<text x="${padL - 3}" y="${h - padB}" text-anchor="end">${fmt(min)}${opts.unit ?? ''}</text>
<text x="${padL}" y="${h - 4}">${esc(first)}</text>
<text x="${w - padR}" y="${h - 4}" text-anchor="end">${esc(last)}</text>
<polyline points="${pts}" fill="none" stroke="#000" stroke-width="1.2"/>
<circle cx="${x(values.length - 1).toFixed(1)}" cy="${y(values[values.length - 1]).toFixed(1)}" r="2" fill="#000"/>
</svg>`;
}

export interface WeekCount {
  week: number;
  count: number;
}

/** Sessions per program week for every week touched by the range. */
export function attendanceByWeek(sessions: ReportSession[], programStartDay: string, from: Date, to: Date): WeekCount[] {
  const firstWeek = weekInfo(programStartDay, from).week;
  const lastWeek = weekInfo(programStartDay, to).week;
  const counts = new Map<number, number>();
  for (let w = firstWeek; w <= lastWeek; w++) counts.set(w, 0);
  for (const s of sessions) {
    const w = weekInfo(programStartDay, new Date(s.startedAt)).week;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].map(([week, count]) => ({ week, count }));
}

export interface VerdictEvent {
  day: string;
  action: CalorieAction;
  text: string;
}

/** Part 8.1 verdicts re-evaluated weekly through the range; only the changes are listed ("when each fired"). */
export function verdictHistory(weighIns: WeighIn[], waists: WaistEntry[], from: Date, to: Date): VerdictEvent[] {
  const out: VerdictEvent[] = [];
  let last: CalorieAction | null = null;
  for (let d = new Date(from); d <= to; d = addDays(d, 7)) {
    const key = dayKey(d);
    const w = weighIns.filter((x) => x.day <= key);
    if (w.length === 0) continue;
    const v = calorieInstruction(w, waists.filter((x) => x.day <= key), d);
    if (v.action !== last) {
      out.push({ day: key, action: v.action, text: v.text });
      last = v.action;
    }
  }
  return out;
}

export interface ExerciseProgress {
  exerciseId: string;
  name: string;
  appearances: number;
  firstLoad: number;
  lastLoad: number;
  firstE1rm: number;
  lastE1rm: number;
  trend: number[];
  labels: string[];
  stalled: boolean;
}

export function exerciseProgress(sessions: ReportSession[], activeStalls: string[]): ExerciseProgress[] {
  const by = new Map<string, Array<{ date: string; sets: ReportSet[] }>>();
  for (const s of sessions) {
    if (s.kind !== 'queue' && s.kind !== 'fullbody') continue;
    const groups = new Map<string, ReportSet[]>();
    for (const set of s.sets) {
      if (!groups.has(set.exerciseId)) groups.set(set.exerciseId, []);
      groups.get(set.exerciseId)!.push(set);
    }
    for (const [id, sets] of groups) {
      if (!by.has(id)) by.set(id, []);
      by.get(id)!.push({ date: s.startedAt, sets });
    }
  }
  const out: ExerciseProgress[] = [];
  for (const [id, apps] of by) {
    const def = isExerciseId(id) ? getExercise(id) : null;
    if (def && def.loadable === false) continue;
    const load = (sets: ReportSet[]) => Math.max(...sets.map((x) => x.load));
    const e1 = (sets: ReportSet[]) => Math.round(bestE1rm(sets));
    out.push({
      exerciseId: id,
      name: name(id),
      appearances: apps.length,
      firstLoad: load(apps[0].sets),
      lastLoad: load(apps[apps.length - 1].sets),
      firstE1rm: e1(apps[0].sets),
      lastE1rm: e1(apps[apps.length - 1].sets),
      trend: apps.map((a) => e1(a.sets)),
      labels: apps.map((a) => fmtDate(a.date)),
      stalled: activeStalls.includes(id),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const RANGE_LABEL: Record<ReportRange, string> = { block: 'Current block', '90d': 'Last 90 days', all: 'Everything' };

export function buildReportHtml(input: ReportInput): string {
  const { generatedAt, programStartDay, sessions } = input;
  const nowInfo = weekInfo(programStartDay, generatedAt);
  const weeks = attendanceByWeek(sessions, programStartDay, input.rangeFrom, input.rangeTo);
  const avg = weeks.length ? sessions.length / weeks.length : 0;
  const progress = exerciseProgress(sessions, input.activeStalls);
  const avgPts = rollingAverage7(input.weighIns).filter((p) => parseDayKey(p.day) >= input.rangeFrom && parseDayKey(p.day) <= input.rangeTo);
  const waists = input.waists.filter((w) => parseDayKey(w.day) >= input.rangeFrom && parseDayKey(w.day) <= input.rangeTo);
  const verdicts = verdictHistory(input.weighIns, input.waists, input.rangeFrom, input.rangeTo);
  const cals = input.calibrations.filter((c) => new Date(c.date) >= input.rangeFrom && new Date(c.date) <= input.rangeTo);

  const sessionTables = sessions
    .map((s) => {
      const groups = new Map<string, ReportSet[]>();
      for (const set of [...s.sets].sort((a, b) => a.cardIndex - b.cardIndex || a.slotIndex - b.slotIndex || a.setIndex - b.setIndex)) {
        const key = `${s.id}:${set.cardIndex}:${set.slotIndex}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(set);
      }
      const rows = [...groups.values()]
        .map((sets) => {
          const ex = sets[0];
          const label = `${esc(name(ex.exerciseId))}${ex.substitutedFrom ? ` <span class="muted">(for ${esc(name(ex.substitutedFrom))})</span>` : ''}`;
          const cells = sets
            .map((x) => {
              const def = isExerciseId(x.exerciseId) ? getExercise(x.exerciseId) : null;
              const loadPart = def && def.loadable === false ? '' : `${x.load} × `;
              const rir = x.rir === null ? '' : ` · RIR ${formatRirChip(x.rir)}`;
              const flags = `${x.pain ? ' ⚑' : ''}${x.toFailure ? ' F' : ''}`;
              return `${loadPart}${x.reps}${rir}${flags}`;
            })
            .join('<br>');
          return `<tr><td class="ex">${label}</td><td class="sets">${cells}</td></tr>`;
        })
        .join('');
      const kindLabel = s.kind === 'queue' ? 'full' : s.kind === 'fullbody' ? 'full-body' : s.kind;
      const edited = s.editedAt ? ` <span class="muted">· edited ${esc(fmtDate(s.editedAt))}</span>` : '';
      return `<section class="session">
<h3>${esc(fmtDate(s.startedAt))} — ${esc(s.sessionType)} <span class="muted">· ${kindLabel} · block ${s.block}, week ${s.week}</span>${edited}</h3>
<table><thead><tr><th>Exercise</th><th>Sets (load × reps · RIR)</th></tr></thead><tbody>${rows || '<tr><td colspan="2" class="muted">No sets logged.</td></tr>'}</tbody></table>
</section>`;
    })
    .join('');

  const progressRows = progress
    .map(
      (p) => `<tr>
<td>${esc(p.name)}${p.stalled ? ' <strong>· STALLED</strong>' : ''}</td>
<td class="num">${p.appearances}</td>
<td class="num">${p.firstLoad} → ${p.lastLoad}</td>
<td class="num">${p.firstE1rm} → ${p.lastE1rm} (${p.lastE1rm - p.firstE1rm >= 0 ? '+' : ''}${p.lastE1rm - p.firstE1rm})</td>
<td>${svgLine(p.trend, { width: 200, height: 60, labels: p.labels })}</td>
</tr>`,
    )
    .join('');

  const photosSection = input.photos.length
    ? `<section><h2>7. Progress photos</h2><div class="photos">${input.photos
        .map((p) => `<figure><img src="${p.dataUri}" alt="${esc(p.view)} ${esc(p.day)}"><figcaption>${esc(p.day)} · ${esc(p.view)}</figcaption></figure>`)
        .join('')}</div></section>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Queue report</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #000; background: #fff; font-size: 10.5pt; line-height: 1.35; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; border-bottom: 1px solid #000; padding-bottom: 2pt; page-break-after: avoid; }
  h3 { font-size: 11pt; margin: 12pt 0 4pt; page-break-after: avoid; }
  p { margin: 0 0 4pt; }
  .muted { color: #555; font-weight: normal; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 6pt; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #000; padding: 3pt 5pt; text-align: left; vertical-align: top; font-size: 9.5pt; }
  th { background: #eee; }
  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.ex { width: 40%; }
  td.sets { font-variant-numeric: tabular-nums; }
  .session { page-break-inside: avoid; }
  .cover { border: 1px solid #000; padding: 8pt 10pt; margin-bottom: 10pt; }
  .photos { display: flex; flex-wrap: wrap; gap: 8pt; }
  figure { margin: 0; width: 30%; }
  figure img { width: 100%; height: auto; border: 1px solid #000; }
  figcaption { font-size: 8.5pt; color: #555; }
  svg { display: block; }
</style></head><body>
<h1>Queue — training report</h1>
<div class="cover">
<p><strong>Range:</strong> ${esc(RANGE_LABEL[input.range])} · ${esc(fmtDate(input.rangeFrom))} – ${esc(fmtDate(input.rangeTo))}</p>
<p><strong>Now:</strong> block ${nowInfo.block.number} (${esc(nowInfo.block.name)}), program week ${nowInfo.week}</p>
<p><strong>Program start:</strong> ${esc(fmtDate(parseDayKey(programStartDay)))} · <strong>Generated:</strong> ${esc(fmtDate(generatedAt))}</p>
</div>

<section><h2>1. Attendance</h2>
<p>${sessions.length} session${sessions.length === 1 ? '' : 's'} over ${weeks.length} program week${weeks.length === 1 ? '' : 's'} · average ${avg.toFixed(1)} per week.</p>
<table><thead><tr><th>Program week</th><th>Sessions</th></tr></thead><tbody>
${weeks.map((w) => `<tr><td>Week ${w.week}</td><td class="num">${w.count}</td></tr>`).join('')}
</tbody></table></section>

<section><h2>2. Session log</h2>
${sessionTables || '<p class="muted">No sessions in this range.</p>'}
</section>

<section><h2>3. Per-exercise progression</h2>
${
  progress.length
    ? `<table><thead><tr><th>Exercise</th><th>Sessions</th><th>Working load (first → last)</th><th>Est. 1RM (first → last)</th><th>Trend</th></tr></thead><tbody>${progressRows}</tbody></table>`
    : '<p class="muted">No queue sessions in this range.</p>'
}
</section>

<section><h2>4. Body metrics</h2>
<h3>Bodyweight, 7-day average</h3>
${avgPts.length >= 2 ? svgLine(avgPts.map((p) => p.avg), { width: 480, height: 120, labels: avgPts.map((p) => p.day), unit: '' }) : '<p class="muted">Fewer than two weigh-ins in this range.</p>'}
<h3>Waist at navel</h3>
${
  waists.length
    ? `<table><thead><tr><th>Date</th><th>Inches</th></tr></thead><tbody>${waists.map((w) => `<tr><td>${esc(w.day)}</td><td class="num">${w.inches}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No waist measurements in this range.</p>'
}
<h3>Calorie calibration verdicts (Part 8.1)</h3>
${
  verdicts.length
    ? `<table><thead><tr><th>From</th><th>Verdict</th><th>Detail</th></tr></thead><tbody>${verdicts
        .map((v) => `<tr><td>${esc(v.day)}</td><td>${v.action === 'hold' ? 'hold' : v.action === 'add' ? '+200 kcal' : v.action === 'subtract' ? '−200 kcal' : 'insufficient data'}</td><td>${esc(v.text)}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="muted">No weigh-ins in this range.</p>'
}
</section>

<section><h2>5. RIR calibration</h2>
${
  cals.length
    ? `<table><thead><tr><th>Date</th><th>Exercise</th><th>Predicted RIR</th><th>Actual RIR</th><th>Delta</th></tr></thead><tbody>${cals
        .map((c) => `<tr><td>${esc(fmtDate(c.date))}</td><td>${esc(name(c.exerciseId))}</td><td class="num">${c.predictedRir}</td><td class="num">${c.actualRir}</td><td class="num">${c.delta >= 0 ? '+' : ''}${c.delta}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="muted">No calibration sets in this range.</p>'
}
</section>
${photosSection}
</body></html>`;
}
