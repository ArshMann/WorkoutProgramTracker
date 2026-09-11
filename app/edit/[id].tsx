import DateTimePicker from '@react-native-community/datetimepicker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as repo from '@/db/repo';
import { incrementFor } from '@/engine/increments';
import type { PlannedSetRow } from '@/engine/types';
import { getExercise, isExerciseId } from '@/program/exercises';
import { recomputeDerivedState } from '@/store/context';
import { useSessionStore } from '@/store/session';
import { useUiStore } from '@/store/ui';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { SetRow } from '@/ui/components/SetRow';
import { Txt } from '@/ui/components/Txt';
import { space, useColors } from '@/ui/theme';

const KIND: Record<string, string> = { queue: 'full session', minimum: 'minimum session', deload: 'deload session', fullbody: 'full-body session' };

/**
 * Editing a logged session. Same steppers and chips as the live session;
 * every change writes straight to the database, marks the session edited,
 * and re-derives queue position, layoff loop and stall flags from history.
 * No rest timer, no suggestions, no calibration prompt here.
 */
export default function EditSession() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const active = useSessionStore((s) => s.active);
  const setJumpTo = useUiStore((s) => s.setHomeJumpTo);
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);

  const session = useMemo(() => (id ? repo.getSession(id) : null), [id, tick]);
  const sets = useMemo(() => (id ? repo.getSetsForSession(id) : []), [id, tick]);
  const increments = useMemo(() => repo.getIncrements(), [tick]);

  if (active && active.sessionId === id) return <Redirect href="/session" />;
  if (!id || !session) {
    return (
      <Screen>
        <Txt muted>This session no longer exists.</Txt>
      </Screen>
    );
  }

  const touched = () => {
    repo.markSessionEdited(id, new Date().toISOString());
    recomputeDerivedState();
    setTick((t) => t + 1);
  };

  // Group rows by slot, in stored order.
  const groups: Array<{ key: string; cardIndex: number; slotIndex: number; rows: repo.SetRow[] }> = [];
  for (const r of sets) {
    const key = `${r.cardIndex}:${r.slotIndex}`;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, cardIndex: r.cardIndex, slotIndex: r.slotIndex, rows: [] }));
    g.rows.push(r);
  }

  const toPlanned = (r: repo.SetRow, isLast: boolean): PlannedSetRow => {
    const def = isExerciseId(r.exerciseId) ? getExercise(r.exerciseId) : null;
    return {
      key: r.id,
      cardIndex: r.cardIndex,
      slotIndex: r.slotIndex,
      exerciseId: r.exerciseId,
      setIndex: r.setIndex,
      load: r.load,
      reps: r.reps,
      rir: r.rir,
      repRange: { min: r.repMin, max: r.repMax },
      rirTarget: r.rirMin === null ? null : { min: r.rirMin, max: r.rirMax ?? r.rirMin },
      restSeconds: 0,
      restCategory: 'isolation',
      loadable: def ? def.loadable !== false : true,
      repUnit: def?.repUnit ?? 'reps',
      perSide: !!def?.perSide,
      isLastSet: isLast,
      calibrationEligible: false,
      countsForProgression: !!r.countsForProgression,
    };
  };

  const addSet = (g: (typeof groups)[number]) => {
    const last = g.rows[g.rows.length - 1];
    repo.upsertSet({
      sessionId: id,
      exerciseId: last.exerciseId,
      substitutedFrom: last.substitutedFrom,
      cardIndex: last.cardIndex,
      slotIndex: last.slotIndex,
      setIndex: Math.max(...g.rows.map((r) => r.setIndex)) + 1,
      load: last.load,
      reps: last.reps,
      rir: last.rir,
      pain: false,
      toFailure: false,
      predictedRir: null,
      repMin: last.repMin,
      repMax: last.repMax,
      rirMin: last.rirMin,
      rirMax: last.rirMax,
      countsForProgression: !!last.countsForProgression,
      loggedAt: new Date().toISOString(),
      prescribedSets: last.prescribedSets,
    });
    touched();
  };

  const deleteSession = () => {
    Alert.alert('Delete this session?', 'All of its sets are removed. The queue position and stall flags are recomputed from what remains.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          repo.deleteSession(id);
          recomputeDerivedState();
          setJumpTo('live');
          router.back();
        },
      },
    ]);
  };

  const started = new Date(session.startedAt);

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Txt variant="title">
          {session.sessionType} <Txt muted>· {KIND[session.kind] ?? session.kind}</Txt>
        </Txt>
        <Pressable onPress={() => setShowDate((v) => !v)} hitSlop={6}>
          <Txt muted>
            {started.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} <Txt faint>· change</Txt>
          </Txt>
        </Pressable>
        <Txt variant="small" muted>
          Week {session.week} · Block {session.block}
          {session.editedAt ? ` · edited ${new Date(session.editedAt).toLocaleDateString()}` : ''}
        </Txt>
        {showDate ? (
          <DateTimePicker
            value={started}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant={c.scheme}
            maximumDate={new Date()}
            onChange={(_, d) => {
              setShowDate(Platform.OS === 'ios');
              if (!d) return;
              const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), started.getHours(), started.getMinutes()).toISOString();
              repo.updateSessionDate(id, at, at);
              touched();
            }}
          />
        ) : null}
      </View>

      {groups.map((g) => {
        const first = g.rows[0];
        const def = isExerciseId(first.exerciseId) ? getExercise(first.exerciseId) : null;
        return (
          <Card key={g.key} style={{ gap: space.sm }}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Txt variant="title">{def?.name ?? first.exerciseId}</Txt>
                <Txt variant="small" muted>
                  {g.rows.length} set{g.rows.length === 1 ? '' : 's'} · {first.repMin}–{first.repMax}
                  {first.substitutedFrom && isExerciseId(first.substitutedFrom) ? `  ·  for ${getExercise(first.substitutedFrom).name}` : ''}
                </Txt>
              </View>
              {g.slotIndex < 100 ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/substitute', params: { mode: 'edit', session: id, card: String(g.cardIndex), slot: String(g.slotIndex) } })}
                  hitSlop={8}
                  style={styles.swap}
                >
                  <Text style={{ color: c.textMuted, fontSize: 22 }}>⇄</Text>
                </Pressable>
              ) : null}
            </View>
            {g.rows.map((r, i) => {
              const row = toPlanned(r, i === g.rows.length - 1);
              return (
                <SetRow
                  key={r.id}
                  row={row}
                  label={`Set ${i + 1}`}
                  value={{ load: r.load, reps: r.reps, rir: r.rir, pain: !!r.pain }}
                  logged={false}
                  active={expanded === r.id}
                  editMode
                  loadStep={def ? incrementFor(def, increments[r.exerciseId]) : 5}
                  onActivate={() => setExpanded(r.id)}
                  onLog={() => setExpanded(null)}
                  onUnlog={() => undefined}
                  onChange={(patch) => {
                    repo.updateSetById(r.id, { load: patch.load ?? r.load, reps: patch.reps ?? r.reps, rir: patch.rir === undefined ? r.rir : patch.rir });
                    touched();
                  }}
                  onTogglePain={() => {
                    repo.updateSetById(r.id, { pain: r.pain ? 0 : 1 });
                    touched();
                  }}
                  onDelete={() => {
                    repo.deleteSetById(r.id);
                    setExpanded(null);
                    touched();
                  }}
                />
              );
            })}
            <Button title="+ Add set" variant="ghost" onPress={() => addSet(g)} />
          </Card>
        );
      })}
      {groups.length === 0 ? (
        <Txt variant="small" faint>
          No sets in this session.
        </Txt>
      ) : null}

      <Button title="Delete session" variant="danger" onPress={deleteSession} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  swap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
