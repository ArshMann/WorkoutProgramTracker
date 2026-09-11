import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RIR_CHIPS, formatRirChip } from '@/engine/rir';
import { radius, TOUCH, useColors } from '../theme';

interface Props {
  value: number | null;
  onChange: (v: number) => void;
  compact?: boolean;
}

/** One row of chips, one tap, no keyboard. */
export function RirChips({ value, onChange, compact }: Props) {
  const c = useColors();
  return (
    <View style={styles.row}>
      {RIR_CHIPS.map((v) => {
        const on = value === v;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={({ pressed }) => [
              styles.chip,
              { minHeight: compact ? 40 : TOUCH, backgroundColor: on ? c.accent : c.surfaceRaised, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.label, { color: on ? c.accentText : c.textMuted }]}>{formatRirChip(v)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 17, fontWeight: '600' },
});
