import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TOUCH, space, useColors } from '../theme';
import { Txt } from './Txt';

/** A list row with a label, optional value, and an optional press. */
export function Row({ label, value, onPress, sub, right }: { label: string; value?: string; sub?: string; onPress?: () => void; right?: React.ReactNode }) {
  const c = useColors();
  const body = (
    <View style={[styles.row, { borderColor: c.border }]}>
      <View style={{ flex: 1 }}>
        <Txt>{label}</Txt>
        {sub ? (
          <Txt variant="small" muted>
            {sub}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt muted style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
      ) : null}
      {right}
      {onPress ? <Txt faint>  ›</Txt> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: TOUCH + 4, flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: space.md },
});
