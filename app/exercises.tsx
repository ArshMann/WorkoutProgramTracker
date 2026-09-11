import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import * as repo from '@/db/repo';
import { weekInfo } from '@/engine/week';
import { getExercise } from '@/program/exercises';
import { getCoreStage } from '@/program/core';
import { useAppStore } from '@/store/app';
import { Card } from '@/ui/components/Card';
import { Row } from '@/ui/components/Row';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';

export default function Exercises() {
  const router = useRouter();
  const startDay = useAppStore((s) => s.programStartDay) ?? '2000-01-01';
  const info = weekInfo(startDay, new Date());
  const history = useMemo(() => repo.getHistoryByExercise(), []);
  const sections: Array<{ title: string; ids: string[] }> = [];
  for (const type of ['PUSH', 'PULL', 'LEGS'] as const) {
    sections.push({ title: type, ids: info.block.sessions[type].map((p) => p.exerciseId) });
  }
  sections.push({ title: 'Core', ids: getCoreStage(info.block.coreStage).drills.map((d) => d.exerciseId) });
  const inBlock = new Set(sections.flatMap((s) => s.ids));
  const others = Object.keys(history).filter((id) => !inBlock.has(id));
  if (others.length) sections.push({ title: 'Other logged', ids: others });

  return (
    <Screen>
      {sections.map((s) => (
        <Card key={s.title}>
          <Txt variant="caption" style={{ marginBottom: 6 }}>
            {s.title}
          </Txt>
          {s.ids.map((id) => {
            const h = history[id] ?? [];
            const last = h[h.length - 1];
            return (
              <Row
                key={id}
                label={getExercise(id).name}
                value={last ? `${last.sets[0]?.load ?? ''}${last.sets[0] ? ' lb' : ''}` : '—'}
                sub={last ? `${h.length} session${h.length === 1 ? '' : 's'}` : undefined}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id } })}
              />
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}
