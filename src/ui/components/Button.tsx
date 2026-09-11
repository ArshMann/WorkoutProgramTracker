import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { radius, TOUCH, useColors } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', disabled, style }: Props) {
  const c = useColors();
  const bg = variant === 'primary' ? c.accent : variant === 'secondary' ? c.surfaceRaised : 'transparent';
  const fg = variant === 'primary' ? c.accentText : variant === 'danger' ? c.danger : variant === 'ghost' ? c.textMuted : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, minHeight: size === 'lg' ? 64 : TOUCH, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        variant === 'secondary' && { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg, fontSize: size === 'lg' ? 20 : 16 }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '600' },
});
