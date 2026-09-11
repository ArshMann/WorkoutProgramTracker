import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { dayKey, parseDayKey } from '@/engine/dates';
import { formatSeconds } from '@/engine/rest';
import { PROGRAM_VERSION } from '@/program';
import type { RestCategory } from '@/program/types';
import { applyImport, exportToShareSheet, pickImportFile } from '@/services/export';
import * as repo from '@/db/repo';
import { Row } from '@/ui/components/Row';
import { kv } from '@/storage/kv';
import { useAppStore, type ThemePref } from '@/store/app';
import { useSessionStore } from '@/store/session';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

const REST_LABELS: Record<RestCategory, string> = {
  'main-hypertrophy': 'Main lifts, hypertrophy blocks',
  'main-strength': 'Main lifts, strength blocks',
  secondary: 'Secondary compounds',
  isolation: 'Isolation',
};

export default function Settings() {
  const c = useColors();
  const router = useRouter();
  const app = useAppStore();
  const [showPicker, setShowPicker] = useState(false);

  const doImport = async () => {
    try {
      const payload = await pickImportFile();
      if (!payload) return;
      Alert.alert('Replace all data?', `This replaces everything on this device with the backup from ${payload.exportedAt.slice(0, 10)}.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            applyImport(payload);
            useSessionStore.getState().discard();
            await useAppStore.persist.rehydrate();
            router.replace('/');
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen>
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Appearance</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['system', 'dark', 'light'] as ThemePref[]).map((t) => (
            <Pressable key={t} onPress={() => app.setTheme(t)} style={[styles.chip, { backgroundColor: app.theme === t ? c.accent : c.surfaceRaised }]}>
              <Txt variant="small" style={{ color: app.theme === t ? c.accentText : c.text, fontWeight: '600' }}>
                {t}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Rest timer</Txt>
        {(Object.keys(REST_LABELS) as RestCategory[]).map((k) => (
          <View key={k} style={styles.restRow}>
            <Txt variant="small" style={{ flex: 1 }}>
              {REST_LABELS[k]}
            </Txt>
            <Pressable onPress={() => app.setRestSeconds(k, Math.max(15, app.restSettings[k] - 15))} style={[styles.pm, { backgroundColor: c.surfaceRaised }]}>
              <Txt>−</Txt>
            </Pressable>
            <Txt style={{ width: 52, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{formatSeconds(app.restSettings[k])}</Txt>
            <Pressable onPress={() => app.setRestSeconds(k, app.restSettings[k] + 15)} style={[styles.pm, { backgroundColor: c.surfaceRaised }]}>
              <Txt>+</Txt>
            </Pressable>
          </View>
        ))}
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Program start</Txt>
        <Txt>{app.programStartDay ?? '—'}</Txt>
        {app.originalStartDay && app.originalStartDay !== app.programStartDay ? (
          <Txt variant="small" muted>
            Originally {app.originalStartDay}; moved when a block was restarted after a layoff.
          </Txt>
        ) : null}
        {showPicker ? (
          <DateTimePicker
            value={app.programStartDay ? parseDayKey(app.programStartDay) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant={c.scheme}
            onChange={(_, d) => {
              setShowPicker(false);
              if (d) app.setStartDay(dayKey(d));
            }}
          />
        ) : (
          <Button title="Change start date" variant="secondary" onPress={() => setShowPicker(true)} />
        )}
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Backup</Txt>
        <Txt variant="small" muted>
          One JSON file with the whole database. Photos stay as files on the device.
        </Txt>
        <Button title="Export to share sheet" onPress={() => exportToShareSheet().catch((e) => Alert.alert('Export failed', String(e)))} />
        <Button title="Import a backup…" variant="secondary" onPress={doImport} />
      </Card>

      <Card>
        <Row label="Export PDF report" sub="Attendance, session log, progression, body metrics — for reading, not backup." onPress={() => router.push('/report')} />
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">About</Txt>
        <Txt variant="small" muted>
          Program v{PROGRAM_VERSION} · app {Constants.expoConfig?.version ?? ''} · state store: {kv().backend}
        </Txt>
      </Card>

      <View style={{ height: space.xxl }} />
      <View style={[styles.danger, { borderColor: c.danger }]}>
        <Txt variant="caption" style={{ color: c.danger }}>
          Danger zone
        </Txt>
        <Txt variant="small" muted>
          Reset program progress clears sessions, sets and the queue position and keeps bodyweight, waist, photos and settings.
        </Txt>
        <Button
          title="Reset program progress"
          variant="danger"
          onPress={() =>
            Alert.alert('Reset program progress?', 'Deletes every logged session and set, stall flags, calibration sets and block reviews, and puts the queue back to PUSH. Bodyweight, waist, photos, the start date and settings are kept.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reset progress',
                style: 'destructive',
                onPress: () => {
                  useSessionStore.setState({ active: null, timer: { endsAt: null, totalSeconds: 0, label: '' } });
                  repo.clearProgress();
                  app.resetProgress();
                  router.replace('/');
                },
              },
            ])
          }
        />
        <Txt variant="small" muted style={{ marginTop: space.sm }}>
          Erase all data removes everything and returns to the start-date screen.
        </Txt>
        <Button title="Erase all data…" variant="danger" onPress={() => router.push('/erase')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  danger: { borderTopWidth: 1, paddingTop: space.lg, gap: space.sm },
  chip: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48 },
  pm: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
