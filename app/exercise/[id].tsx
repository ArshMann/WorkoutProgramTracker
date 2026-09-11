import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as repo from '@/db/repo';
import { bestE1rm } from '@/engine/e1rm';
import { incrementFor } from '@/engine/increments';
import { formatRirChip } from '@/engine/rir';
import { LOAD_TOO_HEAVY_TEXT, isLoadTooHeavy, stallStep, stallStepText } from '@/engine/stall';
import { weekInfo } from '@/engine/week';
import { getExercise, isCalibrationEligible, isExerciseId } from '@/program/exercises';
import { STALL_PROTOCOL_STEPS } from '@/program/reference';
import { useAppStore } from '@/store/app';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { TrendChart } from '@/ui/components/TrendChart';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

const INCREMENT_CHOICES = [1.25, 2.5, 5, 10, 15, 20];

export default function ExerciseHistory() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const startDay = useAppStore((s) => s.programStartDay) ?? '2000-01-01';
  const [tick, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  const valid = !!id && isExerciseId(id);
  const def = valid ? getExercise(id) : null;
  const history = useMemo(() => (valid ? repo.getExerciseHistory(id) : []), [id, valid, tick]);
  const increments = useMemo(() => repo.getIncrements(), [tick]);
  const stall = useMemo(() => (valid ? repo.getActiveStalls().find((s) => s.exerciseId === id) : undefined), [id, valid, tick]);
  const calibrations = useMemo(() => (valid ? repo.listCalibrations().filter((x) => x.exerciseId === id) : []), [id, valid, tick]);

  if (!def || !valid) {
    return (
      <Screen>
        <Txt muted>Unknown exercise.</Txt>
      </Screen>
    );
  }

  const custom = increments[id];
  const effectiveInc = incrementFor(def, custom);
  const attempts = history.filter((a) => a.kind === 'queue' || a.kind === 'fullbody');
  let lastBlock = 0;
  const points = attempts.map((a) => {
    const block = weekInfo(startDay, new Date(a.date)).block.number;
    const marker = block !== lastBlock && lastBlock !== 0 ? `B${block}` : undefined;
    lastBlock = block;
    return { value: Math.round(bestE1rm(a.sets)), marker };
  });
  const now = new Date();

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Txt variant="title">{def.name}</Txt>
        <Txt variant="small" muted>
          {def.pattern.replace(/-/g, ' ')} · {def.equipment.replace(/-/g, ' ')} · {def.role}
        </Txt>
        {def.notes ? (
          <Txt variant="small" faint>
            {def.notes}
          </Txt>
        ) : null}
      </View>

      {stall ? (
        <Card style={{ gap: space.sm, borderColor: c.accent }}>
          <Txt variant="caption">Stalled since {new Date(stall.flaggedAt).toLocaleDateString()}</Txt>
          {isLoadTooHeavy(history) ? (
            <Txt>{LOAD_TOO_HEAVY_TEXT}</Txt>
          ) : (
            (() => {
              const step = stall.stepOverride ?? stallStep(new Date(stall.flaggedAt), now);
              return (
                <Txt>
                  Step {step} of {STALL_PROTOCOL_STEPS.length}: {stallStepText(step)}
                </Txt>
              );
            })()
          )}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              title="Next step"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                const step = stall.stepOverride ?? stallStep(new Date(stall.flaggedAt), now);
                repo.setStallStep(stall.id, Math.min(STALL_PROTOCOL_STEPS.length, step + 1));
                setTick((t) => t + 1);
              }}
            />
            <Button
              title="Resolved"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => {
                repo.resolveStall(stall.id, now.toISOString());
                setTick((t) => t + 1);
              }}
            />
          </View>
        </Card>
      ) : null}

      {def.loadable !== false ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="caption">Load increment</Txt>
          <Txt variant="small" muted>
            Currently +{effectiveInc} lb{custom ? ' (custom)' : ' (default)'}. Set the smallest pin, half-plate or microplate jump once.
          </Txt>
          <View style={styles.chips}>
            {[null, ...INCREMENT_CHOICES].map((v) => {
              const on = v === null ? !custom : custom === v;
              return (
                <Pressable
                  key={String(v)}
                  onPress={() => {
                    repo.setIncrement(id, v);
                    setTick((t) => t + 1);
                  }}
                  style={[styles.chip, { backgroundColor: on ? c.accent : c.surfaceRaised }]}
                >
                  <Txt variant="small" style={{ color: on ? c.accentText : c.text, fontWeight: '600' }}>
                    {v === null ? 'Default' : `${v}`}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {def.loadable !== false ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="caption">Estimated 1RM</Txt>
          <TrendChart points={points} unit="" />
        </Card>
      ) : null}

      {isCalibrationEligible(id) && calibrations.length > 0 ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="caption">RIR calibration</Txt>
          {calibrations
            .slice()
            .reverse()
            .map((k) => (
              <Txt key={k.id} variant="small" muted>
                {new Date(k.date).toLocaleDateString()} · predicted {k.predictedRir}, actual {k.actualRir} · delta {k.delta >= 0 ? '+' : ''}
                {k.delta}
              </Txt>
            ))}
        </Card>
      ) : null}

      <Card style={{ gap: space.md }}>
        <Txt variant="caption">Sessions</Txt>
        {history.length === 0 ? (
          <Txt variant="small" faint>
            No sets logged yet.
          </Txt>
        ) : null}
        {history
          .slice()
          .reverse()
          .map((a) => (
            <View key={a.sessionId} style={{ gap: 2 }}>
              <Txt variant="small" muted>
                {new Date(a.date).toLocaleDateString()}
                {a.kind !== 'queue' ? ` · ${a.kind}` : ''}
                {a.sets.some((s) => s.pain) ? ' · pain flagged' : ''}
                {a.sets.some((s) => s.toFailure) ? ' · calibration set' : ''}
              </Txt>
              <Txt style={{ fontVariant: ['tabular-nums'] }}>
                {a.sets.map((s) => `${def.loadable === false ? '' : `${s.load}×`}${s.reps}${s.rir !== null ? `@${formatRirChip(s.rir)}` : ''}`).join('  ')}
              </Txt>
            </View>
          ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
