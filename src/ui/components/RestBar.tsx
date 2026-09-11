import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatSeconds } from '@/engine/rest';
import { tickTimer, useSessionStore } from '@/store/session';
import { radius, space, useColors } from '../theme';
import { Txt } from './Txt';

/**
 * Persistent, non-blocking bottom bar: the rest countdown on the left, Finish
 * on the right. It never covers the set list (the list pads for it) and never
 * interrupts logging.
 */
export function RestBar({ onFinish }: { onFinish: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const timer = useSessionStore((s) => s.timer);
  const extend = useSessionStore((s) => s.extendTimer);
  const stop = useSessionStore((s) => s.stopTimer);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setRemaining(tickTimer()), 250);
    return () => clearInterval(id);
  }, []);

  const running = timer.endsAt !== null && remaining !== null && remaining > 0;
  const done = timer.endsAt !== null && remaining === 0;

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: insets.bottom + space.sm }]}>
      <Pressable onPress={running || done ? stop : undefined} onLongPress={running ? () => extend(30) : undefined} style={styles.timer}>
        {running || done ? (
          <>
            <Text style={[styles.time, { color: done ? c.accent : c.text }]}>{formatSeconds(remaining ?? 0)}</Text>
            <Txt variant="small" muted numberOfLines={1}>
              {done ? 'Go' : timer.label}
            </Txt>
          </>
        ) : (
          <Txt variant="small" faint>
            Rest timer starts on ✓
          </Txt>
        )}
      </Pressable>
      {running ? (
        <Pressable onPress={() => extend(30)} style={[styles.plus, { backgroundColor: c.surfaceRaised }]}>
          <Txt variant="small">+30</Txt>
        </Pressable>
      ) : null}
      <Pressable onPress={onFinish} style={({ pressed }) => [styles.finish, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}>
        <Text style={{ color: c.accentText, fontSize: 17, fontWeight: '700' }}>Finish</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  timer: { flex: 1, minHeight: 56, justifyContent: 'center' },
  time: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 38 },
  plus: { minHeight: 48, paddingHorizontal: 14, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  finish: { minHeight: 56, paddingHorizontal: 24, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
