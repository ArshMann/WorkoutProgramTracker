import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { font, useColors } from '../theme';

type Variant = 'display' | 'number' | 'title' | 'body' | 'small' | 'caption';

const styles: Record<Variant, TextStyle> = {
  display: { fontSize: font.display, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  number: { fontSize: font.number, fontWeight: '600', fontVariant: ['tabular-nums'] },
  title: { fontSize: font.title, fontWeight: '600' },
  body: { fontSize: font.body, fontWeight: '400' },
  small: { fontSize: font.small, fontWeight: '400' },
  caption: { fontSize: font.caption, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
};

export function Txt({
  variant = 'body',
  muted,
  faint,
  accent,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean; faint?: boolean; accent?: boolean }) {
  const c = useColors();
  const color = accent ? c.accent : faint ? c.textFaint : muted || variant === 'caption' ? c.textMuted : c.text;
  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}
