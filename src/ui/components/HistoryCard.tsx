import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SessionSummary } from '@/db/repo';
import { space, useColors } from '../theme';
import { Card } from './Card';
import { Txt } from './Txt';

const KIND_LABEL: Record<string, string> = { queue: 'Full session', minimum: 'Minimum session', deload: 'Deload session', fullbody: 'Full-body session' };

/** One logged session in the Home strip. Tap to open it for editing. */
export function HistoryCard({ session, onPress, width }: { session: SessionSummary; onPress: () => void; width: number }) {
  const c = useColors();
  const d = new Date(session.startedAt);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}>
      <Card style={{ gap: space.md, paddingVertical: space.xl, minHeight: 236 }}>
        <View style={styles.row}>
          <Txt variant="caption">{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Txt>
          {session.editedAt ? (
            <Txt variant="caption" style={{ color: c.textFaint }}>
              edited
            </Txt>
          ) : null}
        </View>
        <Txt variant="display">{session.sessionType}</Txt>
        <Txt muted>
          Week {session.week} · Block {session.block}
        </Txt>
        <Txt variant="small" muted>
          {KIND_LABEL[session.kind] ?? session.kind} · {session.exerciseCount} exercise{session.exerciseCount === 1 ? '' : 's'} · {session.setCount} set
          {session.setCount === 1 ? '' : 's'}
        </Txt>
        <Txt variant="small" faint>
          Tap to review or edit
        </Txt>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } });
