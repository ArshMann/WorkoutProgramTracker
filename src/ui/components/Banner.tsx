import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, space, useColors } from '../theme';
import { Txt } from './Txt';

/** One line of neutral, factual copy. No icons, no colour coding. */
export function Banner({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={[styles.box, { backgroundColor: c.accentSoft }]}>
      <Txt variant="small" style={{ color: c.text }}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ box: { borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.lg } });
