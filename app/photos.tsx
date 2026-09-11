import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as repo from '@/db/repo';
import { dayKey } from '@/engine/dates';
import { pickProgressPhoto } from '@/services/photos';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

const VIEWS = ['front', 'side', 'back'] as const;
type ViewKind = (typeof VIEWS)[number];

export default function Photos() {
  const c = useColors();
  const [tick, setTick] = useState(0);
  const photos = useMemo(() => repo.listPhotos(), [tick]);
  const today = dayKey(new Date());
  const days = useMemo(() => Array.from(new Set(photos.map((p) => p.day))).sort(), [photos]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const dayA = a ?? days[0] ?? null;
  const dayB = b ?? days[days.length - 1] ?? null;

  const add = (view: ViewKind) => {
    const run = async (source: 'camera' | 'library') => {
      const uri = await pickProgressPhoto(source, `${today}-${view}`);
      if (!uri) return;
      for (const p of photos.filter((x) => x.day === today && x.view === view)) repo.deletePhoto(p.id);
      repo.addPhoto(today, view, uri);
      setTick((t) => t + 1);
    };
    Alert.alert(`${view} photo`, undefined, [
      { text: 'Camera', onPress: () => void run('camera') },
      { text: 'Library', onPress: () => void run('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const find = (day: string | null, view: ViewKind) => photos.find((p) => p.day === day && p.view === view);

  return (
    <Screen>
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Today · {today}</Txt>
        <Txt variant="small" muted>
          Same spot, same lighting, morning. Stored on this device only.
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {VIEWS.map((v) => (
            <Button key={v} title={find(today, v) ? `${v} ✓` : v} variant="secondary" style={{ flex: 1 }} onPress={() => add(v)} />
          ))}
        </View>
      </Card>

      {days.length >= 1 ? (
        <Card style={{ gap: space.md }}>
          <Txt variant="caption">Compare</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {days.map((d) => (
              <Pressable
                key={d}
                onPress={() => (dayA && !a && d !== dayA ? setB(d) : setA(d))}
                onLongPress={() => setB(d)}
                style={[styles.chip, { backgroundColor: d === dayA || d === dayB ? c.accent : c.surfaceRaised }]}
              >
                <Txt variant="small" style={{ color: d === dayA || d === dayB ? c.accentText : c.text }}>
                  {d}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
          <Txt variant="small" faint>
            Tap sets the left date, long-press sets the right.
          </Txt>
          {VIEWS.map((v) => (
            <View key={v} style={{ gap: 4 }}>
              <Txt variant="caption">{v}</Txt>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {[dayA, dayB].map((d, i) => {
                  const p = find(d, v);
                  return (
                    <View key={i} style={[styles.frame, { backgroundColor: c.surfaceRaised }]}>
                      {p ? <Image source={{ uri: p.uri }} style={styles.img} resizeMode="cover" /> : <Txt variant="small" faint>—</Txt>}
                      <Txt variant="caption" style={{ position: 'absolute', bottom: 6, left: 8 }}>
                        {d ?? ''}
                      </Txt>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  frame: { flex: 1, aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%' },
});
