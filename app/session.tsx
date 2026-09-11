import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as repo from '@/db/repo';
import { rirCalibrationDue } from '@/engine/calibration';
import { parseDayKey } from '@/engine/dates';
import type { PlannedSetRow } from '@/engine/types';
import { ensureNotificationPermission } from '@/services/notifications';
import { useAppStore } from '@/store/app';
import { useSessionStore } from '@/store/session';
import { Banner } from '@/ui/components/Banner';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { ExerciseCard } from '@/ui/components/ExerciseCard';
import { RestBar } from '@/ui/components/RestBar';
import { RirChips } from '@/ui/components/RirChips';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { space, useColors } from '@/ui/theme';

/**
 * The active session: one scrolling list of exercise cards, prefilled rows,
 * ✓ logs a row as shown and starts the rest timer. Nothing here opens a
 * dialog on the core path.
 */
export default function SessionScreen() {
  const router = useRouter();
  const c = useColors();
  useKeepAwake();
  const store = useSessionStore();
  const active = store.active;
  const app = useAppStore();
  const [manualKey, setManualKey] = useState<string | null>(null);

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  const customIncrements = useMemo(() => repo.getIncrements(), [active?.sessionId]);

  if (!active) return <Redirect href="/" />;

  const rows = active.session.cards.flatMap((card) => card.rows);
  const nextKey = store.nextRowKey();
  const activeKey = manualKey && !active.logged[manualKey] && rows.some((r) => r.key === manualKey) ? manualKey : nextKey;
  const activeRow = rows.find((r) => r.key === activeKey) ?? null;

  const due = rirCalibrationDue(
    app.lastRirCalibrationAt ? new Date(app.lastRirCalibrationAt) : null,
    parseDayKey(app.originalStartDay ?? app.programStartDay ?? '2000-01-01'),
    new Date(),
  );
  const offerCalibration = due && !active.calibrationOffered && !active.calibration && !!activeRow?.calibrationEligible;

  const finish = () => {
    store.finish(new Date());
    router.replace('/');
  };

  const more = () => {
    Alert.alert(active.session.sessionType, undefined, [
      { text: 'Back to home (keep session)', onPress: () => router.replace('/') },
      {
        text: 'Discard session',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Discard this session?', 'Its logged sets are deleted and the queue does not advance.', [
            { text: 'Keep', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                store.discard();
                router.replace('/');
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onLog = (row: PlannedSetRow) => {
    store.logRow(row, new Date());
    setManualKey(null);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="title">{active.session.sessionType}</Txt>
          <Txt variant="small" muted>
            Week {active.session.week} · Block {active.session.block}
            {active.session.kind !== 'queue' ? ` · ${active.session.kind}` : ''}
          </Txt>
        </View>
        <Pressable onPress={more} hitSlop={8} style={styles.more}>
          <Text style={{ color: c.textMuted, fontSize: 24 }}>⋯</Text>
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {active.session.banner ? <Banner text={active.session.banner} /> : null}
        {offerCalibration && activeRow ? (
          <Card style={{ gap: space.md }}>
            <Txt variant="caption">Calibration set</Txt>
            <Txt>
              Last set. Predict your RIR at rep {activeRow.reps}, then keep going to true concentric failure and log the reps you got.
            </Txt>
            <RirChips value={null} onChange={(v) => store.beginCalibration(activeRow.key, v)} />
            <Button title="Not this time" variant="ghost" onPress={store.markCalibrationOffered} />
          </Card>
        ) : null}
        {active.session.cards.map((card) => (
          <ExerciseCard
            key={card.index}
            card={card}
            activeKey={activeKey}
            values={(row) => store.rowValue(row)}
            isLogged={(key) => !!active.logged[key]}
            customIncrements={customIncrements}
            calibratingKey={active.calibration?.rowKey ?? null}
            onLog={onLog}
            onUnlog={(row) => store.unlogRow(row)}
            onActivate={(row) => setManualKey(row.key)}
            onChange={(row, patch) => store.setEdit(row.key, patch)}
            onTogglePain={(row) => store.togglePain(row)}
            onOpenHistory={(id) => router.push({ pathname: '/exercise/[id]', params: { id } })}
            onSubstitute={(cardIndex, slotIndex) => router.push({ pathname: '/substitute', params: { card: String(cardIndex), slot: String(slotIndex) } })}
          />
        ))}
        <View style={{ height: space.xl }} />
      </ScrollView>
      <RestBar onFinish={finish} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm },
  more: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.xl },
});
