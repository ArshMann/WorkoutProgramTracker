import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { radius, useColors } from '../theme';

interface Props {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  unit?: string;
  /** Show the value with this many decimals when not an integer. */
  decimals?: number;
}

/**
 * ± steppers sized for a sweaty thumb (56 pt). Tapping the number itself
 * opens a numeric keypad; nothing else ever does.
 */
export function Stepper({ value, onChange, step, min = Number.NEGATIVE_INFINITY, unit, decimals = 1 }: Props) {
  const c = useColors();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (editing) setTimeout(() => ref.current?.focus(), 30);
  }, [editing]);

  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(decimals));
  const commit = () => {
    const n = parseFloat(text.replace(',', '.'));
    if (!Number.isNaN(n)) onChange(Math.max(min, n));
    setEditing(false);
  };
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.round((value + step) * 100) / 100);

  return (
    <View style={styles.row}>
      <Pressable onPress={dec} hitSlop={6} style={({ pressed }) => [styles.btn, { backgroundColor: c.surfaceRaised, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.btnText, { color: c.text }]}>−</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setText(fmt(value));
          setEditing(true);
        }}
        style={styles.valueBox}
      >
        {editing ? (
          <TextInput
            ref={ref}
            value={text}
            onChangeText={setText}
            keyboardType="numeric"
            returnKeyType="done"
            onBlur={commit}
            onSubmitEditing={commit}
            selectTextOnFocus
            style={[styles.value, styles.input, { color: c.text, borderColor: c.accent }]}
          />
        ) : (
          <Text style={[styles.value, { color: c.text }]}>{fmt(value)}</Text>
        )}
        {unit ? <Text style={[styles.unit, { color: c.textFaint }]}>{unit}</Text> : null}
      </Pressable>
      <Pressable onPress={inc} hitSlop={6} style={({ pressed }) => [styles.btn, { backgroundColor: c.surfaceRaised, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.btnText, { color: c.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 30, fontWeight: '500', lineHeight: 34 },
  valueBox: { minWidth: 88, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  value: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  input: { minWidth: 88, borderBottomWidth: 2, paddingVertical: 0 },
  unit: { fontSize: 12, marginTop: -2 },
});
