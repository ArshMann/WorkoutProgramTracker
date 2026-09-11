import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import * as repo from '@/db/repo';
import { rollingWeeklyAverage, sessionsInProgramWeek } from '@/engine/attendance';
import { addDays, dayKey } from '@/engine/dates';
import { sessionAt } from '@/engine/queue';
import type { Variant } from '@/engine/session-builder';
import { LOAD_TOO_HEAVY_TEXT, isLoadTooHeavy, isMultiStall, stallStep, stallStepText } from '@/engine/stall';
import { weekInfo } from '@/engine/week';
import { getExercise } from '@/program/exercises';
import { STALL_STEP_7 } from '@/program/reference';
import { useAppStore } from '@/store/app';
import { manualDeloadActive } from '@/store/context';
import { todayHasFinishedSession, useSessionStore } from '@/store/session';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Row } from '@/ui/components/Row';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { space } from '@/ui/theme';

export default function Home() {
  const router = useRouter();
  const app = useAppStore();
  const active = useSessionStore((s) => s.active);
  const start = useSessionStore((s) => s.start);
  const [tick, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  const startDay = app.programStartDay;
  const now = useMemo(() => new Date(), [tick]);
  const info = useMemo(() => (startDay ? weekInfo(startDay, now) : null), [startDay, now]);
  const dates = useMemo(() => repo.getSessionDates(), [tick]);
  const stalls = useMemo(() => repo.getActiveStalls(), [tick]);
  const history = useMemo(() => (stalls.length ? repo.getHistoryByExercise() : {}), [stalls]);
  const doneToday = useMemo(() => todayHasFinishedSession(now), [now]);

  if (!startDay || !info) return <Redirect href="/onboarding" />;

  const next = sessionAt(app.queueIndex);
  const thisWeek = sessionsInProgramWeek(dates, startDay, now);
  const avg = rollingWeeklyAverage(dates, now);
  const deload = info.isDeload || manualDeloadActive(now);
  const blocked = doneToday || !!active;

  const go = (variant: Variant) => {
    start(variant, new Date());
    router.push('/session');
  };

  const unscheduledDeload = () => {
    app.setManualDeloadUntilDay(dayKey(addDays(now, 6)));
    setTick((t) => t + 1);
  };

  return (
    <Screen>
      <Card style={{ gap: space.md, paddingVertical: space.xl }}>
        <Txt variant="caption">Next</Txt>
        <Txt variant="display">{next}</Txt>
        <Txt muted>{info.label}</Txt>
        {deload ? (
          <Txt variant="small" muted>
            Deload: half the sets, ~60 % loads, RIR 4–5.
          </Txt>
        ) : null}
        <View style={{ height: space.sm }} />
        {active ? (
          <Button title={`Resume ${active.session.sessionType}`} size="lg" onPress={() => router.push('/session')} />
        ) : doneToday ? (
          <>
            <Button title="Logged today" size="lg" disabled onPress={() => undefined} />
            <Txt variant="small" faint style={{ textAlign: 'center' }}>
              One session per day. {next} is next.
            </Txt>
          </>
        ) : (
          <Button title="Start" size="lg" onPress={() => go('queue')} />
        )}
      </Card>

      <View style={{ gap: space.xs }}>
        <Txt muted>
          {thisWeek} session{thisWeek === 1 ? '' : 's'} this week
        </Txt>
        <Txt variant="small" faint>
          4-week average {avg.toFixed(1)} per week
        </Txt>
      </View>

      {stalls.length > 0 ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="caption">Stalled</Txt>
          {stalls.map((s) => {
            const step = s.stepOverride ?? stallStep(new Date(s.flaggedAt), now);
            const tooHeavy = isLoadTooHeavy(history[s.exerciseId] ?? []);
            return (
              <View key={s.id} style={{ gap: 2 }}>
                <Txt>{getExercise(s.exerciseId).name}</Txt>
                <Txt variant="small" muted>
                  {tooHeavy ? LOAD_TOO_HEAVY_TEXT : `Step ${step}: ${stallStepText(step)}`}
                </Txt>
              </View>
            );
          })}
          {isMultiStall(stalls.length) ? (
            <View style={{ gap: space.sm, marginTop: space.xs }}>
              <Txt variant="small">{STALL_STEP_7}</Txt>
              {!deload ? <Button title="Take an unscheduled deload this week" variant="secondary" onPress={unscheduledDeload} /> : null}
            </View>
          ) : null}
        </Card>
      ) : null}

      {info.isDeload && !app.blockReviewsSeen.includes(info.block.number) ? (
        <Card>
          <Row label="Block review" sub="Deload week. ~15 minutes, once." onPress={() => router.push('/review')} />
        </Card>
      ) : null}

      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Instead of the queued session</Txt>
        <Button title="Minimum session" variant="secondary" disabled={blocked} onPress={() => go('minimum')} />
        <Txt variant="small" faint>
          First 3 exercises, 2 sets each, RIR 3. Counts as {next}; the queue advances.
        </Txt>
        {!deload ? <Button title="Deload session" variant="secondary" disabled={blocked} onPress={() => go('deload')} /> : null}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="Full-body A" variant="secondary" disabled={blocked} onPress={() => go('FBA')} style={{ flex: 1 }} />
          <Button title="Full-body B" variant="secondary" disabled={blocked} onPress={() => go('FBB')} style={{ flex: 1 }} />
        </View>
        <Txt variant="small" faint>
          For a known two-session week. The queue resumes where it left off.
        </Txt>
      </Card>

      <Card>
        <Row label="Exercise history" onPress={() => router.push('/exercises')} />
        <Row label="Body metrics" onPress={() => router.push('/metrics')} />
        <Row label="Program reference" onPress={() => router.push('/reference')} />
        <Row label="Settings" onPress={() => router.push('/settings')} />
      </Card>
    </Screen>
  );
}
