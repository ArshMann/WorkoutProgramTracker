import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useColors } from '../theme';

/** Page wrapper with safe-area padding. `scroll` for content pages; plain for pages with their own list/bar. */
export function Screen({ children, scroll = true, style, bottom = space.xxl }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle; bottom?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!scroll) {
    return <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top }, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: c.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + bottom }, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.lg },
});
