import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportAll, importAll, type ExportPayload } from '@/db/repo';
import { kv } from '@/storage/kv';

/**
 * The entire sync story: one JSON dump of the database to the share sheet,
 * and the reverse. Progress-photo image files are referenced by path and
 * live in the app's document directory; the JSON carries their rows only.
 */

export async function exportToShareSheet(): Promise<string> {
  const payload = exportAll();
  payload.appState = kv().get('ppl-app');
  const stamp = payload.exportedAt.slice(0, 19).replace(/[:T]/g, '-');
  const file = new File(Paths.cache, `ppl-logger-${stamp}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 1));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export PPL Logger data' });
  }
  return file.uri;
}

/** Returns the parsed payload for the caller to confirm before importing. */
export async function pickImportFile(): Promise<ExportPayload | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const file = new File(res.assets[0].uri);
  const text = await file.text();
  const parsed = JSON.parse(text) as ExportPayload;
  if (parsed.app !== 'ppl-logger') throw new Error('That file is not a PPL Logger export.');
  return parsed;
}

export function applyImport(payload: ExportPayload): void {
  importAll(payload);
  if (payload.appState) kv().set('ppl-app', payload.appState);
  kv().remove('ppl-session');
}
