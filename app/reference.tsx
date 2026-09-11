import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatRirTarget } from '@/engine/rir';
import { weekInfo } from '@/engine/week';
import { BLOCKS, getBlock } from '@/program/blocks';
import { getCoreStage } from '@/program/core';
import { getExercise } from '@/program/exercises';
import {
  DELOAD_RULE,
  MISSED_DAY_MATRIX,
  ON_RAMP,
  PROGRESSION_RULE,
  REST_TABLE,
  STALL_PROTOCOL_STEPS,
  STALL_STEP_7,
  UNSCHEDULED_DELOAD_CRITERIA,
  WARM_UP,
} from '@/program/reference';
import type { Prescription } from '@/program/types';
import { useAppStore } from '@/store/app';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

function fmt(p: Prescription): string {
  const last = p.lastSet?.reps ? ` (last ${p.lastSet.reps.min}–${p.lastSet.reps.max})` : '';
  return `${p.sets} × ${p.reps.min}–${p.reps.max}${last}`;
}

function rirText(p: Prescription): string {
  if (!p.rir) return '—';
  const last = p.lastSet?.rir ? ` (last ${formatRirTarget(p.lastSet.rir)})` : '';
  return `${formatRirTarget(p.rir)}${last}`;
}

export default function Reference() {
  const c = useColors();
  const startDay = useAppStore((s) => s.programStartDay) ?? '2000-01-01';
  const current = weekInfo(startDay, new Date()).block.number;
  const [blockNo, setBlockNo] = useState(current);
  const block = getBlock(blockNo);
  const core = getCoreStage(block.coreStage);

  return (
    <Screen>
      <View style={styles.chips}>
        {BLOCKS.map((b) => (
          <Pressable key={b.number} onPress={() => setBlockNo(b.number)} style={[styles.chip, { backgroundColor: b.number === blockNo ? c.accent : c.surfaceRaised }]}>
            <Txt variant="small" style={{ color: b.number === blockNo ? c.accentText : c.text, fontWeight: '600' }}>
              B{b.number}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View>
        <Txt variant="title">
          Block {block.number} — {block.name}
        </Txt>
        <Txt variant="small" muted>
          Weeks {block.firstWeek}–{block.lastWeek} · deload week {block.deloadWeek}
          {block.number === current ? ' · current' : ''}
        </Txt>
        {block.notes ? (
          <Txt variant="small" faint>
            {block.notes}
          </Txt>
        ) : null}
      </View>

      {(['PUSH', 'PULL', 'LEGS'] as const).map((type) => (
        <Card key={type} style={{ gap: space.sm }}>
          <Txt variant="caption">{type}</Txt>
          {block.sessions[type].map((p, i) => (
            <View key={i} style={[styles.tr, { borderColor: c.border }]}>
              <Txt variant="small" faint style={{ width: 18 }}>
                {i + 1}
              </Txt>
              <View style={{ flex: 1 }}>
                <Txt>{getExercise(p.exerciseId).name}</Txt>
                {p.notes ? (
                  <Txt variant="small" faint>
                    {p.notes}
                  </Txt>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt style={{ fontVariant: ['tabular-nums'] }}>{fmt(p)}</Txt>
                <Txt variant="small" muted>
                  RIR {rirText(p)}
                </Txt>
              </View>
            </View>
          ))}
          {type === 'LEGS' ? (
            <View style={{ gap: 4, marginTop: space.xs }}>
              <Txt variant="caption">{core.label}</Txt>
              {core.drills.map((d, i) => (
                <View key={i} style={[styles.tr, { borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Txt>{getExercise(d.exerciseId).name}</Txt>
                    {d.notes ? (
                      <Txt variant="small" faint>
                        {d.notes}
                      </Txt>
                    ) : null}
                  </View>
                  <Txt style={{ fontVariant: ['tabular-nums'] }}>{fmt(d)}</Txt>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ))}

      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">Progression rule (1.4)</Txt>
        {PROGRESSION_RULE.map((l, i) => (
          <Txt key={i} variant="small">
            {l}
          </Txt>
        ))}
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Missed-day matrix (Part 5)</Txt>
        {MISSED_DAY_MATRIX.map((m) => (
          <View key={m.scenario}>
            <Txt>{m.scenario}</Txt>
            <Txt variant="small" muted>
              {m.action}
            </Txt>
          </View>
        ))}
      </Card>

      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">Rest (1.6)</Txt>
        {REST_TABLE.map((r) => (
          <View key={r.type} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
            <Txt variant="small" style={{ flex: 1 }}>
              {r.type}
            </Txt>
            <Txt variant="small" muted>
              {r.rest}
            </Txt>
          </View>
        ))}
      </Card>

      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">On-ramp (1.3)</Txt>
        {ON_RAMP.map((r) => (
          <Txt key={r.week} variant="small">
            Week {r.week}: RIR {r.rir}. {r.loads}
          </Txt>
        ))}
      </Card>

      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">Deloads (Part 12)</Txt>
        <Txt variant="small">{DELOAD_RULE}</Txt>
        <Txt variant="small" muted>
          Unscheduled — take one if 3 or more are true for a week: {UNSCHEDULED_DELOAD_CRITERIA.join(' · ')}.
        </Txt>
      </Card>

      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">Stall protocol (Part 11)</Txt>
        {STALL_PROTOCOL_STEPS.map((s, i) => (
          <Txt key={i} variant="small">
            {i + 1}. {s}
          </Txt>
        ))}
        <Txt variant="small">7. {STALL_STEP_7}</Txt>
      </Card>

      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">Warm-up (Part 4)</Txt>
        {WARM_UP.map((s, i) => (
          <Txt key={i} variant="small">
            {i + 1}. {s}
          </Txt>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
