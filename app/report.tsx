import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { ReportRange } from '@/report/build';
import { exportPdfReport } from '@/services/report';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Checkbox } from '@/ui/components/Checkbox';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

const RANGES: Array<{ r: ReportRange; label: string }> = [
  { r: 'block', label: 'Current block' },
  { r: '90d', label: 'Last 90 days' },
  { r: 'all', label: 'Everything' },
];

export default function Report() {
  const c = useColors();
  const [range, setRange] = useState<ReportRange>('block');
  const [photos, setPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await exportPdfReport(range, photos);
      setResult(`${r.uri.split('/').pop()} · ${r.pages} page${r.pages === 1 ? '' : 's'}`);
    } catch (e) {
      Alert.alert('Report failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Txt muted>A plain, printable PDF: cover line, attendance, the full session log, per-exercise progression with trends, body metrics, RIR calibration. Saved as queue-report-YYYY-MM-DD.pdf through the share sheet.</Txt>
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Range</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {RANGES.map((x) => (
            <Pressable key={x.r} onPress={() => setRange(x.r)} style={[styles.chip, { backgroundColor: range === x.r ? c.accent : c.surfaceRaised }]}>
              <Txt variant="small" style={{ color: range === x.r ? c.accentText : c.text, fontWeight: '600' }}>
                {x.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Checkbox label="Include progress photos" sub="Off by default. Adds every photo in the range as an image page." checked={photos} onToggle={() => setPhotos((v) => !v)} />
      </Card>
      <Button title={busy ? 'Rendering…' : 'Export PDF'} size="lg" disabled={busy} onPress={run} />
      {result ? (
        <Txt variant="small" muted>
          {result}
        </Txt>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
