import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlannedCard, PlannedSetRow } from '@/engine/types';
import { getExercise } from '@/program/exercises';
import { incrementFor } from '@/engine/increments';
import { space, useColors } from '../theme';
import { Card } from './Card';
import { SetRow, type RowValue } from './SetRow';
import { Txt } from './Txt';

interface Props {
  card: PlannedCard;
  activeKey: string | null;
  values: (row: PlannedSetRow) => RowValue;
  isLogged: (key: string) => boolean;
  customIncrements: Record<string, number>;
  calibratingKey: string | null;
  onLog: (row: PlannedSetRow) => void;
  onUnlog: (row: PlannedSetRow) => void;
  onActivate: (row: PlannedSetRow) => void;
  onChange: (row: PlannedSetRow, patch: Partial<RowValue>) => void;
  onTogglePain: (row: PlannedSetRow) => void;
  onOpenHistory: (exerciseId: string) => void;
  onSubstitute: (cardIndex: number, slotIndex: number) => void;
  /** One tap: move this card to the end of today's walk order (busy station). */
  canMoveLater: boolean;
  onLater: () => void;
}

export function ExerciseCard(p: Props) {
  const c = useColors();
  const { card } = p;
  const multi = card.exercises.length > 1;
  return (
    <Card style={{ gap: space.sm }}>
      {card.isCoreBlock ? (
        <View style={styles.head}>
          <Txt variant="title" style={{ flex: 1 }}>
            {card.title}
          </Txt>
          {p.canMoveLater ? <LaterButton onPress={p.onLater} /> : null}
        </View>
      ) : null}
      {card.exercises.map((ex) => {
        const setsDone = card.rows.filter((r) => r.slotIndex === ex.slotIndex && p.isLogged(r.key)).length;
        const setsTotal = card.rows.filter((r) => r.slotIndex === ex.slotIndex).length;
        const rx = ex.prescription;
        return (
          <View key={ex.slotIndex} style={styles.head}>
            <Pressable onPress={() => p.onOpenHistory(ex.exerciseId)} style={{ flex: 1 }} hitSlop={6}>
              <Txt variant={ex.isCore ? 'body' : 'title'}>{ex.name}</Txt>
              <Txt variant="small" muted>
                {`${rx.sets} × ${rx.reps.min}–${rx.reps.max}`}
                {rx.lastSet?.reps ? ` (last ${rx.lastSet.reps.min}–${rx.lastSet.reps.max})` : ''}
                {`  ·  ${setsDone}/${setsTotal}`}
                {ex.substitutedFrom ? `  ·  for ${getExercise(ex.substitutedFrom).name}` : ''}
              </Txt>
              {ex.suggestion.kind === 'increase' || ex.suggestion.kind === 'range-shift' || ex.suggestion.kind === 'first' ? (
                <Txt variant="small" accent>
                  {ex.suggestion.note}
                </Txt>
              ) : null}
              {rx.notes && !ex.isCore ? (
                <Txt variant="small" faint>
                  {rx.notes}
                </Txt>
              ) : null}
            </Pressable>
            {!ex.isCore ? (
              <Pressable onPress={() => p.onSubstitute(card.index, ex.slotIndex)} hitSlop={8} style={styles.swap}>
                <Text style={{ color: c.textMuted, fontSize: 22 }}>⇄</Text>
              </Pressable>
            ) : null}
            {!ex.isCore && p.canMoveLater ? <LaterButton onPress={p.onLater} /> : null}
          </View>
        );
      })}
      <View>
        {card.rows.map((row) => {
          const ex = card.exercises.find((e) => e.slotIndex === row.slotIndex)!;
          const def = getExercise(row.exerciseId);
          const label = multi ? `${shortName(ex.name)} ${row.setIndex + 1}` : `Set ${row.setIndex + 1}`;
          return (
            <SetRow
              key={row.key}
              row={row}
              label={label}
              value={p.values(row)}
              logged={p.isLogged(row.key)}
              active={p.activeKey === row.key}
              loadStep={incrementFor(def, p.customIncrements[row.exerciseId])}
              onLog={() => p.onLog(row)}
              onUnlog={() => p.onUnlog(row)}
              onActivate={() => p.onActivate(row)}
              onChange={(patch) => p.onChange(row, patch)}
              onTogglePain={() => p.onTogglePain(row)}
              calibrating={p.calibratingKey === row.key}
            />
          );
        })}
      </View>
    </Card>
  );
}

function LaterButton({ onPress }: { onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.later, { backgroundColor: c.surfaceRaised, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '600' }}>Later ↓</Text>
    </Pressable>
  );
}

function shortName(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return words.slice(0, 2).join(' ');
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  swap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  later: { minHeight: 44, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
