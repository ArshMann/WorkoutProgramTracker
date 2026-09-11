import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as repo from '@/db/repo';
import { addDays, parseDayKey, startOfDay } from '@/engine/dates';
import { weekInfo } from '@/engine/week';
import { buildReportHtml, reportFilename, type ReportInput, type ReportRange } from '@/report/build';
import { useAppStore } from '@/store/app';

/** Gathers everything from the database, renders HTML → PDF with expo-print, hands the file to the share sheet. */
export async function exportPdfReport(range: ReportRange, includePhotos: boolean): Promise<{ uri: string; pages: number }> {
  const now = new Date();
  const startDay = useAppStore.getState().programStartDay ?? '2000-01-01';
  const info = weekInfo(startDay, now);
  let from: Date;
  if (range === 'block') from = addDays(parseDayKey(startDay), (info.block.firstWeek - 1) * 7);
  else if (range === '90d') from = addDays(startOfDay(now), -90);
  else from = parseDayKey(startDay);
  const to = now;

  const sessions = repo.getFinishedSessions().filter((s) => new Date(s.startedAt) >= from && new Date(s.startedAt) <= to);
  const reportSessions = sessions.map((s) => ({
    id: s.id,
    startedAt: s.startedAt,
    kind: s.kind,
    sessionType: s.sessionType,
    block: s.block,
    week: s.week,
    editedAt: s.editedAt,
    sets: repo.getSetsForSession(s.id).map((r) => ({
      exerciseId: r.exerciseId,
      substitutedFrom: r.substitutedFrom,
      cardIndex: r.cardIndex,
      slotIndex: r.slotIndex,
      setIndex: r.setIndex,
      load: r.load,
      reps: r.reps,
      rir: r.rir,
      pain: !!r.pain,
      toFailure: !!r.toFailure,
    })),
  }));

  const photos: ReportInput['photos'] = [];
  if (includePhotos) {
    for (const p of repo.listPhotos()) {
      if (parseDayKey(p.day) < from || parseDayKey(p.day) > to) continue;
      try {
        const f = new File(p.uri);
        if (!f.exists) continue;
        photos.push({ day: p.day, view: p.view, dataUri: `data:image/jpeg;base64,${await f.base64()}` });
      } catch {
        // unreadable photo — skip it rather than fail the report
      }
    }
  }

  const html = buildReportHtml({
    generatedAt: now,
    programStartDay: startDay,
    range,
    rangeFrom: from,
    rangeTo: to,
    sessions: reportSessions,
    activeStalls: repo.getActiveStalls().map((s) => s.exerciseId),
    weighIns: repo.listBodyweight(),
    waists: repo.listWaist(),
    calibrations: repo.listCalibrations(),
    photos,
  });

  // US Letter at 72 ppi (612 × 792); A4 readers rescale it without clipping at these margins.
  const printed = await Print.printToFileAsync({ html, width: 612, height: 792, margins: { top: 40, bottom: 40, left: 40, right: 40 } });
  const dest = new File(Paths.cache, reportFilename(now));
  if (dest.exists) dest.delete();
  new File(printed.uri).move(dest);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save training report' });
  }
  return { uri: dest.uri, pages: printed.numberOfPages };
}
