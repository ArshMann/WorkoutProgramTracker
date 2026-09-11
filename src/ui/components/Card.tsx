import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { radius, space, useColors } from '../theme';

export function Card({ style, ...rest }: ViewProps & { style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View {...rest} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth },
});
