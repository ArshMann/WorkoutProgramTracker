import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import * as repo from '@/db/repo';
import { averagePerWeek } from '@/engine/attendance';
import { calorieInstruction, waistChangeOverMonth } from '@/engine/calibration';
import { addDays, parseDayKey, toIso } from '@/engine/dates';
import { bestE1rm } from '@/engine/e1rm';
import { weekInfo } from '@/engine/week';
import { getExercise } from '@/program/exercises';
import { BLOCK_REVIEW_CHECKLIST } from '@/program/reference';
import { useAppStore } from '@/store/app';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Checkbox } from '@/ui/components/Checkbox';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

/** Part 10.3 — surfaced once per deload week, with the numbers filled in. */
export default function Review() {
  const c = useColors();
  const router = useRouter();
  const app = useAppStore();
  const now = new Date();
  const startDay = app.programStartDay ?? '2000-01-01';
  const info = weekInfo(startDay, now);
  const block = info.block;
  const from = addDays(parseDayKey(startDay), (block.firstWeek - 1) * 7);
  const to = addDays(now, 1);

  const data = useMemo(() => {
    const dates = repo.getSessionDates();
    const attendance = averagePerWeek(dates, from, to);
    const history = repo.getHistoryByExercise();
    const progressed: string[] = [];
    const flat: string[] = [];
    for (const [id, apps] of Object.entries(history)) {
      const inBlock = apps.filter((a) => a.kind === 'queue' && new Date(a.date) >= from);
      if (inBlock.length < 2) continue;
      const first = bestE1rm(inBlock[0].sets);
      const last = bestE1rm(inBlock[inBlock.length - 1].sets);
      (last > first ? progressed : flat).push(getExercise(id).name);
    }
    const stalled = repo.getAllStalls().filter((s) => new Date(s.flaggedAt) >= from).map((s) => getExercise(s.exerciseId).name);
    const calories = calorieInstruction(repo.listBodyweight(), repo.listWaist(), now);
    const waistDelta = waistChangeOverMonth(repo.listWaist(), now);
    const pain = repo.getPainCounts(toIso(from));
    const painful = Object.entries(pain)
      .filter(([, n]) => n > 1)
      .map(([id, n]) => `${getExercise(id).name} (${n})`);
    return { attendance, progressed, flat, stalled, calories, waistDelta, painful };
  }, [from, to, now]);

  const [checked, setChecked] = useState<boolean[]>(BLOCK_REVIEW_CHECKLIST.map(() => false));
  const [notes, setNotes] = useState('');

  const facts = [
    `${data.attendance.toFixed(1)} sessions/week this block.`,
    `Progressed: ${data.progressed.join(', ') || 'none yet'}. Flat: ${data.flat.join(', ') || 'none'}. Stalled 3+: ${data.stalled.join(', ') || 'none'}.`,
    data.calories.text,
    data.waistDelta === null ? 'Waist: not enough measurements a month apart.' : `Waist ${data.waistDelta >= 0 ? '+' : ''}${data.waistDelta.toFixed(2)}" over the last month.`,
    data.painful.length ? `Pain flagged more than once: ${data.painful.join(', ')}.` : 'No exercise flagged for pain more than once.',
    data.stalled.length ? `Still stalled: ${data.stalled.join(', ')}. Replace at the boundary if Part 11 did not fix it.` : 'Nothing stalled all block.',
  ];

  const save = () => {
    repo.saveBlockReview(block.number, { checked, notes, facts }, toIso(now));
    app.markBlockReviewSeen(block.number);
    router.back();
  };

  return (
    <Screen>
      <View>
        <Txt variant="title">Block {block.number} review</Txt>
        <Txt variant="small" muted>
          Deload week {info.week}. About 15 minutes, once.
        </Txt>
      </View>
      {BLOCK_REVIEW_CHECKLIST.map((item, i) => (
        <Card key={i} style={{ gap: space.sm }}>
          <Checkbox label={item} checked={checked[i]} onToggle={() => setChecked((cs) => cs.map((v, j) => (j === i ? !v : v)))} />
          <Txt variant="small" muted>
            {facts[i]}
          </Txt>
        </Card>
      ))}
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Notes for next block</Txt>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Swaps, joints, one structural change at most."
          placeholderTextColor={c.textFaint}
          style={{ minHeight: 80, color: c.text, backgroundColor: c.surfaceRaised, borderRadius: radius.sm, padding: space.md, fontSize: 16 }}
        />
      </Card>
      <Button title="Save review" size="lg" onPress={save} />
    </Screen>
  );
}
