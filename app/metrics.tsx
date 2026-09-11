import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as repo from '@/db/repo';
import { calorieInstruction, rollingAverage7 } from '@/engine/calibration';
import { dayKey, daysBetween, parseDayKey } from '@/engine/dates';
import { CALORIE_RULES, NUTRITION_TARGETS } from '@/program/reference';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Checkbox } from '@/ui/components/Checkbox';
import { Row } from '@/ui/components/Row';
import { Screen } from '@/ui/components/Screen';
import { Stepper } from '@/ui/components/Stepper';
import { TrendChart } from '@/ui/components/TrendChart';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

export default function Metrics() {
  const c = useColors();
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  useFocusEffect(useCallback(() => refresh(), []));
  const now = new Date();
  const today = dayKey(now);

  const weighIns = useMemo(() => repo.listBodyweight(), [tick]);
  const waists = useMemo(() => repo.listWaist(), [tick]);
  const checks = useMemo(() => repo.getDailyCheck(today), [tick, today]);
  const cond = useMemo(() => repo.listConditioning().slice(0, 5), [tick]);

  const lastW = weighIns[weighIns.length - 1];
  const todayW = weighIns.find((w) => w.day === today);
  const [weight, setWeight] = useState<number | null>(null);
  const weightValue = weight ?? todayW?.lb ?? lastW?.lb ?? 170;

  const lastWaist = waists[waists.length - 1];
  const [waistVal, setWaistVal] = useState<number | null>(null);
  const waistValue = waistVal ?? lastWaist?.inches ?? 33;
  const waistDays = lastWaist ? daysBetween(parseDayKey(lastWaist.day), now) : null;

  const avg = rollingAverage7(weighIns);
  const chartPoints = avg.slice(-56).map((p) => ({ value: p.avg }));
  const rawPoints = weighIns.slice(-56).map((w) => ({ value: w.lb }));
  const instruction = calorieInstruction(weighIns, waists, now);

  const [condKind, setCondKind] = useState<'zone2' | 'interval'>('zone2');
  const [condMin, setCondMin] = useState(25);

  return (
    <Screen>
      <Card style={{ gap: space.md }}>
        <Txt variant="caption">Bodyweight · 7-day average</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <Txt variant="display">{avg.length ? avg[avg.length - 1].avg.toFixed(1) : '—'}</Txt>
          <Txt muted>lb</Txt>
          {lastW ? (
            <Txt variant="small" faint>
              today’s raw {todayW ? todayW.lb : '—'}
            </Txt>
          ) : null}
        </View>
        <TrendChart points={chartPoints} secondary={rawPoints} unit="" decimals={0} />
        <Txt variant="small" faint>
          The line is the 7-day average; the faint trace is the daily number. Only the line is evaluated.
        </Txt>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Stepper value={weightValue} onChange={setWeight} step={0.2} min={0} unit="lb today" />
          <Button
            title={todayW ? 'Update today' : 'Save today'}
            onPress={() => {
              repo.upsertBodyweight(today, Math.round(weightValue * 10) / 10);
              setWeight(null);
              refresh();
            }}
          />
        </View>
      </Card>

      <Card style={{ gap: space.sm, backgroundColor: c.accentSoft }}>
        <Txt variant="caption">Calories</Txt>
        <Txt variant="title">{instruction.text}</Txt>
        <Txt variant="small" muted>
          {CALORIE_RULES.join('  ·  ')}
        </Txt>
      </Card>

      <Card style={{ gap: space.md }}>
        <Txt variant="caption">Waist at navel · every 2 weeks</Txt>
        <Txt variant="small" muted>
          {lastWaist ? `Last: ${lastWaist.inches}" · ${waistDays} day${waistDays === 1 ? '' : 's'} ago${waistDays !== null && waistDays >= 14 ? ' · due' : ''}` : 'No measurement yet. Morning, relaxed, tape snug not tight.'}
        </Txt>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Stepper value={waistValue} onChange={setWaistVal} step={0.25} min={0} unit="in" decimals={2} />
          <Button
            title="Save measurement"
            variant="secondary"
            onPress={() => {
              repo.upsertWaist(today, waistValue);
              setWaistVal(null);
              refresh();
            }}
          />
        </View>
      </Card>

      <Card>
        <Row label="Progress photos" sub="Front / side / back, every 4 weeks. Side-by-side comparison." onPress={() => router.push('/photos')} />
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Today</Txt>
        <Checkbox label="Creatine 5 g" checked={!!checks.creatine} onToggle={() => { repo.setDailyCheck(today, { creatine: checks.creatine ? 0 : 1 }); refresh(); }} />
        <Checkbox label="Vitamin D3" checked={!!checks.vitaminD} onToggle={() => { repo.setDailyCheck(today, { vitaminD: checks.vitaminD ? 0 : 1 }); refresh(); }} />
        <Checkbox label="Mobility routine" sub="~9 min, ideally evening" checked={!!checks.mobility} onToggle={() => { repo.setDailyCheck(today, { mobility: checks.mobility ? 0 : 1 }); refresh(); }} />
      </Card>

      <Card style={{ gap: space.md }}>
        <Txt variant="caption">Conditioning</Txt>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {(['zone2', 'interval'] as const).map((k) => (
            <Pressable key={k} onPress={() => setCondKind(k)} style={[styles.chip, { backgroundColor: condKind === k ? c.accent : c.surfaceRaised }]}>
              <Txt style={{ color: condKind === k ? c.accentText : c.text, fontWeight: '600' }}>{k === 'zone2' ? 'Zone 2' : 'Interval'}</Txt>
            </Pressable>
          ))}
        </View>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Stepper value={condMin} onChange={(v) => setCondMin(Math.max(0, Math.round(v)))} step={5} min={0} unit="min" />
          <Button
            title="Log"
            variant="secondary"
            onPress={() => {
              repo.addConditioning(today, condKind, condMin);
              refresh();
            }}
          />
        </View>
        {cond.map((x) => (
          <Row key={x.id} label={`${x.kind === 'zone2' ? 'Zone 2' : 'Interval'} · ${x.minutes} min`} value={x.day} />
        ))}
      </Card>

      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">Reference targets</Txt>
        {NUTRITION_TARGETS.map((t) => (
          <Row key={t.item} label={t.item} sub={t.target} />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
