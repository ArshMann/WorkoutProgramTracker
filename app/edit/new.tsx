import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as repo from '@/db/repo';
import { dayKey } from '@/engine/dates';
import { deriveQueueIndex } from '@/engine/derive';
import { layoffEffect } from '@/engine/layoff';
import { sessionAt } from '@/engine/queue';
import { buildSession, type Variant } from '@/engine/session-builder';
import { buildContext, recomputeDerivedState } from '@/store/context';
import { useUiStore } from '@/store/ui';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

const TYPES = ['PUSH', 'PULL', 'LEGS'] as const;
const VARIANTS: Array<{ v: Variant; label: string }> = [
  { v: 'queue', label: 'Full' },
  { v: 'minimum', label: 'Minimum' },
  { v: 'deload', label: 'Deload' },
  { v: 'FBA', label: 'Full-body A' },
  { v: 'FBB', label: 'Full-body B' },
];

/**
 * A session you forgot to log. It is inserted at the chosen date with the
 * prescription of that day's block and the loads you had at the time, then
 * opened for editing. The queue position is re-derived as if it had been
 * logged then.
 */
export default function LogPastSession() {
  const c = useColors();
  const router = useRouter();
  const setJumpTo = useUiStore((s) => s.setHomeJumpTo);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [showDate, setShowDate] = useState(Platform.OS === 'ios');
  const [variant, setVariant] = useState<Variant>('queue');
  const finished = useMemo(() => repo.getFinishedSessions(), []);
  const before = finished.filter((s) => new Date(s.startedAt) < date);
  const suggested = sessionAt(deriveQueueIndex(before.map((s) => ({ startedAt: s.startedAt, finishedAt: s.finishedAt, kind: s.kind as 'queue' }))));
  const [type, setType] = useState<(typeof TYPES)[number] | null>(null);
  const chosenType = type ?? suggested;
  const sameDay = finished.find((s) => dayKey(new Date(s.startedAt)) === dayKey(date));

  const create = () => {
    const ctx = buildContext(date, { layoff: layoffEffect('none', null) });
    // Only what was logged before that date informs the prefill.
    for (const [ex, apps] of Object.entries(ctx.historyByExercise)) ctx.historyByExercise[ex] = apps.filter((a) => new Date(a.date) < date);
    ctx.activeLayoff = null;
    ctx.manualDeload = false;
    const queueIndex = TYPES.indexOf(chosenType);
    const planned = buildSession(ctx, queueIndex, variant);
    const id = repo.newId();
    const at = date.toISOString();
    repo.createFinishedSession({
      id,
      startedAt: at,
      finishedAt: at,
      kind: planned.kind,
      sessionType: planned.sessionType,
      block: planned.block,
      week: planned.week,
      banner: 'Logged after the fact.',
    });
    for (const card of planned.cards) {
      for (const row of card.rows) {
        const ex = card.exercises.find((e) => e.slotIndex === row.slotIndex);
        repo.upsertSet({
          sessionId: id,
          exerciseId: row.exerciseId,
          substitutedFrom: ex?.substitutedFrom ?? null,
          cardIndex: row.cardIndex,
          slotIndex: row.slotIndex,
          setIndex: row.setIndex,
          load: row.load,
          reps: row.reps,
          rir: row.rir,
          pain: false,
          toFailure: false,
          predictedRir: null,
          repMin: row.repRange.min,
          repMax: row.repRange.max,
          rirMin: row.rirTarget?.min ?? null,
          rirMax: row.rirTarget?.max ?? null,
          countsForProgression: row.countsForProgression,
          loggedAt: at,
          prescribedSets: ex?.prescription.sets ?? null,
        });
      }
    }
    repo.markSessionEdited(id, new Date().toISOString());
    recomputeDerivedState();
    setJumpTo(id);
    router.replace({ pathname: '/edit/[id]', params: { id } });
  };

  const chip = (on: boolean) => [styles.chip, { backgroundColor: on ? c.accent : c.surfaceRaised }];
  const chipText = (on: boolean) => ({ color: on ? c.accentText : c.text, fontWeight: '600' as const });

  return (
    <Screen>
      <Txt muted>Every set is prefilled with the prescription for that day and the loads you had then. Edit them on the next screen.</Txt>
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Date</Txt>
        <Txt variant="title">{date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</Txt>
        {showDate ? (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant={c.scheme}
            maximumDate={new Date()}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShowDate(false);
              if (d) setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12));
            }}
          />
        ) : (
          <Button title="Change date" variant="secondary" onPress={() => setShowDate(true)} />
        )}
        {sameDay ? (
          <Txt variant="small" style={{ color: c.danger }}>
            A session is already logged on this day ({sameDay.sessionType}). One session per day.
          </Txt>
        ) : null}
      </Card>
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Session</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {TYPES.map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={chip(chosenType === t)}>
              <Txt style={chipText(chosenType === t)}>{t}</Txt>
            </Pressable>
          ))}
        </View>
        <Txt variant="small" faint>
          The queue would have been at {suggested} on that date.
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {VARIANTS.map((x) => (
            <Pressable key={x.v} onPress={() => setVariant(x.v)} style={[chip(variant === x.v), { flexBasis: '30%' }]}>
              <Txt variant="small" style={chipText(variant === x.v)}>
                {x.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>
      <Button title="Create and edit" size="lg" disabled={!!sameDay} onPress={create} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
