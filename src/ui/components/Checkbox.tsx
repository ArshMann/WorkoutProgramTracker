import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TOUCH, radius, useColors } from '../theme';
import { Txt } from './Txt';

export function Checkbox({ label, checked, onToggle, sub }: { label: string; checked: boolean; onToggle: () => void; sub?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.box, { borderColor: checked ? c.accent : c.border, backgroundColor: checked ? c.accent : 'transparent' }]}>
        {checked ? <Text style={{ color: c.accentText, fontWeight: '700', fontSize: 18 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Txt>{label}</Txt>
        {sub ? (
          <Txt variant="small" muted>
            {sub}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', gap: 14 },
  box: { width: 28, height: 28, borderRadius: radius.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
